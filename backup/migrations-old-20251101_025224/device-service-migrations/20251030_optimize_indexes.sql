-- Migration: Optimize Database Indexes
-- Date: 2025-10-30
-- Purpose: 优化查询性能，添加缺失的复合索引

-- ==================== device_allocations 表优化 ====================

-- 1. 用户活动分配查询优化（最常用）
-- 用途: getUserAllocations(), 分页查询用户的分配记录
-- 查询: WHERE user_id = ? AND status = 'allocated' ORDER BY created_at DESC
DROP INDEX IF EXISTS idx_device_allocations_user_status;
CREATE INDEX idx_device_allocations_user_status_created
  ON device_allocations(user_id, status, created_at DESC);

-- 2. 设备分配状态查询优化
-- 用途: 查找特定设备的活动分配
-- 查询: WHERE device_id = ? AND status IN ('allocated')
CREATE INDEX idx_device_allocations_device_status
  ON device_allocations(device_id, status)
  WHERE status = 'allocated';

-- 3. 过期分配检查优化（Cron任务）
-- 用途: releaseExpiredAllocations()
-- 查询: WHERE status = 'allocated' AND expires_at < NOW()
DROP INDEX IF EXISTS idx_device_allocations_expiry;
CREATE INDEX idx_device_allocations_expiry_optimized
  ON device_allocations(status, expires_at)
  WHERE status = 'allocated';

-- 4. 租户+状态复合查询
-- 用途: 多租户场景下的分配查询
-- 查询: WHERE tenant_id = ? AND status = ?
CREATE INDEX idx_device_allocations_tenant_status
  ON device_allocations(tenant_id, status)
  WHERE tenant_id IS NOT NULL;

-- 5. 时间范围分配统计
-- 用途: 统计某时间段内的分配情况
-- 查询: WHERE created_at BETWEEN ? AND ?
CREATE INDEX idx_device_allocations_created_at_covering
  ON device_allocations(created_at, status, user_id, device_id);

-- 6. 覆盖索引：常用统计查询
-- 用途: getAllocationStats() 性能优化
-- 包含常用统计字段，避免回表
CREATE INDEX idx_device_allocations_stats_covering
  ON device_allocations(status, created_at, duration_minutes, user_id)
  WHERE status IN ('allocated', 'released', 'expired');

-- ==================== device_reservations 表优化 ====================

-- 1. 用户预约查询优化
-- 用途: getUserReservations()
-- 查询: WHERE user_id = ? AND status = ? ORDER BY reserved_start_time DESC
DROP INDEX IF EXISTS idx_device_reservations_user_status;
CREATE INDEX idx_device_reservations_user_status_time
  ON device_reservations(user_id, status, reserved_start_time DESC);

-- 2. 执行预约Cron任务优化（最关键）
-- 用途: executePendingReservations()
-- 查询: WHERE status IN ('pending', 'confirmed')
--       AND reserved_start_time BETWEEN (NOW() - 1 min) AND NOW()
DROP INDEX IF EXISTS idx_device_reservations_start_time_status;
CREATE INDEX idx_device_reservations_execution_check
  ON device_reservations(status, reserved_start_time)
  WHERE status IN ('pending', 'confirmed');

-- 3. 冲突检测优化
-- 用途: checkConflict()
-- 查询: WHERE user_id = ? AND status IN (...)
--       AND reserved_start_time < ? AND reserved_end_time > ?
CREATE INDEX idx_device_reservations_conflict_check
  ON device_reservations(user_id, status, reserved_start_time, reserved_end_time)
  WHERE status IN ('pending', 'confirmed', 'executing');

-- 4. 提醒发送优化
-- 用途: sendReminders()
-- 查询: WHERE status IN ('pending', 'confirmed')
--       AND reminder_sent = false AND remind_before_minutes > 0
CREATE INDEX idx_device_reservations_reminder_check
  ON device_reservations(status, reminder_sent, reserved_start_time)
  WHERE status IN ('pending', 'confirmed') AND reminder_sent = false;

-- 5. 设备类型预约查询
-- 用途: 按设备类型统计预约
CREATE INDEX idx_device_reservations_device_type_status
  ON device_reservations(device_type, status, reserved_start_time)
  WHERE device_type IS NOT NULL;

-- 6. 预约统计覆盖索引
-- 用途: getReservationStatistics()
CREATE INDEX idx_device_reservations_stats_covering
  ON device_reservations(status, created_at, reserved_start_time, fulfilled_at)
  WHERE status IN ('completed', 'failed', 'expired');

-- ==================== allocation_queue 表优化 ====================

-- 1. 优先级队列处理优化（已存在，但增强）
-- 用途: processNextQueueEntry()
-- 查询: WHERE status = 'waiting' ORDER BY priority DESC, created_at ASC
-- 注意：已在初始迁移中创建，这里确保存在
-- idx_allocation_queue_priority_sort 已经是最优的

-- 2. 用户队列查询优化
-- 用途: 查询用户的队列条目
-- 查询: WHERE user_id = ? AND status IN ('waiting', 'processing')
DROP INDEX IF EXISTS idx_allocation_queue_user_status;
CREATE INDEX idx_allocation_queue_user_status_priority
  ON allocation_queue(user_id, status, priority DESC, created_at ASC);

