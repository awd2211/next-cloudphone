package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/cloudphone/media-service/internal/logger"
	"go.uber.org/zap"
)

type Config struct {
	// 服务配置
	Port     string
	GinMode  string
	LogLevel string

	// WebRTC 配置
	STUNServers []string
	TURNServers []TURNServer

	// ICE 配置
	ICEPortMin  uint16
	ICEPortMax  uint16
	NAT1To1IPs  []string // NAT 1:1 映射 IP（用于跨 NAT/Docker 网络的 ICE 候选）

	// 设备服务配置
	DeviceServiceURL string

	// 媒体配置
	VideoCodec    string
	AudioCodec    string
	MaxBitrate    int
	MaxFrameRate  int
	VideoWidth    int
	VideoHeight   int

	// 采集配置 (新增)
	CaptureMode     string // "screencap" (PNG) or "screenrecord" (H.264)
	VideoEncoderType string // "passthrough", "vp8", "vp8-simple", "h264"

	// Consul 配置
	ConsulHost    string
	ConsulPort    int
	ConsulEnabled bool
	ServiceName   string
	ServiceHost   string

	// RabbitMQ 配置
	RabbitMQURL     string
	RabbitMQEnabled bool

	// Tracing 配置
	JaegerEndpoint string
	TracingEnabled bool
}

type TURNServer struct {
	URLs       []string
	Username   string
	Credential string
}

func Load() *Config {
	cfg := &Config{
		Port:     getEnv("PORT", "30006"),
		GinMode:  getEnv("GIN_MODE", "debug"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		DeviceServiceURL: getEnv("DEVICE_SERVICE_URL", "http://localhost:30002"),

		VideoCodec:   getEnv("VIDEO_CODEC", "VP8"),
		AudioCodec:   getEnv("AUDIO_CODEC", "opus"),
		MaxBitrate:   getEnvInt("MAX_BITRATE", 2000000), // 2 Mbps
		MaxFrameRate: getEnvInt("MAX_FRAME_RATE", 30),
		VideoWidth:   getEnvInt("VIDEO_WIDTH", 1280),
		VideoHeight:  getEnvInt("VIDEO_HEIGHT", 720),

		// 采集配置: 默认使用 screenrecord (H.264 硬件编码)
		CaptureMode:     getEnv("CAPTURE_MODE", "screenrecord"), // screenrecord (推荐) | screencap
		VideoEncoderType: getEnv("VIDEO_ENCODER_TYPE", "passthrough"), // 自动根据 CaptureMode 选择

		ICEPortMin: uint16(getEnvInt("ICE_PORT_MIN", 50000)),
		ICEPortMax: uint16(getEnvInt("ICE_PORT_MAX", 50100)),
		NAT1To1IPs: getEnvStringSlice("NAT_1TO1_IPS", []string{}), // 可选：指定公网/LAN IP

		// Consul 配置
		ConsulHost:    getEnv("CONSUL_HOST", "localhost"),
		ConsulPort:    getEnvInt("CONSUL_PORT", 8500),
		ConsulEnabled: getEnvBool("CONSUL_ENABLED", true),
		ServiceName:   getEnv("SERVICE_NAME", "media-service"),
		ServiceHost:   getEnv("SERVICE_HOST", "localhost"),

		// RabbitMQ 配置
		RabbitMQURL:     getEnv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/cloudphone"),
		RabbitMQEnabled: getEnvBool("RABBITMQ_ENABLED", true),

		// Tracing 配置
		JaegerEndpoint: getEnv("JAEGER_ENDPOINT", "localhost:4318"),
		TracingEnabled: getEnvBool("TRACING_ENABLED", true),
	}

	// 加载 STUN 服务器
	stunServers := getEnv("STUN_SERVERS", "stun:stun.l.google.com:19302")
	cfg.STUNServers = strings.Split(stunServers, ",")

	// 加载 TURN 服务器
	turnURLs := getEnv("TURN_URLS", "")
	if turnURLs != "" {
		cfg.TURNServers = []TURNServer{
			{
				URLs:       strings.Split(turnURLs, ","),
				Username:   getEnv("TURN_USERNAME", ""),
				Credential: getEnv("TURN_CREDENTIAL", ""),
			},
		}
	}

	logger.Info("config_loaded",
		zap.String("port", cfg.Port),
		zap.Strings("stun_servers", cfg.STUNServers),
		zap.Uint16("ice_port_min", cfg.ICEPortMin),
		zap.Uint16("ice_port_max", cfg.ICEPortMax),
		zap.Strings("nat_1to1_ips", cfg.NAT1To1IPs),
		zap.String("video_codec", cfg.VideoCodec),
		zap.Int("max_bitrate", cfg.MaxBitrate),
		zap.String("capture_mode", cfg.CaptureMode),
		zap.String("video_encoder_type", cfg.VideoEncoderType),
	)

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvStringSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		parts := strings.Split(value, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}
