package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/cloudphone/media-service/internal/encoder"
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/models"
	"github.com/cloudphone/media-service/internal/webrtc"
	"github.com/cloudphone/media-service/internal/websocket"
	"github.com/gin-gonic/gin"
	wsLib "github.com/gorilla/websocket"
	pionWebRTC "github.com/pion/webrtc/v3"
	"github.com/sirupsen/logrus"
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
	webrtcManager       webrtc.WebRTCManager
	wsHub               *websocket.Hub
	pipelineManager     *encoder.PipelineManager
	adbPath             string
	scrcpyServerPath    string                 // scrcpy-server.jar 路径
	useScrcpy           bool                   // 是否优先使用 scrcpy（高性能 H.264）
	combinedFrameWriter *CombinedFrameWriter   // 组合帧写入器（支持录像）
	logger              *logrus.Logger
}

// HandlerOption 配置选项
type HandlerOption func(*Handler)

// WithScrcpyServer 设置 scrcpy-server 路径
func WithScrcpyServer(path string) HandlerOption {
	return func(h *Handler) {
		h.scrcpyServerPath = path
		h.useScrcpy = path != ""
	}
}

// WithUseScrcpy 设置是否使用 scrcpy
func WithUseScrcpy(use bool) HandlerOption {
	return func(h *Handler) {
		h.useScrcpy = use
	}
}

// WithCombinedFrameWriter 设置组合帧写入器（支持录像功能）
func WithCombinedFrameWriter(cfw *CombinedFrameWriter) HandlerOption {
	return func(h *Handler) {
		h.combinedFrameWriter = cfw
	}
}

// New 创建新的处理器
func New(webrtcMgr webrtc.WebRTCManager, hub *websocket.Hub, pipelineMgr *encoder.PipelineManager, adbPath string, opts ...HandlerOption) *Handler {
	h := &Handler{
		webrtcManager:   webrtcMgr,
		wsHub:           hub,
		pipelineManager: pipelineMgr,
		adbPath:         adbPath,
		logger:          logrus.New(),
	}

	// 应用配置选项
	for _, opt := range opts {
		opt(h)
	}

	return h
}

// CreateSessionRequest 创建会话请求
type CreateSessionRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
	UserID   string `json:"userId" binding:"required"`
}

// ICEServerDTO ICE 服务器 DTO（用于 JSON 序列化）
type ICEServerDTO struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

