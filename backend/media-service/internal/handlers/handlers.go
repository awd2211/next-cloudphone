package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/models"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-gonic/gin"
	wsLib "github.com/gorilla/websocket"
	pionWebRTC "github.com/pion/webrtc/v3"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.uber.org/zap"
)

var tracer = otel.Tracer("media-service/handlers")

var upgrader = wsLib.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// 生产环境应该检查 Origin
		return true
	},
}

// Handler 处理器
type Handler struct {
	webrtcManager webrtc.WebRTCManager
	wsHub         *websocket.Hub
}

// New 创建新的处理器
func New(webrtcMgr webrtc.WebRTCManager, hub *websocket.Hub) *Handler {
	return &Handler{
		webrtcManager: webrtcMgr,
		wsHub:         hub,
	}
}

// CreateSessionRequest 创建会话请求
type CreateSessionRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
	UserID   string `json:"userId" binding:"required"`
}

// CreateSessionResponse 创建会话响应
type CreateSessionResponse struct {
	SessionID string                       `json:"sessionId"`
	Offer     *pionWebRTC.SessionDescription `json:"offer"`
}

// HandleCreateSession 创建新的 WebRTC 会话
func (h *Handler) HandleCreateSession(c *gin.Context) {
	// 创建自定义 span
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "webrtc.create_session")
	defer span.End()

	var req CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 添加业务相关 attributes
	span.SetAttributes(
		attribute.String("device.id", req.DeviceID),
		attribute.String("user.id", req.UserID),
		attribute.String("session.type", "webrtc"),
	)

	// 创建会话
	session, err := h.webrtcManager.CreateSession(req.DeviceID, req.UserID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create session")
		logger.Error("failed_to_create_session",
			zap.String("device_id", req.DeviceID),
			zap.String("user_id", req.UserID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// 记录 session ID
	span.SetAttributes(attribute.String("session.id", session.ID))

	// 创建 offer
	offer, err := h.webrtcManager.CreateOffer(session.ID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create offer")
		logger.Error("failed_to_create_offer",
			zap.String("session_id", session.ID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create offer"})
		return
	}

	span.SetStatus(codes.Ok, "session created successfully")
	logger.Info("session_created",
		zap.String("session_id", session.ID),
		zap.String("device_id", req.DeviceID),
		zap.String("user_id", req.UserID),
	)

	c.JSON(http.StatusOK, CreateSessionResponse{
		SessionID: session.ID,
		Offer:     offer,
	})
}

// SetAnswerRequest 设置 Answer 请求
type SetAnswerRequest struct {
	SessionID string                       `json:"sessionId" binding:"required"`
	Answer    pionWebRTC.SessionDescription `json:"answer" binding:"required"`
}

// HandleSetAnswer 处理客户端的 SDP answer
func (h *Handler) HandleSetAnswer(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "webrtc.set_answer")
	defer span.End()

	var req SetAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("session.id", req.SessionID),
		attribute.String("sdp.type", req.Answer.Type.String()),
	)

	if err := h.webrtcManager.HandleAnswer(req.SessionID, req.Answer); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to handle answer")
		logger.Error("failed_to_handle_answer",
			zap.String("session_id", req.SessionID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle answer"})
		return
	}

	span.SetStatus(codes.Ok, "answer handled")
	logger.Info("answer_handled",
		zap.String("session_id", req.SessionID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// AddICECandidateRequest ICE 候选请求
type AddICECandidateRequest struct {
	SessionID string                     `json:"sessionId" binding:"required"`
	Candidate pionWebRTC.ICECandidateInit `json:"candidate" binding:"required"`
}

// HandleAddICECandidate 添加 ICE 候选
func (h *Handler) HandleAddICECandidate(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "webrtc.add_ice_candidate")
	defer span.End()

	var req AddICECandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("session.id", req.SessionID),
		attribute.String("ice.candidate", req.Candidate.Candidate),
	)

	if err := h.webrtcManager.AddICECandidate(req.SessionID, req.Candidate); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to add ice candidate")
		logger.Warn("failed_to_add_ice_candidate",
			zap.String("session_id", req.SessionID),
			zap.Error(err),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to add ICE candidate"})
		return
	}

	span.SetStatus(codes.Ok, "ice candidate added")
	logger.Debug("ice_candidate_added",
		zap.String("session_id", req.SessionID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// HandleCloseSession 关闭会话
func (h *Handler) HandleCloseSession(c *gin.Context) {
	sessionID := c.Param("id")

	if err := h.webrtcManager.CloseSession(sessionID); err != nil {
		logger.Warn("failed_to_close_session",
			zap.String("session_id", sessionID),
			zap.Error(err),
		)
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	logger.Info("session_closed",
		zap.String("session_id", sessionID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// HandleGetSession 获取会话信息
func (h *Handler) HandleGetSession(c *gin.Context) {
	sessionID := c.Param("id")

	session, err := h.webrtcManager.GetSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessionId":  session.ID,
		"deviceId":   session.DeviceID,
		"userId":     session.UserID,
		"state":      session.GetState(),
		"createdAt":  session.CreatedAt,
		"lastActive": session.LastActivityAt,
	})
}

// HandleListSessions 列出所有会话
func (h *Handler) HandleListSessions(c *gin.Context) {
	sessions := h.webrtcManager.GetAllSessions()

	var result []map[string]interface{}
	for _, session := range sessions {
		result = append(result, map[string]interface{}{
			"sessionId":  session.ID,
			"deviceId":   session.DeviceID,
			"userId":     session.UserID,
			"state":      session.GetState(),
			"createdAt":  session.CreatedAt,
			"lastActive": session.LastActivityAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": result,
		"total":    len(result),
	})
}

// HandleWebSocket 处理 WebSocket 连接
func (h *Handler) HandleWebSocket(c *gin.Context) {
	userID := c.Query("userId")
	deviceID := c.Query("deviceId")

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("failed_to_upgrade_websocket",
			zap.String("user_id", userID),
			zap.String("device_id", deviceID),
			zap.Error(err),
		)
		return
	}

	logger.Info("websocket_connected",
		zap.String("user_id", userID),
		zap.String("device_id", deviceID),
	)

	websocket.ServeWs(h.wsHub, conn, userID, deviceID)
}

// HandleStats 获取统计信息
func (h *Handler) HandleStats(c *gin.Context) {
	sessions := h.webrtcManager.GetAllSessions()

	var activeCount, connectingCount, failedCount int
	for _, session := range sessions {
		switch session.GetState() {
		case models.SessionStateConnected:
			activeCount++
		case models.SessionStateConnecting:
			connectingCount++
		case models.SessionStateFailed:
			failedCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"totalSessions":      len(sessions),
		"activeSessions":     activeCount,
		"connectingSessions": connectingCount,
		"failedSessions":     failedCount,
		"wsConnections":      h.wsHub.GetClients(),
	})
}

// HandleHealth 健康检查
func (h *Handler) HandleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "media-service",
	})
}

// CloudflareTurnResponse Cloudflare TURN API 响应
type CloudflareTurnResponse struct {
	IceServers []IceServer `json:"iceServers"`
}

// IceServer ICE 服务器配置
type IceServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

// HandleGetTurnCredentials 获取 Cloudflare TURN 凭证
func (h *Handler) HandleGetTurnCredentials(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "webrtc.get_turn_credentials")
	defer span.End()

	// 从环境变量获取 Cloudflare 凭证
	keyID := os.Getenv("CLOUDFLARE_TURN_KEY_ID")
	apiToken := os.Getenv("CLOUDFLARE_TURN_API_TOKEN")
	ttl := os.Getenv("CLOUDFLARE_TURN_TTL")

	if keyID == "" || apiToken == "" {
		span.SetStatus(codes.Error, "cloudflare credentials not configured")
		logger.Error("cloudflare_turn_not_configured")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TURN service not configured"})
		return
	}

	if ttl == "" {
		ttl = "86400" // 默认 24 小时
	}

	// 调用 Cloudflare API
	url := fmt.Sprintf("https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers", keyID)

	reqBody, _ := json.Marshal(map[string]interface{}{
		"ttl": 86400,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create request")
		logger.Error("failed_to_create_turn_request", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("Authorization", "Bearer "+apiToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to call cloudflare api")
		logger.Error("failed_to_call_cloudflare_turn_api", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get TURN credentials"})
		return
	}
	defer resp.Body.Close()

	// Cloudflare API 返回 201 Created 而不是 200 OK
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		span.SetStatus(codes.Error, "cloudflare api returned error")
		logger.Error("cloudflare_turn_api_error",
			zap.Int("status_code", resp.StatusCode),
			zap.String("body", string(body)),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get TURN credentials from Cloudflare"})
		return
	}

	var turnResp CloudflareTurnResponse
	if err := json.NewDecoder(resp.Body).Decode(&turnResp); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to decode response")
		logger.Error("failed_to_decode_turn_response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse TURN credentials"})
		return
	}

	span.SetStatus(codes.Ok, "turn credentials retrieved")
	logger.Info("turn_credentials_generated",
		zap.Int("ice_servers_count", len(turnResp.IceServers)),
	)

	c.JSON(http.StatusOK, turnResp)
}
