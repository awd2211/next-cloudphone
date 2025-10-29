package encoder

import (
	"fmt"

	"github.com/cloudphone/media-service/internal/capture"
)

// VideoEncoder defines the interface for video encoding
type VideoEncoder interface {
	// Encode encodes a captured frame
	Encode(frame *capture.Frame) ([]byte, error)

	// SetBitrate adjusts the encoder bitrate
	SetBitrate(bitrate int) error

	// SetFrameRate adjusts the encoder frame rate
	SetFrameRate(fps int) error

	// Close releases encoder resources
	Close() error
}

// AudioEncoder defines the interface for audio encoding
type AudioEncoder interface {
	// EncodeAudio encodes a captured audio frame
	EncodeAudio(frame *capture.AudioFrame) ([]byte, error)

	// SetBitrate adjusts the encoder bitrate
	SetBitrate(bitrate int) error

	// Close releases encoder resources
	Close() error
}

// PassThroughEncoder is a no-op encoder that passes frames unchanged
type PassThroughEncoder struct{}

// NewPassThroughEncoder creates a pass-through encoder
func NewPassThroughEncoder() VideoEncoder {
	return &PassThroughEncoder{}
}

// Encode returns the frame data unchanged
func (e *PassThroughEncoder) Encode(frame *capture.Frame) ([]byte, error) {
	if frame == nil || len(frame.Data) == 0 {
		return nil, fmt.Errorf("empty frame")
	}
	return frame.Data, nil
}

// SetBitrate is a no-op for pass-through
func (e *PassThroughEncoder) SetBitrate(bitrate int) error {
	return nil
}

// SetFrameRate is a no-op for pass-through
func (e *PassThroughEncoder) SetFrameRate(fps int) error {
	return nil
}

// Close is a no-op for pass-through
func (e *PassThroughEncoder) Close() error {
	return nil
}

// PassThroughAudioEncoder is a no-op audio encoder
type PassThroughAudioEncoder struct{}

// NewPassThroughAudioEncoder creates a pass-through audio encoder
func NewPassThroughAudioEncoder() AudioEncoder {
	return &PassThroughAudioEncoder{}
}

// EncodeAudio returns the audio data unchanged
func (e *PassThroughAudioEncoder) EncodeAudio(frame *capture.AudioFrame) ([]byte, error) {
	if frame == nil || len(frame.Data) == 0 {
		return nil, fmt.Errorf("empty audio frame")
	}
	return frame.Data, nil
}

// SetBitrate is a no-op for pass-through
func (e *PassThroughAudioEncoder) SetBitrate(bitrate int) error {
	return nil
}

// Close is a no-op for pass-through
func (e *PassThroughAudioEncoder) Close() error {
	return nil
}

// VP8Encoder encodes frames to VP8 format
// Note: This is a placeholder. Real VP8 encoding would require a library like libvpx
type VP8Encoder struct {
	bitrate   int
	frameRate int
	width     int
	height    int
}

// NewVP8Encoder creates a VP8 encoder
func NewVP8Encoder(width, height, bitrate, frameRate int) VideoEncoder {
	return &VP8Encoder{
		width:     width,
		height:    height,
		bitrate:   bitrate,
		frameRate: frameRate,
	}
}

// Encode encodes a frame to VP8
// Note: This is a stub implementation. Use VP8EncoderFFmpeg or SimpleVP8Encoder for actual encoding.
// See vp8_encoder.go for production-ready implementations.
func (e *VP8Encoder) Encode(frame *capture.Frame) ([]byte, error) {
	// This stub implementation is kept for interface compatibility
	// Production code should use:
	// - VP8EncoderFFmpeg: Streaming encoder with persistent FFmpeg process (vp8_encoder.go)
	// - SimpleVP8Encoder: One-shot encoder for each frame (vp8_encoder.go)
	return frame.Data, fmt.Errorf("VP8 encoding not implemented in stub - use VP8EncoderFFmpeg or SimpleVP8Encoder")
}

// SetBitrate adjusts encoder bitrate
func (e *VP8Encoder) SetBitrate(bitrate int) error {
	e.bitrate = bitrate
	// Note: Real implementation in VP8EncoderFFmpeg supports dynamic bitrate via encoder restart
	return nil
}

// SetFrameRate adjusts encoder frame rate
func (e *VP8Encoder) SetFrameRate(fps int) error {
	e.frameRate = fps
	// Note: Real implementation in VP8EncoderFFmpeg supports dynamic frame rate via encoder restart
	return nil
}

// Close releases encoder resources
func (e *VP8Encoder) Close() error {
	// Note: Real implementation in VP8EncoderFFmpeg properly cleans up FFmpeg processes
	return nil
}

// OpusEncoder encodes audio to Opus format
// Note: This is a placeholder. Real Opus encoding would require libopus
type OpusEncoder struct {
	sampleRate int
	channels   int
	bitrate    int
}

// NewOpusEncoder creates an Opus encoder
func NewOpusEncoder(sampleRate, channels, bitrate int) AudioEncoder {
	return &OpusEncoder{
		sampleRate: sampleRate,
		channels:   channels,
		bitrate:    bitrate,
	}
}

// EncodeAudio encodes audio to Opus
// Note: This is a stub implementation. Use OpusEncoderFFmpeg for actual encoding.
// See opus_encoder.go for production-ready implementation.
func (e *OpusEncoder) EncodeAudio(frame *capture.AudioFrame) ([]byte, error) {
	// This stub implementation is kept for interface compatibility
	// Production code should use:
	// - OpusEncoderFFmpeg: FFmpeg-based Opus encoder (opus_encoder.go)
	// - StreamingOpusEncoder: Streaming version with persistent process (opus_encoder.go)
	return frame.Data, fmt.Errorf("Opus encoding not implemented in stub - use OpusEncoderFFmpeg")
}

// SetBitrate adjusts encoder bitrate
func (e *OpusEncoder) SetBitrate(bitrate int) error {
	e.bitrate = bitrate
	// Note: Real implementation in OpusEncoderFFmpeg supports dynamic bitrate adjustment
	return nil
}

// Close releases encoder resources
func (e *OpusEncoder) Close() error {
	// Note: Real implementation in OpusEncoderFFmpeg properly cleans up resources
	return nil
}
