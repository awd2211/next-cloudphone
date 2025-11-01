-- Create user_events table for Event Sourcing
-- This table stores all domain events for user aggregates
-- Supports event replay, time travel, and complete audit trail

CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "aggregateId" UUID NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "eventData" JSONB NOT NULL,
  version INTEGER NOT NULL,
  metadata JSONB,
  "tenantId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Composite index for fast aggregate event lookup and version checking
-- Used by: getEventsForAggregate(), getCurrentVersion(), optimistic locking
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_AGGREGATE" ON user_events("aggregateId", version);

-- Composite index for event type filtering with time ordering
-- Used by: getEventsByType(), event statistics
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_TYPE" ON user_events("eventType", "createdAt");

-- Index for time-range queries and event purging
-- Used by: getEventsByTimeRange(), purgeOldEvents(), time travel queries
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_CREATED" ON user_events("createdAt");

-- Single column index on aggregateId for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_AGGREGATE_ID" ON user_events("aggregateId");

-- Unique constraint to prevent version conflicts (optimistic locking)
-- Ensures exactly one event per aggregate version
CREATE UNIQUE INDEX IF NOT EXISTS "UNQ_AGGREGATE_VERSION" ON user_events("aggregateId", version);

-- Comments for documentation
COMMENT ON TABLE user_events IS 'Event store for user aggregate domain events. Supports Event Sourcing pattern with event replay and time travel capabilities.';
COMMENT ON COLUMN user_events."aggregateId" IS 'User ID (aggregate root identifier)';
COMMENT ON COLUMN user_events."eventType" IS 'Domain event type (UserCreated, UserUpdated, etc.)';
COMMENT ON COLUMN user_events."eventData" IS 'Event payload as JSON';
COMMENT ON COLUMN user_events.version IS 'Event version number for optimistic locking';
COMMENT ON COLUMN user_events.metadata IS 'Optional metadata (userId, ipAddress, correlationId, etc.)';
COMMENT ON COLUMN user_events."createdAt" IS 'Event occurrence timestamp (immutable)';
