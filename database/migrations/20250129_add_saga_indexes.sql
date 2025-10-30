-- =============================================
-- Saga State Table Indexes Migration
-- Purpose: Improve performance of Saga recovery,
--          timeout detection, and cleanup operations
-- Date: 2025-01-29
-- =============================================

-- Check if saga_state table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'saga_state'
  ) THEN
    RAISE NOTICE 'saga_state table does not exist. Skipping index creation.';
    RETURN;
  END IF;
END
$$;

-- Create index on saga_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_saga_state_saga_id ON saga_state(saga_id);

-- Create index on status for filtering pending/running sagas
CREATE INDEX IF NOT EXISTS idx_saga_state_status ON saga_state(status);

-- Create composite index for timeout detection query
-- Used by SagaOrchestratorService.recoverTimeoutSagas()
CREATE INDEX IF NOT EXISTS idx_saga_state_timeout ON saga_state(status, timeout_at)
  WHERE status IN ('PENDING', 'RUNNING');

-- Create index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_saga_state_created_at ON saga_state(created_at DESC);

-- Create composite index for recovery operations
-- Used by SagaOrchestratorService.recoverIncompleteSagas()
CREATE INDEX IF NOT EXISTS idx_saga_state_recovery ON saga_state(status, created_at)
  WHERE status IN ('PENDING', 'RUNNING', 'COMPENSATING');

-- Create index on updated_at for monitoring recent activity
CREATE INDEX IF NOT EXISTS idx_saga_state_updated_at ON saga_state(updated_at DESC);

-- Add comments
COMMENT ON INDEX idx_saga_state_saga_id IS 'Fast lookup by saga ID';
COMMENT ON INDEX idx_saga_state_status IS 'Filter sagas by status (PENDING, RUNNING, COMPLETED, FAILED, etc.)';
COMMENT ON INDEX idx_saga_state_timeout IS 'Detect sagas that have exceeded their timeout';
COMMENT ON INDEX idx_saga_state_recovery IS 'Find sagas that need recovery (incomplete states)';

-- Analyze table to update statistics after index creation
ANALYZE saga_state;

-- Query to check index usage (for monitoring)
-- SELECT
--   schemaname, tablename, indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'saga_state'
-- ORDER BY idx_scan DESC;
