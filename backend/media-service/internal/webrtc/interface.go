package webrtc

import (
	"time"

	"github.com/cloudphone/media-service/internal/models"
	"github.com/pion/webrtc/v3"
)

// WebRTCManager 定义 WebRTC 管理器接口
// 支持 Manager 和 ShardedManager 两种实现
type WebRTCManager interface {
	// 会话管理
	CreateSession(deviceID, userID string) (*models.Session, error)
	GetSession(sessionID string) (*models.Session, error)
	CloseSession(sessionID string) error
	GetAllSessions() []*models.Session
	CleanupInactiveSessions(timeout time.Duration)

	// SDP 处理
	CreateOffer(sessionID string) (*webrtc.SessionDescription, error)
	HandleAnswer(sessionID string, answer webrtc.SessionDescription) error

	// ICE 处理
	AddICECandidate(sessionID string, candidate webrtc.ICECandidateInit) error

	// 视频帧写入
	WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error
}
