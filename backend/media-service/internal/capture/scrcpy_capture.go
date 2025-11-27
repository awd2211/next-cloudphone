package capture

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"os/exec"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sirupsen/logrus"
)

// ScrcpyCapture implements ScreenCapture using scrcpy-server for high-performance H.264 capture
// scrcpy-server uses MediaProjection API + hardware H.264 encoding on the device,
// achieving 30-60 FPS with minimal latency over WiFi ADB
//
// IMPORTANT: scrcpy v3.x with tunnel_forward=true requires TWO socket connections:
// 1. First socket: receives dummy byte (0x00), then receives video stream
// 2. Second socket: connection triggers video encoding to start
// Without the second connection, the server only sends dummy byte and waits indefinitely.
type ScrcpyCapture struct {
	deviceID       string
	adbPath        string
	scrcpyServer   string // Path to scrcpy-server.jar
	options        CaptureOptions
	frameChannel   chan *Frame
	running        atomic.Bool
	cancel         context.CancelFunc
	ctx            context.Context // Root context for reconnection
	mu             sync.RWMutex
	stats          CaptureStats
	logger         *logrus.Logger

	// scrcpy specific
	videoConn     net.Conn // Primary connection for video stream
	triggerConn   net.Conn // Second connection to trigger video encoding
	controlConn   net.Conn // Control connection for dynamic commands (bitrate, IDR, etc.)
	controlMu     sync.Mutex // Mutex for control socket writes
	localPort     int
	width         int
	height        int
	deviceName    string
	sps           []byte // H.264 SPS NAL unit
	pps           []byte // H.264 PPS NAL unit
	fpsCounter    *fpsCounter
	rawStreamMode bool   // When true, receives pure H.264 NAL without scrcpy frame headers
	scrcpyOpts    ScrcpyOptions // Cached options for reconnection

	// Adaptive bitrate control
	currentBitrate int32  // Current bitrate in bps (atomic)
	bitrateChanges uint64 // Number of bitrate adjustments (atomic)

	// Auto-reconnection
	reconnectEnabled  bool          // Whether auto-reconnect is enabled
	reconnecting      atomic.Bool   // Whether currently reconnecting
	reconnectAttempts uint32        // Current reconnect attempt count
	maxReconnects     uint32        // Maximum reconnection attempts (0 = unlimited)
	reconnectDelay    time.Duration // Base delay between reconnects (with exponential backoff)
	onReconnect       func(success bool, attempt uint32) // Optional callback on reconnection attempts
}

// scrcpy control message types (v2.x+ protocol)
// Reference: https://github.com/Genymobile/scrcpy/blob/master/server/src/main/java/com/genymobile/scrcpy/control/ControlMessage.java
const (
	scrcpyControlInjectKeycode        = 0x00
	scrcpyControlInjectText           = 0x01
	scrcpyControlInjectTouchEvent     = 0x02
	scrcpyControlInjectScrollEvent    = 0x03
	scrcpyControlBackOrScreenOn       = 0x04
	scrcpyControlExpandNotificationPanel = 0x05
	scrcpyControlExpandSettingsPanel  = 0x06
	scrcpyControlCollapsePanel        = 0x07
	scrcpyControlGetClipboard         = 0x08
	scrcpyControlSetClipboard         = 0x09
	scrcpyControlSetScreenPowerMode   = 0x0A
	scrcpyControlRotateDevice         = 0x0B
	scrcpyControlUhidCreate           = 0x0C
	scrcpyControlSetVideoBitRate      = 0x0D // Dynamic bitrate adjustment
	scrcpyControlRequestKeyframe      = 0x0E // Request IDR frame (scrcpy v2.6+)
)

// ScrcpyOptions contains scrcpy-specific options
type ScrcpyOptions struct {
	MaxSize       int  // Max dimension (width or height), 0 = native
	BitRate       int  // Target bitrate in bps (default 8Mbps)
	MaxFPS        int  // Max frame rate (default 30)
	LocalPort     int  // Local port for ADB forward (default 27183)
	RawStreamMode bool // When true, use raw H.264 stream without scrcpy frame headers
}

// DefaultScrcpyOptions returns default scrcpy options optimized for WiFi ADB
func DefaultScrcpyOptions() ScrcpyOptions {
	return ScrcpyOptions{
		MaxSize:       720,      // 720p for good balance between quality and bandwidth
		BitRate:       4000000,  // 4 Mbps (reduced for WiFi stability)
		MaxFPS:        30,       // 30 FPS
		LocalPort:     27183,    // Default scrcpy port
		RawStreamMode: false,    // Use standard protocol mode with frame headers for keyframe detection
	}
}

// NewScrcpyCapture creates a new scrcpy-based screen capture service
func NewScrcpyCapture(adbPath string, scrcpyServer string, logger *logrus.Logger) ScreenCapture {
	if logger == nil {
		logger = logrus.New()
	}

	// Default scrcpy-server path
	if scrcpyServer == "" {
		scrcpyServer = filepath.Join(filepath.Dir(adbPath), "scrcpy-server")
	}

	return &ScrcpyCapture{
		adbPath:      adbPath,
		scrcpyServer: scrcpyServer,
		logger:       logger,
		frameChannel: make(chan *Frame, 30), // Larger buffer for H.264 frames
		fpsCounter: &fpsCounter{
			lastReset: time.Now(),
		},
	}
}

// Start begins capturing frames using scrcpy-server
func (c *ScrcpyCapture) Start(ctx context.Context, options CaptureOptions) error {
	if c.running.Load() {
		return fmt.Errorf("capture already running")
	}

	if options.DeviceID == "" {
		return fmt.Errorf("device ID is required")
	}

	// Parse scrcpy-specific options
	scrcpyOpts := DefaultScrcpyOptions()
	if options.Width > 0 {
		scrcpyOpts.MaxSize = options.Width
	}
	if options.FrameRate > 0 {
		scrcpyOpts.MaxFPS = options.FrameRate
	}

	c.mu.Lock()
	c.options = options
	c.deviceID = options.DeviceID
	c.localPort = scrcpyOpts.LocalPort
	c.scrcpyOpts = scrcpyOpts // Cache for reconnection
	c.stats = CaptureStats{}
	c.frameChannel = make(chan *Frame, options.BufferSize)
	if options.BufferSize <= 0 {
		c.frameChannel = make(chan *Frame, 30)
	}
	// Set default reconnect parameters if not configured
	if c.reconnectDelay == 0 {
		c.reconnectDelay = 2 * time.Second
	}
	if c.maxReconnects == 0 {
		c.maxReconnects = 5 // Default: max 5 reconnection attempts
	}
	c.reconnectEnabled = true // Enable auto-reconnect by default
	c.mu.Unlock()

	// Create cancellable context
	captureCtx, cancel := context.WithCancel(ctx)
	c.cancel = cancel
	c.ctx = ctx // Save root context for reconnection

	// Step 1: Push scrcpy-server to device (if not already there)
	if err := c.pushScrcpyServer(); err != nil {
		return fmt.Errorf("failed to push scrcpy-server: %w", err)
	}

	// Step 2: Setup ADB forward
	if err := c.setupADBForward(); err != nil {
		return fmt.Errorf("failed to setup ADB forward: %w", err)
	}

	// Step 3: Start scrcpy-server on device
	if err := c.startScrcpyServer(captureCtx, scrcpyOpts); err != nil {
		c.cleanupADBForward()
		return fmt.Errorf("failed to start scrcpy-server: %w", err)
	}

	// Step 4: Connect to scrcpy-server
	if err := c.connectToServer(); err != nil {
		c.cleanupADBForward()
		return fmt.Errorf("failed to connect to scrcpy-server: %w", err)
	}

	c.running.Store(true)
	c.stats.LastFrameTime = time.Now()

	// Step 5: Start reading H.264 stream (with reconnection support)
	go c.readH264StreamWithReconnect(captureCtx)

	c.logger.WithFields(logrus.Fields{
		"device_id":        options.DeviceID,
		"max_size":         scrcpyOpts.MaxSize,
		"bitrate":          scrcpyOpts.BitRate,
		"max_fps":          scrcpyOpts.MaxFPS,
		"device_name":      c.deviceName,
		"resolution":       fmt.Sprintf("%dx%d", c.width, c.height),
		"auto_reconnect":   c.reconnectEnabled,
		"max_reconnects":   c.maxReconnects,
	}).Info("Scrcpy capture started")

	return nil
}

