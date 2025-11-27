package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/cloudphone/media-service/internal/encoder"
	"github.com/cloudphone/media-service/internal/logger"
	"github.com/cloudphone/media-service/internal/sfu"
	"github.com/gin-gonic/gin"
	pionWebRTC "github.com/pion/webrtc/v3"
	"github.com/sirupsen/logrus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.uber.org/zap"
)

// SFUHandler SFU 处理器
type SFUHandler struct {
	sfuManager       *sfu.Manager
	pipelineManager  *encoder.PipelineManager
	adbPath          string
	scrcpyServerPath string
	useScrcpy        bool
	logger           *logrus.Logger
}

// SFUHandlerOption 配置选项
type SFUHandlerOption func(*SFUHandler)

// WithSFUScrcpyServer 设置 scrcpy-server 路径
func WithSFUScrcpyServer(path string) SFUHandlerOption {
	return func(h *SFUHandler) {
		h.scrcpyServerPath = path
		h.useScrcpy = path != ""
	}
}

// WithSFUUseScrcpy 设置是否使用 scrcpy
func WithSFUUseScrcpy(use bool) SFUHandlerOption {
	return func(h *SFUHandler) {
		h.useScrcpy = use
	}
}

// NewSFUHandler 创建 SFU 处理器
func NewSFUHandler(sfuMgr *sfu.Manager, pipelineMgr *encoder.PipelineManager, adbPath string, opts ...SFUHandlerOption) *SFUHandler {
	h := &SFUHandler{
		sfuManager:      sfuMgr,
		pipelineManager: pipelineMgr,
		adbPath:         adbPath,
		logger:          logrus.New(),
	}

	for _, opt := range opts {
		opt(h)
	}

	return h
}

// ========== Publisher API ==========

// CreatePublisherRequest 创建发布者请求
type CreatePublisherRequest struct {
	DeviceID   string `json:"deviceId" binding:"required"`
	UserID     string `json:"userId" binding:"required"`
	VideoCodec string `json:"videoCodec"` // "VP8" 或 "H264"，默认 "VP8"
}

// CreatePublisherResponse 创建发布者响应
type CreatePublisherResponse struct {
	PublisherID string                        `json:"publisherId"`
	DeviceID    string                        `json:"deviceId"`
	Offer       *pionWebRTC.SessionDescription `json:"offer"`
	ICEServers  []ICEServerDTO                `json:"iceServers"`
}

