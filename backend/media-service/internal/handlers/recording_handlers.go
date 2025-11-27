package handlers

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/recording"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RecordingHandler 录像 API 处理器
type RecordingHandler struct {
	manager             *recording.Manager
	webrtcManager       *webrtc.Manager
	combinedFrameWriter *CombinedFrameWriter // 组合帧写入器，用于关联录像和 WebRTC
	logger              *zap.Logger
}

// RecordingHandlerOption 处理器配置选项
type RecordingHandlerOption func(*RecordingHandler)

// WithRecordingLogger 设置日志器
func WithRecordingLogger(logger *zap.Logger) RecordingHandlerOption {
	return func(h *RecordingHandler) {
		h.logger = logger
	}
}

// WithCombinedFrameWriterForRecording 设置组合帧写入器
func WithCombinedFrameWriterForRecording(cfw *CombinedFrameWriter) RecordingHandlerOption {
	return func(h *RecordingHandler) {
		h.combinedFrameWriter = cfw
	}
}

// NewRecordingHandler 创建录像处理器
func NewRecordingHandler(
	manager *recording.Manager,
	webrtcManager *webrtc.Manager,
	opts ...RecordingHandlerOption,
) *RecordingHandler {
	h := &RecordingHandler{
		manager:       manager,
		webrtcManager: webrtcManager,
		logger:        zap.NewNop(),
	}

	for _, opt := range opts {
		opt(h)
	}

	return h
}

// HandleStartRecording 开始录像
// POST /api/media/recordings
func (h *RecordingHandler) HandleStartRecording(c *gin.Context) {
	var req recording.StartRecordingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": err.Error(),
		})
		return
	}

	// 获取会话信息以获取视频分辨率
	session, err := h.webrtcManager.GetSession(req.SessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "session_not_found",
			"message": "WebRTC session not found: " + req.SessionID,
		})
		return
	}

	// 使用默认分辨率（如果无法从会话获取）
	width := 1280
	height := 720
	if session != nil {
		// 这里可以从会话中获取实际分辨率
		// 但目前使用默认值
	}

	// 开始录像
	ctx := context.Background()
	rec, err := h.manager.StartRecording(ctx, req, width, height)
	if err != nil {
		h.logger.Error("failed_to_start_recording",
			zap.String("session_id", req.SessionID),
			zap.String("device_id", req.DeviceID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "recording_start_failed",
			"message": err.Error(),
		})
		return
	}

	// 通知 CombinedFrameWriter 开始录像（关联 sessionID 和 recordingID）
	if h.combinedFrameWriter != nil {
		h.combinedFrameWriter.StartRecording(req.SessionID, rec.ID)
		h.logger.Info("combined_frame_writer_recording_started",
			zap.String("recording_id", rec.ID),
			zap.String("session_id", req.SessionID),
		)
	}

	h.logger.Info("recording_started",
		zap.String("recording_id", rec.ID),
		zap.String("session_id", req.SessionID),
		zap.String("device_id", req.DeviceID),
	)

	c.JSON(http.StatusOK, gin.H{
		"recording": rec.ToInfo(h.manager.GetBaseURL()),
	})
}

// HandleStopRecording 停止录像
// POST /api/media/recordings/:id/stop
func (h *RecordingHandler) HandleStopRecording(c *gin.Context) {
	recordingID := c.Param("id")
	if recordingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "recording ID is required",
		})
		return
	}

	// 先获取录像信息以获取 sessionID
	recBefore, err := h.manager.GetRecording(recordingID)
	if err == nil && h.combinedFrameWriter != nil {
		// 通知 CombinedFrameWriter 停止录像
		h.combinedFrameWriter.StopRecording(recBefore.SessionID)
		h.logger.Info("combined_frame_writer_recording_stopped",
			zap.String("recording_id", recordingID),
			zap.String("session_id", recBefore.SessionID),
		)
	}

	rec, err := h.manager.StopRecording(recordingID)
	if err != nil {
		h.logger.Error("failed_to_stop_recording",
			zap.String("recording_id", recordingID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "recording_stop_failed",
			"message": err.Error(),
		})
		return
	}

	h.logger.Info("recording_stopped",
		zap.String("recording_id", recordingID),
		zap.Duration("duration", rec.Duration),
		zap.Int64("file_size", rec.FileSize),
	)

	c.JSON(http.StatusOK, gin.H{
		"recording": rec.ToInfo(h.manager.GetBaseURL()),
	})
}

