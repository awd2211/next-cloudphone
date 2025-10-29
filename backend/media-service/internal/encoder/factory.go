package encoder

import (
	"fmt"

	"github.com/sirupsen/logrus"
)

// EncoderType represents the type of encoder
type EncoderType string

const (
	// Video encoder types
	EncoderTypePassThrough EncoderType = "passthrough"
	EncoderTypeVP8         EncoderType = "vp8"
	EncoderTypeVP8Simple   EncoderType = "vp8-simple"
	EncoderTypeH264        EncoderType = "h264"

	// Audio encoder types
	EncoderTypeOpus       EncoderType = "opus"
	EncoderTypeOpusStream EncoderType = "opus-stream"
	EncoderTypePCM        EncoderType = "pcm"
)

// VideoEncoderConfig contains configuration for video encoders
type VideoEncoderConfig struct {
	Type      EncoderType
	Width     int
	Height    int
	Bitrate   int
	FrameRate int
	Quality   int
	Logger    *logrus.Logger
}

// AudioEncoderConfig contains configuration for audio encoders
type AudioEncoderConfig struct {
	Type       EncoderType
	SampleRate int
	Channels   int
	Bitrate    int
	Logger     *logrus.Logger
}

// EncoderFactory creates encoders based on configuration
type EncoderFactory struct {
	logger *logrus.Logger
}

// NewEncoderFactory creates a new encoder factory
func NewEncoderFactory(logger *logrus.Logger) *EncoderFactory {
	if logger == nil {
		logger = logrus.New()
	}

	return &EncoderFactory{
		logger: logger,
	}
}

// CreateVideoEncoder creates a video encoder based on configuration
func (f *EncoderFactory) CreateVideoEncoder(config VideoEncoderConfig) (VideoEncoder, error) {
	if config.Logger == nil {
		config.Logger = f.logger
	}

	switch config.Type {
	case EncoderTypePassThrough:
		f.logger.Info("Creating Pass-through video encoder")
		return NewPassThroughEncoder(), nil

	case EncoderTypeVP8:
		f.logger.WithFields(logrus.Fields{
			"width":     config.Width,
			"height":    config.Height,
			"bitrate":   config.Bitrate,
			"framerate": config.FrameRate,
		}).Info("Creating VP8 encoder (FFmpeg streaming)")

		return NewVP8EncoderFFmpeg(VP8EncoderOptions{
			Width:     config.Width,
			Height:    config.Height,
			Bitrate:   config.Bitrate,
			FrameRate: config.FrameRate,
			Quality:   config.Quality,
			Logger:    config.Logger,
		})

	case EncoderTypeVP8Simple:
		f.logger.WithFields(logrus.Fields{
			"width":     config.Width,
			"height":    config.Height,
			"bitrate":   config.Bitrate,
			"framerate": config.FrameRate,
		}).Info("Creating Simple VP8 encoder (FFmpeg one-shot)")

		return NewSimpleVP8Encoder(
			config.Width,
			config.Height,
			config.Bitrate,
			config.FrameRate,
			config.Logger,
		), nil

	case EncoderTypeH264:
		f.logger.WithFields(logrus.Fields{
			"width":     config.Width,
			"height":    config.Height,
			"bitrate":   config.Bitrate,
			"framerate": config.FrameRate,
		}).Info("Creating H.264 encoder (FFmpeg with hardware acceleration)")

		return NewH264EncoderFFmpeg(H264EncoderOptions{
			Width:     config.Width,
			Height:    config.Height,
			Bitrate:   config.Bitrate,
			FrameRate: config.FrameRate,
			Preset:    "faster",
			HWAccel:   H264EncoderAuto, // Auto-detect hardware
			Logger:    config.Logger,
		})

	default:
		return nil, fmt.Errorf("unsupported video encoder type: %s", config.Type)
	}
}

// CreateAudioEncoder creates an audio encoder based on configuration
func (f *EncoderFactory) CreateAudioEncoder(config AudioEncoderConfig) (AudioEncoder, error) {
	if config.Logger == nil {
		config.Logger = f.logger
	}

	switch config.Type {
	case EncoderTypePCM:
		f.logger.Info("Creating Pass-through audio encoder (PCM)")
		return NewPassThroughAudioEncoder(), nil

	case EncoderTypeOpus:
		f.logger.WithFields(logrus.Fields{
			"sample_rate": config.SampleRate,
			"channels":    config.Channels,
			"bitrate":     config.Bitrate,
		}).Info("Creating Opus encoder (FFmpeg one-shot)")

		return NewOpusEncoderFFmpeg(OpusEncoderOptions{
			SampleRate: config.SampleRate,
			Channels:   config.Channels,
			Bitrate:    config.Bitrate,
			Logger:     config.Logger,
		})

	case EncoderTypeOpusStream:
		f.logger.WithFields(logrus.Fields{
			"sample_rate": config.SampleRate,
			"channels":    config.Channels,
			"bitrate":     config.Bitrate,
		}).Info("Creating Streaming Opus encoder")

		return NewStreamingOpusEncoder(
			config.SampleRate,
			config.Channels,
			config.Bitrate,
			config.Logger,
		), nil

	default:
		return nil, fmt.Errorf("unsupported audio encoder type: %s", config.Type)
	}
}