// CreateSessionResponse 创建会话响应
type CreateSessionResponse struct {
	SessionID  string                        `json:"sessionId"`
	Offer      *pionWebRTC.SessionDescription `json:"offer"`
	ICEServers []ICEServerDTO                `json:"iceServers"` // 前端必须使用这些 ICE 服务器以确保 TURN 凭证匹配
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

	// 根据配置选择视频编码类型
	// scrcpy 模式使用 H.264（硬件加速，性能更好）
	// screencap 模式使用 VP8（兼容性好）
	videoCodec := webrtc.VideoCodecVP8
	if h.useScrcpy {
		videoCodec = webrtc.VideoCodecH264
	}

	// 添加业务相关 attributes
	span.SetAttributes(
		attribute.String("device.id", req.DeviceID),
		attribute.String("user.id", req.UserID),
		attribute.String("session.type", "webrtc"),
		attribute.String("video.codec", string(videoCodec)),
		attribute.Bool("use_scrcpy", h.useScrcpy),
	)

	// 创建会话（根据模式选择编码类型）
	session, err := h.webrtcManager.CreateSessionWithOptions(req.DeviceID, req.UserID, webrtc.SessionOptions{
		VideoCodec: videoCodec,
	})
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

	// 获取 ICE 服务器配置（包含 TURN 凭证）
	// 前端必须使用这些服务器以确保 TURN 凭证与后端匹配
	iceServers := h.webrtcManager.GetICEServers()
	iceServerDTOs := make([]ICEServerDTO, len(iceServers))
	for i, server := range iceServers {
		var credential string
		if server.Credential != nil {
			if cred, ok := server.Credential.(string); ok {
				credential = cred
			}
		}
		iceServerDTOs[i] = ICEServerDTO{
			URLs:       server.URLs,
			Username:   server.Username,
			Credential: credential,
		}
	}

	span.SetStatus(codes.Ok, "session created successfully")
	logger.Info("session_created",
		zap.String("session_id", session.ID),
		zap.String("device_id", req.DeviceID),
		zap.String("user_id", req.UserID),
		zap.Int("ice_servers", len(iceServerDTOs)),
	)

	c.JSON(http.StatusOK, CreateSessionResponse{
		SessionID:  session.ID,
		Offer:      offer,
		ICEServers: iceServerDTOs,
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

	// 获取 session 以启动视频管道
	session, err := h.webrtcManager.GetSession(req.SessionID)
	if err != nil {
		logger.Warn("failed_to_get_session_for_pipeline",
			zap.String("session_id", req.SessionID),
			zap.Error(err),
		)
	} else if h.pipelineManager != nil {
		// 在后台启动视频管道（不阻塞 HTTP 响应）
		// 重要：使用 context.Background() 而不是 HTTP 请求的 context
		// 因为请求 context 在响应发送后会被取消，导致管道立即停止
		pipelineCtx := context.Background()
		go h.startVideoPipeline(pipelineCtx, session)
	}

	span.SetStatus(codes.Ok, "answer handled")
	logger.Info("answer_handled",
		zap.String("session_id", req.SessionID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// startVideoPipeline 启动视频管道（在后台运行）
func (h *Handler) startVideoPipeline(ctx context.Context, session *models.Session) {
	sessionID := session.ID
	deviceID := session.DeviceID

	logger.Info("starting_video_pipeline",
		zap.String("session_id", sessionID),
		zap.String("device_id", deviceID),
		zap.Bool("use_scrcpy", h.useScrcpy),
		zap.String("scrcpy_server", h.scrcpyServerPath),
	)

	// 创建屏幕捕获实例
	var screenCapture capture.ScreenCapture

	if h.useScrcpy && h.scrcpyServerPath != "" {
		// 使用 scrcpy-server 进行高性能 H.264 捕获
		// scrcpy 直接在设备上进行硬件 H.264 编码，通过 WiFi ADB 可达 30+ FPS
		// 相比 screencap PNG 模式（~1 FPS），性能提升 30 倍以上
		logger.Info("using_scrcpy_capture",
			zap.String("session_id", sessionID),
			zap.String("device_id", deviceID),
			zap.String("scrcpy_server", h.scrcpyServerPath),
		)
		screenCapture = capture.NewScrcpyCapture(h.adbPath, h.scrcpyServerPath, h.logger)
	} else {
		// 回退到 AndroidScreenCapture（screencap PNG 模式）
		// 注意: screenrecord --output-format=h264 在某些 Android 设备上不可用
		// screencap 兼容性更好，虽然性能稍慢但更可靠
		logger.Info("using_screencap_capture",
			zap.String("session_id", sessionID),
			zap.String("device_id", deviceID),
		)
		screenCapture = capture.NewAndroidScreenCapture(h.adbPath, h.logger)
	}

	// 创建视频管道
	// WebRTCManager 实现了 FrameWriter 接口
	// WiFi ADB 分辨率优化: 降低分辨率可显著提升帧率
	// - 原始分辨率 1440x3040 通过 WiFi ADB 传输需要 1-2 秒/帧
	// - 降低到 720 宽度（约 50%）可将帧率提升 2-3 倍
	//
	// 对于 scrcpy 模式:
	// - scrcpy 直接输出 H.264 流，目标 FPS 和码率用于服务端配置
	// - 分辨率由 scrcpy 的 max_size 参数控制
	targetFPS := 30              // scrcpy 可以轻松达到 30 FPS
	targetBitrate := 4000000     // 4 Mbps 适合 WiFi 传输
	targetWidth := 720           // 720p 分辨率
	targetHeight := 0            // 自动计算保持宽高比

	if !h.useScrcpy {
		// screencap 模式需要更保守的参数
		targetFPS = 15
		targetBitrate = 2000000
	}

	// 选择帧写入器：如果启用了录像支持，使用组合写入器
	// 组合写入器会同时将帧发送到 WebRTC 和录像文件
	var frameWriter encoder.FrameWriter
	if h.combinedFrameWriter != nil {
		frameWriter = h.combinedFrameWriter
		logger.Info("using_combined_frame_writer",
			zap.String("session_id", sessionID),
			zap.Bool("recording_enabled", true),
		)
	} else {
		frameWriter = h.webrtcManager
		logger.Info("using_webrtc_frame_writer",
			zap.String("session_id", sessionID),
			zap.Bool("recording_enabled", false),
		)
	}

	err := h.pipelineManager.CreateVideoPipeline(
		ctx,
		sessionID,
		deviceID,
		screenCapture,
		frameWriter, // 使用选定的帧写入器
		targetFPS,
		targetBitrate,
		targetWidth,
		targetHeight,
		encoder.CreateVideoPipelineOptions{
			UseH264Passthrough: h.useScrcpy, // scrcpy 输出 H.264，使用直通模式
		},
	)
	if err != nil {
		logger.Error("failed_to_create_video_pipeline",
			zap.String("session_id", sessionID),
			zap.String("device_id", deviceID),
			zap.Bool("use_scrcpy", h.useScrcpy),
			zap.Error(err),
		)
		return
	}

	logger.Info("video_pipeline_started",
		zap.String("session_id", sessionID),
		zap.String("device_id", deviceID),
		zap.Bool("use_scrcpy", h.useScrcpy),
		zap.Int("target_fps", targetFPS),
		zap.Int("target_bitrate", targetBitrate),
	)
}

// AddICECandidateRequest ICE 候选请求
type AddICECandidateRequest struct {
	SessionID string                     `json:"sessionId" binding:"required"`
	Candidate pionWebRTC.ICECandidateInit `json:"candidate" binding:"required"`
}

// AddICECandidatesRequest 批量 ICE 候选请求
type AddICECandidatesRequest struct {
	SessionID  string                       `json:"sessionId" binding:"required"`
	Candidates []pionWebRTC.ICECandidateInit `json:"candidates" binding:"required"`
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

// HandleAddICECandidates 批量添加 ICE 候选（用于避免 API 速率限制）
func (h *Handler) HandleAddICECandidates(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "webrtc.add_ice_candidates_batch")
	defer span.End()

	var req AddICECandidatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("session.id", req.SessionID),
		attribute.Int("candidates.count", len(req.Candidates)),
	)

	// 批量添加所有 ICE 候选
	addedCount := 0
	var lastErr error
	for i, candidate := range req.Candidates {
		// 记录每个浏览器端 ICE candidate 详情（用于调试 ICE 连接问题）
		logger.Info("browser_ice_candidate_received",
			zap.String("session_id", req.SessionID),
			zap.Int("index", i),
			zap.String("candidate", candidate.Candidate),
		)

		if err := h.webrtcManager.AddICECandidate(req.SessionID, candidate); err != nil {
			lastErr = err
			logger.Warn("failed_to_add_ice_candidate_in_batch",
				zap.String("session_id", req.SessionID),
				zap.String("candidate", candidate.Candidate),
				zap.Error(err),
			)
		} else {
			addedCount++
		}
	}

	// 如果没有一个成功，返回错误
	if addedCount == 0 && lastErr != nil {
		span.RecordError(lastErr)
		span.SetStatus(codes.Error, "failed to add any ice candidates")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to add ICE candidates"})
		return
	}

	// 统计各类型 ICE candidate 数量
	var hostCount, srflxCount, relayCount, unknownCount int
	for _, candidate := range req.Candidates {
		switch {
		case strings.Contains(candidate.Candidate, "typ host"):
			hostCount++
		case strings.Contains(candidate.Candidate, "typ srflx"):
			srflxCount++
		case strings.Contains(candidate.Candidate, "typ relay"):
			relayCount++
		default:
			unknownCount++
		}
	}

	span.SetStatus(codes.Ok, "ice candidates added")
	logger.Info("ice_candidates_batch_added",
		zap.String("session_id", req.SessionID),
		zap.Int("total", len(req.Candidates)),
		zap.Int("added", addedCount),
		zap.Int("host", hostCount),
		zap.Int("srflx", srflxCount),
		zap.Int("relay", relayCount),
		zap.Int("unknown", unknownCount),
	)

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"added":  addedCount,
		"total":  len(req.Candidates),
	})
}

// HandleCloseSession 关闭会话
func (h *Handler) HandleCloseSession(c *gin.Context) {
	sessionID := c.Param("id")

	// 先停止视频管道
	if h.pipelineManager != nil {
		if err := h.pipelineManager.StopAllPipelines(sessionID); err != nil {
			logger.Debug("no_pipelines_to_stop",
				zap.String("session_id", sessionID),
			)
		} else {
			logger.Info("pipelines_stopped",
				zap.String("session_id", sessionID),
			)
		}
	}

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

	// Get frame pool statistics
	framePoolStats := capture.DefaultFramePool.Stats()

	c.JSON(http.StatusOK, gin.H{
		"totalSessions":      len(sessions),
		"activeSessions":     activeCount,
		"connectingSessions": connectingCount,
		"failedSessions":     failedCount,
		"wsConnections":      h.wsHub.GetClients(),
		"framePool": gin.H{
			"allocations": framePoolStats.Allocations,
			"reuses":      framePoolStats.Reuses,
			"reuseRate":   fmt.Sprintf("%.1f%%", framePoolStats.ReuseRate()*100),
		},
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
