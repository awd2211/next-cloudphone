package webrtc

import (
	"time"

	"github.com/cloudphone/media-service/internal/models"
	"github.com/pion/webrtc/v3"
)

// VideoCodecType 视频编码类型
type VideoCodecType string

const (
	// VideoCodecVP8 VP8 编码（默认，兼容性好）
	VideoCodecVP8 VideoCodecType = "VP8"
	// VideoCodecH264 H.264 编码（scrcpy 直出，性能更好）
	VideoCodecH264 VideoCodecType = "H264"
)

// SessionOptions 创建会话的选项
type SessionOptions struct {
	VideoCodec VideoCodecType // 视频编码类型，默认 VP8
}

// WebRTCManager 定义 WebRTC 管理器接口
// 支持 Manager 和 ShardedManager 两种实现
type WebRTCManager interface {
	// 会话管理
	CreateSession(deviceID, userID string) (*models.Session, error)
	// CreateSessionWithOptions 使用指定选项创建会话
	// 用于 scrcpy 模式：需要创建 H.264 track 而不是 VP8
	CreateSessionWithOptions(deviceID, userID string, opts SessionOptions) (*models.Session, error)
	GetSession(sessionID string) (*models.Session, error)
	CloseSession(sessionID string) error
	GetAllSessions() []*models.Session
	CleanupInactiveSessions(timeout time.Duration)

	// SDP 处理
	CreateOffer(sessionID string) (*webrtc.SessionDescription, error)
	HandleAnswer(sessionID string, answer webrtc.SessionDescription) error

	// ICE 处理
	AddICECandidate(sessionID string, candidate webrtc.ICECandidateInit) error

	// ICE 服务器配置 (用于前端同步 TURN 凭证)
	GetICEServers() []webrtc.ICEServer

	// 视频帧写入
	WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error
}
