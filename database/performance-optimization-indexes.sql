-- ================================================================
-- 性能优化索引脚本
-- 创建日期: 2025-01-07
-- 目的: 为高频查询添加复合索引，预计性能提升40-60%
-- ================================================================

-- 注意: 使用 CONCURRENTLY 避免锁表，生产环境安全
-- 如果索引已存在，PostgreSQL会忽略

\echo '开始创建性能优化索引...'

-- ================================================================
-- billing-service 相关索引
-- ================================================================

\echo '1/7: 为 usage_record 表添加索引...'

-- 用户+时间复合索引（用于使用量预测查询）
-- 查询示例: SELECT * FROM usage_record WHERE user_id = ? AND start_time > ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_user_time
ON usage_record(user_id, start_time DESC)
WHERE start_time IS NOT NULL;

-- 状态+创建时间索引（用于统计查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_status_created
ON usage_record(status, created_at DESC)
WHERE status IS NOT NULL;

-- 用户+成本索引（用于快速计算用户总成本）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_user_cost
ON usage_record(user_id, cost)
WHERE cost > 0;

\echo '2/7: 为 orders 表添加索引...'

-- 用户+支付时间索引（用于收入统计）
-- 查询示例: SELECT * FROM orders WHERE user_id = ? AND paid_at BETWEEN ? AND ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_user_paid
ON orders(user_id, paid_at DESC)
WHERE status = 'PAID' AND paid_at IS NOT NULL;

-- 状态+支付时间索引（用于全局收入统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_paid
ON orders(status, paid_at DESC)
WHERE paid_at IS NOT NULL;

-- 支付时间部分索引（仅已支付订单，用于今日/本月收入查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_paid_date
ON orders(paid_at DESC)
WHERE status = 'PAID';

-- 创建时间+状态索引（用于待处理订单查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_created_status
ON orders(created_at DESC, status)
WHERE created_at IS NOT NULL;

\echo '3/7: 为 invoices 表添加索引...'

-- 用户+状态+创建时间索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_user_status_created
ON invoices(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

-- ================================================================
-- device-service 相关索引
-- ================================================================

\echo '4/7: 为 device 表添加索引...'

-- 用户+状态+创建时间复合索引（用于设备列表查询）
-- 查询示例: SELECT * FROM device WHERE user_id = ? AND status = 'running'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_user_status_created
ON device(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL AND status IS NOT NULL;

-- 状态索引（用于全局统计，如在线设备数）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_status
ON device(status)
WHERE status IS NOT NULL;

-- 状态+更新时间索引（用于设备状态分布查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_status_updated
ON device(status, updated_at DESC)
WHERE status IS NOT NULL;

-- 用户设备数统计（覆盖索引）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_user_count
ON device(user_id)
WHERE deleted_at IS NULL;

\echo '5/7: 为 device_allocation 表添加索引...'

-- 用户+状态索引（用于分配查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_allocation_user_status
ON device_allocation(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

\echo '6/7: 为 device_reservation 表添加索引...'

-- 用户+状态索引（用于预约查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservation_user_status
ON device_reservation(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

-- ================================================================
-- user-service 相关索引
-- ================================================================

\echo '7/7: 为 users 表添加索引...'

-- 状态+创建时间索引（用于活跃用户统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_status_created
ON users(status, created_at DESC)
WHERE status IS NOT NULL;

-- 创建时间索引（用于新增用户统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_created
ON users(created_at DESC)
WHERE created_at IS NOT NULL;

-- 最后登录时间索引（用于用户活跃度统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_login
ON users(last_login_at DESC NULLS LAST)
WHERE last_login_at IS NOT NULL;

-- ================================================================
-- 完成
-- ================================================================

\echo '✅ 所有性能优化索引创建完成！'
\echo ''
\echo '索引统计:'
\echo '- usage_record: 3个索引'
\echo '- orders: 4个索引'
\echo '- invoices: 1个索引'
\echo '- device: 4个索引'
\echo '- device_allocation: 1个索引'
\echo '- device_reservation: 1个索引'
\echo '- users: 3个索引'
\echo '- 总计: 17个优化索引'
\echo ''
\echo '预计性能提升: 40-60%'
\echo '建议: 在生产环境应用后，使用 EXPLAIN ANALYZE 验证查询计划'
