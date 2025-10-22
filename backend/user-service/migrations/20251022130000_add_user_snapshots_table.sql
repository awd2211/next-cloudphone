-- Create user_snapshots table for Event Sourcing optimization
-- Snapshots store complete aggregate state at specific versions
-- This dramatically improves event replay performance (10-100x faster)

CREATE TABLE IF NOT EXISTS user_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "aggregateId" UUID NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  "tenantId" UUID,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Composite index for finding latest snapshot for an aggregate
CREATE INDEX IF NOT EXISTS "IDX_USER_SNAPSHOT_AGGREGATE" ON user_snapshots("aggregateId", version DESC);

-- Single column index on aggregateId for fast aggregate lookup
CREATE INDEX IF NOT EXISTS "IDX_USER_SNAPSHOT_AGGREGATE_ID" ON user_snapshots("aggregateId");

-- Index for time-based queries and cleanup operations
CREATE INDEX IF NOT EXISTS "IDX_USER_SNAPSHOT_CREATED" ON user_snapshots("createdAt");

-- Comments for documentation
COMMENT ON TABLE user_snapshots IS 'Event Sourcing snapshots for user aggregates. Stores complete user state at specific versions to optimize event replay performance.';
COMMENT ON COLUMN user_snapshots."aggregateId" IS 'User ID (aggregate root identifier)';
COMMENT ON COLUMN user_snapshots.version IS 'Event version when snapshot was created';
COMMENT ON COLUMN user_snapshots.state IS 'Complete user state as JSON';
COMMENT ON COLUMN user_snapshots.metadata IS 'Snapshot metadata (reason, event count, size, etc.)';
COMMENT ON COLUMN user_snapshots."createdAt" IS 'Snapshot creation timestamp';
