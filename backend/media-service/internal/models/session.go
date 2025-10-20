package models

import (
	"sync"
	"time"

	"github.com/pion/webrtc/v3"
)

// Session 表示一个 WebRTC 会话
type Session struct {
	ID              string
	DeviceID        string
	UserID          string
	PeerConnection  *webrtc.PeerConnection
	DataChannel     *webrtc.DataChannel
	VideoTrack      *webrtc.TrackLocalStaticSample
	AudioTrack      *webrtc.TrackLocalStaticSample
	CreatedAt       time.Time
	LastActivityAt  time.Time
	State           SessionState
	ICECandidates   []webrtc.ICECandidateInit
	mu              sync.RWMutex
}

type SessionState string

const (
	SessionStateNew         SessionState = "new"
	SessionStateConnecting  SessionState = "connecting"
	SessionStateConnected   SessionState = "connected"
	SessionStateDisconnected SessionState = "disconnected"
	SessionStateFailed      SessionState = "failed"
	SessionStateClosed      SessionState = "closed"
)

// UpdateState 更新会话状态
func (s *Session) UpdateState(state SessionState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.State = state
	s.LastActivityAt = time.Now()
}

// GetState 获取会话状态
func (s *Session) GetState() SessionState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.State
}

// AddICECandidate 添加 ICE 候选
func (s *Session) AddICECandidate(candidate webrtc.ICECandidateInit) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ICECandidates = append(s.ICECandidates, candidate)
}

// SignalingMessage 信令消息
type SignalingMessage struct {
	Type      string                   `json:"type"`
	SessionID string                   `json:"sessionId,omitempty"`
	DeviceID  string                   `json:"deviceId,omitempty"`
	UserID    string                   `json:"userId,omitempty"`
	SDP       *webrtc.SessionDescription `json:"sdp,omitempty"`
	Candidate *webrtc.ICECandidateInit `json:"candidate,omitempty"`
	Error     string                   `json:"error,omitempty"`
}

// ControlMessage 控制消息（触摸、按键等）
type ControlMessage struct {
	Type      string  `json:"type"`
	DeviceID  string  `json:"deviceId"`
	Action    string  `json:"action"`
	X         float64 `json:"x,omitempty"`
	Y         float64 `json:"y,omitempty"`
	KeyCode   int     `json:"keyCode,omitempty"`
	Text      string  `json:"text,omitempty"`
	Timestamp int64   `json:"timestamp"`
}

// StatsReport 会话统计
type StatsReport struct {
	SessionID        string        `json:"sessionId"`
	DeviceID         string        `json:"deviceId"`
	Duration         time.Duration `json:"duration"`
	BytesSent        uint64        `json:"bytesSent"`
	BytesReceived    uint64        `json:"bytesReceived"`
	PacketsLost      uint32        `json:"packetsLost"`
	Jitter           float64       `json:"jitter"`
	RoundTripTime    float64       `json:"roundTripTime"`
	VideoFramesSent  uint32        `json:"videoFramesSent"`
	AudioFramesSent  uint32        `json:"audioFramesSent"`
}
