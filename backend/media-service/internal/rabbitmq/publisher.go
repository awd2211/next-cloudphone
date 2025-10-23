package rabbitmq

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/cloudphone/media-service/internal/logger"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

const (
	exchangeName = "cloudphone.events"
	exchangeType = "topic"
)

// Publisher handles publishing events to RabbitMQ
type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
}

// NewPublisher creates a new RabbitMQ publisher
func NewPublisher(url string) (*Publisher, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to rabbitmq: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare exchange
	err = channel.ExchangeDeclare(
		exchangeName,
		exchangeType,
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		channel.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	logger.Info("rabbitmq_publisher_initialized",
		zap.String("exchange", exchangeName),
		zap.String("type", exchangeType),
	)

	return &Publisher{
		conn:    conn,
		channel: channel,
		url:     url,
	}, nil
}

// Close closes the RabbitMQ connection
func (p *Publisher) Close() error {
	if p.channel != nil {
		if err := p.channel.Close(); err != nil {
			logger.Warn("failed_to_close_channel", zap.Error(err))
		}
	}
	if p.conn != nil {
		if err := p.conn.Close(); err != nil {
			logger.Warn("failed_to_close_connection", zap.Error(err))
		}
	}
	logger.Info("rabbitmq_publisher_closed")
	return nil
}

// PublishSessionCreated publishes a session created event
func (p *Publisher) PublishSessionCreated(sessionID, deviceID, userID string) error {
	event := map[string]interface{}{
		"session_id": sessionID,
		"device_id":  deviceID,
		"user_id":    userID,
		"timestamp":  time.Now().Format(time.RFC3339),
		"service":    "media-service",
		"event_type": "session.created",
	}

	return p.publishEvent("media.session.created", event)
}

// PublishSessionClosed publishes a session closed event
func (p *Publisher) PublishSessionClosed(sessionID, deviceID, userID string, duration int64) error {
	event := map[string]interface{}{
		"session_id":       sessionID,
		"device_id":        deviceID,
		"user_id":          userID,
		"duration_seconds": duration,
		"timestamp":        time.Now().Format(time.RFC3339),
		"service":          "media-service",
		"event_type":       "session.closed",
	}

	return p.publishEvent("media.session.closed", event)
}

// PublishSessionError publishes a session error event
func (p *Publisher) PublishSessionError(sessionID, deviceID, userID, errorMsg string) error {
	event := map[string]interface{}{
		"session_id": sessionID,
		"device_id":  deviceID,
		"user_id":    userID,
		"error":      errorMsg,
		"timestamp":  time.Now().Format(time.RFC3339),
		"service":    "media-service",
		"event_type": "session.error",
	}

	return p.publishEvent("media.session.error", event)
}

// PublishRecordingStarted publishes a recording started event
func (p *Publisher) PublishRecordingStarted(sessionID, deviceID, recordingPath string) error {
	event := map[string]interface{}{
		"session_id":     sessionID,
		"device_id":      deviceID,
		"recording_path": recordingPath,
		"timestamp":      time.Now().Format(time.RFC3339),
		"service":        "media-service",
		"event_type":     "recording.started",
	}

	return p.publishEvent("media.recording.started", event)
}

// PublishRecordingStopped publishes a recording stopped event
func (p *Publisher) PublishRecordingStopped(sessionID, deviceID, recordingPath string, duration int64) error {
	event := map[string]interface{}{
		"session_id":       sessionID,
		"device_id":        deviceID,
		"recording_path":   recordingPath,
		"duration_seconds": duration,
		"timestamp":        time.Now().Format(time.RFC3339),
		"service":          "media-service",
		"event_type":       "recording.stopped",
	}

	return p.publishEvent("media.recording.stopped", event)
}

// publishEvent is a helper to publish events to RabbitMQ
func (p *Publisher) publishEvent(routingKey string, event map[string]interface{}) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	err = p.channel.Publish(
		exchangeName,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
		},
	)

	if err != nil {
		logger.Error("rabbitmq_publish_failed",
			zap.String("routing_key", routingKey),
			zap.Error(err),
		)
		return fmt.Errorf("failed to publish event: %w", err)
	}

	logger.Debug("rabbitmq_event_published",
		zap.String("routing_key", routingKey),
		zap.String("event_type", event["event_type"].(string)),
	)

	return nil
}
