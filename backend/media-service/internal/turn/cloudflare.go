package turn

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/cloudphone/media-service/internal/logger"
	"github.com/pion/webrtc/v3"
	"go.uber.org/zap"
)

// CloudflareTurnResponse Cloudflare TURN API 响应
type CloudflareTurnResponse struct {
	IceServers []IceServer `json:"iceServers"`
}

// IceServer ICE 服务器配置
type IceServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

// Service 管理 Cloudflare TURN 凭证
type Service struct {
	keyID    string
	apiToken string
	ttl      int

	// 缓存
	mu              sync.RWMutex
	cachedServers   []webrtc.ICEServer
	cacheExpireTime time.Time
}

// NewService 创建 TURN 服务
func NewService() *Service {
	ttl := 86400 // 默认 24 小时
	return &Service{
		keyID:    os.Getenv("CLOUDFLARE_TURN_KEY_ID"),
		apiToken: os.Getenv("CLOUDFLARE_TURN_API_TOKEN"),
		ttl:      ttl,
	}
}

// IsConfigured 检查是否配置了 Cloudflare TURN
func (s *Service) IsConfigured() bool {
	return s.keyID != "" && s.apiToken != ""
}

// GetICEServers 获取 ICE 服务器配置（带缓存）
func (s *Service) GetICEServers() ([]webrtc.ICEServer, error) {
	// 检查缓存
	s.mu.RLock()
	if time.Now().Before(s.cacheExpireTime) && len(s.cachedServers) > 0 {
		servers := s.cachedServers
		s.mu.RUnlock()
		logger.Debug("using_cached_turn_credentials")
		return servers, nil
	}
	s.mu.RUnlock()

	// 获取新凭证
	return s.fetchAndCacheCredentials()
}

// fetchAndCacheCredentials 从 Cloudflare API 获取并缓存凭证
func (s *Service) fetchAndCacheCredentials() ([]webrtc.ICEServer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 双重检查（避免并发时重复请求）
	if time.Now().Before(s.cacheExpireTime) && len(s.cachedServers) > 0 {
		return s.cachedServers, nil
	}

	if !s.IsConfigured() {
		logger.Warn("cloudflare_turn_not_configured")
		return nil, fmt.Errorf("cloudflare TURN not configured")
	}

	// 调用 Cloudflare API
	url := fmt.Sprintf("https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers", s.keyID)

	reqBody, _ := json.Marshal(map[string]interface{}{
		"ttl": s.ttl,
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call cloudflare api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cloudflare api error: status=%d, body=%s", resp.StatusCode, string(body))
	}

	var turnResp CloudflareTurnResponse
	if err := json.NewDecoder(resp.Body).Decode(&turnResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// 转换为 webrtc.ICEServer
	var servers []webrtc.ICEServer
	for _, ice := range turnResp.IceServers {
		server := webrtc.ICEServer{
			URLs: ice.URLs,
		}
		if ice.Username != "" {
			server.Username = ice.Username
		}
		if ice.Credential != "" {
			server.Credential = ice.Credential
		}
		servers = append(servers, server)
	}

	// 缓存凭证（缓存时间为 TTL 的 90%，确保凭证在使用时仍然有效）
	s.cachedServers = servers
	s.cacheExpireTime = time.Now().Add(time.Duration(float64(s.ttl)*0.9) * time.Second)

	logger.Info("cloudflare_turn_credentials_fetched",
		zap.Int("ice_servers_count", len(servers)),
		zap.Time("cache_expire", s.cacheExpireTime),
	)

	return servers, nil
}