// HandleGetRecording 获取录像信息
// GET /api/media/recordings/:id
func (h *RecordingHandler) HandleGetRecording(c *gin.Context) {
	recordingID := c.Param("id")
	if recordingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "recording ID is required",
		})
		return
	}

	rec, err := h.manager.GetRecording(recordingID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "recording_not_found",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recording": rec.ToInfo(h.manager.GetBaseURL()),
	})
}

// HandleListRecordings 列出所有活跃录像
// GET /api/media/recordings
func (h *RecordingHandler) HandleListRecordings(c *gin.Context) {
	recordings := h.manager.ListActiveRecordings()

	var infos []recording.RecordingInfo
	for _, rec := range recordings {
		infos = append(infos, rec.ToInfo(h.manager.GetBaseURL()))
	}

	c.JSON(http.StatusOK, gin.H{
		"recordings": infos,
		"total":      len(infos),
	})
}

// HandleDownloadRecording 下载录像文件
// GET /api/media/recordings/:id/download
func (h *RecordingHandler) HandleDownloadRecording(c *gin.Context) {
	recordingID := c.Param("id")
	if recordingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "recording ID is required",
		})
		return
	}

	filePath, err := h.manager.GetRecordingFilePath(recordingID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "recording_not_found",
			"message": err.Error(),
		})
		return
	}

	// 检查文件是否存在
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "file_not_found",
			"message": "recording file not found",
		})
		return
	}

	// 设置响应头
	fileName := filepath.Base(filePath)
	c.Header("Content-Disposition", "attachment; filename="+fileName)
	c.Header("Content-Type", "video/webm")
	c.Header("Content-Length", strconv.FormatInt(fileInfo.Size(), 10))

	// 发送文件
	c.File(filePath)
}

// HandleDeleteRecording 删除录像
// DELETE /api/media/recordings/:id
func (h *RecordingHandler) HandleDeleteRecording(c *gin.Context) {
	recordingID := c.Param("id")
	if recordingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "recording ID is required",
		})
		return
	}

	// 先停止录像（如果还在进行中）
	h.manager.StopRecording(recordingID)

	// 获取文件路径
	filePath, err := h.manager.GetRecordingFilePath(recordingID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "recording_not_found",
			"message": err.Error(),
		})
		return
	}

	// 删除文件
	if err := os.Remove(filePath); err != nil {
		h.logger.Error("failed_to_delete_recording_file",
			zap.String("recording_id", recordingID),
			zap.String("file_path", filePath),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "delete_failed",
			"message": err.Error(),
		})
		return
	}

	h.logger.Info("recording_deleted",
		zap.String("recording_id", recordingID),
		zap.String("file_path", filePath),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "recording deleted successfully",
	})
}

// HandleRecordingStats 获取录像统计
// GET /api/media/recordings/stats
func (h *RecordingHandler) HandleRecordingStats(c *gin.Context) {
	stats := h.manager.GetStats()
	c.JSON(http.StatusOK, stats)
}

// HandleCleanupRecordings 清理过期录像
// POST /api/media/recordings/cleanup
func (h *RecordingHandler) HandleCleanupRecordings(c *gin.Context) {
	// 默认清理 7 天前的录像
	maxAgeDays := 7
	if days := c.Query("days"); days != "" {
		if d, err := strconv.Atoi(days); err == nil && d > 0 {
			maxAgeDays = d
		}
	}

	maxAge := time.Duration(maxAgeDays) * 24 * time.Hour
	deleted, err := h.manager.Cleanup(maxAge)
	if err != nil {
		h.logger.Error("cleanup_failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "cleanup_failed",
			"message": err.Error(),
		})
		return
	}

	h.logger.Info("recordings_cleanup_completed",
		zap.Int("deleted_count", deleted),
		zap.Int("max_age_days", maxAgeDays),
	)

	c.JSON(http.StatusOK, gin.H{
		"deleted":    deleted,
		"maxAgeDays": maxAgeDays,
	})
}

// HandleWriteFrame 内部接口：写入视频帧
// 这个方法不作为 HTTP 端点暴露，而是被视频管道调用
func (h *RecordingHandler) WriteFrame(recordingID string, frame []byte, timestamp time.Duration, keyframe bool) error {
	return h.manager.WriteFrame(recordingID, frame, timestamp, keyframe)
}

