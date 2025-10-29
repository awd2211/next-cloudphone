package encoder

import (
	"bytes"
	"fmt"
	"os/exec"
	"sync"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// OpusEncoderFFmpeg implements Opus audio encoding using FFmpeg
type OpusEncoderFFmpeg struct {
	sampleRate int
	channels   int
	bitrate    int
	logger     *logrus.Logger
	mu         sync.Mutex
}

// OpusEncoderOptions contains options for Opus encoder
type OpusEncoderOptions struct {
	SampleRate int // Sample rate in Hz (default 48000)
	Channels   int // Number of channels (1=mono, 2=stereo)
	Bitrate    int // Bitrate in bps (default 64000)
	Logger     *logrus.Logger
}

// NewOpusEncoderFFmpeg creates a new FFmpeg-based Opus encoder
func NewOpusEncoderFFmpeg(options OpusEncoderOptions) (AudioEncoder, error) {
	if options.SampleRate <= 0 {
		options.SampleRate = 48000 // Default 48kHz
	}
	if options.Channels <= 0 {
		options.Channels = 2 // Default stereo
	}
	if options.Bitrate <= 0 {
		options.Bitrate = 64000 // Default 64 kbps
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	encoder := &OpusEncoderFFmpeg{
		sampleRate: options.SampleRate,
		channels:   options.Channels,
		bitrate:    options.Bitrate,
		logger:     options.Logger,
	}

	encoder.logger.WithFields(logrus.Fields{
		"sample_rate": encoder.sampleRate,
		"channels":    encoder.channels,
		"bitrate":     encoder.bitrate,
	}).Info("Opus encoder initialized")

	return encoder, nil
}

// EncodeAudio encodes PCM audio to Opus
func (e *OpusEncoderFFmpeg) EncodeAudio(frame *capture.AudioFrame) ([]byte, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Use FFmpeg to encode PCM to Opus
	cmd := exec.Command("ffmpeg",
		"-f", "s16le", // 16-bit PCM
		"-ar", fmt.Sprintf("%d", frame.SampleRate),
		"-ac", fmt.Sprintf("%d", frame.Channels),
		"-i", "pipe:0",
		"-c:a", "libopus",
		"-b:a", fmt.Sprintf("%d", e.bitrate),
		"-vbr", "on", // Variable bitrate
		"-compression_level", "10", // Max compression
		"-frame_duration", "20", // 20ms frames
		"-application", "voip", // Optimize for voice/real-time
		"-f", "opus",
		"pipe:1",
	)

	cmd.Stdin = bytes.NewReader(frame.Data)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		e.logger.WithError(err).WithField("stderr", stderr.String()).Error("Opus encoding failed")
		return nil, fmt.Errorf("opus encoding failed: %w", err)
	}

	return stdout.Bytes(), nil
}

// SetBitrate adjusts the encoder bitrate
func (e *OpusEncoderFFmpeg) SetBitrate(bitrate int) error {
	e.mu.Lock()
	e.bitrate = bitrate
	e.mu.Unlock()

	e.logger.WithField("new_bitrate", bitrate).Info("Opus bitrate updated")
	return nil
}

// Close releases encoder resources
func (e *OpusEncoderFFmpeg) Close() error {
	e.logger.Info("Opus encoder closed")
	return nil
}

// StreamingOpusEncoder is a streaming version that maintains a persistent FFmpeg process
type StreamingOpusEncoder struct {
	sampleRate int
	channels   int
	bitrate    int
	cmd        *exec.Cmd
	stdin      *bytes.Buffer
	running    bool
	logger     *logrus.Logger
	mu         sync.Mutex
}

// NewStreamingOpusEncoder creates a streaming Opus encoder
func NewStreamingOpusEncoder(sampleRate, channels, bitrate int, logger *logrus.Logger) AudioEncoder {
	if logger == nil {
		logger = logrus.New()
	}

	return &StreamingOpusEncoder{
		sampleRate: sampleRate,
		channels:   channels,
		bitrate:    bitrate,
		logger:     logger,
	}
}

// EncodeAudio encodes audio using a persistent process
func (e *StreamingOpusEncoder) EncodeAudio(frame *capture.AudioFrame) ([]byte, error) {
	// For now, delegate to one-shot encoder
	// A full streaming implementation would maintain the FFmpeg process
	// and use pipes for continuous encoding
	oneShot := &OpusEncoderFFmpeg{
		sampleRate: e.sampleRate,
		channels:   e.channels,
		bitrate:    e.bitrate,
		logger:     e.logger,
	}

	return oneShot.EncodeAudio(frame)
}

// SetBitrate updates bitrate
func (e *StreamingOpusEncoder) SetBitrate(bitrate int) error {
	e.mu.Lock()
	e.bitrate = bitrate
	e.mu.Unlock()
	return nil
}

// Close stops the encoder
func (e *StreamingOpusEncoder) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.cmd != nil && e.cmd.Process != nil {
		e.cmd.Process.Kill()
	}

	e.running = false
	return nil
}
