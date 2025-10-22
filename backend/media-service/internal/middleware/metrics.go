package middleware

import (
	"strconv"
	"time"

	"github.com/cloudphone/media-service/internal/metrics"
	"github.com/gin-gonic/gin"
)

// MetricsMiddleware 记录 HTTP 请求指标
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求开始时间
		start := time.Now()

		// 增加并发请求数
		metrics.HTTPInFlight.Inc()
		defer metrics.HTTPInFlight.Dec()

		// 处理请求
		c.Next()

		// 计算请求延迟
		duration := time.Since(start)

		// 获取路径和状态码
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		method := c.Request.Method
		status := strconv.Itoa(c.Writer.Status())

		// 记录指标
		metrics.RecordHTTPRequest(method, path, status, duration)
	}
}
