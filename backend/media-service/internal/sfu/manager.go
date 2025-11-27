package sfu

import (
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/turn"
	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media"
)

const defaultNumShards = 16

// shard 单个分片
type shard struct {
	mu          sync.RWMutex
	publishers  map[string]*PublisherSession  // sessionID -> publisher
	subscribers map[string]*SubscriberSession // sessionID -> subscriber
}

// Manager SFU 管理器
// 支持多人同屏观看场景：一个发布者，多个订阅者
type Manager struct {
	config      *config.Config
	shards      []shard
	numShards   uint32
	turnService *turn.Service

	// devicePublishers 设备ID到发布者的映射（用于快速查找某设备的发布者）
	devicePublishers map[string]string // deviceID -> publisherID
	deviceMu         sync.RWMutex
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

// NewManager 创建 SFU 管理器
func NewManager(cfg *config.Config, opts ...ManagerOption) *Manager {
	m := &Manager{
		config:           cfg,
		numShards:        defaultNumShards,
		turnService:      turn.NewService(),
		devicePublishers: make(map[string]string),
	}

	for _, opt := range opts {
		opt(m)
	}

	// 初始化分片
	m.shards = make([]shard, m.numShards)
	for i := uint32(0); i < m.numShards; i++ {
		m.shards[i].publishers = make(map[string]*PublisherSession)
		m.shards[i].subscribers = make(map[string]*SubscriberSession)
	}

	log.Printf("SFU Manager initialized with %d shards", m.numShards)

	return m
}

// getShard 获取 sessionID 对应的分片
func (m *Manager) getShard(sessionID string) *shard {
	h := fnv.New32a()
	h.Write([]byte(sessionID))
	return &m.shards[h.Sum32()%m.numShards]
}

// CreatePublisher 创建发布者会话
// 发布者从设备捕获视频并广播给订阅者
func (m *Manager) CreatePublisher(deviceID, userID string, videoCodec string) (*PublisherSession, error) {
	// 检查该设备是否已有发布者
	m.deviceMu.RLock()
	existingPubID, exists := m.devicePublishers[deviceID]
	m.deviceMu.RUnlock()

	if exists {
		// 获取现有发布者
		pub, err := m.GetPublisher(existingPubID)
		if err == nil {
			log.Printf("Device %s already has publisher %s, reusing", deviceID, existingPubID)
			return pub, nil
		}
		// 如果获取失败，清理映射继续创建
		m.deviceMu.Lock()
		delete(m.devicePublishers, deviceID)
		m.deviceMu.Unlock()
	}

	publisherID := uuid.New().String()
	shard := m.getShard(publisherID)

	// 构建 ICE 服务器
	iceServers := m.GetICEServers()

	// 创建 WebRTC 配置
	webrtcConfig := webrtc.Configuration{
		ICEServers:   iceServers,
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlan,
	}

	// 创建设置引擎
	settingEngine := webrtc.SettingEngine{}
	if err := settingEngine.SetEphemeralUDPPortRange(
		m.config.ICEPortMin,
		m.config.ICEPortMax,
	); err != nil {
		return nil, fmt.Errorf("failed to set ICE port range: %w", err)
	}

	if len(m.config.NAT1To1IPs) > 0 {
		settingEngine.SetNAT1To1IPs(m.config.NAT1To1IPs, webrtc.ICECandidateTypeHost)
	}

	// 创建 MediaEngine 并注册编解码器
	mediaEngine := &webrtc.MediaEngine{}
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

	// 创建发布者会话
	publisher := &PublisherSession{
		ID:             publisherID,
		DeviceID:       deviceID,
		UserID:         userID,
		PeerConnection: peerConnection,
		CreatedAt:      time.Now(),
		LastActivityAt: time.Now(),
		State:          StateNew,
		subscribers:    make(map[string]*SubscriberSession),
	}

	// 设置事件处理器
	m.setupPublisherHandlers(publisher)

	// 根据编码类型创建视频轨道
	mimeType := webrtc.MimeTypeVP8
	if videoCodec == "H264" {
		mimeType = webrtc.MimeTypeH264
	}

	videoTrack, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: mimeType},
		"video",
		fmt.Sprintf("cloudphone-sfu-%s", deviceID),
	)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to create video track: %w", err)
	}
	publisher.VideoTrack = videoTrack

	// 添加视频轨道
	if _, err = peerConnection.AddTrack(videoTrack); err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to add video track: %w", err)
	}

	// 创建数据通道（用于控制）
	dataChannel, err := peerConnection.CreateDataChannel("control", nil)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to create data channel: %w", err)
	}
	publisher.DataChannel = dataChannel

	// 存储发布者
	shard.mu.Lock()
	shard.publishers[publisherID] = publisher
	shard.mu.Unlock()

	// 更新设备映射
	m.deviceMu.Lock()
	m.devicePublishers[deviceID] = publisherID
	m.deviceMu.Unlock()

	log.Printf("Created SFU publisher: %s for device: %s", publisherID, deviceID)

	return publisher, nil
}

