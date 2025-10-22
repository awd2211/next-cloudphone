package metrics

import (
	"runtime"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// ========== 会话指标 ==========

var (
	// ActiveSessions 当前活跃的 WebRTC 会话数
	ActiveSessions = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_active_sessions",
		Help: "当前活跃的 WebRTC 会话数",
	})

	// SessionsCreated 创建的会话总数
	SessionsCreated = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_sessions_created_total",
		Help: "创建的会话总数",
	}, []string{"device_id"})

	// SessionsClosed 关闭的会话总数
	SessionsClosed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_sessions_closed_total",
		Help: "关闭的会话总数",
	}, []string{"device_id", "reason"})

	// SessionDuration 会话持续时间（秒）
	SessionDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "media_session_duration_seconds",
		Help:    "会话持续时间",
		Buckets: []float64{60, 300, 600, 1800, 3600, 7200}, // 1分钟到2小时
	}, []string{"device_id"})
)

// ========== ICE 连接指标 ==========

var (
	// ICEConnectionState ICE 连接状态
	ICEConnectionState = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_ice_connection_state",
		Help: "ICE 连接状态 (0=new, 1=checking, 2=connected, 3=completed, 4=failed, 5=disconnected, 6=closed)",
	}, []string{"session_id", "state"})

	// ICECandidatesAdded 添加的 ICE 候选总数
	ICECandidatesAdded = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_ice_candidates_added_total",
		Help: "添加的 ICE 候选总数",
	}, []string{"session_id"})

	// ICEConnectionTime ICE 连接建立时间（毫秒）
	ICEConnectionTime = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "media_ice_connection_time_milliseconds",
		Help:    "ICE 连接建立时间",
		Buckets: prometheus.ExponentialBuckets(100, 2, 8), // 100ms 到 12.8秒
	}, []string{"session_id"})
)

// ========== WebRTC 质量指标 ==========

var (
	// VideoFrameRate 视频帧率 (FPS)
	VideoFrameRate = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_video_frame_rate",
		Help: "视频帧率 (FPS)",
	}, []string{"session_id"})

	// VideoBitrate 视频码率 (bits/秒)
	VideoBitrate = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_video_bitrate_bps",
		Help: "视频码率 (bits/秒)",
	}, []string{"session_id"})

	// PacketLoss 丢包率 (0-1)
	PacketLoss = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_packet_loss_ratio",
		Help: "丢包率 (0-1)",
	}, []string{"session_id"})

	// RTT 往返时间 (毫秒)
	RTT = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_rtt_milliseconds",
		Help: "往返时间 (毫秒)",
	}, []string{"session_id"})

	// Jitter 抖动 (毫秒)
	Jitter = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "media_jitter_milliseconds",
		Help: "网络抖动 (毫秒)",
	}, []string{"session_id"})
)

// ========== WebSocket 指标 ==========

var (
	// WebSocketConnections 当前 WebSocket 连接数
	WebSocketConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_websocket_connections",
		Help: "当前 WebSocket 连接数",
	})

	// WebSocketMessages WebSocket 消息总数
	WebSocketMessages = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_websocket_messages_total",
		Help: "WebSocket 消息总数",
	}, []string{"type", "direction"}) // direction: inbound/outbound

	// WebSocketMessageSize WebSocket 消息大小（字节）
	WebSocketMessageSize = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "media_websocket_message_size_bytes",
		Help:    "WebSocket 消息大小",
		Buckets: prometheus.ExponentialBuckets(64, 4, 8), // 64B 到 1MB
	}, []string{"type"})
)

// ========== HTTP API 指标 ==========

var (
	// HTTPRequests HTTP 请求总数
	HTTPRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_http_requests_total",
		Help: "HTTP 请求总数",
	}, []string{"method", "path", "status"})

	// HTTPDuration HTTP 请求延迟（秒）
	HTTPDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "media_http_duration_seconds",
		Help:    "HTTP 请求延迟",
		Buckets: prometheus.ExponentialBuckets(0.001, 2, 10), // 1ms 到 1秒
	}, []string{"method", "path"})

	// HTTPInFlight 当前正在处理的 HTTP 请求数
	HTTPInFlight = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_http_requests_in_flight",
		Help: "当前正在处理的 HTTP 请求数",
	})
)

// ========== 资源使用指标 ==========

