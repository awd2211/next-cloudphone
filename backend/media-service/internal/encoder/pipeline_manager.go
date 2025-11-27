package encoder

import (
	"context"
	"fmt"
	"hash/fnv"
	"sync"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

const defaultNumShards = 16 // 默认分片数量，平衡并发和内存

// pipelineShard 单个分片，包含视频和音频管道
type pipelineShard struct {
	mu             sync.RWMutex
	videoPipelines map[string]*VideoPipeline
	audioPipelines map[string]*AudioPipeline
}

// PipelineManager manages video and audio pipelines for multiple sessions
// 使用分片锁架构提高并发性能：
//   - numShards=1: 单锁模式，适合小规模部署
//   - numShards=16: 分片模式，适合高并发场景（默认）
type PipelineManager struct {
	shards    []pipelineShard
	numShards uint32
	logger    *logrus.Logger
}

// PipelineManagerOption 配置选项
type PipelineManagerOption func(*PipelineManager)

// WithNumShards 设置分片数量
func WithNumShards(n int) PipelineManagerOption {
	return func(pm *PipelineManager) {
		if n < 1 {
			n = 1
		}
		pm.numShards = uint32(n)
	}
}

// NewPipelineManager creates a new pipeline manager
func NewPipelineManager(logger *logrus.Logger, opts ...PipelineManagerOption) *PipelineManager {
	if logger == nil {
		logger = logrus.New()
	}

	pm := &PipelineManager{
		numShards: defaultNumShards,
		logger:    logger,
	}

	// 应用配置选项
	for _, opt := range opts {
		opt(pm)
	}

	// 初始化分片
	pm.shards = make([]pipelineShard, pm.numShards)
	for i := uint32(0); i < pm.numShards; i++ {
		pm.shards[i].videoPipelines = make(map[string]*VideoPipeline)
		pm.shards[i].audioPipelines = make(map[string]*AudioPipeline)
	}

	logger.WithField("num_shards", pm.numShards).Info("Pipeline manager initialized with sharded locks")

	return pm
}

// getShard 获取 sessionID 对应的分片（FNV hash 分布）
func (pm *PipelineManager) getShard(sessionID string) *pipelineShard {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	index := h.Sum32() % pm.numShards
	return &pm.shards[index]
}

// getShardIndex 获取分片索引（仅用于日志）
func (pm *PipelineManager) getShardIndex(sessionID string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	return h.Sum32() % pm.numShards
}

// CreateVideoPipelineOptions contains options for creating a video pipeline
type CreateVideoPipelineOptions struct {
	UseH264Passthrough bool // If true, use PassThroughEncoder for pre-encoded H.264 (e.g., from scrcpy)
}

// CreateVideoPipeline creates and starts a video pipeline for a session
// targetWidth/targetHeight: Resolution scaling for WiFi ADB optimization (0 = native resolution)
func (pm *PipelineManager) CreateVideoPipeline(
	ctx context.Context,
	sessionID string,
	deviceID string,
	screenCapture capture.ScreenCapture,
	frameWriter FrameWriter,
	targetFPS int,
	targetBitrate int,
	targetWidth int,
	targetHeight int,
	opts ...CreateVideoPipelineOptions,
) error {
	// 获取对应分片
	shard := pm.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	// Check if pipeline already exists
	if _, exists := shard.videoPipelines[sessionID]; exists {
		return fmt.Errorf("video pipeline already exists for session %s", sessionID)
	}

	// Parse options
	var pipelineOpts CreateVideoPipelineOptions
	if len(opts) > 0 {
		pipelineOpts = opts[0]
	}

	// Select encoder based on capture mode
	// - scrcpy outputs pre-encoded H.264 NAL units → use PassThroughEncoder (zero-copy)
	// - screencap outputs raw PNG frames → use VP8FrameEncoder (decode + encode)
	var encoder VideoEncoder
	var encoderName string

	if pipelineOpts.UseH264Passthrough {
		// scrcpy mode: H.264 直通，无需二次编码
		// 性能提升: 避免 H.264 → 解码 → VP8 编码的开销
		encoder = NewPassThroughEncoder()
		encoderName = "PassThroughEncoder (H.264)"
	} else {
		// screencap mode: PNG → VP8 编码
		encoder = NewVP8FrameEncoder(targetBitrate, targetFPS, pm.logger)
		encoderName = "VP8FrameEncoder"
	}

	pm.logger.WithFields(logrus.Fields{
		"session_id":       sessionID,
		"device_id":        deviceID,
		"target_fps":       targetFPS,
		"target_bitrate":   targetBitrate,
		"target_width":     targetWidth,
		"target_height":    targetHeight,
		"encoder":          encoderName,
		"h264_passthrough": pipelineOpts.UseH264Passthrough,
		"shard":            fmt.Sprintf("%d/%d", pm.getShardIndex(sessionID), pm.numShards),
	}).Info("Creating video pipeline")

	// Create pipeline
	pipeline, err := NewVideoPipeline(PipelineOptions{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		Capture:       screenCapture,
		Encoder:       encoder, // VP8FrameEncoder for screencap, PassThroughEncoder for scrcpy H.264
		FrameWriter:   frameWriter,
		TargetFPS:     targetFPS,
		TargetBitrate: targetBitrate,
		AdaptiveMode:  !pipelineOpts.UseH264Passthrough, // Disable adaptive mode for H.264 passthrough
		Logger:        pm.logger,
		TargetWidth:   targetWidth,  // WiFi ADB optimization
		TargetHeight:  targetHeight,
	})
	if err != nil {
		return fmt.Errorf("failed to create video pipeline: %w", err)
	}

	// Start pipeline
	if err := pipeline.Start(ctx); err != nil {
		return fmt.Errorf("failed to start video pipeline: %w", err)
	}

	shard.videoPipelines[sessionID] = pipeline

	pm.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"device_id":  deviceID,
	}).Info("Video pipeline created and started")

	return nil
}

