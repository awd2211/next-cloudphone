package webrtc

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/adb"
	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/metrics"
	"github.com/cloudphone/media-service/internal/models"
	"github.com/cloudphone/media-service/internal/turn"
	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media"
)

const defaultNumShards = 32 // 默认分片数量

// shard 单个分片
type shard struct {
	mu       sync.RWMutex
	sessions map[string]*models.Session
}

// Manager 统一的 WebRTC 会话管理器
// 支持可配置的分片数量：
//   - numShards=1: 单锁模式，适合小规模部署
//   - numShards=32: 分片模式，适合高并发场景
type Manager struct {
	config      *config.Config
	shards      []shard
	numShards   uint32
	adbService  *adb.Service
	turnService *turn.Service
}

// ManagerOption 配置选项
type ManagerOption func(*Manager)

// WithNumShards 设置分片数量
func WithNumShards(n int) ManagerOption {
	return func(m *Manager) {
		if n < 1 {
			n = 1
		}
		m.numShards = uint32(n)
	}
}

// WithTURNService 设置 TURN 服务
func WithTURNService(ts *turn.Service) ManagerOption {
	return func(m *Manager) {
		m.turnService = ts
	}
}

// NewManager 创建 WebRTC 管理器
// 默认使用 32 分片和 Cloudflare TURN 服务
func NewManager(cfg *config.Config, opts ...ManagerOption) *Manager {
	m := &Manager{
		config:      cfg,
		numShards:   defaultNumShards,
		adbService:  adb.NewService(""),
		turnService: turn.NewService(),
	}

	// 应用配置选项
	for _, opt := range opts {
		opt(m)
	}

	// 初始化分片
	m.shards = make([]shard, m.numShards)
	for i := uint32(0); i < m.numShards; i++ {
		m.shards[i].sessions = make(map[string]*models.Session)
	}

	log.Printf("WebRTC Manager initialized with %d shards, TURN configured: %v",
		m.numShards, m.turnService != nil && m.turnService.IsConfigured())

	return m
}

// getShard 获取 sessionID 对应的分片
func (m *Manager) getShard(sessionID string) *shard {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	index := h.Sum32() % m.numShards
	return &m.shards[index]
}

// getShardIndex 获取分片索引（仅用于日志）
func (m *Manager) getShardIndex(sessionID string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	return h.Sum32() % m.numShards
}

// CreateSession 创建新的 WebRTC 会话（默认使用 VP8 编码）
func (m *Manager) CreateSession(deviceID, userID string) (*models.Session, error) {
	return m.CreateSessionWithOptions(deviceID, userID, SessionOptions{
		VideoCodec: VideoCodecVP8,
	})
}