var (
	// MemoryUsage 内存使用量（字节）
	MemoryUsage = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_memory_usage_bytes",
		Help: "内存使用量 (字节)",
	})

	// MemoryHeapAlloc 堆内存分配量（字节）
	MemoryHeapAlloc = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_memory_heap_alloc_bytes",
		Help: "堆内存分配量 (字节)",
	})

	// MemoryHeapSys 堆内存系统占用（字节）
	MemoryHeapSys = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_memory_heap_sys_bytes",
		Help: "堆内存系统占用 (字节)",
	})

	// GoroutineCount Goroutine 数量
	GoroutineCount = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_goroutine_count",
		Help: "Goroutine 数量",
	})

	// GoroutineCountMax Goroutine 最大数量（用于检测泄漏）
	GoroutineCountMax = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_goroutine_count_max",
		Help: "Goroutine 历史最大数量",
	})

	// PotentialGoroutineLeak 潜在 Goroutine 泄漏警告
	PotentialGoroutineLeak = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_potential_goroutine_leak",
		Help: "潜在 Goroutine 泄漏 (1=可能泄漏, 0=正常)",
	})

	// CPUUsage CPU 使用率 (0-1)
	CPUUsage = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "media_cpu_usage_ratio",
		Help: "CPU 使用率 (0-1)",
	})
)

// ========== 错误指标 ==========

var (
	// Errors 错误总数
	Errors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "media_errors_total",
		Help: "错误总数",
	}, []string{"type", "operation"})
)

// ========== 辅助函数 ==========

var (
	goroutineMaxValue    float64
	goroutineSampleCount int
	goroutineBaseline    float64 = -1 // 初始基线（-1 表示未初始化）
)

// StartResourceMonitor 启动资源监控
func StartResourceMonitor(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			updateResourceMetrics()
		}
	}()
}

// updateResourceMetrics 更新资源使用指标
func updateResourceMetrics() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// 内存指标
	MemoryUsage.Set(float64(m.Alloc))
	MemoryHeapAlloc.Set(float64(m.HeapAlloc))
	MemoryHeapSys.Set(float64(m.HeapSys))

	// Goroutine 数量
	currentGoroutines := float64(runtime.NumGoroutine())
	GoroutineCount.Set(currentGoroutines)

	// 更新 Goroutine 最大值
	if currentGoroutines > goroutineMaxValue {
		goroutineMaxValue = currentGoroutines
		GoroutineCountMax.Set(goroutineMaxValue)
	}

	// Goroutine 泄漏检测
	goroutineSampleCount++

	// 等待收集 30 个样本（5分钟）后建立基线
	if goroutineSampleCount == 30 && goroutineBaseline == -1 {
		goroutineBaseline = currentGoroutines
	}

	// 基线建立后，检测异常增长
	if goroutineBaseline > 0 {
		// 如果当前 Goroutine 数量是基线的 3 倍以上，可能存在泄漏
		if currentGoroutines > goroutineBaseline*3 {
			PotentialGoroutineLeak.Set(1)
		} else {
			PotentialGoroutineLeak.Set(0)
		}
	}
}

// RecordSessionCreated 记录会话创建
func RecordSessionCreated(deviceID string) {
	SessionsCreated.WithLabelValues(deviceID).Inc()
	ActiveSessions.Inc()
}

// RecordSessionClosed 记录会话关闭
func RecordSessionClosed(deviceID, reason string, duration time.Duration) {
	SessionsClosed.WithLabelValues(deviceID, reason).Inc()
	ActiveSessions.Dec()
	SessionDuration.WithLabelValues(deviceID).Observe(duration.Seconds())
}

// RecordICECandidate 记录 ICE 候选添加
func RecordICECandidate(sessionID string) {
	ICECandidatesAdded.WithLabelValues(sessionID).Inc()
}

// RecordWebSocketConnection 记录 WebSocket 连接变化
func RecordWebSocketConnection(delta float64) {
	WebSocketConnections.Add(delta)
}

// RecordWebSocketMessage 记录 WebSocket 消息
func RecordWebSocketMessage(msgType, direction string, size int) {
	WebSocketMessages.WithLabelValues(msgType, direction).Inc()
	WebSocketMessageSize.WithLabelValues(msgType).Observe(float64(size))
}

// RecordHTTPRequest 记录 HTTP 请求
func RecordHTTPRequest(method, path, status string, duration time.Duration) {
	HTTPRequests.WithLabelValues(method, path, status).Inc()
	HTTPDuration.WithLabelValues(method, path).Observe(duration.Seconds())
}

// RecordError 记录错误
func RecordError(errType, operation string) {
	Errors.WithLabelValues(errType, operation).Inc()
}
