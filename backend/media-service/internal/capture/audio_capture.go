package capture

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sirupsen/logrus"
)

// AndroidAudioCapture implements AudioCapture for Android devices via ADB
type AndroidAudioCapture struct {
	deviceID      string
	adbPath       string
	options       AudioOptions
	audioChannel  chan *AudioFrame
	running       atomic.Bool
	cancel        context.CancelFunc
	mu            sync.RWMutex
	stats         AudioStats
	logger        *logrus.Logger
	cmd           *exec.Cmd
	sampleSize    int // bytes per sample
}

// NewAndroidAudioCapture creates a new Android audio capture service
func NewAndroidAudioCapture(adbPath string, logger *logrus.Logger) AudioCapture {
	if logger == nil {
		logger = logrus.New()
	}

	return &AndroidAudioCapture{
		adbPath:      adbPath,
		logger:       logger,
		audioChannel: make(chan *AudioFrame, 10),
	}
}

// Start begins capturing audio from the device
func (c *AndroidAudioCapture) Start(ctx context.Context, options AudioOptions) error {
	if c.running.Load() {
		return fmt.Errorf("audio capture already running")
	}

	// Validate options
	if options.DeviceID == "" {
		return fmt.Errorf("device ID is required")
	}
	if options.SampleRate <= 0 {
		options.SampleRate = 48000 // Default 48kHz
	}
	if options.Channels <= 0 {
		options.Channels = 2 // Default stereo
	}
	if options.BitDepth <= 0 {
		options.BitDepth = 16 // Default 16-bit
	}
	if options.BufferSize <= 0 {
		options.BufferSize = 10
	}

	c.mu.Lock()
	c.options = options
	c.deviceID = options.DeviceID
	c.audioChannel = make(chan *AudioFrame, options.BufferSize)
	c.sampleSize = (options.BitDepth / 8) * options.Channels
	c.stats = AudioStats{} // Reset stats
	c.mu.Unlock()

	// Create cancellable context
	captureCtx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	c.running.Store(true)

	// Start audio capture using audiorecord
	// Format: audiorecord [options] <filename>
	// We use '-' for stdout streaming
	c.cmd = exec.CommandContext(captureCtx, c.adbPath, "-s", options.DeviceID,
		"shell", "audiorecord",
		"-s", fmt.Sprintf("%d", options.SampleRate),
		"-c", fmt.Sprintf("%d", options.Channels),
		"-b", fmt.Sprintf("%d", options.BitDepth),
		"-")

	stdout, err := c.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start audiorecord: %w", err)
	}

	// Start reading audio stream
	go c.readAudioStream(captureCtx, stdout)

	c.logger.WithFields(logrus.Fields{
		"device_id":   options.DeviceID,
		"sample_rate": options.SampleRate,
		"channels":    options.Channels,
		"bit_depth":   options.BitDepth,
	}).Info("Audio capture started")

	return nil
}

// Stop stops capturing audio
func (c *AndroidAudioCapture) Stop() error {
	if !c.running.Load() {
		return fmt.Errorf("audio capture not running")
	}

	c.running.Store(false)
	if c.cancel != nil {
		c.cancel()
	}

	if c.cmd != nil && c.cmd.Process != nil {
		c.cmd.Process.Kill()
	}

	c.mu.Lock()
	if c.audioChannel != nil {
		close(c.audioChannel)
		c.audioChannel = nil
	}
	c.mu.Unlock()

	c.logger.WithFields(logrus.Fields{
		"device_id":        c.deviceID,
		"samples_captured": c.stats.SamplesCaptured,
		"uptime":           c.stats.Uptime,
	}).Info("Audio capture stopped")

	return nil
}

// GetAudioChannel returns a channel for receiving audio samples
func (c *AndroidAudioCapture) GetAudioChannel() <-chan *AudioFrame {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.audioChannel
}

// GetStats returns audio capture statistics
func (c *AndroidAudioCapture) GetStats() AudioStats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.stats
}

// IsRunning returns true if capture is active
func (c *AndroidAudioCapture) IsRunning() bool {
	return c.running.Load()
}

// SetSampleRate dynamically adjusts the sample rate
func (c *AndroidAudioCapture) SetSampleRate(rate int) error {
	// Cannot change sample rate without restarting capture
	return fmt.Errorf("sample rate adjustment requires restarting capture")
}

