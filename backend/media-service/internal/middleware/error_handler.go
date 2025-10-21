package middleware

import (
	"net/http"
	"time"

	"github.com/cloudphone/media-service/internal/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ErrorResponse 统一错误响应格式
//
// 与 NestJS 的 HttpExceptionFilter 格式保持一致
type ErrorResponse struct {
	Success   bool      `json:"success"`
	Code      int       `json:"code"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Path      string    `json:"path"`
	Method    string    `json:"method"`
	Error     string    `json:"error,omitempty"` // 仅开发环境
}

// SuccessResponse 统一成功响应格式
type SuccessResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp,omitempty"`
}

// RespondWithError 返回标准错误响应
func RespondWithError(c *gin.Context, code int, message string) {
	response := ErrorResponse{
		Success:   false,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Path:      c.Request.URL.Path,
		Method:    c.Request.Method,
	}

	// 开发环境下添加详细错误信息
	if gin.Mode() == gin.DebugMode {
		if err := c.Errors.Last(); err != nil {
			response.Error = err.Error()
		}
	}

	// 记录错误日志
	logError(c, code, message)

	c.JSON(code, response)
}

// RespondWithSuccess 返回标准成功响应
func RespondWithSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Data:    data,
	})
}

// RespondWithSuccessAndTimestamp 返回带时间戳的成功响应
func RespondWithSuccessAndTimestamp(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Success:   true,
		Data:      data,
		Timestamp: time.Now(),
	})
}

// logError 记录错误日志
func logError(c *gin.Context, code int, message string) {
	fields := []zap.Field{
		zap.Int("status", code),
		zap.String("method", c.Request.Method),
		zap.String("path", c.Request.URL.Path),
		zap.String("message", message),
		zap.String("ip", c.ClientIP()),
		zap.String("user_agent", c.Request.UserAgent()),
	}

	// 根据状态码选择日志级别
	switch {
	case code >= 500:
		logger.Error("http_error", fields...)
	case code >= 400:
		logger.Warn("http_client_error", fields...)
	default:
		logger.Info("http_response", fields...)
	}
}

// ValidationErrorResponse 验证错误响应
type ValidationErrorResponse struct {
	Success   bool                 `json:"success"`
	Code      int                  `json:"code"`
	Message   string               `json:"message"`
	Errors    []ValidationError    `json:"errors"`
	Timestamp time.Time            `json:"timestamp"`
}

// ValidationError 单个验证错误
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// RespondWithValidationError 返回验证错误响应
func RespondWithValidationError(c *gin.Context, errors []ValidationError) {
	response := ValidationErrorResponse{
		Success:   false,
		Code:      http.StatusBadRequest,
		Message:   "请求参数验证失败",
		Errors:    errors,
		Timestamp: time.Now(),
	}

	logger.Warn("validation_error",
		zap.String("path", c.Request.URL.Path),
		zap.Any("errors", errors),
	)

	c.JSON(http.StatusBadRequest, response)
}
