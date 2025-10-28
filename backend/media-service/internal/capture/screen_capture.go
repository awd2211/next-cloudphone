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

// AndroidScreenCapture implements ScreenCapture for Android devices via ADB
type AndroidScreenCapture struct {
	deviceID    string
	adbPath     string
	options     CaptureOptions
	frameChannel chan *Frame
	running     atomic.Bool
	cancel      context.CancelFunc
	mu          sync.RWMutex
	stats       CaptureStats
	logger      *logrus.Logger

	// Frame timing
	lastFrameTime time.Time
	frameInterval time.Duration
	fpsCounter    *fpsCounter
}

// fpsCounter tracks FPS statistics
type fpsCounter struct {
	mu            sync.Mutex
	frames        int
	lastReset     time.Time
	currentFPS    float64
	totalFrames   uint64
	totalDuration time.Duration
}

// NewAndroidScreenCapture creates a new Android screen capture service
func NewAndroidScreenCapture(adbPath string, logger *logrus.Logger) ScreenCapture {
	if logger == nil {
		logger = logrus.New()
	}

	return &AndroidScreenCapture{
		adbPath:      adbPath,
		logger:       logger,
		frameChannel: make(chan *Frame, 10), // Buffered channel
		fpsCounter: &fpsCounter{
			lastReset: time.Now(),
		},
	}
}

// Start begins capturing frames from the device
func (c *AndroidScreenCapture) Start(ctx context.Context, options CaptureOptions) error {
	if c.running.Load() {
		return fmt.Errorf("capture already running")
	}

	// Validate options
	if options.DeviceID == "" {
		return fmt.Errorf("device ID is required")
	}
	if options.FrameRate <= 0 {
		options.FrameRate = 30 // Default 30 fps
	}
	if options.BufferSize <= 0 {
		options.BufferSize = 10
	}

	c.mu.Lock()
	c.options = options
	c.deviceID = options.DeviceID
	c.frameInterval = time.Second / time.Duration(options.FrameRate)
	c.stats = CaptureStats{} // Reset stats
	c.frameChannel = make(chan *Frame, options.BufferSize)
	c.mu.Unlock()

	// Create cancellable context
	captureCtx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	c.running.Store(true)
	c.stats.LastFrameTime = time.Now()

	// Start capture goroutine
	go c.captureLoop(captureCtx)

	c.logger.WithFields(logrus.Fields{
		"device_id":  options.DeviceID,
		"frame_rate": options.FrameRate,
		"format":     options.Format,
	}).Info("Screen capture started")

	return nil
}

// Stop stops capturing frames
func (c *AndroidScreenCapture) Stop() error {
	if !c.running.Load() {
		return fmt.Errorf("capture not running")
	}

	c.running.Store(false)
	if c.cancel != nil {
		c.cancel()
	}

	c.mu.Lock()
	if c.frameChannel != nil {
		close(c.frameChannel)
		c.frameChannel = nil
	}
	c.mu.Unlock()

	c.logger.WithFields(logrus.Fields{
		"device_id":       c.deviceID,
		"frames_captured": c.stats.FramesCaptured,
		"uptime":          time.Since(c.stats.LastFrameTime),
	}).Info("Screen capture stopped")

	return nil
}

// GetFrameChannel returns a channel for receiving captured frames
func (c *AndroidScreenCapture) GetFrameChannel() <-chan *Frame {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.frameChannel
}

// GetStats returns capture statistics
func (c *AndroidScreenCapture) GetStats() CaptureStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	stats := c.stats
	stats.CurrentFPS = c.fpsCounter.getCurrentFPS()
	stats.AverageFPS = c.fpsCounter.getAverageFPS()

	if stats.FramesCaptured > 0 {
		stats.AverageFrameSize = stats.BytesCaptured / stats.FramesCaptured
	}

	return stats
}

// IsRunning returns true if capture is active
func (c *AndroidScreenCapture) IsRunning() bool {
	return c.running.Load()
}

// SetFrameRate dynamically adjusts the frame rate
func (c *AndroidScreenCapture) SetFrameRate(fps int) error {
	if fps <= 0 || fps > 60 {
		return fmt.Errorf("invalid frame rate: %d (must be 1-60)", fps)
	}

	c.mu.Lock()
	c.options.FrameRate = fps
	c.frameInterval = time.Second / time.Duration(fps)
	c.mu.Unlock()

	c.logger.WithField("new_fps", fps).Info("Frame rate adjusted")
	return nil
}

