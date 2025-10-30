-- Device Allocations Table Migration
-- Created: 2025-10-30
-- Description: Stores device allocation records for user-device scheduling

-- Create device_allocations table
CREATE TABLE IF NOT EXISTS device_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields
    device_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'allocated',
    -- Status values: 'allocated', 'released', 'expired'

    -- Timestamps
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Duration
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    duration_seconds INTEGER,

    -- Metadata
    metadata JSONB,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_status CHECK (status IN ('allocated', 'released', 'expired')),
    CONSTRAINT check_duration_minutes CHECK (duration_minutes > 0),
    CONSTRAINT check_duration_seconds CHECK (duration_seconds >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_allocations_device_id
    ON device_allocations(device_id);

CREATE INDEX IF NOT EXISTS idx_device_allocations_user_id
    ON device_allocations(user_id);

CREATE INDEX IF NOT EXISTS idx_device_allocations_tenant_id
    ON device_allocations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_device_allocations_status
    ON device_allocations(status);

CREATE INDEX IF NOT EXISTS idx_device_allocations_allocated_at
    ON device_allocations(allocated_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_allocations_expires_at
    ON device_allocations(expires_at)
    WHERE status = 'allocated' AND expires_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_allocations_device_status
    ON device_allocations(device_id, status);

CREATE INDEX IF NOT EXISTS idx_device_allocations_user_status
    ON device_allocations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_device_allocations_tenant_status
    ON device_allocations(tenant_id, status);

-- Index for finding expired allocations
CREATE INDEX IF NOT EXISTS idx_device_allocations_active_expired
    ON device_allocations(status, expires_at)
    WHERE status = 'allocated';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_device_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_device_allocations_updated_at
    BEFORE UPDATE ON device_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_device_allocations_updated_at();

-- Add comments
COMMENT ON TABLE device_allocations IS 'Stores device allocation records for scheduling';
COMMENT ON COLUMN device_allocations.device_id IS 'Reference to devices table';
COMMENT ON COLUMN device_allocations.user_id IS 'User who allocated the device';
COMMENT ON COLUMN device_allocations.tenant_id IS 'Tenant ID for multi-tenancy';
COMMENT ON COLUMN device_allocations.status IS 'Allocation status: allocated, released, expired';
COMMENT ON COLUMN device_allocations.allocated_at IS 'When the device was allocated';
COMMENT ON COLUMN device_allocations.released_at IS 'When the device was released';
COMMENT ON COLUMN device_allocations.expires_at IS 'When the allocation expires';
COMMENT ON COLUMN device_allocations.duration_minutes IS 'Requested allocation duration';
COMMENT ON COLUMN device_allocations.duration_seconds IS 'Actual usage duration in seconds';
COMMENT ON COLUMN device_allocations.metadata IS 'Additional metadata (JSON)';

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON device_allocations TO cloudphone_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cloudphone_user;
