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
	"github.com/cloudphone/media-service/internal/encoder"
	"github.com/cloudphone/media-service/internal/handlers"
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/metrics"
	"github.com/cloudphone/media-service/internal/middleware"
	"github.com/cloudphone/media-service/internal/rabbitmq"
	"github.com/cloudphone/media-service/internal/recording"
	"github.com/cloudphone/media-service/internal/sfu"
	"github.com/cloudphone/media-service/internal/tracing"
	"github.com/cloudphone/media-service/internal/turn"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
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

	// 创建 TURN 服务 (Cloudflare TURN)
	turnService := turn.NewService()
	if turnService.IsConfigured() {
		logger.Info("cloudflare_turn_configured",
			zap.String("note", "TURN relay will be used for NAT traversal"),
		)
	} else {
		logger.Warn("cloudflare_turn_not_configured",
			zap.String("note", "Only STUN servers will be used, may fail behind strict NAT"),
		)
	}

	// 创建 WebRTC 管理器 (统一实现，支持分片锁和 TURN)
	webrtcManager := webrtc.NewManager(cfg,
		webrtc.WithTURNService(turnService),
		webrtc.WithNumShards(32), // 32 shards for high concurrency
	)

	// 创建 WebSocket Hub
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// 创建视频管道管理器
	pipelineLogger := logrus.New()
	pipelineLogger.SetLevel(logrus.InfoLevel)
	pipelineManager := encoder.NewPipelineManager(pipelineLogger)

	// 获取 ADB 路径
	adbPath := os.Getenv("ADB_PATH")
	if adbPath == "" {
		adbPath = "adb" // 默认使用 PATH 中的 adb
	}

	// 获取 scrcpy-server 路径
	// scrcpy-server 提供高性能 H.264 硬件编码，相比 screencap PNG 模式性能提升 30 倍
	scrcpyServerPath := os.Getenv("SCRCPY_SERVER_PATH")
	useScrcpy := scrcpyServerPath != "" && os.Getenv("USE_SCRCPY") != "false"

	logger.Info("video_pipeline_manager_created",
		zap.String("adb_path", adbPath),
		zap.String("scrcpy_server_path", scrcpyServerPath),
		zap.Bool("use_scrcpy", useScrcpy),
	)

	// 启动会话清理定时器
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			webrtcManager.CleanupInactiveSessions(30 * time.Minute)
		}
	}()

	// 创建录像管理器（需要先于 handler 创建，以支持 CombinedFrameWriter）
	recordingStoragePath := os.Getenv("RECORDING_STORAGE_PATH")
	if recordingStoragePath == "" {
		recordingStoragePath = "./recordings"
	}
	recordingManager, err := recording.NewManager(
		recording.WithStoragePath(recordingStoragePath),
		recording.WithNumShards(8),
		recording.WithLogger(logger.Log),
		recording.WithBaseURL("/api/media"),
	)
	if err != nil {
		logger.Fatal("failed_to_create_recording_manager", zap.Error(err))
	}

	logger.Info("recording_manager_created",
		zap.String("storage_path", recordingStoragePath),
	)

	// 创建组合帧写入器（支持边看边录）
	// 这个写入器会同时将视频帧发送到 WebRTC 和录像文件
	combinedFrameWriter := handlers.NewCombinedFrameWriter(
		webrtcManager,    // 主写入器 (WebRTC)
		recordingManager, // 录像管理器
		logger.Log,       // 日志器
	)

	logger.Info("combined_frame_writer_created",
		zap.Bool("recording_support", true),
	)

	// 创建 HTTP 处理器
	// 通过 HandlerOption 配置 scrcpy 高性能捕获模式和录像支持
	handlerOpts := []handlers.HandlerOption{
		handlers.WithCombinedFrameWriter(combinedFrameWriter), // 启用录像支持
	}
	if useScrcpy {
		handlerOpts = append(handlerOpts,
			handlers.WithScrcpyServer(scrcpyServerPath),
			handlers.WithUseScrcpy(true),
		)
	}
	handler := handlers.New(webrtcManager, wsHub, pipelineManager, adbPath, handlerOpts...)

	// 创建 SFU Manager（支持多人同屏观看）
	sfuManager := sfu.NewManager(cfg,
		sfu.WithTURNService(turnService),
		sfu.WithNumShards(16),
	)

	// 创建 SFU 处理器
	sfuHandlerOpts := []handlers.SFUHandlerOption{}
	if useScrcpy {
		sfuHandlerOpts = append(sfuHandlerOpts,
			handlers.WithSFUScrcpyServer(scrcpyServerPath),
			handlers.WithSFUUseScrcpy(true),
		)
	}
	sfuHandler := handlers.NewSFUHandler(sfuManager, pipelineManager, adbPath, sfuHandlerOpts...)

	logger.Info("sfu_manager_created",
		zap.Bool("use_scrcpy", useScrcpy),
	)

	// 创建录像处理器（传入 CombinedFrameWriter 以支持边看边录）
	recordingHandler := handlers.NewRecordingHandler(
		recordingManager,
		webrtcManager,
		handlers.WithRecordingLogger(logger.Log),
		handlers.WithCombinedFrameWriterForRecording(combinedFrameWriter),
	)

	// 启动 SFU 会话清理定时器
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			sfuManager.CleanupInactiveSessions(30 * time.Minute)
		}
	}()

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
		// WebRTC 会话管理 (1:1 模式)
		api.POST("/sessions", handler.HandleCreateSession)
		api.POST("/sessions/answer", handler.HandleSetAnswer)
		api.POST("/sessions/ice-candidate", handler.HandleAddICECandidate)
		api.POST("/sessions/ice-candidates", handler.HandleAddICECandidates) // 批量 ICE candidates（避免 429 错误）
		api.GET("/sessions/:id", handler.HandleGetSession)
		api.DELETE("/sessions/:id", handler.HandleCloseSession)
		api.GET("/sessions", handler.HandleListSessions)

		// WebSocket 连接
		api.GET("/ws", handler.HandleWebSocket)

		// 统计信息
		api.GET("/stats", handler.HandleStats)

		// Cloudflare TURN 凭证
		api.GET("/turn-credentials", handler.HandleGetTurnCredentials)

		// ========== SFU 路由 (多人同屏观看) ==========
		sfuGroup := api.Group("/sfu")
		{
			// 发布者管理
			sfuGroup.POST("/publishers", sfuHandler.HandleCreatePublisher)
			sfuGroup.POST("/publishers/answer", sfuHandler.HandleSetPublisherAnswer)
			sfuGroup.POST("/publishers/ice-candidate", sfuHandler.HandleAddPublisherICECandidate)
			sfuGroup.GET("/publishers/:id", sfuHandler.HandleGetPublisher)
			sfuGroup.DELETE("/publishers/:id", sfuHandler.HandleClosePublisher)
			sfuGroup.GET("/publishers", sfuHandler.HandleListPublishers)

			// 订阅者管理
			sfuGroup.POST("/subscribers", sfuHandler.HandleCreateSubscriber)
			sfuGroup.POST("/subscribers/by-device", sfuHandler.HandleCreateSubscriberByDevice)
			sfuGroup.POST("/subscribers/answer", sfuHandler.HandleSetSubscriberAnswer)
			sfuGroup.POST("/subscribers/ice-candidate", sfuHandler.HandleAddSubscriberICECandidate)
			sfuGroup.GET("/subscribers/:id", sfuHandler.HandleGetSubscriber)
			sfuGroup.DELETE("/subscribers/:id", sfuHandler.HandleCloseSubscriber)

			// SFU 统计
			sfuGroup.GET("/stats", sfuHandler.HandleSFUStats)
		}

		// ========== 录像路由 (Recording) ==========
		recordingGroup := api.Group("/recordings")
		{
			// 录像管理
			recordingGroup.POST("", recordingHandler.HandleStartRecording)
			recordingGroup.POST("/:id/stop", recordingHandler.HandleStopRecording)
			recordingGroup.GET("/:id", recordingHandler.HandleGetRecording)
			recordingGroup.GET("", recordingHandler.HandleListRecordings)
			recordingGroup.GET("/:id/download", recordingHandler.HandleDownloadRecording)
			recordingGroup.DELETE("/:id", recordingHandler.HandleDeleteRecording)

			// 录像统计和清理
			recordingGroup.GET("/stats", recordingHandler.HandleRecordingStats)
			recordingGroup.POST("/cleanup", recordingHandler.HandleCleanupRecordings)
		}
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

	// 停止所有活跃录像
	logger.Info("stopping_all_recordings")
	recordingManager.StopAll()

	// 清理所有视频管道
	logger.Info("cleaning_up_pipelines")
	pipelineManager.Cleanup()

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