// SetQuality dynamically adjusts capture quality
func (c *AndroidScreenCapture) SetQuality(quality int) error {
	if quality < 0 || quality > 100 {
		return fmt.Errorf("invalid quality: %d (must be 0-100)", quality)
	}

	c.mu.Lock()
	c.options.Quality = quality
	c.mu.Unlock()

	c.logger.WithField("new_quality", quality).Info("Capture quality adjusted")
	return nil
}

// captureLoop is the main capture loop
func (c *AndroidScreenCapture) captureLoop(ctx context.Context) {
	ticker := time.NewTicker(c.frameInterval)
	defer ticker.Stop()

	startTime := time.Now()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Capture loop stopped by context")
			return
		case <-ticker.C:
			if !c.running.Load() {
				return
			}

			// Capture frame
			frame, err := c.captureFrame()
			if err != nil {
				c.logger.WithError(err).Warn("Failed to capture frame")
				atomic.AddUint64(&c.stats.Errors, 1)
				continue
			}

			// Update FPS counter
			c.fpsCounter.increment()

			// Try to send frame to channel (non-blocking)
			select {
			case c.frameChannel <- frame:
				atomic.AddUint64(&c.stats.FramesCaptured, 1)
				atomic.AddUint64(&c.stats.BytesCaptured, uint64(len(frame.Data)))
				c.stats.LastFrameTime = time.Now()
				c.stats.Uptime = time.Since(startTime)
			default:
				// Channel full, drop frame
				atomic.AddUint64(&c.stats.FramesDropped, 1)
				c.logger.Debug("Frame dropped: channel full")
			}
		}
	}
}

// captureFrame captures a single frame from the device
func (c *AndroidScreenCapture) captureFrame() (*Frame, error) {
	c.mu.RLock()
	format := c.options.Format
	deviceID := c.deviceID
	c.mu.RUnlock()

	var cmd *exec.Cmd

	switch format {
	case FrameFormatPNG:
		// Capture as PNG (higher quality, larger size)
		cmd = exec.Command(c.adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	case FrameFormatJPEG:
		// Capture as JPEG (lower quality, smaller size)
		// Note: ADB screencap doesn't directly support JPEG, so we use PNG and will convert if needed
		cmd = exec.Command(c.adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	default:
		// Default to PNG
		cmd = exec.Command(c.adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	}

	// Execute command and read output
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to execute screencap: %w", err)
	}

	if len(output) == 0 {
		return nil, fmt.Errorf("empty frame data")
	}

	// Create frame
	frame := &Frame{
		Data:      output,
		Timestamp: time.Now(),
		Format:    FrameFormatPNG, // ADB screencap outputs PNG
		Duration:  c.frameInterval,
	}

	// Parse PNG dimensions (simple check)
	if len(output) > 24 {
		// PNG signature: 89 50 4E 47 0D 0A 1A 0A
		// IHDR chunk contains width and height
		// This is a simplified approach - a proper PNG parser would be better
		frame.Width = int(output[16])<<24 | int(output[17])<<16 | int(output[18])<<8 | int(output[19])
		frame.Height = int(output[20])<<24 | int(output[21])<<16 | int(output[22])<<8 | int(output[23])
	}

	return frame, nil
}

// fpsCounter methods

func (f *fpsCounter) increment() {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.frames++
	f.totalFrames++

	now := time.Now()
	elapsed := now.Sub(f.lastReset)

	// Update current FPS every second
	if elapsed >= time.Second {
		f.currentFPS = float64(f.frames) / elapsed.Seconds()
		f.totalDuration += elapsed
		f.frames = 0
		f.lastReset = now
	}
}

func (f *fpsCounter) getCurrentFPS() float64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.currentFPS
}

func (f *fpsCounter) getAverageFPS() float64 {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.totalDuration == 0 {
		return 0
	}
	return float64(f.totalFrames) / f.totalDuration.Seconds()
}

// AndroidScreenRecordCapture implements ScreenCapture using screenrecord (H.264 encoding)
type AndroidScreenRecordCapture struct {
	deviceID     string
	adbPath      string
	options      CaptureOptions
	frameChannel chan *Frame
	running      atomic.Bool
	cancel       context.CancelFunc
	mu           sync.RWMutex
	stats        CaptureStats
	logger       *logrus.Logger
	cmd          *exec.Cmd
}

// NewAndroidScreenRecordCapture creates a screen capture service using screenrecord
func NewAndroidScreenRecordCapture(adbPath string, logger *logrus.Logger) ScreenCapture {
	if logger == nil {
		logger = logrus.New()
	}

	return &AndroidScreenRecordCapture{
		adbPath:      adbPath,
		logger:       logger,
		frameChannel: make(chan *Frame, 10),
	}
}

// Start begins capturing using screenrecord
func (c *AndroidScreenRecordCapture) Start(ctx context.Context, options CaptureOptions) error {
	if c.running.Load() {
		return fmt.Errorf("capture already running")
	}

	if options.DeviceID == "" {
		return fmt.Errorf("device ID is required")
	}

	c.mu.Lock()
	c.options = options
	c.deviceID = options.DeviceID
	c.frameChannel = make(chan *Frame, options.BufferSize)
	c.mu.Unlock()

	captureCtx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	c.running.Store(true)

	// Start screenrecord with streaming to stdout
	// screenrecord --output-format=h264 - streams raw H.264 to stdout
	c.cmd = exec.CommandContext(captureCtx, c.adbPath, "-s", options.DeviceID,
		"shell", "screenrecord", "--output-format=h264", "--bit-rate", "2000000", "-")

	stdout, err := c.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start screenrecord: %w", err)
	}

	// Start reading H.264 stream
	go c.readH264Stream(captureCtx, stdout)

	c.logger.WithFields(logrus.Fields{
		"device_id": options.DeviceID,
		"format":    "h264",
	}).Info("Screen record capture started")

	return nil
}

