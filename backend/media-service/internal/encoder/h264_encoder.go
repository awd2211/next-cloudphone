package encoder

import (
	"bytes"
	"fmt"
	"os/exec"
	"sync"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// H264EncoderType represents the type of H.264 encoder
type H264EncoderType string

const (
	H264EncoderNVENC     H264EncoderType = "nvenc"      // NVIDIA NVENC
	H264EncoderQSV       H264EncoderType = "qsv"        // Intel QuickSync
	H264EncoderVAAPI     H264EncoderType = "vaapi"      // VA-API (AMD/Intel)
	H264EncoderX264      H264EncoderType = "libx264"    // Software fallback
	H264EncoderAuto      H264EncoderType = "auto"       // Auto-detect
)

// H264EncoderFFmpeg implements H.264 encoding using FFmpeg with hardware acceleration
type H264EncoderFFmpeg struct {
	width      int
	height     int
	bitrate    int
	frameRate  int
	preset     string
	hwAccel    H264EncoderType
	logger     *logrus.Logger
	converter  *ImageConverter
	mu         sync.Mutex
}

// H264EncoderOptions contains configuration for H.264 encoder
type H264EncoderOptions struct {
	Width     int
	Height    int
	Bitrate   int
	FrameRate int
	Preset    string          // ultrafast, superfast, veryfast, faster, fast, medium
	HWAccel   H264EncoderType // Hardware acceleration type
	Logger    *logrus.Logger
}

// NewH264EncoderFFmpeg creates a new H.264 encoder with hardware acceleration
func NewH264EncoderFFmpeg(options H264EncoderOptions) (*H264EncoderFFmpeg, error) {
	if options.Width <= 0 || options.Height <= 0 {
		return nil, fmt.Errorf("invalid dimensions: %dx%d", options.Width, options.Height)
	}
	if options.Bitrate <= 0 {
		options.Bitrate = 2000000 // 2 Mbps default
	}
	if options.FrameRate <= 0 {
		options.FrameRate = 30
	}
	if options.Preset == "" {
		options.Preset = "faster"
	}
	if options.HWAccel == "" || options.HWAccel == H264EncoderAuto {
		// Auto-detect hardware acceleration
		options.HWAccel = detectHardwareEncoder()
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	encoder := &H264EncoderFFmpeg{
		width:     options.Width,
		height:    options.Height,
		bitrate:   options.Bitrate,
		frameRate: options.FrameRate,
		preset:    options.Preset,
		hwAccel:   options.HWAccel,
		logger:    options.Logger,
		converter: NewImageConverter(),
	}

	encoder.logger.WithFields(logrus.Fields{
		"width":     options.Width,
		"height":    options.Height,
		"bitrate":   options.Bitrate,
		"framerate": options.FrameRate,
		"hwaccel":   options.HWAccel,
		"preset":    options.Preset,
	}).Info("H.264 encoder created")

	return encoder, nil
}

// Encode encodes a frame to H.264
func (e *H264EncoderFFmpeg) Encode(frame *capture.Frame) ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Build FFmpeg command based on hardware acceleration
	cmd := e.buildFFmpegCommand(frame)

	// Set input
	cmd.Stdin = bytes.NewReader(frame.Data)

	// Capture output
	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	// Execute encoding
	if err := cmd.Run(); err != nil {
		e.logger.WithError(err).WithField("stderr", stderr.String()).Error("FFmpeg encoding failed")
		return nil, fmt.Errorf("h264 encoding failed: %w", err)
	}

	return stdout.Bytes(), nil
}

// buildFFmpegCommand builds the FFmpeg command based on hardware acceleration
func (e *H264EncoderFFmpeg) buildFFmpegCommand(frame *capture.Frame) *exec.Cmd {
	var args []string

	// Input format detection
	inputFormat := "image2pipe"
	if frame.Format == capture.FrameFormatPNG {
		inputFormat = "image2pipe"
	} else if frame.Format == capture.FrameFormatJPEG {
		inputFormat = "image2pipe"
	}

	// Common input arguments
	args = append(args,
		"-f", inputFormat,
		"-i", "pipe:0",
	)

	// Hardware acceleration specific arguments
	switch e.hwAccel {
	case H264EncoderNVENC:
		// NVIDIA NVENC
		args = append(args,
			"-c:v", "h264_nvenc",
			"-preset", e.preset,
			"-b:v", fmt.Sprintf("%d", e.bitrate),
			"-maxrate", fmt.Sprintf("%d", e.bitrate*2),
			"-bufsize", fmt.Sprintf("%d", e.bitrate),
			"-profile:v", "baseline",
			"-level", "3.1",
		)

	case H264EncoderQSV:
		// Intel QuickSync
		args = append(args,
			"-c:v", "h264_qsv",
			"-preset", e.preset,
			"-b:v", fmt.Sprintf("%d", e.bitrate),
			"-maxrate", fmt.Sprintf("%d", e.bitrate*2),
			"-bufsize", fmt.Sprintf("%d", e.bitrate),
			"-profile:v", "baseline",
			"-level", "3.1",
		)

	case H264EncoderVAAPI:
		// VA-API (AMD/Intel)
		args = append(args,
			"-vaapi_device", "/dev/dri/renderD128",
			"-c:v", "h264_vaapi",
			"-b:v", fmt.Sprintf("%d", e.bitrate),
			"-maxrate", fmt.Sprintf("%d", e.bitrate*2),
			"-bufsize", fmt.Sprintf("%d", e.bitrate),
			"-profile:v", "578", // Baseline profile
		)

	default:
		// Software fallback (libx264)
		args = append(args,
			"-c:v", "libx264",
			"-preset", e.preset,
			"-tune", "zerolatency",
			"-b:v", fmt.Sprintf("%d", e.bitrate),
			"-maxrate", fmt.Sprintf("%d", e.bitrate*2),
			"-bufsize", fmt.Sprintf("%d", e.bitrate),
			"-profile:v", "baseline",
			"-level", "3.1",
			"-x264-params", "keyint=60:min-keyint=60:scenecut=0",
		)
	}

	// Common output arguments
	args = append(args,
		"-r", fmt.Sprintf("%d", e.frameRate),
		"-pix_fmt", "yuv420p",
		"-frames:v", "1",
		"-f", "h264",
		"pipe:1",
	)

	return exec.Command("ffmpeg", args...)
}

// Close releases encoder resources
func (e *H264EncoderFFmpeg) Close() error {
	e.logger.Info("H.264 encoder closed")
	return nil
}

// SetBitrate dynamically adjusts the bitrate
func (e *H264EncoderFFmpeg) SetBitrate(bitrate int) error {
	if bitrate <= 0 || bitrate > 50000000 {
		return fmt.Errorf("invalid bitrate: %d", bitrate)
	}

	e.mu.Lock()
	e.bitrate = bitrate
	e.mu.Unlock()

	e.logger.WithField("new_bitrate", bitrate).Info("H.264 bitrate adjusted")
	return nil
}

// GetBitrate returns the current bitrate
func (e *H264EncoderFFmpeg) GetBitrate() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.bitrate
}

