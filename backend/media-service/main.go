package main

import (
	"log"
	"time"

	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/handlers"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 设置 Gin 模式
	gin.SetMode(cfg.GinMode)

	// 创建 WebRTC 管理器
	webrtcManager := webrtc.NewManager(cfg)

	// 创建 WebSocket Hub
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// 启动会话清理定时器
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			webrtcManager.CleanupInactiveSessions(30 * time.Minute)
		}
	}()

	// 创建 HTTP 处理器
	handler := handlers.New(webrtcManager, wsHub)

	// 创建 Gin 路由
	router := gin.Default()

	// CORS 配置
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 健康检查
	router.GET("/health", handler.HandleHealth)

	// API 路由
	api := router.Group("/api/media")
	{
		// WebRTC 会话管理
		api.POST("/sessions", handler.HandleCreateSession)
		api.POST("/sessions/answer", handler.HandleSetAnswer)
		api.POST("/sessions/ice-candidate", handler.HandleAddICECandidate)
		api.GET("/sessions/:id", handler.HandleGetSession)
		api.DELETE("/sessions/:id", handler.HandleCloseSession)
		api.GET("/sessions", handler.HandleListSessions)

		// WebSocket 连接
		api.GET("/ws", handler.HandleWebSocket)

		// 统计信息
		api.GET("/stats", handler.HandleStats)
	}

	// 启动服务器
	log.Printf("🎬 Media Service is running on: http://localhost:%s", cfg.Port)
	log.Printf("📡 WebRTC Manager initialized")
	log.Printf("🌐 WebSocket Hub started")
	log.Printf("🔧 STUN Servers: %v", cfg.STUNServers)
	log.Printf("✅ Health check: http://localhost:%s/health", cfg.Port)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