// Stop stops the scrcpy capture
func (c *ScrcpyCapture) Stop() error {
	if !c.running.Load() {
		return fmt.Errorf("capture not running")
	}

	c.running.Store(false)
	if c.cancel != nil {
		c.cancel()
	}

	// Close connections (video, trigger, and control sockets)
	if c.videoConn != nil {
		c.videoConn.Close()
		c.videoConn = nil
	}
	if c.triggerConn != nil {
		c.triggerConn.Close()
		c.triggerConn = nil
	}
	if c.controlConn != nil {
		c.controlConn.Close()
		c.controlConn = nil
	}

	// Cleanup ADB forward
	c.cleanupADBForward()

	c.mu.Lock()
	if c.frameChannel != nil {
		close(c.frameChannel)
		c.frameChannel = nil
	}
	c.mu.Unlock()

	c.logger.WithFields(logrus.Fields{
		"device_id":       c.deviceID,
		"frames_captured": c.stats.FramesCaptured,
		"bytes_captured":  c.stats.BytesCaptured,
	}).Info("Scrcpy capture stopped")

	return nil
}

// GetFrameChannel returns the frame channel
func (c *ScrcpyCapture) GetFrameChannel() <-chan *Frame {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.frameChannel
}

// GetStats returns capture statistics
func (c *ScrcpyCapture) GetStats() CaptureStats {
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
func (c *ScrcpyCapture) IsRunning() bool {
	return c.running.Load()
}

// SetFrameRate is not supported for scrcpy (requires restart)
func (c *ScrcpyCapture) SetFrameRate(fps int) error {
	return fmt.Errorf("dynamic frame rate adjustment not supported for scrcpy, restart capture with new options")
}

// SetQuality maps quality (0-100) to bitrate and calls SetBitrate
// Quality mapping:
//   - 0-25:   500 Kbps (Low)
//   - 26-50:  1 Mbps (Medium)
//   - 51-75:  2 Mbps (High)
//   - 76-100: 4 Mbps (Ultra)
func (c *ScrcpyCapture) SetQuality(quality int) error {
	if quality < 0 {
		quality = 0
	}
	if quality > 100 {
		quality = 100
	}

	var bitrate int
	switch {
	case quality <= 25:
		bitrate = 500000 // 500 Kbps
	case quality <= 50:
		bitrate = 1000000 // 1 Mbps
	case quality <= 75:
		bitrate = 2000000 // 2 Mbps
	default:
		bitrate = 4000000 // 4 Mbps
	}

	return c.SetBitrate(bitrate)
}

// SetBitrate dynamically adjusts the video bitrate via scrcpy control socket
// This sends SET_VIDEO_BITRATE (0x0D) command to scrcpy-server
// Requires scrcpy v2.x+ with control socket enabled
func (c *ScrcpyCapture) SetBitrate(bitrate int) error {
	if !c.running.Load() {
		return fmt.Errorf("capture not running")
	}

	if bitrate < 100000 {
		bitrate = 100000 // Minimum 100 Kbps
	}
	if bitrate > 20000000 {
		bitrate = 20000000 // Maximum 20 Mbps
	}

	c.controlMu.Lock()
	defer c.controlMu.Unlock()

	if c.controlConn == nil {
		return fmt.Errorf("control socket not connected")
	}

	// SET_VIDEO_BITRATE message format:
	// [type(1 byte)] + [bitrate(4 bytes, big-endian)]
	msg := make([]byte, 5)
	msg[0] = scrcpyControlSetVideoBitRate
	binary.BigEndian.PutUint32(msg[1:5], uint32(bitrate))

	// Set write deadline
	c.controlConn.SetWriteDeadline(time.Now().Add(2 * time.Second))
	defer c.controlConn.SetWriteDeadline(time.Time{})

	if _, err := c.controlConn.Write(msg); err != nil {
		return fmt.Errorf("failed to send SET_VIDEO_BITRATE: %w", err)
	}

	// Update tracking
	oldBitrate := atomic.SwapInt32(&c.currentBitrate, int32(bitrate))
	atomic.AddUint64(&c.bitrateChanges, 1)

	c.logger.WithFields(logrus.Fields{
		"old_bitrate": oldBitrate,
		"new_bitrate": bitrate,
		"device_id":   c.deviceID,
	}).Info("Bitrate adjusted via control socket")

	return nil
}

// RequestKeyframe requests an IDR frame from scrcpy-server
// This sends REQUEST_KEYFRAME (0x0E) command
// Requires scrcpy v2.6+
func (c *ScrcpyCapture) RequestKeyframe() error {
	if !c.running.Load() {
		return fmt.Errorf("capture not running")
	}

	c.controlMu.Lock()
	defer c.controlMu.Unlock()

	if c.controlConn == nil {
		return fmt.Errorf("control socket not connected")
	}

	// REQUEST_KEYFRAME message: just the type byte
	msg := []byte{scrcpyControlRequestKeyframe}

	c.controlConn.SetWriteDeadline(time.Now().Add(2 * time.Second))
	defer c.controlConn.SetWriteDeadline(time.Time{})

	if _, err := c.controlConn.Write(msg); err != nil {
		return fmt.Errorf("failed to send REQUEST_KEYFRAME: %w", err)
	}

	c.logger.WithField("device_id", c.deviceID).Debug("Keyframe requested via control socket")

	return nil
}

// GetCurrentBitrate returns the current bitrate setting
func (c *ScrcpyCapture) GetCurrentBitrate() int {
	return int(atomic.LoadInt32(&c.currentBitrate))
}

// GetBitrateChanges returns the number of bitrate adjustments
func (c *ScrcpyCapture) GetBitrateChanges() uint64 {
	return atomic.LoadUint64(&c.bitrateChanges)
}

// GetResolution returns the current capture resolution
func (c *ScrcpyCapture) GetResolution() (width, height int) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.width, c.height
}

// GetSPSPPS returns the H.264 SPS and PPS NAL units (needed for WebRTC)
func (c *ScrcpyCapture) GetSPSPPS() (sps, pps []byte) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.sps, c.pps
}

// pushScrcpyServer pushes the scrcpy-server.jar to the device
func (c *ScrcpyCapture) pushScrcpyServer() error {
	// Check if scrcpy-server exists locally
	cmd := exec.Command(c.adbPath, "-s", c.deviceID, "push", c.scrcpyServer, "/data/local/tmp/scrcpy-server.jar")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("adb push failed: %w, output: %s", err, string(output))
	}
	c.logger.Debug("Scrcpy-server pushed to device")
	return nil
}

// setupADBForward sets up ADB port forwarding for scrcpy
func (c *ScrcpyCapture) setupADBForward() error {
	// Remove existing forward first
	exec.Command(c.adbPath, "-s", c.deviceID, "forward", "--remove-all").Run()

	// Setup new forward
	cmd := exec.Command(c.adbPath, "-s", c.deviceID, "forward",
		fmt.Sprintf("tcp:%d", c.localPort), "localabstract:scrcpy")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("adb forward failed: %w, output: %s", err, string(output))
	}
	c.logger.WithField("port", c.localPort).Debug("ADB forward established")
	return nil
}

// cleanupADBForward removes ADB port forwarding
func (c *ScrcpyCapture) cleanupADBForward() {
	exec.Command(c.adbPath, "-s", c.deviceID, "forward", "--remove",
		fmt.Sprintf("tcp:%d", c.localPort)).Run()
}

