package sfu

import (
	"sync"
	"time"

	"github.com/pion/webrtc/v3"
)

// SessionRole 会话角色
type SessionRole string

const (
	// RolePublisher 发布者 - 捕获设备画面并编码
	RolePublisher SessionRole = "publisher"
	// RoleSubscriber 订阅者 - 只接收视频流
	RoleSubscriber SessionRole = "subscriber"
)

// PublisherSession 发布者会话
// 负责从设备捕获视频并通过 Track 广播给所有订阅者
type PublisherSession struct {
	ID             string
	DeviceID       string
	UserID         string
	PeerConnection *webrtc.PeerConnection
	VideoTrack     *webrtc.TrackLocalStaticSample
	AudioTrack     *webrtc.TrackLocalStaticSample
	DataChannel    *webrtc.DataChannel
	CreatedAt      time.Time
	LastActivityAt time.Time
	State          SessionState
	subscribers    map[string]*SubscriberSession
	mu             sync.RWMutex
}

// SubscriberSession 订阅者会话
// 订阅某个 Publisher 的视频流，只读不写
type SubscriberSession struct {
	ID              string
	PublisherID     string // 关联的发布者 ID
	DeviceID        string // 观看的设备 ID
	UserID          string // 观看者用户 ID
	PeerConnection  *webrtc.PeerConnection
	RTPSender       *webrtc.RTPSender // 用于发送视频
	CreatedAt       time.Time
	LastActivityAt  time.Time
	State           SessionState
	mu              sync.RWMutex
}

// SessionState 会话状态
type SessionState string

const (
	StateNew          SessionState = "new"
	StateConnecting   SessionState = "connecting"
	StateConnected    SessionState = "connected"
	StateDisconnected SessionState = "disconnected"
	StateFailed       SessionState = "failed"
	StateClosed       SessionState = "closed"
)

// PublisherInfo 发布者信息（用于 API 响应）
type PublisherInfo struct {
	ID              string    `json:"id"`
	DeviceID        string    `json:"deviceId"`
	UserID          string    `json:"userId"`
	State           string    `json:"state"`
	SubscriberCount int       `json:"subscriberCount"`
	CreatedAt       time.Time `json:"createdAt"`
}

// SubscriberInfo 订阅者信息（用于 API 响应）
type SubscriberInfo struct {
	ID          string    `json:"id"`
	PublisherID string    `json:"publisherId"`
	DeviceID    string    `json:"deviceId"`
	UserID      string    `json:"userId"`
	State       string    `json:"state"`
	CreatedAt   time.Time `json:"createdAt"`
}

// AddSubscriber 添加订阅者
func (p *PublisherSession) AddSubscriber(sub *SubscriberSession) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.subscribers == nil {
		p.subscribers = make(map[string]*SubscriberSession)
	}
	p.subscribers[sub.ID] = sub
}

// RemoveSubscriber 移除订阅者
func (p *PublisherSession) RemoveSubscriber(subID string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.subscribers, subID)
}

// GetSubscribers 获取所有订阅者
func (p *PublisherSession) GetSubscribers() []*SubscriberSession {
	p.mu.RLock()
	defer p.mu.RUnlock()
	subs := make([]*SubscriberSession, 0, len(p.subscribers))
	for _, sub := range p.subscribers {
		subs = append(subs, sub)
	}
	return subs
}

// GetSubscriberCount 获取订阅者数量
func (p *PublisherSession) GetSubscriberCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.subscribers)
}

// UpdateState 更新发布者状态
func (p *PublisherSession) UpdateState(state SessionState) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.State = state
	p.LastActivityAt = time.Now()
}

// GetState 获取发布者状态
func (p *PublisherSession) GetState() SessionState {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.State
}

// UpdateState 更新订阅者状态
func (s *SubscriberSession) UpdateState(state SessionState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.State = state
	s.LastActivityAt = time.Now()
}

// GetState 获取订阅者状态
func (s *SubscriberSession) GetState() SessionState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.State
}

// ToInfo 转换为 API 响应格式
func (p *PublisherSession) ToInfo() PublisherInfo {
	return PublisherInfo{
		ID:              p.ID,
		DeviceID:        p.DeviceID,
		UserID:          p.UserID,
		State:           string(p.GetState()),
		SubscriberCount: p.GetSubscriberCount(),
		CreatedAt:       p.CreatedAt,
	}
}

// ToInfo 转换为 API 响应格式
func (s *SubscriberSession) ToInfo() SubscriberInfo {
	return SubscriberInfo{
		ID:          s.ID,
		PublisherID: s.PublisherID,
		DeviceID:    s.DeviceID,
		UserID:      s.UserID,
		State:       string(s.GetState()),
		CreatedAt:   s.CreatedAt,
	}
}
