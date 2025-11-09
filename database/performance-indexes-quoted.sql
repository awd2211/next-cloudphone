-- ================================================================
-- 性能优化索引脚本（带引号版本 - 保持驼峰命名）
-- ================================================================

\echo '🚀 开始创建性能优化索引...'

\c cloudphone_billing

\echo '1. usage_records 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_user_time
ON usage_records("userId", "startTime" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_user_cost
ON usage_records("userId", cost) WHERE cost > 0;

\echo '2. orders 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_paid
ON orders("userId", "paidAt" DESC) WHERE status = 'paid' AND "paidAt" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_paid
ON orders(status, "paidAt" DESC) WHERE "paidAt" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_paid_date
ON orders("paidAt" DESC) WHERE status = 'paid';

\echo '3. invoices 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_status
ON invoices("userId", status, "createdAt" DESC) WHERE "userId" IS NOT NULL;

\echo '4. user_balances 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_user
ON user_balances("userId");

\c cloudphone_device

\echo '5. devices 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_status
ON devices("userId", status, "createdAt" DESC) WHERE "userId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_only
ON devices("userId");

\echo '6. device_allocations 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_allocations_user
ON device_allocations("userId", status, "createdAt" DESC);

\echo '7. device_reservations 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_reservations_user
ON device_reservations("userId", status, "createdAt" DESC);

\c cloudphone_user

\echo '8. quotas 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotas_user
ON quotas("userId");

\echo '9. audit_logs 表索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_time
ON audit_logs("userId", "createdAt" DESC);

\c postgres

\echo ''
\echo '✅ 索引创建完成！'
\echo '🎯 预计性能提升: 40-60%'
