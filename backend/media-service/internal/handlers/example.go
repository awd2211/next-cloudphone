package handlers

import (
	"net/http"

	"github.com/cloudphone/media-service/internal/middleware"
	"github.com/gin-gonic/gin"
)

// 使用示例：统一错误和成功响应格式
//
// 这个文件展示了如何使用 middleware.RespondWith* 函数
// 使 Go 服务的响应格式与 NestJS 服务保持一致

// ExampleSuccessHandler 成功响应示例
func ExampleSuccessHandler(c *gin.Context) {
	data := map[string]interface{}{
		"sessionId": "sess-123",
		"status":    "active",
	}

	// 方式 1: 简单成功响应
	middleware.RespondWithSuccess(c, data)

	// 方式 2: 带时间戳的成功响应
	// middleware.RespondWithSuccessAndTimestamp(c, data)
}

// ExampleErrorHandler 错误响应示例
func ExampleErrorHandler(c *gin.Context) {
	// 客户端错误 (400)
	if somethingWrong := true; somethingWrong {
		middleware.RespondWithError(c, http.StatusBadRequest, "Invalid request parameters")
		return
	}

	// 服务器错误 (500)
	if serverError := false; serverError {
		middleware.RespondWithError(c, http.StatusInternalServerError, "Failed to process request")
		return
	}

	// 未找到 (404)
	if notFound := false; notFound {
		middleware.RespondWithError(c, http.StatusNotFound, "Resource not found")
		return
	}
}

// ExampleValidationHandler 验证错误响应示例
func ExampleValidationHandler(c *gin.Context) {
	// 模拟验证错误
	validationErrors := []middleware.ValidationError{
		{
			Field:   "deviceId",
			Message: "should not be empty",
		},
		{
			Field:   "userId",
			Message: "must be a valid UUID",
		},
	}

	middleware.RespondWithValidationError(c, validationErrors)
}

// 实际应用示例：改造 CreateSession
//
// 改造前:
//   c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
//
// 改造后:
//   middleware.RespondWithError(c, http.StatusBadRequest, "Invalid request parameters")
//
// 响应格式变化:
//
// 改造前:
// {
//   "error": "Key: 'CreateSessionRequest.DeviceID' Error:Field validation..."
// }
//
// 改造后:
// {
//   "success": false,
//   "code": 400,
//   "message": "Invalid request parameters",
//   "timestamp": "2025-10-21T10:30:00Z",
//   "path": "/api/media/sessions",
//   "method": "POST",
//   "error": "..." // 仅开发环境
// }

// ExampleImprovedCreateSession 改进后的 CreateSession 示例
func (h *Handler) ExampleImprovedCreateSession(c *gin.Context) {
	var req CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 改进: 使用统一错误响应
		c.Error(err) // 记录到 gin.Context.Errors
		middleware.RespondWithError(c, http.StatusBadRequest, "Invalid request parameters")
		return
	}

	// 创建会话
	session, err := h.webrtcManager.CreateSession(req.DeviceID, req.UserID)
	if err != nil {
		c.Error(err)
		middleware.RespondWithError(c, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// 创建 offer
	offer, err := h.webrtcManager.CreateOffer(session.ID)
	if err != nil {
		c.Error(err)
		middleware.RespondWithError(c, http.StatusInternalServerError, "Failed to create offer")
		return
	}

	// 改进: 使用统一成功响应
	middleware.RespondWithSuccess(c, CreateSessionResponse{
		SessionID: session.ID,
		Offer:     offer,
	})
}
