package recording

import (
	"sync"
	"time"
)

// RecordingState 录像状态
type RecordingState string

const (
	StateIdle       RecordingState = "idle"
	StateRecording  RecordingState = "recording"
	StatePaused     RecordingState = "paused"
	StateStopping   RecordingState = "stopping"
	StateCompleted  RecordingState = "completed"
	StateFailed     RecordingState = "failed"
)

// RecordingFormat 录像格式
type RecordingFormat string

const (
	FormatWebM RecordingFormat = "webm" // VP8/VP9 + Opus
	FormatMP4  RecordingFormat = "mp4"  // H.264 + AAC (需要额外依赖)
)

// Recording 录像会话
type Recording struct {
	ID             string          `json:"id"`
	SessionID      string          `json:"sessionId"`      // 关联的 WebRTC 会话 ID
	DeviceID       string          `json:"deviceId"`       // 设备 ID
	UserID         string          `json:"userId"`         // 发起录像的用户
	State          RecordingState  `json:"state"`          // 录像状态
	Format         RecordingFormat `json:"format"`         // 录像格式
	FilePath       string          `json:"filePath"`       // 本地文件路径
	FileSize       int64           `json:"fileSize"`       // 文件大小 (bytes)
	Duration       time.Duration   `json:"duration"`       // 录像时长
	Width          int             `json:"width"`          // 视频宽度
	Height         int             `json:"height"`         // 视频高度
	FrameRate      int             `json:"frameRate"`      // 帧率
	Bitrate        int             `json:"bitrate"`        // 比特率
	StartedAt      time.Time       `json:"startedAt"`      // 开始时间
	StoppedAt      *time.Time      `json:"stoppedAt"`      // 结束时间
	FramesWritten  uint64          `json:"framesWritten"`  // 已写入帧数
	BytesWritten   uint64          `json:"bytesWritten"`   // 已写入字节数
	ErrorMessage   string          `json:"errorMessage"`   // 错误信息
	mu             sync.RWMutex
}

// RecordingInfo 录像信息 (用于 API 响应)
type RecordingInfo struct {
	ID            string         `json:"id"`
	SessionID     string         `json:"sessionId"`
	DeviceID      string         `json:"deviceId"`
	UserID        string         `json:"userId"`
	State         string         `json:"state"`
	Format        string         `json:"format"`
	FileSize      int64          `json:"fileSize"`
	Duration      float64        `json:"durationSeconds"`
	Width         int            `json:"width"`
	Height        int            `json:"height"`
	FrameRate     int            `json:"frameRate"`
	Bitrate       int            `json:"bitrate"`
	StartedAt     time.Time      `json:"startedAt"`
	StoppedAt     *time.Time     `json:"stoppedAt,omitempty"`
	FramesWritten uint64         `json:"framesWritten"`
	DownloadURL   string         `json:"downloadUrl,omitempty"`
}

// RecordingStats 录像统计
type RecordingStats struct {
	ActiveRecordings    int     `json:"activeRecordings"`
	TotalRecordings     int     `json:"totalRecordings"`
	TotalDurationSec    float64 `json:"totalDurationSeconds"`
	TotalBytesWritten   uint64  `json:"totalBytesWritten"`
	AverageFrameRate    float64 `json:"averageFrameRate"`
}

// StartRecordingRequest 开始录像请求
type StartRecordingRequest struct {
	SessionID   string          `json:"sessionId" binding:"required"`
	DeviceID    string          `json:"deviceId" binding:"required"`
	Format      RecordingFormat `json:"format"`      // 默认 webm
	Codec       string          `json:"codec"`       // 视频编解码器: "VP8", "VP9", "H264"，默认 VP8
	MaxDuration int             `json:"maxDuration"` // 最大录像时长 (秒), 0 = 无限制
	SPS         []byte          `json:"-"`           // H.264 SPS NAL unit (内部使用)
	PPS         []byte          `json:"-"`           // H.264 PPS NAL unit (内部使用)
}

// StopRecordingRequest 停止录像请求
type StopRecordingRequest struct {
	RecordingID string `json:"recordingId" binding:"required"`
}

// UpdateState 更新录像状态
func (r *Recording) UpdateState(state RecordingState) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.State = state
	if state == StateCompleted || state == StateFailed {
		now := time.Now()
		r.StoppedAt = &now
		r.Duration = now.Sub(r.StartedAt)
	}
}

// GetState 获取录像状态
func (r *Recording) GetState() RecordingState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.State
}

// IncrementFrames 增加帧计数
func (r *Recording) IncrementFrames(bytes int64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.FramesWritten++
	r.BytesWritten += uint64(bytes)
	r.FileSize += bytes
}

// SetError 设置错误信息
func (r *Recording) SetError(err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.State = StateFailed
	r.ErrorMessage = err.Error()
	now := time.Now()
	r.StoppedAt = &now
}

// ToInfo 转换为 API 响应格式
func (r *Recording) ToInfo(downloadBaseURL string) RecordingInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	info := RecordingInfo{
		ID:            r.ID,
		SessionID:     r.SessionID,
		DeviceID:      r.DeviceID,
		UserID:        r.UserID,
		State:         string(r.State),
		Format:        string(r.Format),
		FileSize:      r.FileSize,
		Duration:      r.Duration.Seconds(),
		Width:         r.Width,
		Height:        r.Height,
		FrameRate:     r.FrameRate,
		Bitrate:       r.Bitrate,
		StartedAt:     r.StartedAt,
		StoppedAt:     r.StoppedAt,
		FramesWritten: r.FramesWritten,
	}

	// 只有完成的录像才有下载链接
	if r.State == StateCompleted && downloadBaseURL != "" {
		info.DownloadURL = downloadBaseURL + "/recordings/" + r.ID + "/download"
	}

	return info
}