// CreateSessionWithOptions 使用指定选项创建 WebRTC 会话
// 支持选择视频编码类型：
//   - VideoCodecVP8: 默认，兼容性好，适合 screencap PNG 模式
//   - VideoCodecH264: 性能更好，适合 scrcpy 直出模式
func (m *Manager) CreateSessionWithOptions(deviceID, userID string, opts SessionOptions) (*models.Session, error) {
	// 生成 session ID
	sessionID := uuid.New().String()

	// 默认 VP8
	if opts.VideoCodec == "" {
		opts.VideoCodec = VideoCodecVP8
	}

	// 获取对应的分片
	shard := m.getShard(sessionID)

	// 构建 ICE 服务器配置
	iceServers := m.GetICEServers()

	// 创建 WebRTC 配置
	webrtcConfig := webrtc.Configuration{
		ICEServers:   iceServers,
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlan,
	}

	// 创建设置引擎
	settingEngine := webrtc.SettingEngine{}

	// 设置 ICE 端口范围
	if err := settingEngine.SetEphemeralUDPPortRange(
		m.config.ICEPortMin,
		m.config.ICEPortMax,
	); err != nil {
		return nil, fmt.Errorf("failed to set ICE port range: %w", err)
	}

	// 设置 NAT 1:1 IP 映射（解决 Docker/NAT 网络下 ICE 候选 IP 问题）
	// 当配置了 NAT_1TO1_IPS 时，ICE 候选将使用这些 IP 而不是本地接口 IP
	if len(m.config.NAT1To1IPs) > 0 {
		settingEngine.SetNAT1To1IPs(m.config.NAT1To1IPs, webrtc.ICECandidateTypeHost)
		log.Printf("NAT 1:1 IPs configured: %v", m.config.NAT1To1IPs)
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

	// 根据编码类型创建视频轨道
	// - VP8: 兼容性好，适合 screencap PNG → VP8 编码模式
	// - H.264: 性能好，适合 scrcpy H.264 直通模式（零拷贝）
	var mimeType string
	switch opts.VideoCodec {
	case VideoCodecH264:
		mimeType = webrtc.MimeTypeH264
	default:
		mimeType = webrtc.MimeTypeVP8
	}

	videoTrack, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: mimeType},
		"video",
		"cloudphone-video",
	)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to create video track (codec: %s): %w", opts.VideoCodec, err)
	}
	session.VideoTrack = videoTrack

	log.Printf("Created video track with codec: %s for session: %s", opts.VideoCodec, sessionID)

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

	// 只锁定对应的分片
	shard.mu.Lock()
	shard.sessions[sessionID] = session
	shard.mu.Unlock()

	// 记录会话创建指标
	metrics.RecordSessionCreated(deviceID)

	log.Printf("Created WebRTC session: %s for device: %s, user: %s (shard: %d/%d)",
		sessionID, deviceID, userID, m.getShardIndex(sessionID), m.numShards)

	return session, nil
}

// GetSession 获取会话
func (m *Manager) GetSession(sessionID string) (*models.Session, error) {
	shard := m.getShard(sessionID)

	shard.mu.RLock()
	session, ok := shard.sessions[sessionID]
	shard.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	return session, nil
}

// CloseSession 关闭会话
func (m *Manager) CloseSession(sessionID string) error {
	shard := m.getShard(sessionID)

	shard.mu.Lock()
	session, ok := shard.sessions[sessionID]
	if !ok {
		shard.mu.Unlock()
		return fmt.Errorf("session not found: %s", sessionID)
	}

	if session.PeerConnection != nil {
		if err := session.PeerConnection.Close(); err != nil {
			log.Printf("Error closing peer connection: %v", err)
		}
	}

	// 记录会话关闭指标
	duration := time.Since(session.CreatedAt)
	metrics.RecordSessionClosed(session.DeviceID, "normal_close", duration)

	session.UpdateState(models.SessionStateClosed)
	delete(shard.sessions, sessionID)
	shard.mu.Unlock()

	log.Printf("Closed session: %s", sessionID)

	return nil
}

// DeleteSession 删除会话（用于错误处理，不返回错误）
func (m *Manager) DeleteSession(sessionID string) {
	shard := m.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	session, ok := shard.sessions[sessionID]
	if !ok {
		return
	}

	if session.PeerConnection != nil {
		if err := session.PeerConnection.Close(); err != nil {
			log.Printf("Error closing peer connection during cleanup: %v", err)
		}
	}

	// 记录会话关闭指标 - 标记为错误清理
	duration := time.Since(session.CreatedAt)
	metrics.RecordSessionClosed(session.DeviceID, "error_cleanup", duration)

	session.UpdateState(models.SessionStateClosed)
	delete(shard.sessions, sessionID)

	log.Printf("Deleted session during error cleanup: %s", sessionID)
}