// startScrcpyServer starts the scrcpy-server on the device
func (c *ScrcpyCapture) startScrcpyServer(ctx context.Context, opts ScrcpyOptions) error {
	// Build scrcpy-server command
	// scrcpy v3.x uses key=value argument format
	//
	// Key parameters for raw stream mode (no headers):
	// - send_device_meta=false: Don't send 64-byte device name header
	// - send_frame_meta=false: Don't send 12-byte frame headers (PTS + size)
	// - send_codec_meta=false: Don't send codec/resolution metadata
	// - send_dummy_byte=true: Still send dummy byte for connection sync
	//
	// With these options, we receive pure H.264 NAL units directly

	var serverParams string
	if opts.RawStreamMode {
		// Raw stream mode: pure H.264 NAL units without scrcpy headers
		serverParams = fmt.Sprintf(
			"CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server 3.3.3 "+
				"tunnel_forward=true "+
				"video=true "+
				"audio=false "+
				"control=false "+
				"video_codec=h264 "+
				"video_bit_rate=%d "+
				"max_size=%d "+
				"max_fps=%d "+
				"send_device_meta=false "+
				"send_frame_meta=false "+
				"send_codec_meta=false "+
				"send_dummy_byte=true "+
				"cleanup=false "+
				"power_off_on_close=false",
			opts.BitRate, opts.MaxSize, opts.MaxFPS)
		c.rawStreamMode = true
	} else {
		// Standard mode: with scrcpy protocol headers (77-byte header + 12-byte frame headers)
		serverParams = fmt.Sprintf(
			"CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server 3.3.3 "+
				"tunnel_forward=true "+
				"video=true "+
				"audio=false "+
				"control=false "+
				"video_codec=h264 "+
				"video_bit_rate=%d "+
				"max_size=%d "+
				"max_fps=%d "+
				"cleanup=false "+
				"power_off_on_close=false",
			opts.BitRate, opts.MaxSize, opts.MaxFPS)
		c.rawStreamMode = false
	}

	args := []string{"-s", c.deviceID, "shell", serverParams}

	cmd := exec.CommandContext(ctx, c.adbPath, args...)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start scrcpy-server: %w", err)
	}

	// Give scrcpy-server time to initialize
	time.Sleep(2 * time.Second)

	c.logger.WithFields(logrus.Fields{
		"max_size":        opts.MaxSize,
		"bitrate":         opts.BitRate,
		"max_fps":         opts.MaxFPS,
		"raw_stream_mode": c.rawStreamMode,
	}).Debug("Scrcpy-server started")

	return nil
}

// connectToServer connects to the scrcpy-server using dual-socket protocol
//
// CRITICAL: scrcpy v3.x with tunnel_forward=true requires TWO socket connections:
// 1. First socket (videoConn): receives dummy byte (0x00), then receives video stream
// 2. Second socket (triggerConn): connection triggers video encoding to start
//
// Without the second connection, the server only sends dummy byte and waits indefinitely.
// This is documented in: https://github.com/Genymobile/scrcpy/blob/master/doc/tunnels.md
func (c *ScrcpyCapture) connectToServer() error {
	var err error
	serverAddr := fmt.Sprintf("localhost:%d", c.localPort)

	// Step 1: Establish first connection (video stream socket)
	c.videoConn, err = net.DialTimeout("tcp", serverAddr, 5*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect video socket: %w", err)
	}

	c.logger.Debug("Video socket connected, waiting for dummy byte")

	// Step 2: Read dummy byte (0x00) from first connection
	c.videoConn.SetReadDeadline(time.Now().Add(5 * time.Second))
	dummyByte := make([]byte, 1)
	if _, err := io.ReadFull(c.videoConn, dummyByte); err != nil {
		c.videoConn.Close()
		return fmt.Errorf("failed to read dummy byte: %w", err)
	}

	c.logger.WithField("dummy_byte", fmt.Sprintf("0x%02x", dummyByte[0])).Debug("Received dummy byte")

	// Step 3: Establish second connection to trigger video encoding
	c.triggerConn, err = net.DialTimeout("tcp", serverAddr, 3*time.Second)
	if err != nil {
		// Second connection might fail if server already started encoding
		// This is not necessarily fatal in some scrcpy versions
		c.logger.WithError(err).Warn("Second connection failed (may be OK if server already streaming)")
	} else {
		c.logger.Debug("Trigger socket connected - video encoding should start")
	}

	// Step 4: Read metadata based on mode
	c.videoConn.SetReadDeadline(time.Now().Add(10 * time.Second))

	if c.rawStreamMode {
		// Raw stream mode: no headers, pure H.264 NAL units
		// We need to read initial data to extract SPS/PPS for resolution
		c.logger.Debug("Raw stream mode: waiting for H.264 NAL units")

		// Read initial buffer to find SPS/PPS
		initBuf := make([]byte, 4096)
		n, err := io.ReadAtLeast(c.videoConn, initBuf, 100)
		if err != nil {
			c.videoConn.Close()
			if c.triggerConn != nil {
				c.triggerConn.Close()
			}
			return fmt.Errorf("failed to read initial H.264 data: %w (got %d bytes)", err, n)
		}

		c.logger.WithField("bytes", n).Debug("Received initial H.264 data")

		// Extract SPS/PPS and resolution from raw H.264 data
		if err := c.parseRawH264Init(initBuf[:n]); err != nil {
			c.logger.WithError(err).Warn("Failed to parse H.264 init data, using defaults")
			// Use default resolution
			c.width = 720
			c.height = 1280
		}

		c.deviceName = "scrcpy-raw"

	} else {
		// Standard mode: read 76-byte scrcpy v3.x header
		// Header format (76 bytes total):
		// - 64 bytes: device name (null-terminated, first byte may be device name start)
		// - 4 bytes: codec string ("h264", "h265", "av01")
		// - 4 bytes: width (big-endian)
		// - 4 bytes: height (big-endian)

		header := make([]byte, 76)
		if _, err := io.ReadFull(c.videoConn, header); err != nil {
			c.videoConn.Close()
			if c.triggerConn != nil {
				c.triggerConn.Close()
			}
			return fmt.Errorf("failed to read scrcpy header: %w", err)
		}

		// Parse device name (skip leading null bytes)
		c.deviceName = trimNull(header[0:64])

		// Parse codec (bytes 64-67, directly after device name)
		codecStr := string(header[64:68])
		c.logger.WithField("codec", codecStr).Debug("Video codec")

		// Parse width and height (big-endian)
		c.width = int(binary.BigEndian.Uint32(header[68:72]))
		c.height = int(binary.BigEndian.Uint32(header[72:76]))
	}

	c.logger.WithFields(logrus.Fields{
		"device_name":     c.deviceName,
		"width":           c.width,
		"height":          c.height,
		"raw_stream_mode": c.rawStreamMode,
	}).Debug("Connected to scrcpy-server")

	// Clear deadline for streaming
	c.videoConn.SetReadDeadline(time.Time{})

	// Step 5: Establish control socket connection for dynamic bitrate adjustment
	// The control socket is the third connection to scrcpy-server
	// It allows sending commands like SET_VIDEO_BITRATE and REQUEST_KEYFRAME
	c.controlConn, err = net.DialTimeout("tcp", serverAddr, 3*time.Second)
	if err != nil {
		// Control socket is optional - adaptive bitrate won't work without it
		// but basic video streaming will still function
		c.logger.WithError(err).Warn("Control socket connection failed (adaptive bitrate disabled)")
		c.controlConn = nil
	} else {
		c.logger.Debug("Control socket connected - adaptive bitrate enabled")

		// Read dummy byte from control socket (scrcpy protocol requirement)
		c.controlConn.SetReadDeadline(time.Now().Add(2 * time.Second))
		ctrlDummy := make([]byte, 1)
		if _, err := io.ReadFull(c.controlConn, ctrlDummy); err != nil {
			c.logger.WithError(err).Warn("Failed to read control socket dummy byte")
			c.controlConn.Close()
			c.controlConn = nil
		} else {
			c.logger.WithField("dummy_byte", fmt.Sprintf("0x%02x", ctrlDummy[0])).Debug("Control socket ready")
			c.controlConn.SetReadDeadline(time.Time{})
		}
	}

	return nil
}