// Stop stops the screenrecord capture
func (c *AndroidScreenRecordCapture) Stop() error {
	if !c.running.Load() {
		return fmt.Errorf("capture not running")
	}

	c.running.Store(false)
	if c.cancel != nil {
		c.cancel()
	}

	if c.cmd != nil && c.cmd.Process != nil {
		c.cmd.Process.Kill()
	}

	c.mu.Lock()
	if c.frameChannel != nil {
		close(c.frameChannel)
		c.frameChannel = nil
	}
	c.mu.Unlock()

	c.logger.Info("Screen record capture stopped")
	return nil
}

// GetFrameChannel returns the frame channel
func (c *AndroidScreenRecordCapture) GetFrameChannel() <-chan *Frame {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.frameChannel
}

// GetStats returns capture statistics
func (c *AndroidScreenRecordCapture) GetStats() CaptureStats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.stats
}

// IsRunning returns true if capture is active
func (c *AndroidScreenRecordCapture) IsRunning() bool {
	return c.running.Load()
}

// SetFrameRate adjusts frame rate (not supported for screenrecord)
func (c *AndroidScreenRecordCapture) SetFrameRate(fps int) error {
	return fmt.Errorf("frame rate adjustment not supported for screenrecord")
}

// SetQuality adjusts quality (not supported for screenrecord)
func (c *AndroidScreenRecordCapture) SetQuality(quality int) error {
	return fmt.Errorf("quality adjustment not supported for screenrecord")
}

// readH264Stream reads H.264 NAL units from the stream
func (c *AndroidScreenRecordCapture) readH264Stream(ctx context.Context, reader io.Reader) {
	buffer := make([]byte, 65536) // 64KB buffer

	for {
		select {
		case <-ctx.Done():
			return
		default:
			n, err := reader.Read(buffer)
			if err != nil {
				if err != io.EOF {
					c.logger.WithError(err).Warn("Error reading H.264 stream")
					atomic.AddUint64(&c.stats.Errors, 1)
				}
				return
			}

			if n > 0 {
				// Create frame with H.264 data
				frame := &Frame{
					Data:      make([]byte, n),
					Timestamp: time.Now(),
					Format:    FrameFormatH264,
				}
				copy(frame.Data, buffer[:n])

				// Try to send frame
				select {
				case c.frameChannel <- frame:
					atomic.AddUint64(&c.stats.FramesCaptured, 1)
					atomic.AddUint64(&c.stats.BytesCaptured, uint64(n))
					c.stats.LastFrameTime = time.Now()
				default:
					atomic.AddUint64(&c.stats.FramesDropped, 1)
				}
			}
		}
	}
}