// CreateOffer 创建 SDP offer（等待 ICE gathering 完成以包含所有候选）
func (m *Manager) CreateOffer(sessionID string) (*webrtc.SessionDescription, error) {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	offer, err := session.PeerConnection.CreateOffer(nil)
	if err != nil {
		m.DeleteSession(sessionID)
		return nil, fmt.Errorf("failed to create offer: %w", err)
	}

	// 创建用于等待 ICE gathering 完成的 channel
	// 当 OnICECandidate 收到 nil 时表示 gathering 完成
	gatherComplete := make(chan struct{})
	var gatherOnce sync.Once

	// 临时保存原有的 OnICECandidate 处理器（如果有的话）
	// 使用新的处理器来检测 gathering 完成
	session.PeerConnection.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			// ICE gathering 完成
			gatherOnce.Do(func() {
				close(gatherComplete)
			})
		} else {
			log.Printf("New ICE candidate during offer creation: %s (session: %s)",
				candidate.String(), sessionID)
		}
	})

	if err = session.PeerConnection.SetLocalDescription(offer); err != nil {
		m.DeleteSession(sessionID)
		return nil, fmt.Errorf("failed to set local description: %w", err)
	}

	// 等待 ICE gathering 完成（最多 10 秒）
	// 这确保 offer SDP 包含所有 ICE candidates（包括 relay 候选）
	select {
	case <-gatherComplete:
		log.Printf("ICE gathering complete for session: %s", sessionID)
	case <-time.After(10 * time.Second):
		log.Printf("ICE gathering timeout for session: %s (proceeding anyway)", sessionID)
	}

	session.UpdateState(models.SessionStateConnecting)

	// 返回包含完整 ICE candidates 的 local description
	localDesc := session.PeerConnection.LocalDescription()
	if localDesc == nil {
		m.DeleteSession(sessionID)
		return nil, fmt.Errorf("local description is nil after gathering")
	}

	return localDesc, nil
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

	// 添加到会话（带数量限制）
	if err := session.AddICECandidate(candidate); err != nil {
		log.Printf("Warning: ICE candidate limit reached for session %s: %v", sessionID, err)
	}

	// 记录 ICE 候选添加指标
	metrics.RecordICECandidate(sessionID)

	return nil
}

// GetAllSessions 获取所有会话
func (m *Manager) GetAllSessions() []*models.Session {
	var sessions []*models.Session

	// 并发读取所有分片
	var wg sync.WaitGroup
	sessionsChan := make(chan []*models.Session, m.numShards)

	for i := uint32(0); i < m.numShards; i++ {
		wg.Add(1)
		go func(shard *shard) {
			defer wg.Done()

			shard.mu.RLock()
			shardSessions := make([]*models.Session, 0, len(shard.sessions))
			for _, session := range shard.sessions {
				shardSessions = append(shardSessions, session)
			}
			shard.mu.RUnlock()

			sessionsChan <- shardSessions
		}(&m.shards[i])
	}

	// 等待所有 goroutine 完成
	go func() {
		wg.Wait()
		close(sessionsChan)
	}()

	// 收集所有会话
	for shardSessions := range sessionsChan {
		sessions = append(sessions, shardSessions...)
	}

	return sessions
}