// parseRawH264Init parses initial H.264 NAL units to extract SPS/PPS and resolution
func (c *ScrcpyCapture) parseRawH264Init(data []byte) error {
	// Find and parse NAL units
	nalUnits := splitNALUnits(data)

	for _, nal := range nalUnits {
		if len(nal) < 5 {
			continue
		}

		// Find NAL type (after start code)
		nalTypeIdx := 4
		if len(nal) > 3 && nal[2] == 1 {
			nalTypeIdx = 3 // 3-byte start code
		}
		if nalTypeIdx >= len(nal) {
			continue
		}

		nalType := nal[nalTypeIdx] & 0x1F

		switch nalType {
		case 7: // SPS - Sequence Parameter Set
			c.sps = make([]byte, len(nal))
			copy(c.sps, nal)

			// Parse resolution from SPS (simplified - assumes baseline profile)
			if err := c.parseResolutionFromSPSData(nal); err != nil {
				c.logger.WithError(err).Debug("Failed to parse SPS for resolution")
			}

			c.logger.WithFields(logrus.Fields{
				"sps_size":   len(nal),
				"resolution": fmt.Sprintf("%dx%d", c.width, c.height),
			}).Debug("SPS NAL extracted from raw stream")

		case 8: // PPS - Picture Parameter Set
			c.pps = make([]byte, len(nal))
			copy(c.pps, nal)
			c.logger.WithField("pps_size", len(nal)).Debug("PPS NAL extracted from raw stream")
		}
	}

	if c.sps == nil {
		return fmt.Errorf("no SPS found in initial H.264 data")
	}

	return nil
}

// h264BitReader is a helper for reading bits from H.264 NAL units
type h264BitReader struct {
	data     []byte
	bytePos  int
	bitPos   int // 0-7, 0 is MSB
}

func newH264BitReader(data []byte) *h264BitReader {
	return &h264BitReader{data: data, bytePos: 0, bitPos: 0}
}

// readBit reads a single bit
func (r *h264BitReader) readBit() (uint32, error) {
	if r.bytePos >= len(r.data) {
		return 0, fmt.Errorf("end of data")
	}
	bit := (r.data[r.bytePos] >> (7 - r.bitPos)) & 1
	r.bitPos++
	if r.bitPos == 8 {
		r.bitPos = 0
		r.bytePos++
	}
	return uint32(bit), nil
}

// readBits reads n bits (up to 32)
func (r *h264BitReader) readBits(n int) (uint32, error) {
	if n > 32 || n < 0 {
		return 0, fmt.Errorf("invalid bit count: %d", n)
	}
	var result uint32
	for i := 0; i < n; i++ {
		bit, err := r.readBit()
		if err != nil {
			return 0, err
		}
		result = (result << 1) | bit
	}
	return result, nil
}

// readUE reads an unsigned Exp-Golomb coded value
func (r *h264BitReader) readUE() (uint32, error) {
	// Count leading zeros
	leadingZeros := 0
	for {
		bit, err := r.readBit()
		if err != nil {
			return 0, err
		}
		if bit == 1 {
			break
		}
		leadingZeros++
		if leadingZeros > 32 {
			return 0, fmt.Errorf("invalid exp-golomb: too many leading zeros")
		}
	}
	if leadingZeros == 0 {
		return 0, nil
	}
	// Read the remaining bits
	suffix, err := r.readBits(leadingZeros)
	if err != nil {
		return 0, err
	}
	return (1 << leadingZeros) - 1 + suffix, nil
}

// readSE reads a signed Exp-Golomb coded value
func (r *h264BitReader) readSE() (int32, error) {
	ue, err := r.readUE()
	if err != nil {
		return 0, err
	}
	// Convert to signed: 0->0, 1->1, 2->-1, 3->2, 4->-2, ...
	if ue&1 == 1 {
		return int32((ue + 1) / 2), nil
	}
	return -int32(ue / 2), nil
}

// skipScalingList skips a scaling list in H.264 SPS
func (r *h264BitReader) skipScalingList(size int) error {
	lastScale := int32(8)
	nextScale := int32(8)
	for j := 0; j < size; j++ {
		if nextScale != 0 {
			deltaScale, err := r.readSE()
			if err != nil {
				return err
			}
			nextScale = (lastScale + deltaScale + 256) % 256
		}
		if nextScale != 0 {
			lastScale = nextScale
		}
	}
	return nil
}

