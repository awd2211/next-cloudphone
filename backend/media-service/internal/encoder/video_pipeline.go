package encoder

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cloudphone/media-service/internal/adaptive"
	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// VideoPipeline manages the video frame processing pipeline
// It reads frames from capture service, encodes them, and provides them to WebRTC
type VideoPipeline struct {
	sessionID     string
	deviceID      string
	capture       capture.ScreenCapture
	encoder       VideoEncoder
	frameWriter   FrameWriter
	running       atomic.Bool
	cancel        context.CancelFunc
	mu            sync.RWMutex
	stats         PipelineStats
	logger        *logrus.Logger

	// Configuration
	targetFPS     int
	targetBitrate int
	adaptiveMode  bool

	// Resolution scaling (0 = native resolution)
	targetWidth  int
	targetHeight int
	quality      int // JPEG quality (1-100)

	// Adaptive quality control
	qualityController *adaptive.QualityController
}

// FrameWriter is an interface for writing encoded frames
type FrameWriter interface {
	WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error
}

// PipelineStats contains statistics about the pipeline
type PipelineStats struct {
	FramesProcessed   uint64
	FramesEncoded     uint64
	FramesDropped     uint64
	BytesProcessed    uint64
	BytesEncoded      uint64
	EncodingErrors    uint64
	WritingErrors     uint64
	EncodingTimeouts  uint64  // 新增: 编码超时次数
	AverageFPS        float64
	AverageBitrate    float64
	Uptime            time.Duration
}

// PipelineOptions contains options for video pipeline
type PipelineOptions struct {
	SessionID     string
	DeviceID      string
	Capture       capture.ScreenCapture
	Encoder       VideoEncoder
	FrameWriter   FrameWriter
	TargetFPS     int
	TargetBitrate int
	AdaptiveMode  bool
	Logger        *logrus.Logger

	// Resolution scaling options (for WiFi ADB performance optimization)
	TargetWidth  int // Target width (0 = native resolution)
	TargetHeight int // Target height (0 = native resolution)
	Quality      int // JPEG quality (1-100, 0 = default 70)
}

