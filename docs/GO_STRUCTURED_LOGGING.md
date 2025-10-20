# Go 结构化日志 - Media Service (zap)

## 概述

为 Media Service (Go/Gin) 实现了完整的结构化日志系统，使用 uber-go/zap 库，参考 Winston/structlog 配置模式。

## 实现文件

### 1. logger/logger.go (180行)
`backend/media-service/internal/logger/logger.go`

**核心功能**：
- 环境自适应配置（开发/生产环境）
- 结构化日志输出（JSON 格式）
- 彩色控制台输出（开发环境）
- 高性能日志记录（zap 零分配设计）
- 可选文件日志轮转

**技术栈**：
- `go.uber.org/zap`: 高性能结构化日志核心库

### 2. logger/middleware.go (80行)
`backend/media-service/internal/logger/middleware.go`

**Gin HTTP 中间件**：
- GinLogger: HTTP 请求日志记录
- GinRecovery: Panic 恢复和记录

## 日志配置

### 开发环境（彩色易读）
```bash
2025-10-20 18:54:49  INFO  logger/logger.go:98  logger_initialized  {"environment": "development", "log_level": "debug"}
2025-10-20 18:54:49  INFO  config/config.go:79  config_loaded  {"port": "30006", "stun_servers": ["stun:stun.l.google.com:19302"], "ice_port_min": 50000, "ice_port_max": 50100}
2025-10-20 18:55:23  INFO  logger/middleware.go:66  http_request  {"status": 200, "method": "GET", "path": "/health", "latency": "51.86µs"}
```

### 生产环境（JSON）
```json
{
  "timestamp": "2025-10-20T18:54:49.123Z",
  "level": "info",
  "logger": "config",
  "caller": "config/config.go:79",
  "message": "config_loaded",
  "port": "30006",
  "stun_servers": ["stun:stun.l.google.com:19302"],
  "ice_port_min": 50000,
  "ice_port_max": 50100
}
```

## 使用方法

### 基本用法

```go
package example

import (
	"github.com/cloudphone/media-service/internal/logger"
	"go.uber.org/zap"
)

func ExampleFunction() {
	// 基本日志
	logger.Info("operation_started")
	
	// 带字段的日志
	logger.Info("session_created",
		zap.String("session_id", sessionID),
		zap.String("device_id", deviceID),
		zap.String("user_id", userID),
	)
	
	// 错误日志
	logger.Error("operation_failed",
		zap.String("session_id", sessionID),
		zap.Error(err),
	)
	
	// 警告日志
	logger.Warn("resource_low",
		zap.Int("available_slots", slots),
	)
	
	// 调试日志
	logger.Debug("ice_candidate_added",
		zap.String("session_id", sessionID),
		zap.Any("candidate", candidate),
	)
}
```

### 在 main.go 中使用

```go
package main

import (
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// 初始化日志系统
	logger.Init()
	defer logger.Sync() // 刷新缓冲区
	
	// 创建 Gin 路由
	router := gin.New()
	
	// 添加日志中间件
	router.Use(logger.GinRecovery()) // Panic 恢复
	router.Use(logger.GinLogger())   // HTTP 请求日志
	
	// 启动信息
	logger.Info("media_service_starting",
		zap.String("port", cfg.Port),
		zap.String("gin_mode", cfg.GinMode),
		zap.Strings("stun_servers", cfg.STUNServers),
	)
	
	router.Run(":" + cfg.Port)
}
```

### 在 handlers 中使用

```go
package handlers

import (
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func (h *Handler) HandleCreateSession(c *gin.Context) {
	// 创建会话
	session, err := h.webrtcManager.CreateSession(req.DeviceID, req.UserID)
	if err != nil {
		logger.Error("failed_to_create_session",
			zap.String("device_id", req.DeviceID),
			zap.String("user_id", req.UserID),
			zap.Error(err),
		)
		c.JSON(500, gin.H{"error": "Failed to create session"})
		return
	}
	
	logger.Info("session_created",
		zap.String("session_id", session.ID),
		zap.String("device_id", req.DeviceID),
		zap.String("user_id", req.UserID),
	)
	
	c.JSON(200, session)
}
```

### 创建带上下文的 logger

```go
// 创建子 logger（类似 Winston 的 child logger）
sessionLogger := logger.With(
	zap.String("session_id", sessionID),
	zap.String("user_id", userID),
)

// 后续日志会自动包含这些字段
sessionLogger.Info("offer_created")
sessionLogger.Info("answer_received")
sessionLogger.Info("connection_established")
```

## Zap 字段类型

```go
zap.String("key", "value")           // 字符串
zap.Int("key", 123)                  // 整数
zap.Int64("key", 123)                // 64位整数
zap.Uint16("key", 123)               // 无符号16位整数
zap.Bool("key", true)                // 布尔值
zap.Float64("key", 3.14)             // 浮点数
zap.Duration("key", time.Second)     // 时间间隔
zap.Time("key", time.Now())          // 时间
zap.Error(err)                       // 错误
zap.Any("key", value)                // 任意类型（会使用反射）
zap.Strings("key", []string{"a", "b"}) // 字符串数组
zap.Stack("stacktrace")              // 堆栈跟踪
```

## 日志级别

- **Debug**: 详细调试信息（开发环境默认）
- **Info**: 重要事件（生产环境默认）
- **Warn**: 警告信息（潜在问题）
- **Error**: 错误信息（需要关注）
- **Fatal**: 致命错误（会退出程序）

