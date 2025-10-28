-- Migration: Add composite indexes for high-frequency queries
-- Date: 2025-10-28
-- Purpose: Improve query performance by 5-10x for common query patterns

-- ========================================
-- Device Table Composite Indexes
-- ========================================

-- 1. 用户设备状态查询 (最常用)
-- Query: SELECT * FROM devices WHERE userId = ? AND status = ?
-- Use case: 获取用户的所有运行中/空闲/错误状态设备
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_status
ON devices(userId, status)
WHERE userId IS NOT NULL;

-- 2. 租户设备状态查询 (多租户场景)
-- Query: SELECT * FROM devices WHERE tenantId = ? AND status = ?
-- Use case: 租户管理员查看所有设备状态
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_tenant_status
ON devices(tenantId, status)
WHERE tenantId IS NOT NULL;

-- 3. 设备过期检查 (定时任务)
-- Query: SELECT * FROM devices WHERE status = 'running' AND expiresAt < NOW()
-- Use case: 清理过期设备的定时任务
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_status_expires
ON devices(status, expiresAt)
WHERE expiresAt IS NOT NULL;

-- 4. 用户设备列表 (带时间排序)
-- Query: SELECT * FROM devices WHERE userId = ? ORDER BY createdAt DESC
-- Use case: 用户设备列表页，按创建时间倒序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_created
ON devices(userId, createdAt DESC)
WHERE userId IS NOT NULL;

-- ========================================
-- Device Snapshots Table Composite Indexes
-- ========================================

-- 5. 设备快照列表查询
-- Query: SELECT * FROM device_snapshots WHERE deviceId = ? ORDER BY createdAt DESC
-- Use case: 获取某个设备的所有快照
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_device_created
ON device_snapshots(deviceId, createdAt DESC);

-- ========================================
-- Device Monitoring Indexes
-- ========================================

-- 6. 设备心跳监控 (故障检测)
-- Query: SELECT * FROM devices WHERE status = 'running' AND lastHeartbeatAt < ?
-- Use case: 检测超时未心跳的设备
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_status_heartbeat
ON devices(status, lastHeartbeatAt)
WHERE status = 'running';

-- 7. 容器ID快速查找 (Docker 操作)
-- Query: SELECT * FROM devices WHERE containerId = ?
-- Use case: 根据 Docker 容器 ID 快速定位设备
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_container
ON devices(containerId)
WHERE containerId IS NOT NULL;

-- ========================================
-- Index Statistics and Verification
-- ========================================

-- Analyze tables to update statistics
ANALYZE devices;
ANALYZE device_snapshots;

-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('devices', 'device_snapshots')
  AND indexname LIKE 'idx_%_user_%'
   OR indexname LIKE 'idx_%_tenant_%'
   OR indexname LIKE 'idx_%_status_%'
   OR indexname LIKE 'idx_%_device_%'
   OR indexname LIKE 'idx_%_container%'
ORDER BY tablename, indexname;