// CreateAudioPipeline creates and starts an audio pipeline for a session
func (pm *PipelineManager) CreateAudioPipeline(
	ctx context.Context,
	sessionID string,
	deviceID string,
	audioCapture capture.AudioCapture,
	frameWriter AudioFrameWriter,
) error {
	// 获取对应分片
	shard := pm.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	// Check if pipeline already exists
	if _, exists := shard.audioPipelines[sessionID]; exists {
		return fmt.Errorf("audio pipeline already exists for session %s", sessionID)
	}

	// Create pipeline
	pipeline, err := NewAudioPipeline(AudioPipelineOptions{
		SessionID:   sessionID,
		DeviceID:    deviceID,
		Capture:     audioCapture,
		Encoder:     NewPassThroughAudioEncoder(), // Use pass-through for now
		FrameWriter: frameWriter,
		Logger:      pm.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create audio pipeline: %w", err)
	}

	// Start pipeline
	if err := pipeline.Start(ctx); err != nil {
		return fmt.Errorf("failed to start audio pipeline: %w", err)
	}

	shard.audioPipelines[sessionID] = pipeline

	pm.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"device_id":  deviceID,
		"shard":      fmt.Sprintf("%d/%d", pm.getShardIndex(sessionID), pm.numShards),
	}).Info("Audio pipeline created and started")

	return nil
}

// StopVideoPipeline stops and removes a video pipeline
func (pm *PipelineManager) StopVideoPipeline(sessionID string) error {
	shard := pm.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	pipeline, exists := shard.videoPipelines[sessionID]
	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	if err := pipeline.Stop(); err != nil {
		pm.logger.WithError(err).Warn("Error stopping video pipeline")
	}

	delete(shard.videoPipelines, sessionID)

	pm.logger.WithField("session_id", sessionID).Info("Video pipeline stopped and removed")

	return nil
}