// readAudioStream reads PCM audio data from the stream
func (c *AndroidAudioCapture) readAudioStream(ctx context.Context, reader io.Reader) {
	// Calculate samples per frame (20ms of audio is typical)
	c.mu.RLock()
	sampleRate := c.options.SampleRate
	channels := c.options.Channels
	bitDepth := c.options.BitDepth
	c.mu.RUnlock()

	frameDuration := 20 * time.Millisecond
	samplesPerFrame := int(float64(sampleRate) * frameDuration.Seconds())
	bytesPerFrame := samplesPerFrame * (bitDepth / 8) * channels

	buffer := make([]byte, bytesPerFrame)
	startTime := time.Now()

	for {
		select {
		case <-ctx.Done():
			return
		default:
			n, err := io.ReadFull(reader, buffer)
			if err != nil {
				if err != io.EOF && err != io.ErrUnexpectedEOF {
					c.logger.WithError(err).Warn("Error reading audio stream")
					atomic.AddUint64(&c.stats.Errors, 1)
				}
				return
			}

			if n > 0 {
				// Create audio frame
				frame := &AudioFrame{
					Data:       make([]byte, n),
					SampleRate: sampleRate,
					Channels:   channels,
					Timestamp:  time.Now(),
					Duration:   frameDuration,
				}
				copy(frame.Data, buffer[:n])

				// Try to send frame
				select {
				case c.audioChannel <- frame:
					atomic.AddUint64(&c.stats.SamplesCaptured, uint64(n/c.sampleSize))
					atomic.AddUint64(&c.stats.BytesCaptured, uint64(n))
					c.stats.LastSampleTime = time.Now()
					c.stats.Uptime = time.Since(startTime)
				default:
					atomic.AddUint64(&c.stats.SamplesDropped, uint64(n/c.sampleSize))
					c.logger.Debug("Audio frame dropped: channel full")
				}
			}
		}
	}
}

// MockAudioCapture is a mock implementation for testing without a real device
type MockAudioCapture struct {
	audioChannel chan *AudioFrame
	running      atomic.Bool
	cancel       context.CancelFunc
	stats        AudioStats
	mu           sync.RWMutex
}

// NewMockAudioCapture creates a mock audio capture for testing
func NewMockAudioCapture() AudioCapture {
	return &MockAudioCapture{
		audioChannel: make(chan *AudioFrame, 10),
	}
}

// Start generates mock audio data
func (m *MockAudioCapture) Start(ctx context.Context, options AudioOptions) error {
	if m.running.Load() {
		return fmt.Errorf("mock capture already running")
	}

	captureCtx, cancel := context.WithCancel(ctx)
	m.cancel = cancel
	m.running.Store(true)

	go m.generateMockAudio(captureCtx, options)

	return nil
}

// Stop stops mock audio generation
func (m *MockAudioCapture) Stop() error {
	if !m.running.Load() {
		return fmt.Errorf("mock capture not running")
	}

	m.running.Store(false)
	if m.cancel != nil {
		m.cancel()
	}

	m.mu.Lock()
	close(m.audioChannel)
	m.mu.Unlock()

	return nil
}

// GetAudioChannel returns the audio channel
func (m *MockAudioCapture) GetAudioChannel() <-chan *AudioFrame {
	return m.audioChannel
}

// GetStats returns mock stats
func (m *MockAudioCapture) GetStats() AudioStats {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.stats
}

// IsRunning returns running status
func (m *MockAudioCapture) IsRunning() bool {
	return m.running.Load()
}

// SetSampleRate does nothing for mock
func (m *MockAudioCapture) SetSampleRate(rate int) error {
	return nil
}

// generateMockAudio generates sine wave audio data for testing
func (m *MockAudioCapture) generateMockAudio(ctx context.Context, options AudioOptions) {
	frameDuration := 20 * time.Millisecond
	ticker := time.NewTicker(frameDuration)
	defer ticker.Stop()

	samplesPerFrame := int(float64(options.SampleRate) * frameDuration.Seconds())
	bytesPerFrame := samplesPerFrame * (options.BitDepth / 8) * options.Channels

	phase := 0.0
	frequency := 440.0 // A4 note

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Generate sine wave PCM data
			data := make([]byte, bytesPerFrame)

			// Simple sine wave generation (16-bit PCM)
			if options.BitDepth == 16 {
				for i := 0; i < samplesPerFrame; i++ {
					sample := int16(32767.0 * 0.3 * // 30% volume
						(phase / (2.0 * 3.14159265359)))
					phase += 2.0 * 3.14159265359 * frequency / float64(options.SampleRate)
					if phase > 2.0*3.14159265359 {
						phase -= 2.0 * 3.14159265359
					}

					// Write sample to both channels if stereo
					for ch := 0; ch < options.Channels; ch++ {
						idx := (i*options.Channels + ch) * 2
						data[idx] = byte(sample & 0xFF)
						data[idx+1] = byte(sample >> 8)
					}
				}
			}

			frame := &AudioFrame{
				Data:       data,
				SampleRate: options.SampleRate,
				Channels:   options.Channels,
				Timestamp:  time.Now(),
				Duration:   frameDuration,
			}

			select {
			case m.audioChannel <- frame:
				atomic.AddUint64(&m.stats.SamplesCaptured, uint64(samplesPerFrame))
				atomic.AddUint64(&m.stats.BytesCaptured, uint64(len(data)))
			default:
				atomic.AddUint64(&m.stats.SamplesDropped, uint64(samplesPerFrame))
			}
		}
	}
}
