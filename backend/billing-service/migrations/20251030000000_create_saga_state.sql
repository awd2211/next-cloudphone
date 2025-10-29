-- ========================================
-- Saga State Table for Distributed Transaction Management
-- ========================================
--
-- This table stores the state of long-running distributed transactions (Sagas).
-- It enables reliable orchestration of multi-step operations across services
-- with compensation logic for failure scenarios.
--
-- Use Cases:
-- 1. Payment Refund Saga (Issue #1) - Coordinate refund across Payment + Billing + Notification
-- 2. Device Creation Saga (Issue #2) - Coordinate device creation across Device + Docker + User
-- 3. App Upload Saga (Issue #3) - Coordinate upload across App + MinIO + Device
--
-- Features:
-- - Saga state persistence for crash recovery
-- - Timeout detection for stuck sagas
-- - JSONB state for flexible data storage
-- - Step tracking for compensation logic
-- ========================================

-- Create saga_state table
CREATE TABLE IF NOT EXISTS saga_state (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,

  -- Saga identification
  saga_id VARCHAR(100) NOT NULL UNIQUE,
  saga_type VARCHAR(50) NOT NULL,

  -- Execution tracking
  current_step VARCHAR(100) NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,

  -- State management
  state JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',

  -- Error handling
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Timeout management
  timeout_at TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT saga_state_status_check CHECK (
    status IN (
      'RUNNING',      -- Saga is executing
      'COMPLETED',    -- Saga completed successfully
      'COMPENSATING', -- Saga is rolling back
      'COMPENSATED',  -- Saga rollback completed
      'FAILED',       -- Saga failed permanently
      'TIMEOUT'       -- Saga exceeded timeout
    )
  ),

  CONSTRAINT saga_state_type_check CHECK (
    saga_type IN (
      'PAYMENT_REFUND',   -- Issue #1: Refund saga
      'DEVICE_CREATION',  -- Issue #2: Device creation saga
      'APP_UPLOAD'        -- Issue #3: App upload saga
    )
  )
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- Index for querying by saga_id (primary lookup)
CREATE INDEX idx_saga_state_saga_id ON saga_state(saga_id);

-- Index for finding running sagas (health checks, monitoring)
CREATE INDEX idx_saga_state_status ON saga_state(status);

-- Index for timeout detection (scheduled cleanup job)
CREATE INDEX idx_saga_state_timeout ON saga_state(timeout_at)
  WHERE timeout_at IS NOT NULL AND status = 'RUNNING';

-- Index for saga type filtering (analytics)
CREATE INDEX idx_saga_state_type ON saga_state(saga_type);

-- Composite index for active saga queries
CREATE INDEX idx_saga_state_status_type ON saga_state(status, saga_type);

-- Index for created_at (retention policy, cleanup)
CREATE INDEX idx_saga_state_created_at ON saga_state(created_at);

-- ========================================
-- Updated_at Trigger
-- ========================================

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_saga_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to saga_state table
CREATE TRIGGER trigger_update_saga_state_updated_at
  BEFORE UPDATE ON saga_state
  FOR EACH ROW
  EXECUTE FUNCTION update_saga_state_updated_at();

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TABLE saga_state IS 'Stores state of long-running distributed transactions (Sagas) for reliable orchestration with compensation logic';

COMMENT ON COLUMN saga_state.saga_id IS 'Unique identifier for the saga instance (UUID format)';
COMMENT ON COLUMN saga_state.saga_type IS 'Type of saga: PAYMENT_REFUND, DEVICE_CREATION, APP_UPLOAD';
COMMENT ON COLUMN saga_state.current_step IS 'Name of the current step being executed';
COMMENT ON COLUMN saga_state.step_index IS 'Zero-based index of the current step (for compensation ordering)';
COMMENT ON COLUMN saga_state.state IS 'JSONB object containing saga-specific state data (entity IDs, intermediate results, etc.)';
COMMENT ON COLUMN saga_state.status IS 'Saga status: RUNNING, COMPLETED, COMPENSATING, COMPENSATED, FAILED, TIMEOUT';
COMMENT ON COLUMN saga_state.error_message IS 'Last error message if saga failed or is compensating';
COMMENT ON COLUMN saga_state.retry_count IS 'Number of retry attempts for the current step';
COMMENT ON COLUMN saga_state.max_retries IS 'Maximum retry attempts before triggering compensation';
COMMENT ON COLUMN saga_state.timeout_at IS 'Timestamp when saga should timeout if not completed';
COMMENT ON COLUMN saga_state.started_at IS 'Timestamp when saga execution started';
COMMENT ON COLUMN saga_state.completed_at IS 'Timestamp when saga reached terminal state (COMPLETED, COMPENSATED, FAILED)';

-- ========================================
-- Sample Usage Examples
-- ========================================

-- Example 1: Create new saga for payment refund
-- INSERT INTO saga_state (saga_id, saga_type, current_step, state, timeout_at)
-- VALUES (
--   'refund-abc123',
--   'PAYMENT_REFUND',
--   'INITIATE_REFUND',
--   '{"refundId": "ref-456", "paymentId": "pay-789", "amount": 100.00, "currency": "USD"}'::JSONB,
--   CURRENT_TIMESTAMP + INTERVAL '5 minutes'
-- );

-- Example 2: Update saga step
-- UPDATE saga_state
-- SET current_step = 'UPDATE_BALANCE',
--     step_index = 1,
--     state = state || '{"balanceUpdated": true}'::JSONB
-- WHERE saga_id = 'refund-abc123';

-- Example 3: Mark saga as completed
-- UPDATE saga_state
-- SET status = 'COMPLETED',
--     completed_at = CURRENT_TIMESTAMP
-- WHERE saga_id = 'refund-abc123';

-- Example 4: Start compensation
-- UPDATE saga_state
-- SET status = 'COMPENSATING',
--     error_message = 'Balance update failed: insufficient funds'
-- WHERE saga_id = 'refund-abc123';

-- Example 5: Find timed-out sagas (for scheduled job)
-- SELECT saga_id, saga_type, current_step, started_at, timeout_at
-- FROM saga_state
-- WHERE status = 'RUNNING'
--   AND timeout_at < CURRENT_TIMESTAMP;

-- Example 6: Query saga metrics
-- SELECT
--   saga_type,
--   status,
--   COUNT(*) as count,
--   AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - started_at))) as avg_duration_seconds
-- FROM saga_state
-- WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
-- GROUP BY saga_type, status
-- ORDER BY saga_type, status;