-- 3. 过期队列检查优化（Cron任务）
-- 用途: markExpiredQueueEntries()
-- 查询: WHERE status = 'waiting' AND (NOW() - created_at) > max_wait_minutes
-- 已存在 idx_allocation_queue_expiry_check，但可以优化
DROP INDEX IF EXISTS idx_allocation_queue_expiry_check;
CREATE INDEX idx_allocation_queue_expiry_optimized
  ON allocation_queue(status, created_at, max_wait_minutes)
  WHERE status = 'waiting';

-- 4. 设备类型队列查询
-- 用途: 按设备类型处理队列
-- 查询: WHERE status = 'waiting' AND device_type = ? ORDER BY priority DESC
CREATE INDEX idx_allocation_queue_device_type_priority
  ON allocation_queue(device_type, status, priority DESC, created_at ASC)
  WHERE status = 'waiting' AND device_type IS NOT NULL;

-- 5. 位置计算优化
-- 用途: updateQueuePosition() 计算排队位置
-- 查询: WHERE status = 'waiting' AND (priority > ? OR (priority = ? AND created_at < ?))
-- 已被 idx_allocation_queue_priority_sort 覆盖

-- 6. 统计查询覆盖索引
-- 用途: getQueueStatistics()
CREATE INDEX idx_allocation_queue_stats_covering
  ON allocation_queue(status, user_tier, created_at, fulfilled_at)
  WHERE status IN ('fulfilled', 'expired', 'cancelled');

-- ==================== nodes 表优化 ====================

-- 1. 活动节点查询
-- 用途: 查询在线节点
-- 查询: WHERE status = 'online' ORDER BY created_at
CREATE INDEX idx_nodes_status_created
  ON nodes(status, created_at)
  WHERE status = 'online';

-- 2. 区域节点查询
-- 用途: getNodesByRegion()
-- 查询: WHERE region = ? AND status = 'online'
CREATE INDEX idx_nodes_region_status
  ON nodes(region, status)
  WHERE status = 'online';

-- 3. 标签查询优化
-- 用途: getNodesByLabel() - 使用GIN索引支持JSONB查询
CREATE INDEX idx_nodes_labels_gin
  ON nodes USING gin(labels jsonb_path_ops);

-- 4. 污点查询优化
CREATE INDEX idx_nodes_taints_gin
  ON nodes USING gin(taints jsonb_path_ops);

-- ==================== devices 表优化 ====================

-- 1. 可用设备查询（最关键）
-- 用途: getAvailableDevices()
-- 查询: WHERE status = 'running' AND allocated = false
CREATE INDEX idx_devices_available
  ON devices(status, allocated)
  WHERE status = 'running' AND allocated = false;

-- 2. 节点设备查询
-- 用途: 查询特定节点上的设备
-- 查询: WHERE node_id = ? AND status = ?
CREATE INDEX idx_devices_node_status
  ON devices(node_id, status);

-- 3. 设备类型查询
-- 用途: 按设备类型筛选
-- 查询: WHERE device_type = ? AND status = 'running'
CREATE INDEX idx_devices_type_status
  ON devices(device_type, status, allocated)
  WHERE status = 'running';

-- 4. 租户设备查询
-- 用途: 多租户场景
CREATE INDEX idx_devices_tenant_status
  ON devices(tenant_id, status)
  WHERE tenant_id IS NOT NULL;

-- ==================== 分析和监控 ====================

-- 创建用于分析索引使用情况的视图
CREATE OR REPLACE VIEW v_unused_indexes AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as number_of_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 创建用于分析缺失索引的视图（基于顺序扫描）
CREATE OR REPLACE VIEW v_tables_needing_indexes AS
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND seq_tup_read / seq_scan > 1000  -- 每次扫描超过1000行
ORDER BY seq_scan DESC;

-- ==================== 索引维护建议 ====================

-- 注释：定期运行以下命令以维护索引健康
-- REINDEX TABLE device_allocations;
-- REINDEX TABLE device_reservations;
-- REINDEX TABLE allocation_queue;
-- VACUUM ANALYZE device_allocations;
-- VACUUM ANALYZE device_reservations;
-- VACUUM ANALYZE allocation_queue;

-- 注释：监控索引使用情况
-- SELECT * FROM v_unused_indexes LIMIT 20;
-- SELECT * FROM v_tables_needing_indexes LIMIT 20;

-- 注释：查看表膨胀情况
-- SELECT
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
--   pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_stat_user_tables
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================== 性能提示 ====================

-- 1. 对于高频更新的表，考虑调整 fillfactor
ALTER TABLE device_allocations SET (fillfactor = 90);
ALTER TABLE allocation_queue SET (fillfactor = 85);

-- 2. 启用表的自动vacuum统计收集
ALTER TABLE device_allocations SET (autovacuum_enabled = true, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE device_reservations SET (autovacuum_enabled = true, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE allocation_queue SET (autovacuum_enabled = true, autovacuum_vacuum_scale_factor = 0.05);

-- 3. 为统计信息设置更高的采样
ALTER TABLE device_allocations ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE device_reservations ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE allocation_queue ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE allocation_queue ALTER COLUMN priority SET STATISTICS 1000;

COMMENT ON COLUMN device_allocations.status IS '分配状态 - 已设置高统计采样';
COMMENT ON COLUMN allocation_queue.priority IS '优先级 - 已设置高统计采样';
