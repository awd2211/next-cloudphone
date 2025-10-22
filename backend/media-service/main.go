package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/handlers"
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/metrics"
	"github.com/cloudphone/media-service/internal/middleware"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	// 初始化日志系统
	logger.Init()
	defer logger.Sync()

	// 加载配置
	cfg := config.Load()

	// 设置 Gin 模式
	gin.SetMode(cfg.GinMode)

	// 创建 WebRTC 管理器 (使用分片锁优化)
	webrtcManager := webrtc.NewShardedManager(cfg)

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

	// 创建 Gin 路由（不使用 Default，手动添加中间件）
	router := gin.New()

	// 添加日志和恢复中间件
	router.Use(logger.GinRecovery())
	router.Use(logger.GinLogger())

	// 添加 Prometheus 指标中间件
	router.Use(middleware.MetricsMiddleware())

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

	// Prometheus 指标
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 启动资源监控（每10秒采集一次）
	metrics.StartResourceMonitor(10 * time.Second)

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

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// 启动服务器（在 goroutine 中）
	go func() {
		logger.Info("media_service_starting",
			zap.String("port", cfg.Port),
			zap.String("gin_mode", cfg.GinMode),
			zap.Strings("stun_servers", cfg.STUNServers),
			zap.Uint16("ice_port_min", cfg.ICEPortMin),
			zap.Uint16("ice_port_max", cfg.ICEPortMax),
		)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("failed_to_start_server", zap.Error(err))
		}
	}()

	// 等待中断信号以优雅关闭服务器
	quit := make(chan os.Signal, 1)
	// 捕获 SIGINT (Ctrl+C) 和 SIGTERM 信号
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting_down_server",
		zap.String("reason", "signal_received"),
	)

	// 设置 30 秒的优雅关闭超时
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 优雅关闭 HTTP 服务器
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server_shutdown_error", zap.Error(err))
	}

	// 关闭所有 WebRTC 会话
	logger.Info("closing_all_sessions")
	allSessions := webrtcManager.GetAllSessions()
	for _, session := range allSessions {
		if err := webrtcManager.CloseSession(session.ID); err != nil {
			logger.Warn("failed_to_close_session",
				zap.String("session_id", session.ID),
				zap.Error(err),
			)
		}
	}

	logger.Info("server_stopped", zap.Int("closed_sessions", len(allSessions)))
}
