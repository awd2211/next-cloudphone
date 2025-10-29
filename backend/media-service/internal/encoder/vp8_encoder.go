package encoder

import (
	"bytes"
	"fmt"
	"io"
	"os/exec"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// VP8EncoderFFmpeg implements VP8 encoding using FFmpeg
type VP8EncoderFFmpeg struct {
	width     int
	height    int
	bitrate   int
	frameRate int
	quality   int // 0-63, lower is better (VP8 uses CRF-like quality)

	converter *ImageConverter
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	stdout    io.ReadCloser
	mu        sync.Mutex
	running   bool
	logger    *logrus.Logger

	// Frame counter
	frameCount uint64
}

// VP8EncoderOptions contains options for VP8 encoder
type VP8EncoderOptions struct {
	Width     int
	Height    int
	Bitrate   int // bits per second
	FrameRate int // frames per second
	Quality   int // 0-63, lower is better
	Logger    *logrus.Logger
}

// NewVP8EncoderFFmpeg creates a new FFmpeg-based VP8 encoder
func NewVP8EncoderFFmpeg(options VP8EncoderOptions) (VideoEncoder, error) {
	if options.Width <= 0 || options.Height <= 0 {
		return nil, fmt.Errorf("invalid dimensions: %dx%d", options.Width, options.Height)
	}
	if options.Bitrate <= 0 {
		options.Bitrate = 2000000 // Default 2 Mbps
	}
	if options.FrameRate <= 0 {
		options.FrameRate = 30 // Default 30 fps
	}
	if options.Quality < 0 || options.Quality > 63 {
		options.Quality = 10 // Default quality
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	encoder := &VP8EncoderFFmpeg{
		width:     options.Width,
		height:    options.Height,
		bitrate:   options.Bitrate,
		frameRate: options.FrameRate,
		quality:   options.Quality,
		converter: NewImageConverter(),
		logger:    options.Logger,
	}

	// Start FFmpeg process
	if err := encoder.start(); err != nil {
		return nil, fmt.Errorf("failed to start FFmpeg: %w", err)
	}

	return encoder, nil
}

// start initializes the FFmpeg encoding process
func (e *VP8EncoderFFmpeg) start() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.running {
		return fmt.Errorf("encoder already running")
	}

	// FFmpeg command to encode raw YUV420 to VP8
	// Input: raw i420 video from stdin
	// Output: VP8 IVF format to stdout
	args := []string{
		"-f", "rawvideo",
		"-pix_fmt", "yuv420p",
		"-s", fmt.Sprintf("%dx%d", e.width, e.height),
		"-r", fmt.Sprintf("%d", e.frameRate),
		"-i", "pipe:0", // Read from stdin
		"-c:v", "libvpx", // VP8 codec
		"-b:v", fmt.Sprintf("%d", e.bitrate),
		"-quality", "realtime", // Realtime encoding mode
		"-cpu-used", "5", // Faster encoding (0-16, higher = faster but lower quality)
		"-deadline", "realtime",
		"-error-resilient", "1", // Error resilience for real-time streaming
		"-lag-in-frames", "0", // No frame delay
		"-f", "ivf", // IVF container format
		"pipe:1", // Write to stdout
	}

	e.cmd = exec.Command("ffmpeg", args...)

	// Set up stdin pipe for writing frames
	stdin, err := e.cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}
	e.stdin = stdin

	// Set up stdout pipe for reading encoded data
	stdout, err := e.cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	e.stdout = stdout

	// Capture stderr for debugging
	var stderrBuf bytes.Buffer
	e.cmd.Stderr = &stderrBuf

	// Start the process
	if err := e.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	e.running = true

	e.logger.WithFields(logrus.Fields{
		"width":     e.width,
		"height":    e.height,
		"bitrate":   e.bitrate,
		"framerate": e.frameRate,
	}).Info("VP8 encoder started")

	return nil
}

// Encode encodes a captured frame to VP8
func (e *VP8EncoderFFmpeg) Encode(frame *capture.Frame) ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.running {
		return nil, fmt.Errorf("encoder not running")
	}

	// Convert frame to I420 (YUV420)
	i420, width, height, err := e.converter.FrameToI420(frame)
	if err != nil {
		return nil, fmt.Errorf("failed to convert frame to I420: %w", err)
	}

	// Check if dimensions match
	if width != e.width || height != e.height {
		// TODO: Resize image if needed
		return nil, fmt.Errorf("frame dimensions mismatch: got %dx%d, expected %dx%d", width, height, e.width, e.height)
	}

	// Write I420 data to FFmpeg stdin
	if _, err := e.stdin.Write(i420); err != nil {
		return nil, fmt.Errorf("failed to write frame to encoder: %w", err)
	}

	// Read encoded VP8 data from stdout
	// Note: This is a simplified approach. In production, you'd need async I/O
	// to avoid blocking, and handle the IVF container format properly
	encoded := make([]byte, 65536) // 64KB buffer
	n, err := e.stdout.Read(encoded)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read encoded data: %w", err)
	}

	e.frameCount++

	if n > 0 {
		return encoded[:n], nil
	}

	return nil, fmt.Errorf("no encoded data available")
}