// NewVideoPipeline creates a new video processing pipeline
func NewVideoPipeline(options PipelineOptions) (*VideoPipeline, error) {
	if options.SessionID == "" {
		return nil, fmt.Errorf("session ID is required")
	}
	if options.DeviceID == "" {
		return nil, fmt.Errorf("device ID is required")
	}
	if options.Capture == nil {
		return nil, fmt.Errorf("capture service is required")
	}
	if options.FrameWriter == nil {
		return nil, fmt.Errorf("frame writer is required")
	}

	if options.TargetFPS <= 0 {
		options.TargetFPS = 30
	}
	if options.TargetBitrate <= 0 {
		options.TargetBitrate = 2000000 // 2 Mbps
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	// If no encoder provided, use pass-through
	if options.Encoder == nil {
		options.Encoder = NewPassThroughEncoder()
	}

	// Set default quality if not specified
	quality := options.Quality
	if quality <= 0 || quality > 100 {
		quality = 70 // Good balance between size and quality
	}

	pipeline := &VideoPipeline{
		sessionID:     options.SessionID,
		deviceID:      options.DeviceID,
		capture:       options.Capture,
		encoder:       options.Encoder,
		frameWriter:   options.FrameWriter,
		targetFPS:     options.TargetFPS,
		targetBitrate: options.TargetBitrate,
		adaptiveMode:  options.AdaptiveMode,
		logger:        options.Logger,
		targetWidth:   options.TargetWidth,
		targetHeight:  options.TargetHeight,
		quality:       quality,
	}

	// Setup adaptive quality control if enabled
	if options.AdaptiveMode {
		pipeline.setupAdaptiveQuality()
	}

	return pipeline, nil
}

// Start begins the video processing pipeline
func (p *VideoPipeline) Start(ctx context.Context) error {
	if p.running.Load() {
		return fmt.Errorf("pipeline already running")
	}

	// Start capture if not already running
	if !p.capture.IsRunning() {
		// Use JPEG format when scaling for better compression
		format := capture.FrameFormatPNG
		if p.targetWidth > 0 || p.targetHeight > 0 {
			format = capture.FrameFormatJPEG
		}

		captureOptions := capture.CaptureOptions{
			DeviceID:   p.deviceID,
			FrameRate:  p.targetFPS,
			Format:     format,
			BufferSize: 5,            // 缓冲区大小
			Width:      p.targetWidth,  // Resolution scaling for WiFi ADB optimization
			Height:     p.targetHeight,
			Quality:    p.quality,
		}

		if err := p.capture.Start(ctx, captureOptions); err != nil {
			return fmt.Errorf("failed to start capture: %w", err)
		}
	}

	// Create cancellable context
	pipelineCtx, cancel := context.WithCancel(ctx)
	p.cancel = cancel

	p.running.Store(true)

	// Start pipeline processing goroutine
	go p.processingLoop(pipelineCtx)

	p.logger.WithFields(logrus.Fields{
		"session_id": p.sessionID,
		"device_id":  p.deviceID,
		"target_fps": p.targetFPS,
	}).Info("Video pipeline started")

	return nil
}

// Stop stops the video processing pipeline
func (p *VideoPipeline) Stop() error {
	if !p.running.Load() {
		return fmt.Errorf("pipeline not running")
	}

	p.running.Store(false)
	if p.cancel != nil {
		p.cancel()
	}

	p.logger.WithFields(logrus.Fields{
		"session_id":       p.sessionID,
		"frames_processed": p.stats.FramesProcessed,
		"frames_encoded":   p.stats.FramesEncoded,
		"uptime":           p.stats.Uptime,
	}).Info("Video pipeline stopped")

	return nil
}

// IsRunning returns true if pipeline is active
func (p *VideoPipeline) IsRunning() bool {
	return p.running.Load()
}

// GetStats returns pipeline statistics
func (p *VideoPipeline) GetStats() PipelineStats {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.stats
}

// SetTargetFPS adjusts target frame rate
func (p *VideoPipeline) SetTargetFPS(fps int) error {
	if fps <= 0 || fps > 60 {
		return fmt.Errorf("invalid FPS: %d", fps)
	}

	p.mu.Lock()
	p.targetFPS = fps
	p.mu.Unlock()

	// Adjust capture frame rate
	if err := p.capture.SetFrameRate(fps); err != nil {
		p.logger.WithError(err).Warn("Failed to adjust capture frame rate")
	}

	p.logger.WithField("new_fps", fps).Info("Target FPS adjusted")
	return nil
}

// SetTargetBitrate adjusts target bitrate
func (p *VideoPipeline) SetTargetBitrate(bitrate int) error {
	if bitrate <= 0 {
		return fmt.Errorf("invalid bitrate: %d", bitrate)
	}

	p.mu.Lock()
	p.targetBitrate = bitrate
	p.mu.Unlock()

	// Adjust encoder bitrate if supported
	if p.encoder != nil {
		if err := p.encoder.SetBitrate(bitrate); err != nil {
			p.logger.WithError(err).Warn("Failed to adjust encoder bitrate")
		}
	}

	p.logger.WithField("new_bitrate", bitrate).Info("Target bitrate adjusted")
	return nil
}

// processingLoop is the main frame processing loop
func (p *VideoPipeline) processingLoop(ctx context.Context) {
	frameChannel := p.capture.GetFrameChannel()
	startTime := time.Now()
	lastStatsTime := time.Now()

	var framesInLastSecond uint64
	var bytesInLastSecond uint64

	for {
		select {
		case <-ctx.Done():
			p.logger.Debug("Pipeline processing loop stopped by context")
			return

		case frame, ok := <-frameChannel:
			if !ok {
				p.logger.Warn("Frame channel closed")
				return
			}

			if frame == nil {
				continue
			}

			// Capture frame size before processing (frame.Data may be released)
			frameSize := uint64(len(frame.Data))

			// Process frame
			if err := p.processFrame(frame); err != nil {
				p.logger.WithError(err).Warn("Failed to process frame")
				atomic.AddUint64(&p.stats.EncodingErrors, 1)
				frame.Release() // Return buffer to pool on error
				continue
			}

			// Update counters
			atomic.AddUint64(&p.stats.FramesProcessed, 1)
			atomic.AddUint64(&p.stats.BytesProcessed, frameSize)
			framesInLastSecond++
			bytesInLastSecond += frameSize

			// Release frame buffer back to pool
			frame.Release()

			// Update FPS and bitrate stats every second
			now := time.Now()
			if now.Sub(lastStatsTime) >= time.Second {
				elapsed := now.Sub(lastStatsTime).Seconds()

				p.mu.Lock()
				p.stats.AverageFPS = float64(framesInLastSecond) / elapsed
				p.stats.AverageBitrate = float64(bytesInLastSecond*8) / elapsed // bits per second
				p.stats.Uptime = now.Sub(startTime)
				p.mu.Unlock()

				framesInLastSecond = 0
				bytesInLastSecond = 0
				lastStatsTime = now
			}
		}
	}
}

// processFrame processes a single captured frame
func (p *VideoPipeline) processFrame(frame *capture.Frame) error {
	// Encode frame with timeout (修复阻塞问题)
	var encodedData []byte
	var err error

	if p.encoder != nil {
		// 创建带超时的编码
		// 500ms timeout to accommodate VP8 encoding via FFmpeg (~235ms typical)
		encodeCtx, encodeCancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer encodeCancel()

		type encodeResult struct {
			data []byte
			err  error
		}

		resultCh := make(chan encodeResult, 1)
		go func() {
			data, encodeErr := p.encoder.Encode(frame)
			resultCh <- encodeResult{data: data, err: encodeErr}
		}()

		select {
		case result := <-resultCh:
			// 编码完成
			encodedData = result.data
			err = result.err
			if err != nil {
				return fmt.Errorf("encoding failed: %w", err)
			}
			atomic.AddUint64(&p.stats.FramesEncoded, 1)
			atomic.AddUint64(&p.stats.BytesEncoded, uint64(len(encodedData)))

		case <-encodeCtx.Done():
			// 编码超时,丢帧
			atomic.AddUint64(&p.stats.EncodingTimeouts, 1)
			atomic.AddUint64(&p.stats.FramesDropped, 1)
			p.logger.WithField("frame_timestamp", frame.Timestamp).
				Warn("Frame encoding timeout, dropping frame")
			return fmt.Errorf("encoding timeout")
		}
	} else {
		// No encoder, use raw frame data
		encodedData = frame.Data
	}

	// Write to WebRTC track with timeout
	writeCtx, writeCancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer writeCancel()

	writeDone := make(chan error, 1)
	go func() {
		writeDone <- p.frameWriter.WriteVideoFrame(p.sessionID, encodedData, frame.Duration)
	}()

	select {
	case writeErr := <-writeDone:
		if writeErr != nil {
			atomic.AddUint64(&p.stats.WritingErrors, 1)
			return fmt.Errorf("failed to write frame: %w", writeErr)
		}
	case <-writeCtx.Done():
		// 写入超时
		atomic.AddUint64(&p.stats.WritingErrors, 1)
		p.logger.Warn("Frame write timeout")
		return fmt.Errorf("write timeout")
	}

	return nil
}

// AudioPipeline manages the audio processing pipeline
type AudioPipeline struct {
	sessionID    string
	deviceID     string
	capture      capture.AudioCapture
	encoder      AudioEncoder
	frameWriter  AudioFrameWriter
	running      atomic.Bool
	cancel       context.CancelFunc
	mu           sync.RWMutex
	stats        AudioPipelineStats
	logger       *logrus.Logger
}

// AudioFrameWriter is an interface for writing encoded audio frames
type AudioFrameWriter interface {
	WriteAudioFrame(sessionID string, frame []byte, duration time.Duration) error
}

// AudioPipelineStats contains statistics about the audio pipeline
type AudioPipelineStats struct {
	SamplesProcessed uint64
	SamplesEncoded   uint64
	SamplesDropped   uint64
	BytesProcessed   uint64
	BytesEncoded     uint64
	EncodingErrors   uint64
	WritingErrors    uint64
	Uptime           time.Duration
}

// AudioPipelineOptions contains options for audio pipeline
type AudioPipelineOptions struct {
	SessionID   string
	DeviceID    string
	Capture     capture.AudioCapture
	Encoder     AudioEncoder
	FrameWriter AudioFrameWriter
	Logger      *logrus.Logger
}

// NewAudioPipeline creates a new audio processing pipeline
func NewAudioPipeline(options AudioPipelineOptions) (*AudioPipeline, error) {
	if options.SessionID == "" {
		return nil, fmt.Errorf("session ID is required")
	}
	if options.DeviceID == "" {
		return nil, fmt.Errorf("device ID is required")
	}
	if options.Capture == nil {
		return nil, fmt.Errorf("capture service is required")
	}
	if options.FrameWriter == nil {
		return nil, fmt.Errorf("frame writer is required")
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	// If no encoder provided, use pass-through
	if options.Encoder == nil {
		options.Encoder = NewPassThroughAudioEncoder()
	}

	return &AudioPipeline{
		sessionID:   options.SessionID,
		deviceID:    options.DeviceID,
		capture:     options.Capture,
		encoder:     options.Encoder,
		frameWriter: options.FrameWriter,
		logger:      options.Logger,
	}, nil
}

// Start begins the audio processing pipeline
func (p *AudioPipeline) Start(ctx context.Context) error {
	if p.running.Load() {
		return fmt.Errorf("audio pipeline already running")
	}

	// Start capture if not already running
	if !p.capture.IsRunning() {
		audioOptions := capture.AudioOptions{
			DeviceID:   p.deviceID,
			SampleRate: 48000,
			Channels:   2,
			BitDepth:   16,
			BufferSize: 5,
		}

		if err := p.capture.Start(ctx, audioOptions); err != nil {
			return fmt.Errorf("failed to start audio capture: %w", err)
		}
	}

	// Create cancellable context
	pipelineCtx, cancel := context.WithCancel(ctx)
	p.cancel = cancel

	p.running.Store(true)

	// Start pipeline processing goroutine
	go p.processingLoop(pipelineCtx)

	p.logger.WithFields(logrus.Fields{
		"session_id": p.sessionID,
		"device_id":  p.deviceID,
	}).Info("Audio pipeline started")

	return nil
}

// Stop stops the audio processing pipeline
func (p *AudioPipeline) Stop() error {
	if !p.running.Load() {
		return fmt.Errorf("audio pipeline not running")
	}

	p.running.Store(false)
	if p.cancel != nil {
		p.cancel()
	}

	p.logger.WithFields(logrus.Fields{
		"session_id":        p.sessionID,
		"samples_processed": p.stats.SamplesProcessed,
		"uptime":            p.stats.Uptime,
	}).Info("Audio pipeline stopped")

	return nil
}

// IsRunning returns true if pipeline is active
func (p *AudioPipeline) IsRunning() bool {
	return p.running.Load()
}

// GetStats returns audio pipeline statistics
func (p *AudioPipeline) GetStats() AudioPipelineStats {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.stats
}

// processingLoop is the main audio processing loop
func (p *AudioPipeline) processingLoop(ctx context.Context) {
	audioChannel := p.capture.GetAudioChannel()
	startTime := time.Now()

	for {
		select {
		case <-ctx.Done():
			p.logger.Debug("Audio pipeline processing loop stopped by context")
			return

		case frame, ok := <-audioChannel:
			if !ok {
				p.logger.Warn("Audio channel closed")
				return
			}

			if frame == nil {
				continue
			}

			// Process audio frame
			if err := p.processAudioFrame(frame); err != nil {
				p.logger.WithError(err).Warn("Failed to process audio frame")
				atomic.AddUint64(&p.stats.EncodingErrors, 1)
				continue
			}

			// Update counters
			samples := uint64(len(frame.Data) / ((frame.SampleRate / 1000) * frame.Channels * 2)) // Approximate
			atomic.AddUint64(&p.stats.SamplesProcessed, samples)
			atomic.AddUint64(&p.stats.BytesProcessed, uint64(len(frame.Data)))

			p.mu.Lock()
			p.stats.Uptime = time.Since(startTime)
			p.mu.Unlock()
		}
	}
}

// processAudioFrame processes a single captured audio frame
func (p *AudioPipeline) processAudioFrame(frame *capture.AudioFrame) error {
	// Encode audio frame if encoder is available
	var encodedData []byte
	var err error

	if p.encoder != nil {
		encodedData, err = p.encoder.EncodeAudio(frame)
		if err != nil {
			return fmt.Errorf("audio encoding failed: %w", err)
		}
		atomic.AddUint64(&p.stats.SamplesEncoded, uint64(len(encodedData)))
		atomic.AddUint64(&p.stats.BytesEncoded, uint64(len(encodedData)))
	} else {
		// No encoder, use raw frame data
		encodedData = frame.Data
	}

	// Write to WebRTC track
	if err := p.frameWriter.WriteAudioFrame(p.sessionID, encodedData, frame.Duration); err != nil {
		atomic.AddUint64(&p.stats.WritingErrors, 1)
		return fmt.Errorf("failed to write audio frame: %w", err)
	}

	return nil
}

// setupAdaptiveQuality initializes the quality controller and wires it to the capture
func (p *VideoPipeline) setupAdaptiveQuality() {
	// Create quality controller
	p.qualityController = adaptive.NewQualityController(adaptive.QualityControllerOptions{
		SessionID: p.sessionID,
		InitialQuality: adaptive.QualitySettings{
			Level:     adaptive.QualityLevelHigh,
			Bitrate:   p.targetBitrate,
			FrameRate: p.targetFPS,
			Width:     p.targetWidth,
			Height:    p.targetHeight,
		},
		Logger: p.logger,
	})

	// Wire quality controller to capture if it supports adaptive bitrate
	if abc, ok := p.capture.(capture.AdaptiveBitrateCapture); ok {
		p.qualityController.SetBitrateAdjuster(adaptive.BitrateAdjusterFunc(abc.SetBitrate))
		p.logger.WithField("session_id", p.sessionID).Info("Adaptive bitrate control enabled via scrcpy control socket")
	} else {
		p.logger.WithField("session_id", p.sessionID).Warn("Capture does not support adaptive bitrate, quality controller is read-only")
	}
}

// UpdateNetworkQuality updates the quality controller with network metrics
// This should be called when RTCP feedback is received from WebRTC
func (p *VideoPipeline) UpdateNetworkQuality(rtt time.Duration, packetLoss float64, bandwidth uint64) {
	if p.qualityController == nil {
		return
	}

	p.qualityController.UpdateNetworkQuality(adaptive.NetworkQuality{
		RTT:        rtt,
		PacketLoss: packetLoss,
		Bandwidth:  bandwidth,
	})

	// Attempt adaptation based on new metrics
	if changed, newQuality := p.qualityController.Adapt(); changed {
		p.logger.WithFields(logrus.Fields{
			"session_id":  p.sessionID,
			"new_level":   newQuality.Level.String(),
			"new_bitrate": newQuality.Bitrate,
		}).Info("Quality adapted based on network conditions")
	}
}

// GetQualityController returns the quality controller for external monitoring
func (p *VideoPipeline) GetQualityController() *adaptive.QualityController {
	return p.qualityController
}

// RequestKeyframe requests an immediate IDR/keyframe if capture supports it
// Useful for new viewers joining or after packet loss recovery
func (p *VideoPipeline) RequestKeyframe() error {
	if kr, ok := p.capture.(capture.KeyframeRequester); ok {
		return kr.RequestKeyframe()
	}
	return fmt.Errorf("capture does not support keyframe requests")
}