// CreateSubscriber 创建订阅者会话
// 订阅者从发布者接收视频流
func (m *Manager) CreateSubscriber(publisherID, userID string) (*SubscriberSession, error) {
	// 获取发布者
	publisher, err := m.GetPublisher(publisherID)
	if err != nil {
		return nil, fmt.Errorf("publisher not found: %w", err)
	}

	if publisher.VideoTrack == nil {
		return nil, fmt.Errorf("publisher has no video track")
	}

	subscriberID := uuid.New().String()
	shard := m.getShard(subscriberID)

	// 构建 ICE 服务器
	iceServers := m.GetICEServers()

	// 创建 WebRTC 配置
	webrtcConfig := webrtc.Configuration{
		ICEServers:   iceServers,
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlan,
	}

	// 创建设置引擎
	settingEngine := webrtc.SettingEngine{}
	if err := settingEngine.SetEphemeralUDPPortRange(
		m.config.ICEPortMin,
		m.config.ICEPortMax,
	); err != nil {
		return nil, fmt.Errorf("failed to set ICE port range: %w", err)
	}

	if len(m.config.NAT1To1IPs) > 0 {
		settingEngine.SetNAT1To1IPs(m.config.NAT1To1IPs, webrtc.ICECandidateTypeHost)
	}

	// 创建 MediaEngine
	mediaEngine := &webrtc.MediaEngine{}
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

	// 创建订阅者会话
	subscriber := &SubscriberSession{
		ID:             subscriberID,
		PublisherID:    publisherID,
		DeviceID:       publisher.DeviceID,
		UserID:         userID,
		PeerConnection: peerConnection,
		CreatedAt:      time.Now(),
		LastActivityAt: time.Now(),
		State:          StateNew,
	}

	// 设置事件处理器
	m.setupSubscriberHandlers(subscriber)

	// 关键：将发布者的 Track 添加到订阅者的 PeerConnection
	// 这样订阅者就能接收发布者的视频流，而不需要重新编码
	rtpSender, err := peerConnection.AddTrack(publisher.VideoTrack)
	if err != nil {
		peerConnection.Close()
		return nil, fmt.Errorf("failed to add publisher track to subscriber: %w", err)
	}
	subscriber.RTPSender = rtpSender

	// 处理 RTCP 反馈（用于质量控制）
	go func() {
		rtcpBuf := make([]byte, 1500)
		for {
			if _, _, rtcpErr := rtpSender.Read(rtcpBuf); rtcpErr != nil {
				return
			}
		}
	}()

	// 存储订阅者
	shard.mu.Lock()
	shard.subscribers[subscriberID] = subscriber
	shard.mu.Unlock()

	// 添加到发布者的订阅者列表
	publisher.AddSubscriber(subscriber)

	log.Printf("Created SFU subscriber: %s for publisher: %s (device: %s)",
		subscriberID, publisherID, publisher.DeviceID)

	return subscriber, nil
}

