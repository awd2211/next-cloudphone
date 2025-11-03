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
	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media"
)

const numShards = 32 // 分片数量 - 2的幂次方，方便位运算优化

// shard 单个分片
type shard struct {
	mu       sync.RWMutex
	sessions map[string]*models.Session
}

// ShardedManager 分片会话管理器 - 解决全局锁瓶颈
type ShardedManager struct {
	config     *config.Config
	shards     [numShards]shard
	adbService *adb.Service
}

// NewShardedManager 创建分片 WebRTC 管理器
func NewShardedManager(cfg *config.Config) *ShardedManager {
	m := &ShardedManager{
		config:     cfg,
		adbService: adb.NewService(""), // 使用默认 adb 路径
	}

	// 初始化每个分片
	for i := 0; i < numShards; i++ {
		m.shards[i].sessions = make(map[string]*models.Session)
	}

	return m
}

// getShard 获取 sessionID 对应的分片
func (m *ShardedManager) getShard(sessionID string) *shard {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	index := h.Sum32() % numShards
	return &m.shards[index]
}

// CreateSession 创建新的 WebRTC 会话
func (m *ShardedManager) CreateSession(deviceID, userID string) (*models.Session, error) {
	// 生成 session ID
	sessionID := uuid.New().String()

	// 获取对应的分片
	shard := m.getShard(sessionID)

	// 创建 WebRTC 配置
	webrtcConfig := webrtc.Configuration{
		ICEServers:   m.buildICEServers(),
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

	// 只锁定对应的分片
	shard.mu.Lock()
	shard.sessions[sessionID] = session
	shard.mu.Unlock()

	// 记录会话创建指标
	metrics.RecordSessionCreated(deviceID)

	log.Printf("Created WebRTC session: %s for device: %s, user: %s (shard: %d)",
		sessionID, deviceID, userID, m.getShardIndex(sessionID))

	return session, nil
}

// getShardIndex 获取分片索引（仅用于日志）
func (m *ShardedManager) getShardIndex(sessionID string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	return h.Sum32() % numShards
}

// GetSession 获取会话
func (m *ShardedManager) GetSession(sessionID string) (*models.Session, error) {
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
func (m *ShardedManager) CloseSession(sessionID string) error {
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
func (m *ShardedManager) DeleteSession(sessionID string) {
	shard := m.getShard(sessionID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	session, ok := shard.sessions[sessionID]
	if !ok {
		// 会话不存在，无需处理
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

	log.Printf("Deleted session during error cleanup: %s (shard: %d)",
		sessionID, m.getShardIndex(sessionID))
}

// CreateOffer 创建 SDP offer
func (m *ShardedManager) CreateOffer(sessionID string) (*webrtc.SessionDescription, error) {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	offer, err := session.PeerConnection.CreateOffer(nil)
	if err != nil {
		// 修复资源泄漏: CreateOffer 失败时删除 session
		m.DeleteSession(sessionID)
		return nil, fmt.Errorf("failed to create offer: %w", err)
	}

	if err = session.PeerConnection.SetLocalDescription(offer); err != nil {
		// 修复资源泄漏: SetLocalDescription 失败时删除 session
		m.DeleteSession(sessionID)
		return nil, fmt.Errorf("failed to set local description: %w", err)
	}

	session.UpdateState(models.SessionStateConnecting)

	return &offer, nil
}

// HandleAnswer 处理 SDP answer
func (m *ShardedManager) HandleAnswer(sessionID string, answer webrtc.SessionDescription) error {
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
func (m *ShardedManager) AddICECandidate(sessionID string, candidate webrtc.ICECandidateInit) error {
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
		// 不返回错误，因为候选已经添加到 PeerConnection
		// 只是不再记录到会话的候选列表中
	}

	// 记录 ICE 候选添加指标
	metrics.RecordICECandidate(sessionID)

	return nil
}

// GetAllSessions 获取所有会话
func (m *ShardedManager) GetAllSessions() []*models.Session {
	var sessions []*models.Session

	// 并发读取所有分片
	var wg sync.WaitGroup
	sessionsChan := make(chan []*models.Session, numShards)

	for i := 0; i < numShards; i++ {
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
func (m *ShardedManager) CleanupInactiveSessions(timeout time.Duration) {
	now := time.Now()

	// 并发清理每个分片
	var wg sync.WaitGroup

	for i := 0; i < numShards; i++ {
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

					// 记录会话关闭指标 - 因不活跃而关闭
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
func (m *ShardedManager) WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error {
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

// setupPeerConnectionHandlers 设置 PeerConnection 事件处理器
func (m *ShardedManager) setupPeerConnectionHandlers(session *models.Session) {
	pc := session.PeerConnection

	// ICE 连接状态变化
	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State changed: %s (session: %s)",
			state.String(), session.ID)

		// 记录 ICE 连接状态指标
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
func (m *ShardedManager) setupDataChannelHandlers(session *models.Session, dc *webrtc.DataChannel) {
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
func (m *ShardedManager) handleControlMessage(session *models.Session, data []byte) error {
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

// handleTouchEvent 处理触摸事件
func (m *ShardedManager) handleTouchEvent(session *models.Session, msg *models.ControlMessage) error {
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
func (m *ShardedManager) handleKeyEvent(session *models.Session, msg *models.ControlMessage) error {
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
func (m *ShardedManager) handleTextInput(session *models.Session, msg *models.ControlMessage) error {
	if msg.Text == "" {
		return fmt.Errorf("text input is empty")
	}

	log.Printf("Text input: '%s' on device %s", msg.Text, session.DeviceID)
	if err := m.adbService.SendText(session.DeviceID, msg.Text); err != nil {
		return fmt.Errorf("failed to send text input: %w", err)
	}
	return nil
}

// buildICEServers 构建 ICE 服务器配置
func (m *ShardedManager) buildICEServers() []webrtc.ICEServer {
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

// registerCodecs 注册编解码器
func (m *ShardedManager) registerCodecs(mediaEngine *webrtc.MediaEngine) error {
	// 优先注册 H.264 视频编解码器 (硬件加速, 浏览器原生支持)
	// 注册 H.264 Baseline Profile Level 3.1
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

	// 注册 VP8 视频编解码器 (降级选项)
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
