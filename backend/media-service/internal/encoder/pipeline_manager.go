package encoder

import (
	"context"
	"fmt"
	"sync"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// PipelineManager manages video and audio pipelines for multiple sessions
type PipelineManager struct {
	videoPipelines map[string]*VideoPipeline
	audioPipelines map[string]*AudioPipeline
	mu             sync.RWMutex
	logger         *logrus.Logger
}

// NewPipelineManager creates a new pipeline manager
func NewPipelineManager(logger *logrus.Logger) *PipelineManager {
	if logger == nil {
		logger = logrus.New()
	}

	return &PipelineManager{
		videoPipelines: make(map[string]*VideoPipeline),
		audioPipelines: make(map[string]*AudioPipeline),
		logger:         logger,
	}
}

// CreateVideoPipeline creates and starts a video pipeline for a session
func (pm *PipelineManager) CreateVideoPipeline(
	ctx context.Context,
	sessionID string,
	deviceID string,
	screenCapture capture.ScreenCapture,
	frameWriter FrameWriter,
	targetFPS int,
	targetBitrate int,
) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Check if pipeline already exists
	if _, exists := pm.videoPipelines[sessionID]; exists {
		return fmt.Errorf("video pipeline already exists for session %s", sessionID)
	}

	// Create pipeline
	pipeline, err := NewVideoPipeline(PipelineOptions{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		Capture:       screenCapture,
		Encoder:       NewPassThroughEncoder(), // Use pass-through for now
		FrameWriter:   frameWriter,
		TargetFPS:     targetFPS,
		TargetBitrate: targetBitrate,
		AdaptiveMode:  true,
		Logger:        pm.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create video pipeline: %w", err)
	}

	// Start pipeline
	if err := pipeline.Start(ctx); err != nil {
		return fmt.Errorf("failed to start video pipeline: %w", err)
	}

	pm.videoPipelines[sessionID] = pipeline

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
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Check if pipeline already exists
	if _, exists := pm.audioPipelines[sessionID]; exists {
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

	pm.audioPipelines[sessionID] = pipeline

	pm.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"device_id":  deviceID,
	}).Info("Audio pipeline created and started")

	return nil
}

// StopVideoPipeline stops and removes a video pipeline
func (pm *PipelineManager) StopVideoPipeline(sessionID string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pipeline, exists := pm.videoPipelines[sessionID]
	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	if err := pipeline.Stop(); err != nil {
		pm.logger.WithError(err).Warn("Error stopping video pipeline")
	}

	delete(pm.videoPipelines, sessionID)

	pm.logger.WithField("session_id", sessionID).Info("Video pipeline stopped and removed")

	return nil
}

// StopAudioPipeline stops and removes an audio pipeline
func (pm *PipelineManager) StopAudioPipeline(sessionID string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pipeline, exists := pm.audioPipelines[sessionID]
	if !exists {
		return fmt.Errorf("audio pipeline not found for session %s", sessionID)
	}

	if err := pipeline.Stop(); err != nil {
		pm.logger.WithError(err).Warn("Error stopping audio pipeline")
	}

	delete(pm.audioPipelines, sessionID)

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
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	pipeline, exists := pm.videoPipelines[sessionID]
	if !exists {
		return PipelineStats{}, fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.GetStats(), nil
}

// GetAudioPipelineStats returns statistics for an audio pipeline
func (pm *PipelineManager) GetAudioPipelineStats(sessionID string) (AudioPipelineStats, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	pipeline, exists := pm.audioPipelines[sessionID]
	if !exists {
		return AudioPipelineStats{}, fmt.Errorf("audio pipeline not found for session %s", sessionID)
	}

	return pipeline.GetStats(), nil
}

// AdjustVideoBitrate adjusts the bitrate for a video pipeline
func (pm *PipelineManager) AdjustVideoBitrate(sessionID string, bitrate int) error {
	pm.mu.RLock()
	pipeline, exists := pm.videoPipelines[sessionID]
	pm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.SetTargetBitrate(bitrate)
}

// AdjustVideoFPS adjusts the frame rate for a video pipeline
func (pm *PipelineManager) AdjustVideoFPS(sessionID string, fps int) error {
	pm.mu.RLock()
	pipeline, exists := pm.videoPipelines[sessionID]
	pm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("video pipeline not found for session %s", sessionID)
	}

	return pipeline.SetTargetFPS(fps)
}

// GetActivePipelineCount returns the number of active pipelines
func (pm *PipelineManager) GetActivePipelineCount() (videoPipelines, audioPipelines int) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	return len(pm.videoPipelines), len(pm.audioPipelines)
}

// ListActiveSessions returns all session IDs with active pipelines
func (pm *PipelineManager) ListActiveSessions() []string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	sessionSet := make(map[string]bool)

	for sessionID := range pm.videoPipelines {
		sessionSet[sessionID] = true
	}

	for sessionID := range pm.audioPipelines {
		sessionSet[sessionID] = true
	}

	sessions := make([]string, 0, len(sessionSet))
	for sessionID := range sessionSet {
		sessions = append(sessions, sessionID)
	}

	return sessions
}

// Cleanup stops and removes all pipelines
func (pm *PipelineManager) Cleanup() {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Stop all video pipelines
	for sessionID, pipeline := range pm.videoPipelines {
		if err := pipeline.Stop(); err != nil {
			pm.logger.WithError(err).WithField("session_id", sessionID).
				Warn("Error stopping video pipeline during cleanup")
		}
	}

	// Stop all audio pipelines
	for sessionID, pipeline := range pm.audioPipelines {
		if err := pipeline.Stop(); err != nil {
			pm.logger.WithError(err).WithField("session_id", sessionID).
				Warn("Error stopping audio pipeline during cleanup")
		}
	}

	// Clear maps
	pm.videoPipelines = make(map[string]*VideoPipeline)
	pm.audioPipelines = make(map[string]*AudioPipeline)

	pm.logger.Info("Pipeline manager cleanup completed")
}
