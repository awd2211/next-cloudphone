package config

import (
	"log"
	"os"
	"strconv"
	"strings"
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
	ICEPortMin uint16
	ICEPortMax uint16

	// 设备服务配置
	DeviceServiceURL string

	// 媒体配置
	VideoCodec    string
	AudioCodec    string
	MaxBitrate    int
	MaxFrameRate  int
	VideoWidth    int
	VideoHeight   int
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

		ICEPortMin: uint16(getEnvInt("ICE_PORT_MIN", 50000)),
		ICEPortMax: uint16(getEnvInt("ICE_PORT_MAX", 50100)),
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

	log.Printf("Config loaded: Port=%s, STUN=%v, ICE Ports=%d-%d",
		cfg.Port, cfg.STUNServers, cfg.ICEPortMin, cfg.ICEPortMax)

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