// GetPublisher 获取发布者
func (m *Manager) GetPublisher(publisherID string) (*PublisherSession, error) {
	shard := m.getShard(publisherID)

	shard.mu.RLock()
	publisher, ok := shard.publishers[publisherID]
	shard.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("publisher not found: %s", publisherID)
	}

	return publisher, nil
}

// GetPublisherByDevice 通过设备 ID 获取发布者
func (m *Manager) GetPublisherByDevice(deviceID string) (*PublisherSession, error) {
	m.deviceMu.RLock()
	publisherID, exists := m.devicePublishers[deviceID]
	m.deviceMu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no publisher for device: %s", deviceID)
	}

	return m.GetPublisher(publisherID)
}

// GetSubscriber 获取订阅者
func (m *Manager) GetSubscriber(subscriberID string) (*SubscriberSession, error) {
	shard := m.getShard(subscriberID)

	shard.mu.RLock()
	subscriber, ok := shard.subscribers[subscriberID]
	shard.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("subscriber not found: %s", subscriberID)
	}

	return subscriber, nil
}

// ClosePublisher 关闭发布者
func (m *Manager) ClosePublisher(publisherID string) error {
	shard := m.getShard(publisherID)

	shard.mu.Lock()
	publisher, ok := shard.publishers[publisherID]
	if !ok {
		shard.mu.Unlock()
		return fmt.Errorf("publisher not found: %s", publisherID)
	}

	// 关闭所有订阅者
	for _, sub := range publisher.GetSubscribers() {
		m.CloseSubscriber(sub.ID)
	}

	// 关闭发布者连接
	if publisher.PeerConnection != nil {
		publisher.PeerConnection.Close()
	}

	publisher.UpdateState(StateClosed)
	delete(shard.publishers, publisherID)
	shard.mu.Unlock()

	// 清理设备映射
	m.deviceMu.Lock()
	delete(m.devicePublishers, publisher.DeviceID)
	m.deviceMu.Unlock()

	log.Printf("Closed SFU publisher: %s", publisherID)

	return nil
}

// CloseSubscriber 关闭订阅者
func (m *Manager) CloseSubscriber(subscriberID string) error {
	shard := m.getShard(subscriberID)

	shard.mu.Lock()
	subscriber, ok := shard.subscribers[subscriberID]
	if !ok {
		shard.mu.Unlock()
		return fmt.Errorf("subscriber not found: %s", subscriberID)
	}

	// 从发布者移除
	if publisher, err := m.GetPublisher(subscriber.PublisherID); err == nil {
		publisher.RemoveSubscriber(subscriberID)
	}

	// 关闭连接
	if subscriber.PeerConnection != nil {
		subscriber.PeerConnection.Close()
	}

	subscriber.UpdateState(StateClosed)
	delete(shard.subscribers, subscriberID)
	shard.mu.Unlock()

	log.Printf("Closed SFU subscriber: %s", subscriberID)

	return nil
}

// CreatePublisherOffer 创建发布者 SDP Offer
func (m *Manager) CreatePublisherOffer(publisherID string) (*webrtc.SessionDescription, error) {
	publisher, err := m.GetPublisher(publisherID)
	if err != nil {
		return nil, err
	}

	offer, err := publisher.PeerConnection.CreateOffer(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create offer: %w", err)
	}

	// 等待 ICE gathering 完成
	gatherComplete := make(chan struct{})
	var gatherOnce sync.Once

	publisher.PeerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			gatherOnce.Do(func() { close(gatherComplete) })
		}
	})

	if err = publisher.PeerConnection.SetLocalDescription(offer); err != nil {
		return nil, fmt.Errorf("failed to set local description: %w", err)
	}

	select {
	case <-gatherComplete:
	case <-time.After(10 * time.Second):
		log.Printf("ICE gathering timeout for publisher: %s", publisherID)
	}

	publisher.UpdateState(StateConnecting)

	return publisher.PeerConnection.LocalDescription(), nil
}