// GetManager 获取录像管理器（用于创建组合 FrameWriter）
func (h *RecordingHandler) GetManager() *recording.Manager {
	return h.manager
}

// ========== 组合 FrameWriter 实现 ==========

// CombinedFrameWriter 组合帧写入器
// 将视频帧同时写入 WebRTC 连接和录像文件
// 实现 encoder.FrameWriter 接口
type CombinedFrameWriter struct {
	// 主写入器（WebRTC）
	primary FrameWriterInterface
	// 录像管理器
	recordingManager *recording.Manager
	// 活跃的录像 ID 映射（sessionID -> recordingID）
	recordings map[string]string
	// 帧计数器（用于计算时间戳）
	frameCounters map[string]uint64
	// 帧率（用于计算时间戳）
	frameRate int
	mu        sync.RWMutex
	logger    *zap.Logger
}

// FrameWriterInterface 帧写入器接口
type FrameWriterInterface interface {
	WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error
}

// NewCombinedFrameWriter 创建组合帧写入器
func NewCombinedFrameWriter(
	primary FrameWriterInterface,
	recordingManager *recording.Manager,
	logger *zap.Logger,
) *CombinedFrameWriter {
	if logger == nil {
		logger = zap.NewNop()
	}
	return &CombinedFrameWriter{
		primary:          primary,
		recordingManager: recordingManager,
		recordings:       make(map[string]string),
		frameCounters:    make(map[string]uint64),
		frameRate:        30, // 默认 30fps
		logger:           logger,
	}
}

// WriteVideoFrame 写入视频帧到 WebRTC 和录像
func (w *CombinedFrameWriter) WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error {
	// 1. 先写入主写入器（WebRTC）- 这是实时的，优先级高
	if err := w.primary.WriteVideoFrame(sessionID, frame, duration); err != nil {
		return err
	}

	// 2. 检查是否有活跃的录像
	w.mu.RLock()
	recordingID, hasRecording := w.recordings[sessionID]
	w.mu.RUnlock()

	if hasRecording && w.recordingManager != nil {
		// 增加帧计数器并计算时间戳
		w.mu.Lock()
		frameCount := w.frameCounters[sessionID]
		w.frameCounters[sessionID] = frameCount + 1
		w.mu.Unlock()

		// 计算基于帧数的时间戳（更精确）
		timestamp := time.Duration(frameCount) * time.Second / time.Duration(w.frameRate)

		// 检测关键帧（VP8 关键帧的第一个字节的最低位为 0）
		keyframe := len(frame) > 0 && (frame[0]&0x01) == 0

		// 异步写入录像文件，避免阻塞实时传输
		go func(rid string, f []byte, ts time.Duration, kf bool) {
			if err := w.recordingManager.WriteFrame(rid, f, ts, kf); err != nil {
				w.logger.Warn("recording_write_frame_failed",
					zap.String("recording_id", rid),
					zap.Error(err),
				)
			}
		}(recordingID, frame, timestamp, keyframe)
	}

	return nil
}

// StartRecording 开始录像
func (w *CombinedFrameWriter) StartRecording(sessionID, recordingID string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.recordings[sessionID] = recordingID
	w.frameCounters[sessionID] = 0
	w.logger.Info("combined_writer_recording_started",
		zap.String("session_id", sessionID),
		zap.String("recording_id", recordingID),
	)
}

// StopRecording 停止录像
func (w *CombinedFrameWriter) StopRecording(sessionID string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	delete(w.recordings, sessionID)
	delete(w.frameCounters, sessionID)
	w.logger.Info("combined_writer_recording_stopped",
		zap.String("session_id", sessionID),
	)
}

// GetRecordingID 获取会话的录像 ID
func (w *CombinedFrameWriter) GetRecordingID(sessionID string) (string, bool) {
	w.mu.RLock()
	defer w.mu.RUnlock()
	rid, ok := w.recordings[sessionID]
	return rid, ok
}

// HasRecording 检查会话是否正在录像
func (w *CombinedFrameWriter) HasRecording(sessionID string) bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	_, ok := w.recordings[sessionID]
	return ok
}

// SetFrameRate 设置帧率
func (w *CombinedFrameWriter) SetFrameRate(fps int) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if fps > 0 {
		w.frameRate = fps
	}
}
