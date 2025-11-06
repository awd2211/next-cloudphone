package main

import (
	"context"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/consul"
	"github.com/cloudphone/media-service/internal/handlers"
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/metrics"
	"github.com/cloudphone/media-service/internal/middleware"
	"github.com/cloudphone/media-service/internal/rabbitmq"
	"github.com/cloudphone/media-service/internal/tracing"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"
)

func main() {
	// 初始化日志系统
	logger.Init()
	defer logger.Sync()

	// 加载配置
	cfg := config.Load()

	// ========== 初始化 OpenTelemetry 追踪 ==========
	tracingCfg := tracing.Config{
		ServiceName:    cfg.ServiceName,
		ServiceVersion: "1.0.0",
		JaegerEndpoint: cfg.JaegerEndpoint,
		Enabled:        cfg.TracingEnabled,
		SampleRate:     1.0, // 100% sampling in development
	}

	shutdownTracing, err := tracing.InitTracing(tracingCfg, logger.Log)
	if err != nil {
		logger.Warn("tracing_initialization_failed",
			zap.Error(err),
			zap.String("note", "continuing without tracing"),
		)
	}
	// Defer tracing shutdown (will be called before logger.Sync())
	if shutdownTracing != nil {
		defer func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := shutdownTracing(ctx); err != nil {
				logger.Error("tracing_shutdown_failed", zap.Error(err))
			}
		}()
	}

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

	// 添加 OpenTelemetry 追踪中间件
	if cfg.TracingEnabled {
		router.Use(otelgin.Middleware(cfg.ServiceName))
	}

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

	// pprof 性能分析端点 (用于 Goroutine 泄漏检测和性能调优)
	debugGroup := router.Group("/debug/pprof")
	{
		debugGroup.GET("/", gin.WrapF(pprof.Index))
		debugGroup.GET("/cmdline", gin.WrapF(pprof.Cmdline))
		debugGroup.GET("/profile", gin.WrapF(pprof.Profile))
		debugGroup.POST("/symbol", gin.WrapF(pprof.Symbol))
		debugGroup.GET("/symbol", gin.WrapF(pprof.Symbol))
		debugGroup.GET("/trace", gin.WrapF(pprof.Trace))
		debugGroup.GET("/allocs", gin.WrapH(pprof.Handler("allocs")))
		debugGroup.GET("/block", gin.WrapH(pprof.Handler("block")))
		debugGroup.GET("/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		debugGroup.GET("/heap", gin.WrapH(pprof.Handler("heap")))
		debugGroup.GET("/mutex", gin.WrapH(pprof.Handler("mutex")))
		debugGroup.GET("/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
	}

	logger.Info("pprof_enabled", zap.String("endpoint", "/debug/pprof"))

	// 启动资源监控（每10秒采集一次）
	metrics.StartResourceMonitor(10 * time.Second)

	// 启动 Goroutine 监控
	go monitorGoroutines()

	// ========== 初始化 RabbitMQ 发布者 ==========
	var eventPublisher *rabbitmq.Publisher
	if cfg.RabbitMQEnabled {
		var err error
		eventPublisher, err = rabbitmq.NewPublisher(cfg.RabbitMQURL)
		if err != nil {
			logger.Warn("rabbitmq_initialization_failed",
				zap.Error(err),
				zap.String("note", "continuing without event publishing"),
			)
		} else {
			logger.Info("rabbitmq_publisher_initialized",
				zap.String("url_masked", "amqp://***:***@***"),
			)
		}
	}

	// ========== 注册到 Consul ==========
	var consulClient *consul.Client
	if cfg.ConsulEnabled {
		var err error
		consulClient, err = consul.NewClient(cfg)
		if err != nil {
			logger.Warn("consul_client_creation_failed",
				zap.Error(err),
				zap.String("note", "continuing without service registration"),
			)
		} else {
			err = consulClient.RegisterService()
			if err != nil {
				logger.Warn("consul_registration_failed",
					zap.Error(err),
				)
			} else {
				logger.Info("consul_registration_successful",
					zap.String("service_name", cfg.ServiceName),
				)
			}
		}
	}

	// API 路由 (需要 JWT 认证)
	api := router.Group("/api/media")
	api.Use(middleware.JWTMiddleware())
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

	// ========== 从 Consul 注销服务 ==========
	if consulClient != nil {
		if err := consulClient.DeregisterService(); err != nil {
			logger.Error("consul_deregistration_failed", zap.Error(err))
		} else {
			logger.Info("consul_deregistration_successful")
		}
	}

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

	// ========== 关闭 RabbitMQ 连接 ==========
	if eventPublisher != nil {
		if err := eventPublisher.Close(); err != nil {
			logger.Error("rabbitmq_close_failed", zap.Error(err))
		}
	}

	logger.Info("server_stopped",
		zap.Int("closed_sessions", len(allSessions)),
		zap.Bool("consul_enabled", cfg.ConsulEnabled),
		zap.Bool("rabbitmq_enabled", cfg.RabbitMQEnabled),
	)
}

// monitorGoroutines monitors Goroutine count for leak detection
func monitorGoroutines() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	var baseline int
	var baselineSet bool

	for range ticker.C {
		current := runtime.NumGoroutine()

		// Set baseline on first measurement
		if !baselineSet {
			baseline = current
			baselineSet = true
			logger.Info("goroutine_baseline_set", zap.Int("count", baseline))
			continue
		}

		// Check for significant increase (>20%)
		increase := float64(current-baseline) / float64(baseline) * 100

		if increase > 20 {
			logger.Warn("goroutine_count_increased",
				zap.Int("baseline", baseline),
				zap.Int("current", current),
				zap.Float64("increase_percent", increase),
				zap.String("action", "possible goroutine leak"),
			)
		} else {
			logger.Debug("goroutine_count_normal",
				zap.Int("count", current),
				zap.Int("baseline", baseline),
			)
		}

		// Update baseline gradually (exponential moving average)
		baseline = (baseline*9 + current) / 10
	}
}