// parseResolutionFromSPSData extracts resolution from H.264 SPS NAL unit
// Implements full Exp-Golomb decoding for accurate resolution extraction
func (c *ScrcpyCapture) parseResolutionFromSPSData(sps []byte) error {
	// Skip NAL start code
	startIdx := 0
	if len(sps) > 4 && sps[0] == 0 && sps[1] == 0 && sps[2] == 0 && sps[3] == 1 {
		startIdx = 4 // 4-byte start code
	} else if len(sps) > 3 && sps[0] == 0 && sps[1] == 0 && sps[2] == 1 {
		startIdx = 3 // 3-byte start code
	}

	if startIdx >= len(sps) {
		return fmt.Errorf("SPS too short: no data after start code")
	}

	// Check NAL type (should be 7 for SPS)
	nalType := sps[startIdx] & 0x1F
	if nalType != 7 {
		return fmt.Errorf("not an SPS NAL unit, type=%d", nalType)
	}
	startIdx++ // Skip NAL header

	if startIdx+3 >= len(sps) {
		return fmt.Errorf("SPS too short for profile/level")
	}

	// Remove emulation prevention bytes (0x00 0x00 0x03 -> 0x00 0x00)
	rbspData := make([]byte, 0, len(sps)-startIdx)
	for i := startIdx; i < len(sps); i++ {
		if i+2 < len(sps) && sps[i] == 0 && sps[i+1] == 0 && sps[i+2] == 3 {
			rbspData = append(rbspData, 0, 0)
			i += 2 // Skip the 0x03 byte
		} else {
			rbspData = append(rbspData, sps[i])
		}
	}

	if len(rbspData) < 4 {
		return fmt.Errorf("RBSP too short")
	}

	reader := newH264BitReader(rbspData)

	// profile_idc (8 bits)
	profileIdc, err := reader.readBits(8)
	if err != nil {
		return fmt.Errorf("failed to read profile_idc: %w", err)
	}

	// constraint_set flags (8 bits) - skip
	if _, err := reader.readBits(8); err != nil {
		return fmt.Errorf("failed to read constraint flags: %w", err)
	}

	// level_idc (8 bits) - skip
	if _, err := reader.readBits(8); err != nil {
		return fmt.Errorf("failed to read level_idc: %w", err)
	}

	// seq_parameter_set_id (ue)
	if _, err := reader.readUE(); err != nil {
		return fmt.Errorf("failed to read seq_parameter_set_id: %w", err)
	}

	// High Profile specific fields
	chromaFormatIdc := uint32(1) // Default for non-high profiles
	if profileIdc == 100 || profileIdc == 110 || profileIdc == 122 ||
		profileIdc == 244 || profileIdc == 44 || profileIdc == 83 ||
		profileIdc == 86 || profileIdc == 118 || profileIdc == 128 ||
		profileIdc == 138 || profileIdc == 139 || profileIdc == 134 ||
		profileIdc == 135 {

		// chroma_format_idc (ue)
		chromaFormatIdc, err = reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read chroma_format_idc: %w", err)
		}

		if chromaFormatIdc == 3 {
			// separate_colour_plane_flag (1 bit)
			if _, err := reader.readBit(); err != nil {
				return fmt.Errorf("failed to read separate_colour_plane_flag: %w", err)
			}
		}

		// bit_depth_luma_minus8 (ue)
		if _, err := reader.readUE(); err != nil {
			return fmt.Errorf("failed to read bit_depth_luma_minus8: %w", err)
		}

		// bit_depth_chroma_minus8 (ue)
		if _, err := reader.readUE(); err != nil {
			return fmt.Errorf("failed to read bit_depth_chroma_minus8: %w", err)
		}

		// qpprime_y_zero_transform_bypass_flag (1 bit)
		if _, err := reader.readBit(); err != nil {
			return fmt.Errorf("failed to read qpprime_y_zero_transform_bypass_flag: %w", err)
		}

		// seq_scaling_matrix_present_flag (1 bit)
		scalingMatrixFlag, err := reader.readBit()
		if err != nil {
			return fmt.Errorf("failed to read seq_scaling_matrix_present_flag: %w", err)
		}

		if scalingMatrixFlag == 1 {
			numScalingLists := 8
			if chromaFormatIdc == 3 {
				numScalingLists = 12
			}
			for i := 0; i < numScalingLists; i++ {
				listPresent, err := reader.readBit()
				if err != nil {
					return fmt.Errorf("failed to read scaling list present flag: %w", err)
				}
				if listPresent == 1 {
					if i < 6 {
						if err := reader.skipScalingList(16); err != nil {
							return fmt.Errorf("failed to skip scaling list 4x4: %w", err)
						}
					} else {
						if err := reader.skipScalingList(64); err != nil {
							return fmt.Errorf("failed to skip scaling list 8x8: %w", err)
						}
					}
				}
			}
		}
	}

	// log2_max_frame_num_minus4 (ue)
	if _, err := reader.readUE(); err != nil {
		return fmt.Errorf("failed to read log2_max_frame_num_minus4: %w", err)
	}

	// pic_order_cnt_type (ue)
	picOrderCntType, err := reader.readUE()
	if err != nil {
		return fmt.Errorf("failed to read pic_order_cnt_type: %w", err)
	}

	if picOrderCntType == 0 {
		// log2_max_pic_order_cnt_lsb_minus4 (ue)
		if _, err := reader.readUE(); err != nil {
			return fmt.Errorf("failed to read log2_max_pic_order_cnt_lsb_minus4: %w", err)
		}
	} else if picOrderCntType == 1 {
		// delta_pic_order_always_zero_flag (1 bit)
		if _, err := reader.readBit(); err != nil {
			return fmt.Errorf("failed to read delta_pic_order_always_zero_flag: %w", err)
		}
		// offset_for_non_ref_pic (se)
		if _, err := reader.readSE(); err != nil {
			return fmt.Errorf("failed to read offset_for_non_ref_pic: %w", err)
		}
		// offset_for_top_to_bottom_field (se)
		if _, err := reader.readSE(); err != nil {
			return fmt.Errorf("failed to read offset_for_top_to_bottom_field: %w", err)
		}
		// num_ref_frames_in_pic_order_cnt_cycle (ue)
		numRefFrames, err := reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read num_ref_frames_in_pic_order_cnt_cycle: %w", err)
		}
		for i := uint32(0); i < numRefFrames; i++ {
			// offset_for_ref_frame[i] (se)
			if _, err := reader.readSE(); err != nil {
				return fmt.Errorf("failed to read offset_for_ref_frame: %w", err)
			}
		}
	}

	// max_num_ref_frames (ue)
	if _, err := reader.readUE(); err != nil {
		return fmt.Errorf("failed to read max_num_ref_frames: %w", err)
	}

	// gaps_in_frame_num_value_allowed_flag (1 bit)
	if _, err := reader.readBit(); err != nil {
		return fmt.Errorf("failed to read gaps_in_frame_num_value_allowed_flag: %w", err)
	}

	// pic_width_in_mbs_minus1 (ue)
	picWidthInMbsMinus1, err := reader.readUE()
	if err != nil {
		return fmt.Errorf("failed to read pic_width_in_mbs_minus1: %w", err)
	}

	// pic_height_in_map_units_minus1 (ue)
	picHeightInMapUnitsMinus1, err := reader.readUE()
	if err != nil {
		return fmt.Errorf("failed to read pic_height_in_map_units_minus1: %w", err)
	}

	// frame_mbs_only_flag (1 bit)
	frameMbsOnlyFlag, err := reader.readBit()
	if err != nil {
		return fmt.Errorf("failed to read frame_mbs_only_flag: %w", err)
	}

	if frameMbsOnlyFlag == 0 {
		// mb_adaptive_frame_field_flag (1 bit)
		if _, err := reader.readBit(); err != nil {
			return fmt.Errorf("failed to read mb_adaptive_frame_field_flag: %w", err)
		}
	}

	// direct_8x8_inference_flag (1 bit)
	if _, err := reader.readBit(); err != nil {
		return fmt.Errorf("failed to read direct_8x8_inference_flag: %w", err)
	}

	// frame_cropping_flag (1 bit)
	frameCroppingFlag, err := reader.readBit()
	if err != nil {
		return fmt.Errorf("failed to read frame_cropping_flag: %w", err)
	}

	var cropLeft, cropRight, cropTop, cropBottom uint32
	if frameCroppingFlag == 1 {
		cropLeft, err = reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read frame_crop_left_offset: %w", err)
		}
		cropRight, err = reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read frame_crop_right_offset: %w", err)
		}
		cropTop, err = reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read frame_crop_top_offset: %w", err)
		}
		cropBottom, err = reader.readUE()
		if err != nil {
			return fmt.Errorf("failed to read frame_crop_bottom_offset: %w", err)
		}
	}

	// Calculate actual dimensions
	// Width = (pic_width_in_mbs_minus1 + 1) * 16
	// Height = (pic_height_in_map_units_minus1 + 1) * 16 * (2 - frame_mbs_only_flag)
	width := (picWidthInMbsMinus1 + 1) * 16
	height := (picHeightInMapUnitsMinus1 + 1) * 16
	if frameMbsOnlyFlag == 0 {
		height *= 2
	}

	// Apply cropping
	// Crop unit depends on chroma_format_idc
	var cropUnitX, cropUnitY uint32
	if chromaFormatIdc == 0 {
		cropUnitX = 1
		cropUnitY = 2 - frameMbsOnlyFlag
	} else if chromaFormatIdc == 1 {
		cropUnitX = 2
		cropUnitY = 2 * (2 - frameMbsOnlyFlag)
	} else if chromaFormatIdc == 2 {
		cropUnitX = 2
		cropUnitY = 2 - frameMbsOnlyFlag
	} else { // chromaFormatIdc == 3
		cropUnitX = 1
		cropUnitY = 2 - frameMbsOnlyFlag
	}

	width -= (cropLeft + cropRight) * cropUnitX
	height -= (cropTop + cropBottom) * cropUnitY

	c.width = int(width)
	c.height = int(height)

	c.logger.WithFields(logrus.Fields{
		"profile_idc":      profileIdc,
		"chroma_format":    chromaFormatIdc,
		"pic_width_mbs":    picWidthInMbsMinus1 + 1,
		"pic_height_mbs":   picHeightInMapUnitsMinus1 + 1,
		"frame_mbs_only":   frameMbsOnlyFlag,
		"crop":             fmt.Sprintf("L:%d R:%d T:%d B:%d", cropLeft, cropRight, cropTop, cropBottom),
		"final_resolution": fmt.Sprintf("%dx%d", c.width, c.height),
	}).Debug("H.264 SPS parsed successfully")

	return nil
}

