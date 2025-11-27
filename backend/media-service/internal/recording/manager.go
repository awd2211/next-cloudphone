package recording

import (
	"context"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

const (
	defaultNumShards    = 16
	defaultMaxDuration  = 3600 // 1 hour in seconds
	defaultStoragePath  = "./recordings"
)

// Manager 管理所有录像会话
type Manager struct {
	shards      []*recordingShard
	numShards   int
	storagePath string
	logger      *zap.Logger
	baseURL     string // 用于生成下载 URL
}

// recordingShard 录像分片，用于减少锁竞争
type recordingShard struct {
	recordings map[string]*recordingSession
	mu         sync.RWMutex
}

// recordingSession 活跃的录像会话
type recordingSession struct {
	recording  *Recording
	writer     *WebMWriter
	cancel     context.CancelFunc
	wg         sync.WaitGroup
}

// ManagerOption 管理器配置选项
type ManagerOption func(*Manager)

// WithStoragePath 设置存储路径
func WithStoragePath(path string) ManagerOption {
	return func(m *Manager) {
		m.storagePath = path
	}
}

// WithNumShards 设置分片数量
func WithNumShards(n int) ManagerOption {
	return func(m *Manager) {
		if n > 0 {
			m.numShards = n
		}
	}
}

// WithLogger 设置日志器
func WithLogger(logger *zap.Logger) ManagerOption {
	return func(m *Manager) {
		m.logger = logger
	}
}

// WithBaseURL 设置下载 URL 基础路径
func WithBaseURL(url string) ManagerOption {
	return func(m *Manager) {
		m.baseURL = url
	}
}

// NewManager 创建录像管理器
func NewManager(opts ...ManagerOption) (*Manager, error) {
	m := &Manager{
		numShards:   defaultNumShards,
		storagePath: defaultStoragePath,
		logger:      zap.NewNop(),
	}

	for _, opt := range opts {
		opt(m)
	}

	// 创建存储目录
	if err := os.MkdirAll(m.storagePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	// 初始化分片
	m.shards = make([]*recordingShard, m.numShards)
	for i := 0; i < m.numShards; i++ {
		m.shards[i] = &recordingShard{
			recordings: make(map[string]*recordingSession),
		}
	}

	m.logger.Info("recording_manager_initialized",
		zap.String("storage_path", m.storagePath),
		zap.Int("num_shards", m.numShards),
	)

	return m, nil
}

// getShard 根据 ID 获取对应的分片
func (m *Manager) getShard(id string) *recordingShard {
	h := fnv.New32a()
	h.Write([]byte(id))
	return m.shards[h.Sum32()%uint32(m.numShards)]
}

// StartRecording 开始录像
func (m *Manager) StartRecording(ctx context.Context, req StartRecordingRequest, width, height int) (*Recording, error) {
	recordingID := uuid.New().String()

	// 确定录像格式
	format := req.Format
	if format == "" {
		format = FormatWebM
	}

	// 创建录像记录
	recording := &Recording{
		ID:        recordingID,
		SessionID: req.SessionID,
		DeviceID:  req.DeviceID,
		UserID:    "", // 从 ctx 获取
		State:     StateRecording,
		Format:    format,
		Width:     width,
		Height:    height,
		FrameRate: 30, // 默认帧率
		Bitrate:   2000000,
		StartedAt: time.Now(),
	}

	// 生成文件路径
	timestamp := time.Now().Format("20060102_150405")
	fileName := fmt.Sprintf("%s_%s_%s.webm", req.DeviceID, timestamp, recordingID[:8])
	recording.FilePath = filepath.Join(m.storagePath, fileName)

	// 创建 WebM 写入器
	codecID := req.Codec
	if codecID == "" {
		codecID = "VP8" // 默认使用 VP8
	}
	writer, err := NewWebMWriter(WebMWriterOptions{
		FilePath:  recording.FilePath,
		Width:     width,
		Height:    height,
		FrameRate: recording.FrameRate,
		CodecID:   codecID,
		SPS:       req.SPS, // H.264 SPS NAL unit
		PPS:       req.PPS, // H.264 PPS NAL unit
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create WebM writer: %w", err)
	}

	// 写入头部
	if err := writer.WriteHeader(); err != nil {
		writer.Close()
		os.Remove(recording.FilePath)
		return nil, fmt.Errorf("failed to write WebM header: %w", err)
	}

	// 创建取消上下文
	recordCtx, cancel := context.WithCancel(ctx)

	// 创建会话
	session := &recordingSession{
		recording: recording,
		writer:    writer,
		cancel:    cancel,
	}

	// 存储到分片
	shard := m.getShard(recordingID)
	shard.mu.Lock()
	shard.recordings[recordingID] = session
	shard.mu.Unlock()

	// 启动超时监控
	if req.MaxDuration > 0 {
		session.wg.Add(1)
		go func() {
			defer session.wg.Done()
			select {
			case <-recordCtx.Done():
				return
			case <-time.After(time.Duration(req.MaxDuration) * time.Second):
				m.logger.Info("recording_max_duration_reached",
					zap.String("recording_id", recordingID),
					zap.Int("max_duration", req.MaxDuration),
				)
				m.StopRecording(recordingID)
			}
		}()
	}

	m.logger.Info("recording_started",
		zap.String("recording_id", recordingID),
		zap.String("session_id", req.SessionID),
		zap.String("device_id", req.DeviceID),
		zap.String("file_path", recording.FilePath),
		zap.Int("width", width),
		zap.Int("height", height),
	)

	return recording, nil
}

// WriteFrame 写入视频帧
func (m *Manager) WriteFrame(recordingID string, frame []byte, timestamp time.Duration, keyframe bool) error {
	shard := m.getShard(recordingID)
	shard.mu.RLock()
	session, exists := shard.recordings[recordingID]
	shard.mu.RUnlock()

	if !exists {
		return fmt.Errorf("recording not found: %s", recordingID)
	}

	if session.recording.GetState() != StateRecording {
		return fmt.Errorf("recording is not active: %s", session.recording.GetState())
	}

	if err := session.writer.WriteFrame(frame, timestamp, keyframe); err != nil {
		return fmt.Errorf("failed to write frame: %w", err)
	}

	session.recording.IncrementFrames(int64(len(frame)))
	return nil
}

// StopRecording 停止录像
func (m *Manager) StopRecording(recordingID string) (*Recording, error) {
	shard := m.getShard(recordingID)

	shard.mu.Lock()
	session, exists := shard.recordings[recordingID]
	if !exists {
		shard.mu.Unlock()
		return nil, fmt.Errorf("recording not found: %s", recordingID)
	}

	// 从活跃录像中移除
	delete(shard.recordings, recordingID)
	shard.mu.Unlock()

	// 取消上下文
	session.cancel()

	// 等待所有 goroutine 完成
	session.wg.Wait()

	// 更新状态
	session.recording.UpdateState(StateStopping)

	// 关闭写入器
	if err := session.writer.Close(); err != nil {
		session.recording.SetError(err)
		m.logger.Error("failed_to_close_recording",
			zap.String("recording_id", recordingID),
			zap.Error(err),
		)
		return session.recording, err
	}

	// 获取文件信息
	fileInfo, err := os.Stat(session.recording.FilePath)
	if err == nil {
		session.recording.FileSize = fileInfo.Size()
	}

	// 获取写入统计
	frames, bytes, duration := session.writer.GetStats()
	session.recording.FramesWritten = frames
	session.recording.BytesWritten = bytes
	session.recording.Duration = duration

	// 更新为完成状态
	session.recording.UpdateState(StateCompleted)

	m.logger.Info("recording_stopped",
		zap.String("recording_id", recordingID),
		zap.Uint64("frames_written", frames),
		zap.Uint64("bytes_written", bytes),
		zap.Duration("duration", duration),
		zap.Int64("file_size", session.recording.FileSize),
	)

	return session.recording, nil
}

// GetRecording 获取录像信息
func (m *Manager) GetRecording(recordingID string) (*Recording, error) {
	shard := m.getShard(recordingID)
	shard.mu.RLock()
	session, exists := shard.recordings[recordingID]
	shard.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("recording not found: %s", recordingID)
	}

	return session.recording, nil
}

// GetRecordingFilePath 获取录像文件路径
func (m *Manager) GetRecordingFilePath(recordingID string) (string, error) {
	// 首先检查活跃录像
	shard := m.getShard(recordingID)
	shard.mu.RLock()
	session, exists := shard.recordings[recordingID]
	shard.mu.RUnlock()

	if exists {
		return session.recording.FilePath, nil
	}

	// 如果不在活跃录像中，尝试在存储目录中查找
	pattern := filepath.Join(m.storagePath, fmt.Sprintf("*_%s.webm", recordingID[:8]))
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return "", fmt.Errorf("failed to search for recording file: %w", err)
	}

	if len(matches) == 0 {
		return "", fmt.Errorf("recording file not found: %s", recordingID)
	}

	return matches[0], nil
}

// ListActiveRecordings 列出所有活跃录像
func (m *Manager) ListActiveRecordings() []*Recording {
	var recordings []*Recording

	for _, shard := range m.shards {
		shard.mu.RLock()
		for _, session := range shard.recordings {
			recordings = append(recordings, session.recording)
		}
		shard.mu.RUnlock()
	}

	return recordings
}

// GetStats 获取录像统计
func (m *Manager) GetStats() RecordingStats {
	stats := RecordingStats{}

	for _, shard := range m.shards {
		shard.mu.RLock()
		for _, session := range shard.recordings {
			stats.ActiveRecordings++
			stats.TotalBytesWritten += session.recording.BytesWritten
			if session.recording.FrameRate > 0 {
				stats.AverageFrameRate += float64(session.recording.FrameRate)
			}
		}
		shard.mu.RUnlock()
	}

	if stats.ActiveRecordings > 0 {
		stats.AverageFrameRate /= float64(stats.ActiveRecordings)
	}

	// 统计存储目录中的所有录像文件
	files, _ := filepath.Glob(filepath.Join(m.storagePath, "*.webm"))
	stats.TotalRecordings = len(files)

	return stats
}

// Cleanup 清理过期录像文件
func (m *Manager) Cleanup(maxAge time.Duration) (int, error) {
	files, err := filepath.Glob(filepath.Join(m.storagePath, "*.webm"))
	if err != nil {
		return 0, fmt.Errorf("failed to list recording files: %w", err)
	}

	deleted := 0
	now := time.Now()

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}

		if now.Sub(info.ModTime()) > maxAge {
			if err := os.Remove(file); err != nil {
				m.logger.Warn("failed_to_delete_recording",
					zap.String("file", file),
					zap.Error(err),
				)
				continue
			}
			deleted++
			m.logger.Info("recording_deleted",
				zap.String("file", file),
				zap.Duration("age", now.Sub(info.ModTime())),
			)
		}
	}

	return deleted, nil
}

// StopAll 停止所有录像
func (m *Manager) StopAll() {
	for _, shard := range m.shards {
		shard.mu.Lock()
		for id, session := range shard.recordings {
			session.cancel()
			session.writer.Close()
			session.recording.UpdateState(StateCompleted)
			m.logger.Info("recording_force_stopped",
				zap.String("recording_id", id),
			)
		}
		shard.recordings = make(map[string]*recordingSession)
		shard.mu.Unlock()
	}
}

// GetBaseURL 获取下载基础 URL
func (m *Manager) GetBaseURL() string {
	return m.baseURL
}