// CreateSubscriberOffer 创建订阅者 SDP Offer
func (m *Manager) CreateSubscriberOffer(subscriberID string) (*webrtc.SessionDescription, error) {
	subscriber, err := m.GetSubscriber(subscriberID)
	if err != nil {
		return nil, err
	}

	offer, err := subscriber.PeerConnection.CreateOffer(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create offer: %w", err)
	}

	// 等待 ICE gathering 完成
	gatherComplete := make(chan struct{})
	var gatherOnce sync.Once

	subscriber.PeerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			gatherOnce.Do(func() { close(gatherComplete) })
		}
	})

	if err = subscriber.PeerConnection.SetLocalDescription(offer); err != nil {
		return nil, fmt.Errorf("failed to set local description: %w", err)
	}

	select {
	case <-gatherComplete:
	case <-time.After(10 * time.Second):
		log.Printf("ICE gathering timeout for subscriber: %s", subscriberID)
	}

	subscriber.UpdateState(StateConnecting)

	return subscriber.PeerConnection.LocalDescription(), nil
}

// HandlePublisherAnswer 处理发布者 Answer
func (m *Manager) HandlePublisherAnswer(publisherID string, answer webrtc.SessionDescription) error {
	publisher, err := m.GetPublisher(publisherID)
	if err != nil {
		return err
	}

	return publisher.PeerConnection.SetRemoteDescription(answer)
}

// HandleSubscriberAnswer 处理订阅者 Answer
func (m *Manager) HandleSubscriberAnswer(subscriberID string, answer webrtc.SessionDescription) error {
	subscriber, err := m.GetSubscriber(subscriberID)
	if err != nil {
		return err
	}

	return subscriber.PeerConnection.SetRemoteDescription(answer)
}

// AddPublisherICECandidate 添加发布者 ICE 候选
func (m *Manager) AddPublisherICECandidate(publisherID string, candidate webrtc.ICECandidateInit) error {
	publisher, err := m.GetPublisher(publisherID)
	if err != nil {
		return err
	}

	return publisher.PeerConnection.AddICECandidate(candidate)
}

// AddSubscriberICECandidate 添加订阅者 ICE 候选
func (m *Manager) AddSubscriberICECandidate(subscriberID string, candidate webrtc.ICECandidateInit) error {
	subscriber, err := m.GetSubscriber(subscriberID)
	if err != nil {
		return err
	}

	return subscriber.PeerConnection.AddICECandidate(candidate)
}

// WriteVideoFrame 向发布者的视频轨道写入帧
// 所有订阅者会自动收到这个帧
func (m *Manager) WriteVideoFrame(publisherID string, frame []byte, duration time.Duration) error {
	publisher, err := m.GetPublisher(publisherID)
	if err != nil {
		return err
	}

	if publisher.VideoTrack == nil {
		return fmt.Errorf("video track not available")
	}

	sample := &media.Sample{
		Data:     frame,
		Duration: duration,
	}

	if err := publisher.VideoTrack.WriteSample(*sample); err != nil {
		if err != io.ErrClosedPipe {
			return fmt.Errorf("failed to write video frame: %w", err)
		}
	}

	return nil
}

// GetAllPublishers 获取所有发布者
func (m *Manager) GetAllPublishers() []*PublisherSession {
	var publishers []*PublisherSession

	for i := uint32(0); i < m.numShards; i++ {
		m.shards[i].mu.RLock()
		for _, pub := range m.shards[i].publishers {
			publishers = append(publishers, pub)
		}
		m.shards[i].mu.RUnlock()
	}

	return publishers
}