// HandleCreatePublisher 创建发布者会话
// POST /api/media/sfu/publishers
func (h *SFUHandler) HandleCreatePublisher(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.create_publisher")
	defer span.End()

	var req CreatePublisherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 根据配置选择编码类型
	videoCodec := req.VideoCodec
	if videoCodec == "" {
		if h.useScrcpy {
			videoCodec = "H264"
		} else {
			videoCodec = "VP8"
		}
	}

	span.SetAttributes(
		attribute.String("device.id", req.DeviceID),
		attribute.String("user.id", req.UserID),
		attribute.String("video.codec", videoCodec),
	)

	// 创建发布者
	publisher, err := h.sfuManager.CreatePublisher(req.DeviceID, req.UserID, videoCodec)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create publisher")
		logger.Error("failed_to_create_sfu_publisher",
			zap.String("device_id", req.DeviceID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create publisher"})
		return
	}

	span.SetAttributes(attribute.String("publisher.id", publisher.ID))

	// 创建 Offer
	offer, err := h.sfuManager.CreatePublisherOffer(publisher.ID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create offer")
		logger.Error("failed_to_create_publisher_offer",
			zap.String("publisher_id", publisher.ID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create offer"})
		return
	}

	// 获取 ICE 服务器配置
	iceServers := h.sfuManager.GetICEServers()
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

	span.SetStatus(codes.Ok, "publisher created")
	logger.Info("sfu_publisher_created",
		zap.String("publisher_id", publisher.ID),
		zap.String("device_id", req.DeviceID),
		zap.String("video_codec", videoCodec),
	)

	c.JSON(http.StatusOK, CreatePublisherResponse{
		PublisherID: publisher.ID,
		DeviceID:    req.DeviceID,
		Offer:       offer,
		ICEServers:  iceServerDTOs,
	})
}

// SetPublisherAnswerRequest 设置发布者 Answer 请求
type SetPublisherAnswerRequest struct {
	PublisherID string                       `json:"publisherId" binding:"required"`
	Answer      pionWebRTC.SessionDescription `json:"answer" binding:"required"`
}

// HandleSetPublisherAnswer 处理发布者 Answer
// POST /api/media/sfu/publishers/answer
func (h *SFUHandler) HandleSetPublisherAnswer(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.set_publisher_answer")
	defer span.End()

	var req SetPublisherAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(attribute.String("publisher.id", req.PublisherID))

	if err := h.sfuManager.HandlePublisherAnswer(req.PublisherID, req.Answer); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to handle answer")
		logger.Error("failed_to_handle_publisher_answer",
			zap.String("publisher_id", req.PublisherID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle answer"})
		return
	}

	// 获取发布者信息以启动视频管道
	publisher, err := h.sfuManager.GetPublisher(req.PublisherID)
	if err != nil {
		logger.Warn("failed_to_get_publisher_for_pipeline",
			zap.String("publisher_id", req.PublisherID),
			zap.Error(err),
		)
	} else if h.pipelineManager != nil {
		// 启动视频管道
		pipelineCtx := context.Background()
		go h.startSFUVideoPipeline(pipelineCtx, publisher)
	}

	span.SetStatus(codes.Ok, "answer handled")
	logger.Info("sfu_publisher_answer_handled",
		zap.String("publisher_id", req.PublisherID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// startSFUVideoPipeline 启动 SFU 视频管道
func (h *SFUHandler) startSFUVideoPipeline(ctx context.Context, publisher *sfu.PublisherSession) {
	publisherID := publisher.ID
	deviceID := publisher.DeviceID

	logger.Info("starting_sfu_video_pipeline",
		zap.String("publisher_id", publisherID),
		zap.String("device_id", deviceID),
		zap.Bool("use_scrcpy", h.useScrcpy),
	)

	// 创建屏幕捕获
	var screenCapture capture.ScreenCapture
	if h.useScrcpy && h.scrcpyServerPath != "" {
		screenCapture = capture.NewScrcpyCapture(h.adbPath, h.scrcpyServerPath, h.logger)
	} else {
		screenCapture = capture.NewAndroidScreenCapture(h.adbPath, h.logger)
	}

	// 配置参数
	targetFPS := 30
	targetBitrate := 4000000
	targetWidth := 720
	targetHeight := 0

	if !h.useScrcpy {
		targetFPS = 15
		targetBitrate = 2000000
	}

	// 创建 SFU FrameWriter 适配器
	frameWriter := &sfuFrameWriter{
		manager:     h.sfuManager,
		publisherID: publisherID,
	}

	err := h.pipelineManager.CreateVideoPipeline(
		ctx,
		publisherID, // 使用 publisherID 作为 sessionID
		deviceID,
		screenCapture,
		frameWriter,
		targetFPS,
		targetBitrate,
		targetWidth,
		targetHeight,
		encoder.CreateVideoPipelineOptions{
			UseH264Passthrough: h.useScrcpy,
		},
	)
	if err != nil {
		logger.Error("failed_to_create_sfu_video_pipeline",
			zap.String("publisher_id", publisherID),
			zap.String("device_id", deviceID),
			zap.Error(err),
		)
		return
	}

	logger.Info("sfu_video_pipeline_started",
		zap.String("publisher_id", publisherID),
		zap.String("device_id", deviceID),
		zap.Int("target_fps", targetFPS),
	)
}

// sfuFrameWriter 适配器：将帧写入 SFU Manager
// 实现 encoder.FrameWriter 接口
type sfuFrameWriter struct {
	manager     *sfu.Manager
	publisherID string
}

func (w *sfuFrameWriter) WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error {
	return w.manager.WriteVideoFrame(w.publisherID, frame, duration)
}

// AddPublisherICECandidateRequest 添加发布者 ICE 候选请求
type AddPublisherICECandidateRequest struct {
	PublisherID string                      `json:"publisherId" binding:"required"`
	Candidate   pionWebRTC.ICECandidateInit `json:"candidate" binding:"required"`
}

// HandleAddPublisherICECandidate 添加发布者 ICE 候选
// POST /api/media/sfu/publishers/ice-candidate
func (h *SFUHandler) HandleAddPublisherICECandidate(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.add_publisher_ice_candidate")
	defer span.End()

	var req AddPublisherICECandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(attribute.String("publisher.id", req.PublisherID))

	if err := h.sfuManager.AddPublisherICECandidate(req.PublisherID, req.Candidate); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to add ice candidate")
		logger.Warn("failed_to_add_publisher_ice_candidate",
			zap.String("publisher_id", req.PublisherID),
			zap.Error(err),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to add ICE candidate"})
		return
	}

	span.SetStatus(codes.Ok, "ice candidate added")
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// HandleGetPublisher 获取发布者信息
// GET /api/media/sfu/publishers/:id
func (h *SFUHandler) HandleGetPublisher(c *gin.Context) {
	publisherID := c.Param("id")

	publisher, err := h.sfuManager.GetPublisher(publisherID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Publisher not found"})
		return
	}

	c.JSON(http.StatusOK, publisher.ToInfo())
}

// HandleClosePublisher 关闭发布者
// DELETE /api/media/sfu/publishers/:id
func (h *SFUHandler) HandleClosePublisher(c *gin.Context) {
	publisherID := c.Param("id")

	// 停止视频管道
	if h.pipelineManager != nil {
		if err := h.pipelineManager.StopAllPipelines(publisherID); err != nil {
			logger.Debug("no_sfu_pipelines_to_stop",
				zap.String("publisher_id", publisherID),
			)
		}
	}

	if err := h.sfuManager.ClosePublisher(publisherID); err != nil {
		logger.Warn("failed_to_close_publisher",
			zap.String("publisher_id", publisherID),
			zap.Error(err),
		)
		c.JSON(http.StatusNotFound, gin.H{"error": "Publisher not found"})
		return
	}

	logger.Info("sfu_publisher_closed",
		zap.String("publisher_id", publisherID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// HandleListPublishers 列出所有发布者
// GET /api/media/sfu/publishers
func (h *SFUHandler) HandleListPublishers(c *gin.Context) {
	publishers := h.sfuManager.GetAllPublishers()

	var result []sfu.PublisherInfo
	for _, pub := range publishers {
		result = append(result, pub.ToInfo())
	}

	c.JSON(http.StatusOK, gin.H{
		"publishers": result,
		"total":      len(result),
	})
}

// ========== Subscriber API ==========

// CreateSubscriberRequest 创建订阅者请求
type CreateSubscriberRequest struct {
	PublisherID string `json:"publisherId" binding:"required"`
	UserID      string `json:"userId" binding:"required"`
}

// CreateSubscriberByDeviceRequest 通过设备创建订阅者请求
type CreateSubscriberByDeviceRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
	UserID   string `json:"userId" binding:"required"`
}

// CreateSubscriberResponse 创建订阅者响应
type CreateSubscriberResponse struct {
	SubscriberID string                        `json:"subscriberId"`
	PublisherID  string                        `json:"publisherId"`
	DeviceID     string                        `json:"deviceId"`
	Offer        *pionWebRTC.SessionDescription `json:"offer"`
	ICEServers   []ICEServerDTO                `json:"iceServers"`
}

// HandleCreateSubscriber 创建订阅者会话
// POST /api/media/sfu/subscribers
func (h *SFUHandler) HandleCreateSubscriber(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.create_subscriber")
	defer span.End()

	var req CreateSubscriberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("publisher.id", req.PublisherID),
		attribute.String("user.id", req.UserID),
	)

	// 创建订阅者
	subscriber, err := h.sfuManager.CreateSubscriber(req.PublisherID, req.UserID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create subscriber")
		logger.Error("failed_to_create_sfu_subscriber",
			zap.String("publisher_id", req.PublisherID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscriber: " + err.Error()})
		return
	}

	span.SetAttributes(attribute.String("subscriber.id", subscriber.ID))

	// 创建 Offer
	offer, err := h.sfuManager.CreateSubscriberOffer(subscriber.ID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create offer")
		logger.Error("failed_to_create_subscriber_offer",
			zap.String("subscriber_id", subscriber.ID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create offer"})
		return
	}

	// 获取 ICE 服务器配置
	iceServers := h.sfuManager.GetICEServers()
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

	span.SetStatus(codes.Ok, "subscriber created")
	logger.Info("sfu_subscriber_created",
		zap.String("subscriber_id", subscriber.ID),
		zap.String("publisher_id", req.PublisherID),
		zap.String("device_id", subscriber.DeviceID),
	)

	c.JSON(http.StatusOK, CreateSubscriberResponse{
		SubscriberID: subscriber.ID,
		PublisherID:  subscriber.PublisherID,
		DeviceID:     subscriber.DeviceID,
		Offer:        offer,
		ICEServers:   iceServerDTOs,
	})
}

// HandleCreateSubscriberByDevice 通过设备 ID 创建订阅者
// POST /api/media/sfu/subscribers/by-device
func (h *SFUHandler) HandleCreateSubscriberByDevice(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.create_subscriber_by_device")
	defer span.End()

	var req CreateSubscriberByDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("device.id", req.DeviceID),
		attribute.String("user.id", req.UserID),
	)

	// 获取设备的发布者
	publisher, err := h.sfuManager.GetPublisherByDevice(req.DeviceID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "no publisher for device")
		c.JSON(http.StatusNotFound, gin.H{"error": "No active publisher for this device"})
		return
	}

	// 创建订阅者
	subscriber, err := h.sfuManager.CreateSubscriber(publisher.ID, req.UserID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create subscriber")
		logger.Error("failed_to_create_sfu_subscriber",
			zap.String("device_id", req.DeviceID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscriber"})
		return
	}

	span.SetAttributes(attribute.String("subscriber.id", subscriber.ID))

	// 创建 Offer
	offer, err := h.sfuManager.CreateSubscriberOffer(subscriber.ID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to create offer")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create offer"})
		return
	}

	// 获取 ICE 服务器配置
	iceServers := h.sfuManager.GetICEServers()
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

	span.SetStatus(codes.Ok, "subscriber created")
	logger.Info("sfu_subscriber_created_by_device",
		zap.String("subscriber_id", subscriber.ID),
		zap.String("device_id", req.DeviceID),
	)

	c.JSON(http.StatusOK, CreateSubscriberResponse{
		SubscriberID: subscriber.ID,
		PublisherID:  subscriber.PublisherID,
		DeviceID:     subscriber.DeviceID,
		Offer:        offer,
		ICEServers:   iceServerDTOs,
	})
}

// SetSubscriberAnswerRequest 设置订阅者 Answer 请求
type SetSubscriberAnswerRequest struct {
	SubscriberID string                       `json:"subscriberId" binding:"required"`
	Answer       pionWebRTC.SessionDescription `json:"answer" binding:"required"`
}

// HandleSetSubscriberAnswer 处理订阅者 Answer
// POST /api/media/sfu/subscribers/answer
func (h *SFUHandler) HandleSetSubscriberAnswer(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.set_subscriber_answer")
	defer span.End()

	var req SetSubscriberAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(attribute.String("subscriber.id", req.SubscriberID))

	if err := h.sfuManager.HandleSubscriberAnswer(req.SubscriberID, req.Answer); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to handle answer")
		logger.Error("failed_to_handle_subscriber_answer",
			zap.String("subscriber_id", req.SubscriberID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle answer"})
		return
	}

	span.SetStatus(codes.Ok, "answer handled")
	logger.Info("sfu_subscriber_answer_handled",
		zap.String("subscriber_id", req.SubscriberID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// AddSubscriberICECandidateRequest 添加订阅者 ICE 候选请求
type AddSubscriberICECandidateRequest struct {
	SubscriberID string                      `json:"subscriberId" binding:"required"`
	Candidate    pionWebRTC.ICECandidateInit `json:"candidate" binding:"required"`
}

// HandleAddSubscriberICECandidate 添加订阅者 ICE 候选
// POST /api/media/sfu/subscribers/ice-candidate
func (h *SFUHandler) HandleAddSubscriberICECandidate(c *gin.Context) {
	ctx := c.Request.Context()
	ctx, span := tracer.Start(ctx, "sfu.add_subscriber_ice_candidate")
	defer span.End()

	var req AddSubscriberICECandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid request")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(attribute.String("subscriber.id", req.SubscriberID))

	if err := h.sfuManager.AddSubscriberICECandidate(req.SubscriberID, req.Candidate); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to add ice candidate")
		logger.Warn("failed_to_add_subscriber_ice_candidate",
			zap.String("subscriber_id", req.SubscriberID),
			zap.Error(err),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to add ICE candidate"})
		return
	}

	span.SetStatus(codes.Ok, "ice candidate added")
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// HandleGetSubscriber 获取订阅者信息
// GET /api/media/sfu/subscribers/:id
func (h *SFUHandler) HandleGetSubscriber(c *gin.Context) {
	subscriberID := c.Param("id")

	subscriber, err := h.sfuManager.GetSubscriber(subscriberID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscriber not found"})
		return
	}

	c.JSON(http.StatusOK, subscriber.ToInfo())
}

// HandleCloseSubscriber 关闭订阅者
// DELETE /api/media/sfu/subscribers/:id
func (h *SFUHandler) HandleCloseSubscriber(c *gin.Context) {
	subscriberID := c.Param("id")

	if err := h.sfuManager.CloseSubscriber(subscriberID); err != nil {
		logger.Warn("failed_to_close_subscriber",
			zap.String("subscriber_id", subscriberID),
			zap.Error(err),
		)
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscriber not found"})
		return
	}

	logger.Info("sfu_subscriber_closed",
		zap.String("subscriber_id", subscriberID),
	)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ========== 统计 API ==========

// HandleSFUStats 获取 SFU 统计信息
// GET /api/media/sfu/stats
func (h *SFUHandler) HandleSFUStats(c *gin.Context) {
	publishers := h.sfuManager.GetAllPublishers()

	totalSubscribers := 0
	var publisherStats []map[string]interface{}

	for _, pub := range publishers {
		subCount := pub.GetSubscriberCount()
		totalSubscribers += subCount
		publisherStats = append(publisherStats, map[string]interface{}{
			"id":              pub.ID,
			"deviceId":        pub.DeviceID,
			"state":           string(pub.GetState()),
			"subscriberCount": subCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"totalPublishers":  len(publishers),
		"totalSubscribers": totalSubscribers,
		"publishers":       publisherStats,
	})
}
