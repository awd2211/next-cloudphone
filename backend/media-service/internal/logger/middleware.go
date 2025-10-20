package logger

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GinLogger 返回一个 Gin 中间件，用于记录 HTTP 请求
//
// 类似于 Winston 的 LoggingInterceptor：
// - 记录请求方法、路径、状态码
// - 记录响应时间
// - 记录客户端 IP
// - 自动记录错误
func GinLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 计算耗时
		latency := time.Since(start)

		// 获取状态码
		statusCode := c.Writer.Status()

		// 获取客户端 IP
		clientIP := c.ClientIP()

		// 获取请求方法
		method := c.Request.Method

		// 获取错误信息
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		// 构建日志字段
		fields := []zap.Field{
			zap.Int("status", statusCode),
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", clientIP),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		}

		// 根据状态码选择日志级别
		if len(c.Errors) > 0 {
			// 有错误
			Error("http_request_error",
				append(fields, zap.String("error", errorMessage))...,
			)
		} else if statusCode >= 500 {
			// 服务器错误
			Error("http_request_server_error", fields...)
		} else if statusCode >= 400 {
			// 客户端错误
			Warn("http_request_client_error", fields...)
		} else {
			// 正常请求
			Info("http_request", fields...)
		}
	}
}

// GinRecovery 返回一个 Gin 中间件，用于恢复 panic 并记录
//
// 类似于 Winston 的 AllExceptionsFilter
func GinRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 记录 panic
				Error("panic_recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.String("ip", c.ClientIP()),
					zap.Stack("stacktrace"),
				)

				// 返回 500 错误
				c.AbortWithStatusJSON(500, gin.H{
					"error": "Internal Server Error",
				})
			}
		}()

		c.Next()
	}
}