// CleanupInactiveSessions 清理不活跃的会话
func (m *Manager) CleanupInactiveSessions(timeout time.Duration) {
	now := time.Now()

	// 并发清理每个分片
	var wg sync.WaitGroup

	for i := uint32(0); i < m.numShards; i++ {
		wg.Add(1)
		go func(shard *shard) {
			defer wg.Done()

			shard.mu.Lock()
			defer shard.mu.Unlock()

			for sessionID, session := range shard.sessions {
				if now.Sub(session.LastActivityAt) > timeout {
					log.Printf("Cleaning up inactive session: %s", sessionID)
					if session.PeerConnection != nil {
						session.PeerConnection.Close()
					}

					duration := time.Since(session.CreatedAt)
					metrics.RecordSessionClosed(session.DeviceID, "inactive_timeout", duration)

					session.UpdateState(models.SessionStateClosed)
					delete(shard.sessions, sessionID)
				}
			}
		}(&m.shards[i])
	}

	wg.Wait()
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

// GetICEServers 返回 ICE 服务器配置（公开方法，用于前端同步 TURN 凭证）
// 确保前端和后端使用相同的 TURN 凭证，否则 relay 连接会失败
func (m *Manager) GetICEServers() []webrtc.ICEServer {
	var servers []webrtc.ICEServer

	// 1. 优先尝试从 Cloudflare TURN 服务获取动态凭证
	log.Printf("Building ICE servers configuration...")

	if m.turnService == nil {
		log.Printf("TURN service not initialized")
	} else if m.turnService.IsConfigured() {
		log.Printf("Cloudflare TURN is configured, fetching credentials...")
		turnServers, err := m.turnService.GetICEServers()
		if err != nil {
			log.Printf("Warning: Failed to get Cloudflare TURN credentials: %v", err)
		} else {
			servers = append(servers, turnServers...)
			log.Printf("Added %d Cloudflare TURN servers", len(turnServers))
			for i, s := range turnServers {
				log.Printf("  TURN server %d: %v", i, s.URLs)
			}
		}
	} else {
		log.Printf("Cloudflare TURN not configured (missing CLOUDFLARE_TURN_KEY_ID or CLOUDFLARE_TURN_API_TOKEN)")
	}

	// 2. 添加配置文件中的 STUN 服务器
	for _, stun := range m.config.STUNServers {
		servers = append(servers, webrtc.ICEServer{
			URLs: []string{stun},
		})
	}

	// 3. 添加配置文件中的静态 TURN 服务器（如果有配置）
	for _, t := range m.config.TURNServers {
		servers = append(servers, webrtc.ICEServer{
			URLs:       t.URLs,
			Username:   t.Username,
			Credential: t.Credential,
		})
	}

	log.Printf("Total ICE servers: %d (TURN + STUN)", len(servers))
	return servers
}

// setupPeerConnectionHandlers 设置 PeerConnection 事件处理器
func (m *Manager) setupPeerConnectionHandlers(session *models.Session) {
	pc := session.PeerConnection

	// ICE 连接状态变化
	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State changed: %s (session: %s)",
			state.String(), session.ID)

		stateValue := 0.0
		switch state {
		case webrtc.ICEConnectionStateNew:
			stateValue = 0
		case webrtc.ICEConnectionStateChecking:
			stateValue = 1
		case webrtc.ICEConnectionStateConnected:
			stateValue = 2
			session.UpdateState(models.SessionStateConnected)
		case webrtc.ICEConnectionStateCompleted:
			stateValue = 3
		case webrtc.ICEConnectionStateFailed:
			stateValue = 4
			session.UpdateState(models.SessionStateFailed)
			m.CloseSession(session.ID)
		case webrtc.ICEConnectionStateDisconnected:
			stateValue = 5
			session.UpdateState(models.SessionStateDisconnected)
		case webrtc.ICEConnectionStateClosed:
			stateValue = 6
			session.UpdateState(models.SessionStateClosed)
		}

		metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
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

// setupDataChannelHandlers 设置数据通道处理器
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

// handleControlMessage 处理控制消息
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

// handleTouchEvent 处理触摸事件
func (m *Manager) handleTouchEvent(session *models.Session, msg *models.ControlMessage) error {
	switch msg.Action {
	case "down":
		log.Printf("Touch down at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchDown(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch down: %w", err)
		}
	case "move":
		log.Printf("Touch move to (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchMove(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch move: %w", err)
		}
	case "up":
		log.Printf("Touch up at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTouchUp(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send touch up: %w", err)
		}
	case "tap":
		log.Printf("Tap at (%.0f, %.0f) on device %s", msg.X, msg.Y, session.DeviceID)
		if err := m.adbService.SendTap(session.DeviceID, msg.X, msg.Y); err != nil {
			return fmt.Errorf("failed to send tap: %w", err)
		}
	default:
		return fmt.Errorf("unknown touch action: %s", msg.Action)
	}
	return nil
}

// handleKeyEvent 处理按键事件
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

// handleTextInput 处理文本输入
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

// registerCodecs 注册编解码器
func (m *Manager) registerCodecs(mediaEngine *webrtc.MediaEngine) error {
	// H.264 视频编解码器 (硬件加速, 浏览器原生支持)
	if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:     webrtc.MimeTypeH264,
			ClockRate:    90000,
			Channels:     0,
			SDPFmtpLine:  "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
			RTCPFeedback: nil,
		},
		PayloadType: 102,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return err
	}

	// VP8 视频编解码器 (降级选项)
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

	// Opus 音频编解码器
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