// GetDefaultVideoEncoderConfig returns default configuration for video encoder
func GetDefaultVideoEncoderConfig(encoderType EncoderType) VideoEncoderConfig {
	config := VideoEncoderConfig{
		Type:      encoderType,
		Width:     1280,
		Height:    720,
		Bitrate:   2000000, // 2 Mbps
		FrameRate: 30,
		Quality:   10,
	}

	// Adjust defaults based on encoder type
	switch encoderType {
	case EncoderTypeVP8Simple:
		// Simple VP8 encoder may need lower settings for better performance
		config.Bitrate = 1500000 // 1.5 Mbps
		config.FrameRate = 24
	}

	return config
}

// GetDefaultAudioEncoderConfig returns default configuration for audio encoder
func GetDefaultAudioEncoderConfig(encoderType EncoderType) AudioEncoderConfig {
	return AudioEncoderConfig{
		Type:       encoderType,
		SampleRate: 48000,
		Channels:   2,
		Bitrate:    64000, // 64 kbps
	}
}

// RecommendedEncoderForQuality recommends encoder based on quality level
func RecommendedEncoderForQuality(qualityLevel string) EncoderType {
	switch qualityLevel {
	case "low":
		return EncoderTypePassThrough // Lowest latency, higher bandwidth
	case "medium":
		return EncoderTypeVP8Simple // Good balance
	case "high":
		return EncoderTypeVP8 // Best quality/compression
	default:
		return EncoderTypeVP8Simple // Default
	}
}

// RecommendedEncoderForCaptureFormat recommends encoder based on capture format
// This is the key optimization: use pass-through for H.264, avoid re-encoding
func RecommendedEncoderForCaptureFormat(captureFormat string) EncoderType {
	switch captureFormat {
	case "h264", "H264", "screenrecord":
		// H.264 already encoded by Android hardware, use pass-through
		return EncoderTypePassThrough
	case "png", "PNG", "screencap":
		// PNG needs encoding, use VP8 simple (fast)
		return EncoderTypeVP8Simple
	case "jpeg", "JPEG":
		// JPEG needs encoding, use VP8 simple
		return EncoderTypeVP8Simple
	default:
		// Default to pass-through (assume pre-encoded)
		return EncoderTypePassThrough
	}
}

// ValidateVideoEncoderConfig validates video encoder configuration
func ValidateVideoEncoderConfig(config VideoEncoderConfig) error {
	if config.Width <= 0 || config.Width > 3840 {
		return fmt.Errorf("invalid width: %d (must be 1-3840)", config.Width)
	}
	if config.Height <= 0 || config.Height > 2160 {
		return fmt.Errorf("invalid height: %d (must be 1-2160)", config.Height)
	}
	if config.Width%2 != 0 || config.Height%2 != 0 {
		return fmt.Errorf("dimensions must be even (got %dx%d)", config.Width, config.Height)
	}
	if config.Bitrate <= 0 || config.Bitrate > 50000000 {
		return fmt.Errorf("invalid bitrate: %d (must be 1-50000000)", config.Bitrate)
	}
	if config.FrameRate <= 0 || config.FrameRate > 60 {
		return fmt.Errorf("invalid framerate: %d (must be 1-60)", config.FrameRate)
	}

	return nil
}

// ValidateAudioEncoderConfig validates audio encoder configuration
func ValidateAudioEncoderConfig(config AudioEncoderConfig) error {
	validSampleRates := map[int]bool{
		8000: true, 12000: true, 16000: true, 24000: true,
		48000: true, 96000: true,
	}

	if !validSampleRates[config.SampleRate] {
		return fmt.Errorf("invalid sample rate: %d (must be 8000, 12000, 16000, 24000, 48000, or 96000)", config.SampleRate)
	}

	if config.Channels < 1 || config.Channels > 2 {
		return fmt.Errorf("invalid channels: %d (must be 1 or 2)", config.Channels)
	}

	if config.Bitrate <= 0 || config.Bitrate > 510000 {
		return fmt.Errorf("invalid bitrate: %d (must be 1-510000)", config.Bitrate)
	}

	return nil
}
