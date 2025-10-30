-- =============================================
-- Saga State Table Creation
-- Purpose: Enable Saga distributed transaction pattern
--          with crash recovery and timeout detection
-- Date: 2025-10-30
-- Database: cloudphone_billing (可在任何需要 Saga 的服务数据库中创建)
-- =============================================

-- Create saga_state table
CREATE TABLE IF NOT EXISTS saga_state (
  -- Primary identifier
  saga_id VARCHAR(255) PRIMARY KEY,

  -- Saga metadata
  saga_type VARCHAR(100) NOT NULL,

  -- Execution state
  current_step VARCHAR(100) NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  state JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,

  -- Retry configuration
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Timeout management
  timeout_at TIMESTAMP,

  -- Timestamps
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT
);

-- Create indexes for performance
-- (索引脚本已在 20250129_add_saga_indexes.sql 中定义，此处创建基础索引)

-- Index on saga_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_saga_state_saga_id ON saga_state(saga_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_saga_state_status ON saga_state(status);

-- Composite index for timeout detection
CREATE INDEX IF NOT EXISTS idx_saga_state_timeout ON saga_state(status, timeout_at)
  WHERE status IN ('PENDING', 'RUNNING');

-- Index on created_at for cleanup
CREATE INDEX IF NOT EXISTS idx_saga_state_started_at ON saga_state(started_at DESC);

-- Composite index for recovery operations
CREATE INDEX IF NOT EXISTS idx_saga_state_recovery ON saga_state(status, started_at)
  WHERE status IN ('PENDING', 'RUNNING', 'COMPENSATING');

-- Add comments for documentation
COMMENT ON TABLE saga_state IS 'Saga distributed transaction state tracking';
COMMENT ON COLUMN saga_state.saga_id IS 'Unique identifier for saga instance';
COMMENT ON COLUMN saga_state.saga_type IS 'Type of saga (e.g., PAYMENT_PURCHASE)';
COMMENT ON COLUMN saga_state.current_step IS 'Name of current step being executed';
COMMENT ON COLUMN saga_state.step_index IS 'Index of current step in saga definition';
COMMENT ON COLUMN saga_state.state IS 'JSON state data for saga execution';
COMMENT ON COLUMN saga_state.status IS 'Current status: PENDING, RUNNING, COMPLETED, FAILED, COMPENSATING, COMPENSATED';
COMMENT ON COLUMN saga_state.retry_count IS 'Number of retry attempts for current step';
COMMENT ON COLUMN saga_state.max_retries IS 'Maximum allowed retries per step';
COMMENT ON COLUMN saga_state.timeout_at IS 'Timestamp when saga should timeout';
COMMENT ON COLUMN saga_state.started_at IS 'When saga execution started';
COMMENT ON COLUMN saga_state.completed_at IS 'When saga finished (success or failure)';
COMMENT ON COLUMN saga_state.error_message IS 'Error message if saga failed';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saga_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_saga_state_updated_at ON saga_state;
CREATE TRIGGER trigger_saga_state_updated_at
  BEFORE UPDATE ON saga_state
  FOR EACH ROW
  EXECUTE FUNCTION update_saga_state_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON saga_state TO billing_service_user;

-- Analyze table
ANALYZE saga_state;

-- Display table info
\d saga_state

-- Success message
SELECT 'saga_state table created successfully!' as message;