// readH264Stream reads H.264 frames from scrcpy-server
//
// Two modes are supported:
// 1. Standard mode (rawStreamMode=false): scrcpy v3.x protocol with 12-byte frame headers
//    Frame format: 8 bytes (PTS + flags) + 4 bytes (packet size) + N bytes (NAL data)
//    Flag bits: bit 63 = config frame, bit 62 = keyframe
//
// 2. Raw stream mode (rawStreamMode=true): Pure H.264 NAL units without any headers
//    NAL units are delimited by start codes (0x00 0x00 0x00 0x01 or 0x00 0x00 0x01)
func (c *ScrcpyCapture) readH264Stream(ctx context.Context) {
	// Note: Don't set running to false here - let the reconnection wrapper handle it
	// Connections are cleaned up by attemptReconnect() or the final Stop()
	startTime := time.Now()

	if c.rawStreamMode {
		c.logger.Debug("Starting H.264 stream reading in RAW mode (pure NAL units)")
		c.readRawH264Stream(ctx, startTime)
	} else {
		c.logger.Debug("Starting H.264 stream reading in STANDARD mode (scrcpy v3.x protocol)")
		c.readScrcpyProtocolStream(ctx, startTime)
	}
}

// readScrcpyProtocolStream reads H.264 frames using scrcpy v3.x protocol with frame headers
func (c *ScrcpyCapture) readScrcpyProtocolStream(ctx context.Context, startTime time.Time) {
	// Frame header buffer (12 bytes: 8 PTS+flags + 4 size)
	frameHeader := make([]byte, 12)

	for {
		select {
		case <-ctx.Done():
			c.logger.Debug("H.264 stream reading stopped by context")
			return
		default:
		}

		if !c.running.Load() {
			return
		}

		// Set read deadline
		c.videoConn.SetReadDeadline(time.Now().Add(5 * time.Second))

		// Read frame header (12 bytes)
		if _, err := io.ReadFull(c.videoConn, frameHeader); err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue // Timeout, try again
			}
			if err != io.EOF {
				c.logger.WithError(err).Warn("Error reading frame header")
				atomic.AddUint64(&c.stats.Errors, 1)
			}
			return
		}

		// Parse frame header
		ptsAndFlags := binary.BigEndian.Uint64(frameHeader[0:8])
		packetSize := binary.BigEndian.Uint32(frameHeader[8:12])

		// Extract flags from PTS
		isConfig := (ptsAndFlags >> 63) & 1
		isKeyFrame := (ptsAndFlags >> 62) & 1
		pts := ptsAndFlags & 0x3FFFFFFFFFFFFFFF // Lower 62 bits

		// Validate packet size (sanity check)
		if packetSize == 0 || packetSize > 10*1024*1024 { // Max 10MB per frame
			c.logger.WithField("packet_size", packetSize).Warn("Invalid packet size, skipping")
			atomic.AddUint64(&c.stats.Errors, 1)
			continue
		}

		// Read frame data (use pool to reduce GC pressure)
		frameData := DefaultFramePool.Get(int(packetSize))
		if _, err := io.ReadFull(c.videoConn, frameData); err != nil {
			// Return buffer to pool on error
			DefaultFramePool.Put(frameData)
			if err != io.EOF {
				c.logger.WithError(err).Warn("Error reading frame data")
				atomic.AddUint64(&c.stats.Errors, 1)
			}
			return
		}

		// Create frame with pool release callback
		frame := &Frame{
			Data:      frameData,
			Timestamp: time.Now(),
			Format:    FrameFormatH264,
			Width:     c.width,
			Height:    c.height,
			Keyframe:  isKeyFrame == 1, // Set keyframe flag from scrcpy protocol
		}
		// Set release callback to return buffer to pool after processing
		frame.SetRelease(func() {
			DefaultFramePool.Put(frameData)
		})

		// Process based on frame type
		c.mu.Lock()
		if isConfig == 1 {
			// Config frame contains SPS/PPS
			c.extractSPSPPS(frameData)
			c.logger.WithField("size", packetSize).Debug("Config frame received (SPS/PPS)")
		}
		if isKeyFrame == 1 {
			frame.Duration = time.Second / 30 // Estimate for keyframe
			if c.stats.FramesCaptured%30 == 0 {
				c.logger.WithFields(logrus.Fields{
					"pts":  pts,
					"size": packetSize,
				}).Debug("Keyframe received")
			}
		}
		c.mu.Unlock()

		// Update FPS counter
		c.fpsCounter.increment()

		// Try to send frame
		c.sendFrame(frame, startTime)
	}
}

// readRawH264Stream reads pure H.264 NAL units without scrcpy frame headers
// This is used when send_frame_meta=false is set on the server
func (c *ScrcpyCapture) readRawH264Stream(ctx context.Context, startTime time.Time) {
	// Large buffer for reading raw stream data
	readBuf := make([]byte, 256*1024) // 256KB read buffer
	nalBuf := make([]byte, 0, 512*1024) // NAL assembly buffer

	for {
		select {
		case <-ctx.Done():
			c.logger.Debug("Raw H.264 stream reading stopped by context")
			return
		default:
		}

		if !c.running.Load() {
			return
		}

		// Set read deadline
		c.videoConn.SetReadDeadline(time.Now().Add(5 * time.Second))

		// Read available data
		n, err := c.videoConn.Read(readBuf)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue // Timeout, try again
			}
			if err != io.EOF {
				c.logger.WithError(err).Warn("Error reading raw H.264 data")
				atomic.AddUint64(&c.stats.Errors, 1)
			}
			return
		}

		// Append to NAL buffer
		nalBuf = append(nalBuf, readBuf[:n]...)

		// Extract complete NAL units
		frames := c.extractNALUnitsFromBuffer(&nalBuf)

		// Send each frame
		for _, frame := range frames {
			c.fpsCounter.increment()
			c.sendFrame(frame, startTime)
		}
	}
}

// extractNALUnitsFromBuffer extracts complete NAL units from a buffer
// Returns extracted frames and updates the buffer to remove processed data
func (c *ScrcpyCapture) extractNALUnitsFromBuffer(buf *[]byte) []*Frame {
	var frames []*Frame
	data := *buf

	// Find all NAL start code positions
	var positions []int
	for i := 0; i < len(data)-4; i++ {
		if data[i] == 0 && data[i+1] == 0 {
			if data[i+2] == 0 && data[i+3] == 1 {
				positions = append(positions, i)
			} else if data[i+2] == 1 {
				positions = append(positions, i)
			}
		}
	}

	if len(positions) < 2 {
		// Not enough NAL units found, keep buffer for more data
		return frames
	}

	// Extract complete NAL units (all except the last incomplete one)
	for i := 0; i < len(positions)-1; i++ {
		start := positions[i]
		end := positions[i+1]
		nalData := data[start:end]

		if len(nalData) < 5 {
			continue
		}

		// Determine NAL type
		nalTypeIdx := 4
		if nalData[2] == 1 {
			nalTypeIdx = 3
		}
		if nalTypeIdx >= len(nalData) {
			continue
		}
		nalType := nalData[nalTypeIdx] & 0x1F

		// Create frame - set keyframe flag for IDR (type 5)
		isKeyframe := nalType == 5

		// Use pool to allocate frame buffer (reduces GC pressure)
		frameData := DefaultFramePool.Get(len(nalData))
		copy(frameData, nalData)

		frame := &Frame{
			Data:      frameData,
			Timestamp: time.Now(),
			Format:    FrameFormatH264,
			Width:     c.width,
			Height:    c.height,
			Keyframe:  isKeyframe,
		}
		// Set release callback to return buffer to pool
		frame.SetRelease(func() {
			DefaultFramePool.Put(frameData)
		})

		// Process based on NAL type
		c.mu.Lock()
		switch nalType {
		case 7: // SPS
			c.sps = frame.Data
			c.logger.WithField("size", len(nalData)).Debug("SPS NAL received (raw mode)")
		case 8: // PPS
			c.pps = frame.Data
			c.logger.WithField("size", len(nalData)).Debug("PPS NAL received (raw mode)")
		case 5: // IDR (keyframe)
			frame.Duration = time.Second / 30
			if c.stats.FramesCaptured%30 == 0 {
				c.logger.WithField("size", len(nalData)).Debug("IDR frame received (raw mode)")
			}
		}
		c.mu.Unlock()

		frames = append(frames, frame)
	}

	// Keep remaining data (last incomplete NAL unit)
	if len(positions) > 0 {
		lastStart := positions[len(positions)-1]
		*buf = data[lastStart:]
	}

	return frames
}