## 环境变量配置

```bash
# 日志级别
LOG_LEVEL=debug          # debug, info, warn, error

# 运行环境
NODE_ENV=development     # development, production

# 文件日志（仅生产环境）
ENABLE_FILE_LOGGING=true
```

## HTTP 请求日志

### 自动记录的信息

```go
{
  "status": 200,              // HTTP 状态码
  "method": "GET",            // 请求方法
  "path": "/api/media/sessions",  // 请求路径
  "query": "userId=123",      // 查询参数
  "ip": "172.22.0.1",         // 客户端 IP
  "latency": "51.86µs",       // 响应时间
  "user_agent": "curl/8.9.1"  // User-Agent
}
```

### 日志级别选择

- **2xx 成功**: INFO 级别
- **4xx 客户端错误**: WARN 级别
- **5xx 服务器错误**: ERROR 级别
- **有错误信息**: ERROR 级别

## 日志事件列表

### 系统启动
- `logger_initialized`: 日志系统初始化
- `config_loaded`: 配置加载完成
- `media_service_starting`: Media Service 启动

### HTTP 请求
- `http_request`: 正常 HTTP 请求
- `http_request_client_error`: 4xx 客户端错误
- `http_request_server_error`: 5xx 服务器错误
- `http_request_error`: 请求处理错误
- `panic_recovered`: Panic 恢复

### WebRTC 会话管理
- `session_created`: WebRTC 会话创建
- `failed_to_create_session`: 会话创建失败
- `failed_to_create_offer`: Offer 创建失败
- `answer_handled`: SDP Answer 处理完成
- `failed_to_handle_answer`: Answer 处理失败
- `session_closed`: 会话关闭
- `failed_to_close_session`: 会话关闭失败

### ICE 处理
- `ice_candidate_added`: ICE 候选添加成功
- `failed_to_add_ice_candidate`: ICE 候选添加失败

### WebSocket
- `websocket_connected`: WebSocket 连接建立
- `failed_to_upgrade_websocket`: WebSocket 升级失败

## 与 Winston/structlog 的对应关系

| Winston/structlog | zap 实现 |
|-------------------|---------|
| `winston.format.timestamp()` | `zapcore.ISO8601TimeEncoder` |
| `winston.format.json()` | `encoding: "json"` |
| `winston.format.printf()` | `encoding: "console"` |
| `winston.format.colorize()` | `zapcore.CapitalColorLevelEncoder` |
| `winston.transports.Console()` | `OutputPaths: ["stdout"]` |
| `winston.transports.File()` | `OutputPaths: ["logs/combined.log"]` |
| `logger.child({ context })` | `logger.With(zap.String(...))` |
| `logger.info(msg, { key: value })` | `logger.Info(msg, zap.String("key", value))` |
| `exc_info=True` (structlog) | `zap.Error(err)` |

## 性能优势

Zap 相比其他 Go 日志库的优势：
- **零分配**: 避免不必要的内存分配
- **类型安全**: 编译时类型检查
- **高性能**: 基准测试比 logrus 快 5-10 倍
- **结构化**: 强制使用结构化字段

## 依赖项

```go
require (
	go.uber.org/zap v1.27.0
	go.uber.org/multierr v1.10.0 // indirect
)
```

## 测试验证

```bash
# 查看日志
docker logs cloudphone-media-service --tail 50

# 测试 HTTP 请求日志
curl http://localhost:30006/health
docker logs cloudphone-media-service | grep http_request

# 测试会话创建日志
curl -X POST http://localhost:30006/api/media/sessions \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device", "userId": "test-user"}'
docker logs cloudphone-media-service | grep session_created
```

## 最佳实践

1. **事件命名**：使用 `snake_case`，描述性强
   ```go
   logger.Info("session_created")        // ✅ 好
   logger.Info("SessionCreated")         // ❌ 差
   logger.Info("create session success") // ❌ 差
   ```

2. **上下文信息**：总是包含关键标识
   ```go
   logger.Info("session_created",
       zap.String("session_id", sessionID),  // ✅ 关键ID
       zap.String("user_id", userID),
   )
   ```

3. **错误处理**：使用 `zap.Error()` 记录错误
   ```go
   logger.Error("operation_failed",
       zap.String("operation", "create_session"),
       zap.Error(err),  // ✅ 包含堆栈信息
   )
   ```

4. **避免使用 `zap.Any()`**：性能较差
   ```go
   logger.Info("data", zap.Int("count", count))     // ✅ 好
   logger.Info("data", zap.Any("count", count))     // ❌ 差（使用反射）
   ```

5. **日志级别选择**：
   - Debug: 调试信息（函数进入/退出）
   - Info: 正常业务事件
   - Warn: 预期的异常情况
   - Error: 错误和异常

## 文件日志（生产环境）

启用文件日志后：
```
logs/
├── combined.log   # 所有日志
├── error.log      # 仅错误日志
```

## 下一步计划

- [ ] 集成日志采样（高流量场景）
- [ ] 添加日志轮转配置
- [ ] 集成 Prometheus metrics
- [ ] 部署 ELK Stack 进行日志聚合
- [ ] 添加分布式追踪（OpenTelemetry）

## 参考资源

- [uber-go/zap 官方文档](https://github.com/uber-go/zap)
- [Zap 性能基准测试](https://github.com/uber-go/zap#performance)
- [Winston 配置参考](../backend/user-service/src/config/winston.config.ts)
- [Structlog 配置参考](../backend/scheduler-service/logger.py)