// GetICEServers 获取 ICE 服务器配置
func (m *Manager) GetICEServers() []webrtc.ICEServer {
	var servers []webrtc.ICEServer

	// 从 TURN 服务获取
	if m.turnService != nil && m.turnService.IsConfigured() {
		turnServers, err := m.turnService.GetICEServers()
		if err == nil {
			servers = append(servers, turnServers...)
		}
	}

	// 添加配置的 STUN 服务器
	for _, stun := range m.config.STUNServers {
		servers = append(servers, webrtc.ICEServer{URLs: []string{stun}})
	}

	// 添加配置的 TURN 服务器
	for _, t := range m.config.TURNServers {
		servers = append(servers, webrtc.ICEServer{
			URLs:       t.URLs,
			Username:   t.Username,
			Credential: t.Credential,
		})
	}

	return servers
}

// setupPublisherHandlers 设置发布者事件处理器
func (m *Manager) setupPublisherHandlers(pub *PublisherSession) {
	pc := pub.PeerConnection

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("Publisher %s ICE state: %s", pub.ID, state.String())

		switch state {
		case webrtc.ICEConnectionStateConnected:
			pub.UpdateState(StateConnected)
		case webrtc.ICEConnectionStateFailed:
			pub.UpdateState(StateFailed)
			m.ClosePublisher(pub.ID)
		case webrtc.ICEConnectionStateDisconnected:
			pub.UpdateState(StateDisconnected)
		case webrtc.ICEConnectionStateClosed:
			pub.UpdateState(StateClosed)
		}
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("Publisher %s connection state: %s", pub.ID, state.String())
	})
}

// setupSubscriberHandlers 设置订阅者事件处理器
func (m *Manager) setupSubscriberHandlers(sub *SubscriberSession) {
	pc := sub.PeerConnection

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("Subscriber %s ICE state: %s", sub.ID, state.String())

		switch state {
		case webrtc.ICEConnectionStateConnected:
			sub.UpdateState(StateConnected)
		case webrtc.ICEConnectionStateFailed:
			sub.UpdateState(StateFailed)
			m.CloseSubscriber(sub.ID)
		case webrtc.ICEConnectionStateDisconnected:
			sub.UpdateState(StateDisconnected)
		case webrtc.ICEConnectionStateClosed:
			sub.UpdateState(StateClosed)
		}
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("Subscriber %s connection state: %s", sub.ID, state.String())
	})
}

// registerCodecs 注册编解码器
func (m *Manager) registerCodecs(mediaEngine *webrtc.MediaEngine) error {
	// H.264
	if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:    webrtc.MimeTypeH264,
			ClockRate:   90000,
			SDPFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
		},
		PayloadType: 102,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return err
	}

	// VP8
	if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:  webrtc.MimeTypeVP8,
			ClockRate: 90000,
		},
		PayloadType: 96,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return err
	}

	// Opus
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

// CleanupInactiveSessions 清理不活跃的会话
func (m *Manager) CleanupInactiveSessions(timeout time.Duration) {
	now := time.Now()

	for i := uint32(0); i < m.numShards; i++ {
		shard := &m.shards[i]

		shard.mu.Lock()
		// 清理不活跃的订阅者
		for subID, sub := range shard.subscribers {
			if now.Sub(sub.LastActivityAt) > timeout {
				log.Printf("Cleaning up inactive subscriber: %s", subID)
				if sub.PeerConnection != nil {
					sub.PeerConnection.Close()
				}
				delete(shard.subscribers, subID)
			}
		}

		// 清理不活跃的发布者
		for pubID, pub := range shard.publishers {
			if now.Sub(pub.LastActivityAt) > timeout {
				log.Printf("Cleaning up inactive publisher: %s", pubID)
				// 先关闭所有订阅者
				for _, sub := range pub.GetSubscribers() {
					if sub.PeerConnection != nil {
						sub.PeerConnection.Close()
					}
					delete(shard.subscribers, sub.ID)
				}
				if pub.PeerConnection != nil {
					pub.PeerConnection.Close()
				}
				delete(shard.publishers, pubID)

				// 清理设备映射
				m.deviceMu.Lock()
				delete(m.devicePublishers, pub.DeviceID)
				m.deviceMu.Unlock()
			}
		}
		shard.mu.Unlock()
	}
}
