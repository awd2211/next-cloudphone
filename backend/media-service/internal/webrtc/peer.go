package webrtc

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/adb"
	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/models"
	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media"
)

// Manager 管理所有 WebRTC 会话
type Manager struct {
	config     *config.Config
	sessions   map[string]*models.Session
	adbService *adb.Service
	mu         sync.RWMutex
}

// NewManager 创建 WebRTC 管理器
func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		config:     cfg,
		sessions:   make(map[string]*models.Session),
		adbService: adb.NewService(""), // 使用默认 adb 路径
	}
}

// CreateSession 创建新的 WebRTC 会话
func (m *Manager) CreateSession(deviceID, userID string) (*models.Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 创建 WebRTC 配置
	webrtcConfig := webrtc.Configuration{
		ICEServers: m.buildICEServers(),
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlan,
	}

	// 创建设置
	settingEngine := webrtc.SettingEngine{}

	// 设置 ICE 端口范围
	if err := settingEngine.SetEphemeralUDPPortRange(
		m.config.ICEPortMin,
		m.config.ICEPortMax,
	); err != nil {
		return nil, fmt.Errorf("failed to set ICE port range: %w", err)
	}

	// 创建 MediaEngine
	mediaEngine := &webrtc.MediaEngine{}

	// 注册编解码器
	if err := m.registerCodecs(mediaEngine); err != nil {
		return nil, fmt.Errorf("failed to register codecs: %w", err)
	}

	// 创建 API
	api := webrtc.NewAPI(
		webrtc.WithSettingEngine(settingEngine),
		webrtc.WithMediaEngine(mediaEngine),
	)

	// 创建 PeerConnection
	peerConnection, err := api.NewPeerConnection(webrtcConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create peer connection: %w", err)
	}

	// 创建会话
	sessionID := uuid.New().String()
	session := &models.Session{
		ID:             sessionID,
		DeviceID:       deviceID,
		UserID:         userID,
		PeerConnection: peerConnection,
		CreatedAt:      time.Now(),
		LastActivityAt: time.Now(),
		State:          models.SessionStateNew,
		ICECandidates:  []webrtc.ICECandidateInit{},
	}

	// 设置事件处理器
	m.setupPeerConnectionHandlers(session)

	// 创建视频轨道
	videoTrack, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
		"video",
		"cloudphone-video",
	)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to create video track: %w", err)
	}
	session.VideoTrack = videoTrack

	// 添加视频轨道到 PeerConnection
	if _, err = peerConnection.AddTrack(videoTrack); err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to add video track: %w", err)
	}

	// 创建数据通道（用于控制消息）
	dataChannel, err := peerConnection.CreateDataChannel("control", nil)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to create data channel: %w", err)
	}
	session.DataChannel = dataChannel

	m.setupDataChannelHandlers(session, dataChannel)

	m.sessions[sessionID] = session

	log.Printf("Created WebRTC session: %s for device: %s, user: %s",
		sessionID, deviceID, userID)

	return session, nil
}

// GetSession 获取会话
func (m *Manager) GetSession(sessionID string) (*models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, ok := m.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	return session, nil
}

// CloseSession 关闭会话
func (m *Manager) CloseSession(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, ok := m.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	if session.PeerConnection != nil {
		if err := session.PeerConnection.Close(); err != nil {
			log.Printf("Error closing peer connection: %v", err)
		}
	}

	session.UpdateState(models.SessionStateClosed)
	delete(m.sessions, sessionID)

	log.Printf("Closed session: %s", sessionID)

	return nil
}

// CreateOffer 创建 SDP offer
func (m *Manager) CreateOffer(sessionID string) (*webrtc.SessionDescription, error) {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	offer, err := session.PeerConnection.CreateOffer(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create offer: %w", err)
	}

	if err = session.PeerConnection.SetLocalDescription(offer); err != nil {
		return nil, fmt.Errorf("failed to set local description: %w", err)
	}

	session.UpdateState(models.SessionStateConnecting)

	return &offer, nil
}