// SetBitrate adjusts the encoder bitrate
func (e *VP8EncoderFFmpeg) SetBitrate(bitrate int) error {
	// FFmpeg doesn't support runtime bitrate changes via stdin
	// We need to restart the encoder with new settings
	e.mu.Lock()
	oldBitrate := e.bitrate
	e.bitrate = bitrate
	e.mu.Unlock()

	e.logger.WithFields(logrus.Fields{
		"old_bitrate": oldBitrate,
		"new_bitrate": bitrate,
	}).Info("Bitrate updated, restarting encoder")

	// Restart encoder with new bitrate
	return e.restart()
}

// SetFrameRate adjusts the encoder frame rate
func (e *VP8EncoderFFmpeg) SetFrameRate(fps int) error {
	e.mu.Lock()
	oldFps := e.frameRate
	e.frameRate = fps
	e.mu.Unlock()

	e.logger.WithFields(logrus.Fields{
		"old_fps": oldFps,
		"new_fps": fps,
	}).Info("Frame rate updated, restarting encoder")

	// Restart encoder with new frame rate
	return e.restart()
}

// Close releases encoder resources
func (e *VP8EncoderFFmpeg) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.running {
		return nil
	}

	// Close stdin to signal end of input
	if e.stdin != nil {
		e.stdin.Close()
	}

	// Wait for process to finish with timeout (修复进程泄漏)
	if e.cmd != nil && e.cmd.Process != nil {
		done := make(chan error, 1)
		go func() {
			done <- e.cmd.Wait()
		}()

		select {
		case err := <-done:
			if err != nil {
				e.logger.WithError(err).Warn("FFmpeg process exited with error")
			}
		case <-time.After(5 * time.Second):
			// Timeout: forcefully kill the process
			e.logger.Warn("FFmpeg process did not exit in time, killing forcefully")
			if err := e.cmd.Process.Kill(); err != nil {
				e.logger.WithError(err).Error("Failed to kill FFmpeg process")
			}
			<-done // Wait for the goroutine to finish
		}
	}

	e.running = false

	e.logger.WithField("frames_encoded", e.frameCount).Info("VP8 encoder closed")

	return nil
}

// GetFrameCount returns the number of frames encoded
func (e *VP8EncoderFFmpeg) GetFrameCount() uint64 {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.frameCount
}

// restart restarts the encoder with current settings
// This is used when bitrate or frame rate changes
func (e *VP8EncoderFFmpeg) restart() error {
	e.logger.Info("Restarting VP8 encoder with new settings")

	// Close the current encoder
	if err := e.Close(); err != nil {
		e.logger.WithError(err).Warn("Error closing encoder during restart")
	}

	// Small delay to ensure process cleanup
	time.Sleep(100 * time.Millisecond)

	// Start with new settings
	if err := e.start(); err != nil {
		e.logger.WithError(err).Error("Failed to restart encoder")
		return fmt.Errorf("failed to restart encoder: %w", err)
	}

	e.logger.Info("VP8 encoder restarted successfully")
	return nil
}

// SimpleVP8Encoder is a simpler VP8 encoder that uses FFmpeg in one-shot mode
// This is more practical for real-time streaming where we encode each frame independently
type SimpleVP8Encoder struct {
	width     int
	height    int
	bitrate   int
	frameRate int
	converter *ImageConverter
	logger    *logrus.Logger
	mu        sync.Mutex
}

// NewSimpleVP8Encoder creates a simplified VP8 encoder
func NewSimpleVP8Encoder(width, height, bitrate, frameRate int, logger *logrus.Logger) VideoEncoder {
	if logger == nil {
		logger = logrus.New()
	}

	return &SimpleVP8Encoder{
		width:     width,
		height:    height,
		bitrate:   bitrate,
		frameRate: frameRate,
		converter: NewImageConverter(),
		logger:    logger,
	}
}

// Encode encodes a single frame to VP8 using FFmpeg one-shot mode
func (e *SimpleVP8Encoder) Encode(frame *capture.Frame) ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// For simplicity, we'll use FFmpeg to encode the PNG/JPEG directly
	// This is less efficient but more reliable than streaming mode

	cmd := exec.Command("ffmpeg",
		"-f", "image2pipe",
		"-i", "pipe:0",
		"-c:v", "libvpx",
		"-b:v", fmt.Sprintf("%d", e.bitrate),
		"-quality", "realtime",
		"-cpu-used", "5",
		"-deadline", "realtime",
		"-frames:v", "1",
		"-f", "webm",
		"pipe:1",
	)

	cmd.Stdin = bytes.NewReader(frame.Data)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		e.logger.WithError(err).WithField("stderr", stderr.String()).Error("FFmpeg encoding failed")
		return nil, fmt.Errorf("ffmpeg encoding failed: %w", err)
	}

	return stdout.Bytes(), nil
}

// SetBitrate updates bitrate
func (e *SimpleVP8Encoder) SetBitrate(bitrate int) error {
	e.mu.Lock()
	e.bitrate = bitrate
	e.mu.Unlock()
	return nil
}

// SetFrameRate updates frame rate
func (e *SimpleVP8Encoder) SetFrameRate(fps int) error {
	e.mu.Lock()
	e.frameRate = fps
	e.mu.Unlock()
	return nil
}

// Close does nothing for simple encoder
func (e *SimpleVP8Encoder) Close() error {
	return nil
}
