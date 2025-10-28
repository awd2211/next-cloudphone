package capture

import (
	"context"
	"time"
)

// Frame represents a captured frame from the device
type Frame struct {
	Data      []byte        // Raw frame data (RGBA or encoded)
	Width     int           // Frame width in pixels
	Height    int           // Frame height in pixels
	Timestamp time.Time     // Capture timestamp
	Format    FrameFormat   // Frame format
	Duration  time.Duration // Frame duration for encoding
}

// FrameFormat represents the format of captured frames
type FrameFormat string

const (
	// FrameFormatRGBA represents RGBA raw format
	FrameFormatRGBA FrameFormat = "rgba"
	// FrameFormatH264 represents H.264 encoded format
	FrameFormatH264 FrameFormat = "h264"
	// FrameFormatVP8 represents VP8 encoded format
	FrameFormatVP8 FrameFormat = "vp8"
	// FrameFormatJPEG represents JPEG encoded format
	FrameFormatJPEG FrameFormat = "jpeg"
	// FrameFormatPNG represents PNG encoded format
	FrameFormatPNG FrameFormat = "png"
)

// CaptureOptions contains options for screen capture
type CaptureOptions struct {
	DeviceID   string        // Device identifier
	Width      int           // Desired width (0 = device native)
	Height     int           // Desired height (0 = device native)
	FrameRate  int           // Target frame rate (fps)
	Format     FrameFormat   // Desired output format
	Quality    int           // Quality level (0-100 for lossy formats)
	BufferSize int           // Frame buffer size
}

// ScreenCapture defines the interface for screen capture services
type ScreenCapture interface {
	// Start begins capturing frames from the device
	Start(ctx context.Context, options CaptureOptions) error

	// Stop stops capturing frames
	Stop() error

	// GetFrameChannel returns a channel for receiving captured frames
	GetFrameChannel() <-chan *Frame

	// GetStats returns capture statistics
	GetStats() CaptureStats

	// IsRunning returns true if capture is active
	IsRunning() bool

	// SetFrameRate dynamically adjusts the frame rate
	SetFrameRate(fps int) error

	// SetQuality dynamically adjusts capture quality
	SetQuality(quality int) error
}

// CaptureStats contains statistics about the capture process
type CaptureStats struct {
	FramesCaptured  uint64        // Total frames captured
	FramesDropped   uint64        // Frames dropped due to buffer full
	BytesCaptured   uint64        // Total bytes captured
	AverageFrameSize uint64       // Average frame size in bytes
	AverageFPS      float64       // Average frames per second
	CurrentFPS      float64       // Current frames per second
	Uptime          time.Duration // Total capture uptime
	LastFrameTime   time.Time     // Timestamp of last frame
	Errors          uint64        // Total errors encountered
}

// AudioCapture defines the interface for audio capture services
type AudioCapture interface {
	// Start begins capturing audio from the device
	Start(ctx context.Context, options AudioOptions) error

	// Stop stops capturing audio
	Stop() error

	// GetAudioChannel returns a channel for receiving audio samples
	GetAudioChannel() <-chan *AudioFrame

	// GetStats returns audio capture statistics
	GetStats() AudioStats

	// IsRunning returns true if capture is active
	IsRunning() bool

	// SetSampleRate dynamically adjusts the sample rate
	SetSampleRate(rate int) error
}

// AudioFrame represents a captured audio frame
type AudioFrame struct {
	Data       []byte    // Raw audio data (PCM)
	SampleRate int       // Sample rate in Hz
	Channels   int       // Number of audio channels
	Timestamp  time.Time // Capture timestamp
	Duration   time.Duration
}

// AudioOptions contains options for audio capture
type AudioOptions struct {
	DeviceID   string // Device identifier
	SampleRate int    // Sample rate in Hz (default 48000)
	Channels   int    // Number of channels (1=mono, 2=stereo)
	BitDepth   int    // Bit depth (8, 16, 24, 32)
	BufferSize int    // Audio buffer size
}

// AudioStats contains statistics about the audio capture process
type AudioStats struct {
	SamplesCaptured uint64        // Total samples captured
	SamplesDropped  uint64        // Samples dropped
	BytesCaptured   uint64        // Total bytes captured
	Uptime          time.Duration // Total capture uptime
	LastSampleTime  time.Time     // Timestamp of last sample
	Errors          uint64        // Total errors encountered
}