// HandleAnswer 处理 SDP answer
func (m *Manager) HandleAnswer(sessionID string, answer webrtc.SessionDescription) error {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return err
	}

	if err := session.PeerConnection.SetRemoteDescription(answer); err != nil {
		return fmt.Errorf("failed to set remote description: %w", err)
	}

	return nil
}

// AddICECandidate 添加 ICE 候选
func (m *Manager) AddICECandidate(sessionID string, candidate webrtc.ICECandidateInit) error {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return err
	}

	if err := session.PeerConnection.AddICECandidate(candidate); err != nil {
		return fmt.Errorf("failed to add ICE candidate: %w", err)
	}

	session.AddICECandidate(candidate)

	return nil
}

// 设置 PeerConnection 事件处理器
func (m *Manager) setupPeerConnectionHandlers(session *models.Session) {
	pc := session.PeerConnection

	// ICE 连接状态变化
	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State changed: %s (session: %s)",
			state.String(), session.ID)

		switch state {
		case webrtc.ICEConnectionStateConnected:
			session.UpdateState(models.SessionStateConnected)
		case webrtc.ICEConnectionStateDisconnected:
			session.UpdateState(models.SessionStateDisconnected)
		case webrtc.ICEConnectionStateFailed:
			session.UpdateState(models.SessionStateFailed)
			m.CloseSession(session.ID)
		case webrtc.ICEConnectionStateClosed:
			session.UpdateState(models.SessionStateClosed)
		}
	})

	// ICE 候选生成
	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			log.Printf("New ICE candidate: %s (session: %s)",
				candidate.String(), session.ID)
		}
	})

	// 连接状态变化
	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("Peer Connection State changed: %s (session: %s)",
			state.String(), session.ID)
	})

	// 信令状态变化
	pc.OnSignalingStateChange(func(state webrtc.SignalingState) {
		log.Printf("Signaling State changed: %s (session: %s)",
			state.String(), session.ID)
	})
}

// 设置数据通道处理器
func (m *Manager) setupDataChannelHandlers(session *models.Session, dc *webrtc.DataChannel) {
	dc.OnOpen(func() {
		log.Printf("Data channel opened (session: %s)", session.ID)
	})

	dc.OnClose(func() {
		log.Printf("Data channel closed (session: %s)", session.ID)
	})

	dc.OnMessage(func(msg webrtc.DataChannelMessage) {
		if err := m.handleControlMessage(session, msg.Data); err != nil {
			log.Printf("Error handling control message (session: %s): %v", session.ID, err)
		}
	})

	dc.OnError(func(err error) {
		log.Printf("Data channel error (session: %s): %v", session.ID, err)
	})
}

// 处理控制消息
func (m *Manager) handleControlMessage(session *models.Session, data []byte) error {
	var ctrlMsg models.ControlMessage
	if err := json.Unmarshal(data, &ctrlMsg); err != nil {
		return fmt.Errorf("failed to parse control message: %w", err)
	}

	log.Printf("Control message received (session: %s, type: %s, action: %s)",
		session.ID, ctrlMsg.Type, ctrlMsg.Action)

	// 验证设备ID匹配
	if ctrlMsg.DeviceID != session.DeviceID {
		return fmt.Errorf("device ID mismatch: expected %s, got %s",
			session.DeviceID, ctrlMsg.DeviceID)
	}

	// 根据控制消息类型分发处理
	switch ctrlMsg.Type {
	case "touch":
		return m.handleTouchEvent(session, &ctrlMsg)
	case "key":
		return m.handleKeyEvent(session, &ctrlMsg)
	case "text":
		return m.handleTextInput(session, &ctrlMsg)
	default:
		return fmt.Errorf("unknown control message type: %s", ctrlMsg.Type)
	}
}

// 处理触摸事件
func (m *Manager) handleTouchEvent(session *models.Session, msg *models.ControlMessage) error {
	switch msg.Action {
	case "down":
		// 触摸按下事件
		log.Printf("Touch down at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchDown(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch down: %w", err)
		}
	case "move":
		// 触摸移动事件
		log.Printf("Touch move to (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchMove(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch move: %w", err)
		}
	case "up":
		// 触摸释放事件
		log.Printf("Touch up at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchUp(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch up: %w", err)
		}
	case "tap":
		// 单击事件（简化版）
		log.Printf("Tap at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTap(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send tap: %w", err)
		}
	default:
		return fmt.Errorf("unknown touch action: %s", msg.Action)
	}
	return nil
}

