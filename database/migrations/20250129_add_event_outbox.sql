-- =============================================
-- Event Outbox Table Migration
-- Purpose: Implement Transactional Outbox Pattern
--          to ensure reliable event publishing
-- Date: 2025-01-29
-- =============================================

-- Create event_outbox table for storing unpublished events
CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event metadata
  aggregate_type VARCHAR(100) NOT NULL,  -- e.g., 'device', 'user', 'app'
  aggregate_id VARCHAR(255) NOT NULL,    -- e.g., device ID, user ID
  event_type VARCHAR(255) NOT NULL,      -- e.g., 'device.created', 'device.started'

  -- Event payload
  payload JSONB NOT NULL,                -- Full event data

  -- Publishing metadata
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, published, failed
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('pending', 'published', 'failed'))
);

-- Create indexes for efficient querying
CREATE INDEX idx_outbox_status_created ON event_outbox(status, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_outbox_aggregate ON event_outbox(aggregate_type, aggregate_id);

CREATE INDEX idx_outbox_event_type ON event_outbox(event_type);

CREATE INDEX idx_outbox_created_at ON event_outbox(created_at DESC);

-- Create partial index for failed events with retries remaining
CREATE INDEX idx_outbox_failed_retryable ON event_outbox(status, retry_count, created_at)
  WHERE status = 'failed' AND retry_count < max_retries;

-- Add comment
COMMENT ON TABLE event_outbox IS 'Transactional outbox for reliable event publishing. Events are written in the same transaction as business data, then published asynchronously by a background worker.';

COMMENT ON COLUMN event_outbox.status IS 'pending: waiting to be published, published: successfully sent to RabbitMQ, failed: max retries exceeded';

COMMENT ON COLUMN event_outbox.retry_count IS 'Number of publish attempts. Incremented on each failure.';

-- Create function to clean up old published events (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_outbox_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM event_outbox
  WHERE status = 'published'
    AND published_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_outbox_events() IS 'Deletes published events older than 7 days. Should be called by a scheduled job.';

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON event_outbox TO cloudphone_device_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON event_outbox TO cloudphone_user_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON event_outbox TO cloudphone_app_user;