// SetFrameRate dynamically adjusts the frame rate
func (e *H264EncoderFFmpeg) SetFrameRate(fps int) error {
	if fps <= 0 || fps > 60 {
		return fmt.Errorf("invalid frame rate: %d (must be 1-60)", fps)
	}

	e.mu.Lock()
	e.frameRate = fps
	e.mu.Unlock()

	e.logger.WithField("new_framerate", fps).Info("H.264 frame rate adjusted")
	return nil
}

// detectHardwareEncoder detects available hardware encoders
func detectHardwareEncoder() H264EncoderType {
	// Try to detect hardware encoders
	encoders := []struct {
		hwType   H264EncoderType
		testCmd  []string
	}{
		{
			hwType:  H264EncoderNVENC,
			testCmd: []string{"ffmpeg", "-hide_banner", "-encoders"},
		},
		{
			hwType:  H264EncoderQSV,
			testCmd: []string{"ffmpeg", "-hide_banner", "-encoders"},
		},
		{
			hwType:  H264EncoderVAAPI,
			testCmd: []string{"ffmpeg", "-hide_banner", "-encoders"},
		},
	}

	for _, enc := range encoders {
		cmd := exec.Command(enc.testCmd[0], enc.testCmd[1:]...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			continue
		}

		outputStr := string(output)
		switch enc.hwType {
		case H264EncoderNVENC:
			if bytes.Contains(output, []byte("h264_nvenc")) {
				logrus.Info("Detected NVIDIA NVENC hardware encoder")
				return H264EncoderNVENC
			}
		case H264EncoderQSV:
			if bytes.Contains(output, []byte("h264_qsv")) {
				logrus.Info("Detected Intel QuickSync hardware encoder")
				return H264EncoderQSV
			}
		case H264EncoderVAAPI:
			if bytes.Contains(output, []byte("h264_vaapi")) {
				logrus.Info("Detected VA-API hardware encoder")
				return H264EncoderVAAPI
			}
		}
		_ = outputStr // Suppress unused variable warning
	}

	// Fallback to software encoder
	logrus.Warn("No hardware encoder detected, using libx264 (software)")
	return H264EncoderX264
}

// IsHardwareAccelerated returns true if using hardware acceleration
func (e *H264EncoderFFmpeg) IsHardwareAccelerated() bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.hwAccel != H264EncoderX264
}

// GetHardwareType returns the hardware acceleration type
func (e *H264EncoderFFmpeg) GetHardwareType() H264EncoderType {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.hwAccel
}