// StopAudioPipeline stops and removes an audio pipeline
func (pm *PipelineManager) StopAudioPipeline(sessionID string) error {
	shard := pm.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	pipeline, exists := shard.audioPipelines[sessionID]
	if !exists {
		return fmt.Errorf("audio pipeline not found for session %s", sessionID)
	}

	if err := pipeline.Stop(); err != nil {
		pm.logger.WithError(err).Warn("Error stopping audio pipeline")
	}

	delete(shard.audioPipelines, sessionID)

	pm.logger.WithField("session_id", sessionID).Info("Audio pipeline stopped and removed")

	return nil
}

// StopAllPipelines stops all pipelines for a session
func (pm *PipelineManager) StopAllPipelines(sessionID string) error {
	var videoErr, audioErr error

	// Try to stop video pipeline
	if err := pm.StopVideoPipeline(sessionID); err != nil {
		videoErr = err
	}

	// Try to stop audio pipeline
	if err := pm.StopAudioPipeline(sessionID); err != nil {
		audioErr = err
	}

	if videoErr != nil {
		return videoErr
	}
	if audioErr != nil {
		return audioErr
	}

	return nil
}

// GetVideoPipelineStats returns statistics for a video pipeline
func (pm *PipelineManager) GetVideoPipelineStats(sessionID string) (PipelineStats, error) {
	shard := pm.getShard(sessionID)

	shard.mu.RLock()
	defer shard.mu.RUnlock()

	pipeline, exists := shard.videoPipelines[sessionID]
	if !exists {
		return PipelineStats{}, fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.GetStats(), nil
}

// GetAudioPipelineStats returns statistics for an audio pipeline
func (pm *PipelineManager) GetAudioPipelineStats(sessionID string) (AudioPipelineStats, error) {
	shard := pm.getShard(sessionID)

	shard.mu.RLock()
	defer shard.mu.RUnlock()

	pipeline, exists := shard.audioPipelines[sessionID]
	if !exists {
		return AudioPipelineStats{}, fmt.Errorf("audio pipeline not found for session %s", sessionID)
	}

	return pipeline.GetStats(), nil
}

// AdjustVideoBitrate adjusts the bitrate for a video pipeline
func (pm *PipelineManager) AdjustVideoBitrate(sessionID string, bitrate int) error {
	shard := pm.getShard(sessionID)

	shard.mu.RLock()
	pipeline, exists := shard.videoPipelines[sessionID]
	shard.mu.RUnlock()

	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.SetTargetBitrate(bitrate)
}

// AdjustVideoFPS adjusts the frame rate for a video pipeline
func (pm *PipelineManager) AdjustVideoFPS(sessionID string, fps int) error {
	shard := pm.getShard(sessionID)

	shard.mu.RLock()
	pipeline, exists := shard.videoPipelines[sessionID]
	shard.mu.RUnlock()

	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.SetTargetFPS(fps)
}

// GetActivePipelineCount returns the number of active pipelines
func (pm *PipelineManager) GetActivePipelineCount() (videoPipelines, audioPipelines int) {
	// 并发读取所有分片
	var wg sync.WaitGroup
	var mu sync.Mutex

	for i := uint32(0); i < pm.numShards; i++ {
		wg.Add(1)
		go func(shard *pipelineShard) {
			defer wg.Done()

			shard.mu.RLock()
			videoCount := len(shard.videoPipelines)
			audioCount := len(shard.audioPipelines)
			shard.mu.RUnlock()

			mu.Lock()
			videoPipelines += videoCount
			audioPipelines += audioCount
			mu.Unlock()
		}(&pm.shards[i])
	}

	wg.Wait()
	return
}

// ListActiveSessions returns all session IDs with active pipelines
func (pm *PipelineManager) ListActiveSessions() []string {
	sessionSet := make(map[string]bool)
	var mu sync.Mutex

	// 并发读取所有分片
	var wg sync.WaitGroup

	for i := uint32(0); i < pm.numShards; i++ {
		wg.Add(1)
		go func(shard *pipelineShard) {
			defer wg.Done()

			shard.mu.RLock()
			localSessions := make([]string, 0)
			for sessionID := range shard.videoPipelines {
				localSessions = append(localSessions, sessionID)
			}
			for sessionID := range shard.audioPipelines {
				localSessions = append(localSessions, sessionID)
			}
			shard.mu.RUnlock()

			mu.Lock()
			for _, s := range localSessions {
				sessionSet[s] = true
			}
			mu.Unlock()
		}(&pm.shards[i])
	}

	wg.Wait()

	sessions := make([]string, 0, len(sessionSet))
	for sessionID := range sessionSet {
		sessions = append(sessions, sessionID)
	}

	return sessions
}

// Cleanup stops and removes all pipelines
func (pm *PipelineManager) Cleanup() {
	// 并发清理每个分片
	var wg sync.WaitGroup

	for i := uint32(0); i < pm.numShards; i++ {
		wg.Add(1)
		go func(shard *pipelineShard) {
			defer wg.Done()

			shard.mu.Lock()
			defer shard.mu.Unlock()

			// Stop all video pipelines
			for sessionID, pipeline := range shard.videoPipelines {
				if err := pipeline.Stop(); err != nil {
					pm.logger.WithError(err).WithField("session_id", sessionID).
						Warn("Error stopping video pipeline during cleanup")
				}
			}

			// Stop all audio pipelines
			for sessionID, pipeline := range shard.audioPipelines {
				if err := pipeline.Stop(); err != nil {
					pm.logger.WithError(err).WithField("session_id", sessionID).
						Warn("Error stopping audio pipeline during cleanup")
				}
			}

			// Clear maps
			shard.videoPipelines = make(map[string]*VideoPipeline)
			shard.audioPipelines = make(map[string]*AudioPipeline)
		}(&pm.shards[i])
	}

	wg.Wait()

	pm.logger.Info("Pipeline manager cleanup completed")
}

// GetShardStats 返回分片统计信息（用于监控和调试）
func (pm *PipelineManager) GetShardStats() []ShardStats {
	stats := make([]ShardStats, pm.numShards)

	var wg sync.WaitGroup

	for i := uint32(0); i < pm.numShards; i++ {
		wg.Add(1)
		go func(idx uint32, shard *pipelineShard) {
			defer wg.Done()

			shard.mu.RLock()
			stats[idx] = ShardStats{
				ShardIndex:     idx,
				VideoPipelines: len(shard.videoPipelines),
				AudioPipelines: len(shard.audioPipelines),
			}
			shard.mu.RUnlock()
		}(i, &pm.shards[i])
	}

	wg.Wait()
	return stats
}

// ShardStats 分片统计信息
type ShardStats struct {
	ShardIndex     uint32 `json:"shard_index"`
	VideoPipelines int    `json:"video_pipelines"`
	AudioPipelines int    `json:"audio_pipelines"`
}

// RequestKeyframe requests an IDR/keyframe for a video pipeline
// This is called by RTCPCollector when receiving PLI/FIR or detecting high packet loss
func (pm *PipelineManager) RequestKeyframe(sessionID string) error {
	shard := pm.getShard(sessionID)

	shard.mu.RLock()
	pipeline, exists := shard.videoPipelines[sessionID]
	shard.mu.RUnlock()

	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.RequestKeyframe()
}

// GetKeyframeRequester returns a function that can be used as RTCPCollector's keyframe requester
// This creates a closure that captures the sessionID for the keyframe request
func (pm *PipelineManager) GetKeyframeRequester(sessionID string) func() error {
	return func() error {
		return pm.RequestKeyframe(sessionID)
	}
}