// sendFrame sends a frame to the channel and updates statistics
func (c *ScrcpyCapture) sendFrame(frame *Frame, startTime time.Time) {
	select {
	case c.frameChannel <- frame:
		atomic.AddUint64(&c.stats.FramesCaptured, 1)
		atomic.AddUint64(&c.stats.BytesCaptured, uint64(len(frame.Data)))
		c.mu.Lock()
		c.stats.LastFrameTime = time.Now()
		c.stats.Uptime = time.Since(startTime)
		c.mu.Unlock()
	default:
		atomic.AddUint64(&c.stats.FramesDropped, 1)
	}
}

// extractNALUnits extracts complete NAL units from buffer
// NAL units are delimited by 0x00 0x00 0x00 0x01 or 0x00 0x00 0x01
func (c *ScrcpyCapture) extractNALUnits(buf *[]byte) []*Frame {
	var frames []*Frame
	data := *buf

	for {
		// Find NAL start code
		startIdx := findNALStartCode(data)
		if startIdx < 0 {
			break
		}

		// Find next NAL start code
		nextIdx := findNALStartCode(data[startIdx+4:])
		if nextIdx < 0 {
			// Incomplete NAL, keep in buffer
			*buf = data[startIdx:]
			return frames
		}
		nextIdx += startIdx + 4

		// Extract NAL unit (include start code)
		nalData := data[startIdx:nextIdx]

		// Parse NAL type (first byte after start code)
		nalTypeIdx := startIdx + 4
		if data[startIdx+2] == 1 {
			nalTypeIdx = startIdx + 3 // 3-byte start code
		}
		nalType := data[nalTypeIdx] & 0x1F

		// Create frame based on NAL type
		frame := &Frame{
			Data:      make([]byte, len(nalData)),
			Timestamp: time.Now(),
			Format:    FrameFormatH264,
			Width:     c.width,
			Height:    c.height,
		}
		copy(frame.Data, nalData)

		// Store SPS/PPS for later use
		c.mu.Lock()
		switch nalType {
		case 7: // SPS
			c.sps = frame.Data
			// Parse resolution from SPS if needed
			c.parseResolutionFromSPS(frame.Data)
			c.logger.Debug("H.264 SPS received")
		case 8: // PPS
			c.pps = frame.Data
			c.logger.Debug("H.264 PPS received")
		case 5: // IDR (keyframe)
			frame.Duration = time.Second / 30 // Estimate
		}
		c.mu.Unlock()

		frames = append(frames, frame)
		data = data[nextIdx:]
	}

	*buf = data
	return frames
}

// findNALStartCode finds the index of NAL start code (0x00 0x00 0x00 0x01 or 0x00 0x00 0x01)
func findNALStartCode(data []byte) int {
	for i := 0; i < len(data)-3; i++ {
		if data[i] == 0 && data[i+1] == 0 {
			if data[i+2] == 0 && data[i+3] == 1 {
				return i // 4-byte start code
			}
			if data[i+2] == 1 {
				return i // 3-byte start code
			}
		}
	}
	return -1
}

// extractSPSPPS extracts SPS and PPS NAL units from config frame data
// Config frame contains SPS/PPS with NAL start codes (0x00 0x00 0x00 0x01)
func (c *ScrcpyCapture) extractSPSPPS(data []byte) {
	// Find all NAL units in the config frame
	nalUnits := splitNALUnits(data)

	for _, nal := range nalUnits {
		if len(nal) < 5 {
			continue
		}

		// Find NAL type (after start code)
		nalTypeIdx := 4
		if len(nal) > 3 && nal[2] == 1 {
			nalTypeIdx = 3 // 3-byte start code
		}
		if nalTypeIdx >= len(nal) {
			continue
		}

		nalType := nal[nalTypeIdx] & 0x1F

		switch nalType {
		case 7: // SPS
			c.sps = make([]byte, len(nal))
			copy(c.sps, nal)
			c.logger.WithField("sps_size", len(nal)).Debug("SPS NAL extracted")
		case 8: // PPS
			c.pps = make([]byte, len(nal))
			copy(c.pps, nal)
			c.logger.WithField("pps_size", len(nal)).Debug("PPS NAL extracted")
		}
	}
}

// splitNALUnits splits H.264 data into individual NAL units
func splitNALUnits(data []byte) [][]byte {
	var nalUnits [][]byte
	var positions []int

	// Find all NAL start code positions
	for i := 0; i < len(data)-3; i++ {
		if data[i] == 0 && data[i+1] == 0 {
			if i+3 < len(data) && data[i+2] == 0 && data[i+3] == 1 {
				positions = append(positions, i) // 4-byte start code
			} else if data[i+2] == 1 {
				positions = append(positions, i) // 3-byte start code
			}
		}
	}

	// Extract NAL units between positions
	for i := 0; i < len(positions); i++ {
		start := positions[i]
		var end int
		if i+1 < len(positions) {
			end = positions[i+1]
		} else {
			end = len(data)
		}
		nalUnits = append(nalUnits, data[start:end])
	}

	return nalUnits
}

// parseResolutionFromSPS extracts resolution from H.264 SPS NAL unit (unused - we get resolution from scrcpy header)
func (c *ScrcpyCapture) parseResolutionFromSPS(sps []byte) {
	// Resolution is now obtained from scrcpy protocol header
	// This function is kept for potential future use with direct H.264 streams
}

// trimNull removes null bytes from a byte slice and returns as string
func trimNull(b []byte) string {
	// Skip leading nulls
	start := 0
	for start < len(b) && b[start] == 0 {
		start++
	}
	// Find end
	end := start
	for end < len(b) && b[end] != 0 {
		end++
	}
	return string(b[start:end])
}

// GetCodecExtraData returns codec initialization data for WebRTC
func (c *ScrcpyCapture) GetCodecExtraData() []byte {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.sps == nil || c.pps == nil {
		return nil
	}

	// Combine SPS and PPS with start codes for WebRTC
	extra := make([]byte, len(c.sps)+len(c.pps))
	copy(extra, c.sps)
	copy(extra[len(c.sps):], c.pps)
	return extra
}

// ScrcpyH264Source wraps ScrcpyCapture for direct H.264 WebRTC streaming
// This can be used with pion/webrtc's H264 track
type ScrcpyH264Source struct {
	capture    *ScrcpyCapture
	sampleRate uint32
	frameCount uint64
}

// NewScrcpyH264Source creates a new H.264 source from ScrcpyCapture
func NewScrcpyH264Source(capture *ScrcpyCapture) *ScrcpyH264Source {
	return &ScrcpyH264Source{
		capture:    capture,
		sampleRate: 90000, // H.264 clock rate
	}
}

// Read reads the next H.264 frame (implements io.Reader for pion)
func (s *ScrcpyH264Source) Read(p []byte) (n int, err error) {
	frameChan := s.capture.GetFrameChannel()
	if frameChan == nil {
		return 0, io.EOF
	}

	frame, ok := <-frameChan
	if !ok || frame == nil {
		return 0, io.EOF
	}

	if len(p) < len(frame.Data) {
		return 0, fmt.Errorf("buffer too small: need %d, got %d", len(frame.Data), len(p))
	}

	copy(p, frame.Data)
	s.frameCount++
	return len(frame.Data), nil
}

// GetClockRate returns the H.264 clock rate (90000 Hz)
func (s *ScrcpyH264Source) GetClockRate() uint32 {
	return s.sampleRate
}