// 处理按键事件
func (m *Manager) handleKeyEvent(session *models.Session, msg *models.ControlMessage) error {
	switch msg.Action {
	case "press":
		log.Printf("Key press: %d on device %s", msg.KeyCode, session.DeviceID)
		if err := m.adbService.SendKeyEvent(session.DeviceID, msg.KeyCode); err != nil {
			return fmt.Errorf("failed to send key event: %w", err)
		}
	case "longpress":
		log.Printf("Key long press: %d on device %s", msg.KeyCode, session.DeviceID)
		if err := m.adbService.SendLongPress(session.DeviceID, msg.KeyCode); err != nil {
			return fmt.Errorf("failed to send long press: %w", err)
		}
	default:
		return fmt.Errorf("unknown key action: %s", msg.Action)
	}
	return nil
}

// 处理文本输入
func (m *Manager) handleTextInput(session *models.Session, msg *models.ControlMessage) error {
	if msg.Text == "" {
		return fmt.Errorf("text input is empty")
	}

	log.Printf("Text input: '%s' on device %s", msg.Text, session.DeviceID)
	if err := m.adbService.SendText(session.DeviceID, msg.Text); err != nil {
		return fmt.Errorf("failed to send text input: %w", err)
	}
	return nil
}

// 构建 ICE 服务器配置
func (m *Manager) buildICEServers() []webrtc.ICEServer {
	var servers []webrtc.ICEServer

	// 添加 STUN 服务器
	for _, stun := range m.config.STUNServers {
		servers = append(servers, webrtc.ICEServer{
			URLs: []string{stun},
		})
	}

	// 添加 TURN 服务器
	for _, turn := range m.config.TURNServers {
		servers = append(servers, webrtc.ICEServer{
			URLs:       turn.URLs,
			Username:   turn.Username,
			Credential: turn.Credential,
		})
	}

	return servers
}

// 注册编解码器
func (m *Manager) registerCodecs(mediaEngine *webrtc.MediaEngine) error {
	// 注册 VP8 视频编解码器
	if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:     webrtc.MimeTypeVP8,
			ClockRate:    90000,
			Channels:     0,
			SDPFmtpLine:  "",
			RTCPFeedback: nil,
		},
		PayloadType: 96,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return err
	}

	// 注册 Opus 音频编解码器
	if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:    webrtc.MimeTypeOpus,
			ClockRate:   48000,
			Channels:    2,
			SDPFmtpLine: "minptime=10;useinbandfec=1",
		},
		PayloadType: 111,
	}, webrtc.RTPCodecTypeAudio); err != nil {
		return err
	}

	return nil
}

// GetAllSessions 获取所有会话
func (m *Manager) GetAllSessions() []*models.Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sessions := make([]*models.Session, 0, len(m.sessions))
	for _, session := range m.sessions {
		sessions = append(sessions, session)
	}

	return sessions
}

// CleanupInactiveSessions 清理不活跃的会话
func (m *Manager) CleanupInactiveSessions(timeout time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for sessionID, session := range m.sessions {
		if now.Sub(session.LastActivityAt) > timeout {
			log.Printf("Cleaning up inactive session: %s", sessionID)
			if session.PeerConnection != nil {
				session.PeerConnection.Close()
			}
			session.UpdateState(models.SessionStateClosed)
			delete(m.sessions, sessionID)
		}
	}
}

// WriteVideoFrame 向视频轨道写入帧
func (m *Manager) WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return err
	}

	if session.VideoTrack == nil {
		return fmt.Errorf("video track not available")
	}

	sample := &media.Sample{
		Data:     frame,
		Duration: duration,
	}

	if err := session.VideoTrack.WriteSample(*sample); err != nil {
		if err != io.ErrClosedPipe {
			return fmt.Errorf("failed to write video frame: %w", err)
		}
	}

	return nil
}