// GetTimestamp returns the current RTP timestamp
func (s *ScrcpyH264Source) GetTimestamp() uint32 {
	// Calculate timestamp based on frame count and assumed 30fps
	return uint32(s.frameCount * uint64(s.sampleRate) / 30)
}

// ParseScrcpyMetadata parses the scrcpy protocol metadata after the device name
func ParseScrcpyMetadata(conn net.Conn) (codecID uint32, width, height int, err error) {
	// Read codec ID (4 bytes big-endian, but offset by one due to protocol quirk)
	buf := make([]byte, 12)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return 0, 0, 0, fmt.Errorf("failed to read metadata: %w", err)
	}

	// In scrcpy v3.x, the format after device name is:
	// 1 byte padding + "h264" (4 bytes) + width (4 bytes) + height (4 bytes)
	// But since it's embedded in the stream, we just look for width/height
	// after the codec string

	// Check if this looks like the codec string
	codecStr := string(buf[1:5])
	if codecStr == "h264" || codecStr == "h265" {
		width = int(binary.BigEndian.Uint32(buf[5:9]))
		height = int(binary.BigEndian.Uint32(buf[9:13]))

		// Verify reasonable dimensions
		if width > 0 && width < 10000 && height > 0 && height < 10000 {
			codecID = binary.BigEndian.Uint32(buf[1:5])
			return codecID, width, height, nil
		}
	}

	// Fall back to default values if parsing fails
	return 0x68323634, 720, 1280, nil // h264, 720x1280 default
}

// ==================== Auto-Reconnection Logic ====================

// SetReconnectOptions configures auto-reconnection behavior
// Call this before Start() to customize reconnection parameters
func (c *ScrcpyCapture) SetReconnectOptions(enabled bool, maxAttempts uint32, baseDelay time.Duration, callback func(success bool, attempt uint32)) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reconnectEnabled = enabled
	if maxAttempts > 0 {
		c.maxReconnects = maxAttempts
	}
	if baseDelay > 0 {
		c.reconnectDelay = baseDelay
	}
	c.onReconnect = callback
}

// IsReconnecting returns true if currently attempting to reconnect
func (c *ScrcpyCapture) IsReconnecting() bool {
	return c.reconnecting.Load()
}

// GetReconnectAttempts returns the current reconnection attempt count
func (c *ScrcpyCapture) GetReconnectAttempts() uint32 {
	return atomic.LoadUint32(&c.reconnectAttempts)
}

// readH264StreamWithReconnect wraps readH264Stream with auto-reconnection logic
// It implements exponential backoff retry strategy when the connection is lost
func (c *ScrcpyCapture) readH264StreamWithReconnect(ctx context.Context) {
	// Ensure running state is set to false when we finally exit
	defer func() {
		c.running.Store(false)
		c.cleanupConnections()
		c.logger.WithField("device_id", c.deviceID).Debug("Stream reader with reconnection exited")
	}()

	for {
		// Run the actual H.264 stream reading
		c.readH264Stream(ctx)

		// Check if we should attempt reconnection
		if !c.shouldReconnect(ctx) {
			c.logger.Debug("Reconnection not enabled or context cancelled, exiting stream reader")
			return
		}

		// Attempt reconnection
		if !c.attemptReconnect(ctx) {
			c.logger.WithFields(logrus.Fields{
				"device_id":        c.deviceID,
				"attempts":         c.reconnectAttempts,
				"max_reconnects":   c.maxReconnects,
			}).Warn("All reconnection attempts failed, giving up")
			return
		}

		// Reconnection successful, loop will continue to readH264Stream again
		c.logger.WithFields(logrus.Fields{
			"device_id": c.deviceID,
			"attempt":   c.reconnectAttempts,
		}).Info("Stream reconnected successfully")
	}
}

// shouldReconnect determines if reconnection should be attempted
func (c *ScrcpyCapture) shouldReconnect(ctx context.Context) bool {
	// Check context first
	select {
	case <-ctx.Done():
		return false
	default:
	}

	// Check if reconnection is enabled and running is still true
	// (running being false means Stop() was called explicitly)
	if !c.reconnectEnabled {
		return false
	}

	// Check if we've exceeded max reconnection attempts (0 = unlimited)
	if c.maxReconnects > 0 && atomic.LoadUint32(&c.reconnectAttempts) >= c.maxReconnects {
		return false
	}

	return true
}

// attemptReconnect tries to re-establish the scrcpy connection
// Returns true if reconnection was successful, false otherwise
func (c *ScrcpyCapture) attemptReconnect(ctx context.Context) bool {
	c.reconnecting.Store(true)
	defer c.reconnecting.Store(false)

	// Increment attempt counter
	attempt := atomic.AddUint32(&c.reconnectAttempts, 1)

	c.logger.WithFields(logrus.Fields{
		"device_id":      c.deviceID,
		"attempt":        attempt,
		"max_reconnects": c.maxReconnects,
	}).Info("Attempting to reconnect scrcpy stream")

	// Calculate exponential backoff delay
	// Formula: baseDelay * 2^(attempt-1), capped at 30 seconds
	backoffDelay := c.reconnectDelay * time.Duration(1<<(attempt-1))
	if backoffDelay > 30*time.Second {
		backoffDelay = 30 * time.Second
	}

	c.logger.WithFields(logrus.Fields{
		"device_id":      c.deviceID,
		"delay":          backoffDelay,
		"attempt":        attempt,
	}).Debug("Waiting before reconnection attempt")

	// Wait with backoff, but respect context cancellation
	select {
	case <-ctx.Done():
		c.notifyReconnect(false, attempt)
		return false
	case <-time.After(backoffDelay):
	}

	// Cleanup existing connections
	c.cleanupConnections()

	// Re-establish ADB forward
	if err := c.setupADBForward(); err != nil {
		c.logger.WithError(err).WithFields(logrus.Fields{
			"device_id": c.deviceID,
			"attempt":   attempt,
		}).Warn("Failed to setup ADB forward during reconnection")
		c.notifyReconnect(false, attempt)
		return false
	}

	// Create a new context for this reconnection attempt with timeout
	reconnectCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Restart scrcpy-server
	if err := c.startScrcpyServer(reconnectCtx, c.scrcpyOpts); err != nil {
		c.logger.WithError(err).WithFields(logrus.Fields{
			"device_id": c.deviceID,
			"attempt":   attempt,
		}).Warn("Failed to start scrcpy-server during reconnection")
		c.cleanupADBForward()
		c.notifyReconnect(false, attempt)
		return false
	}

	// Reconnect to server
	if err := c.connectToServer(); err != nil {
		c.logger.WithError(err).WithFields(logrus.Fields{
			"device_id": c.deviceID,
			"attempt":   attempt,
		}).Warn("Failed to connect to scrcpy-server during reconnection")
		c.cleanupADBForward()
		c.notifyReconnect(false, attempt)
		return false
	}

	// Reconnection successful
	c.running.Store(true)
	c.stats.LastFrameTime = time.Now()

	// Reset attempt counter on success
	atomic.StoreUint32(&c.reconnectAttempts, 0)

	c.notifyReconnect(true, attempt)
	return true
}

// cleanupConnections closes all existing scrcpy connections
func (c *ScrcpyCapture) cleanupConnections() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.videoConn != nil {
		c.videoConn.Close()
		c.videoConn = nil
	}
	if c.triggerConn != nil {
		c.triggerConn.Close()
		c.triggerConn = nil
	}
	if c.controlConn != nil {
		c.controlConn.Close()
		c.controlConn = nil
	}

	// Also cleanup ADB forward to ensure clean state
	c.cleanupADBForward()
}

// notifyReconnect calls the reconnect callback if configured
func (c *ScrcpyCapture) notifyReconnect(success bool, attempt uint32) {
	if c.onReconnect != nil {
		// Call callback in a goroutine to avoid blocking
		go c.onReconnect(success, attempt)
	}
}
