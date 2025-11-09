-- ============================================================
-- 配额管理系统性能优化索引
-- ============================================================

\c cloudphone_user;

-- ✅ 1. 核心查询索引: 按用户ID和状态查询配额
CREATE INDEX IF NOT EXISTS idx_quotas_user_status
ON quotas(user_id, status)
WHERE status = 'active';

-- ✅ 2. 过期配额检查索引
CREATE INDEX IF NOT EXISTS idx_quotas_expired_check
ON quotas(status, valid_until)
WHERE status = 'active' AND valid_until IS NOT NULL;

-- ✅ 3. 批量重置索引
CREATE INDEX IF NOT EXISTS idx_quotas_status_reset
ON quotas(status)
WHERE status = 'active';

-- ✅ 4. 配额告警查询索引 (高使用率配额)
CREATE INDEX IF NOT EXISTS idx_quotas_high_usage
ON quotas(status, ((usage->>'currentDevices')::int))
WHERE status = 'active';

-- ✅ 5. JSONB 配额使用字段索引 (GIN索引用于复杂查询)
CREATE INDEX IF NOT EXISTS idx_quotas_usage_gin
ON quotas USING GIN (usage jsonb_path_ops);

-- ✅ 6. JSONB 配额限制字段索引
CREATE INDEX IF NOT EXISTS idx_quotas_limits_gin
ON quotas USING GIN (limits jsonb_path_ops);

-- ✅ 7. 自动续费配额索引
CREATE INDEX IF NOT EXISTS idx_quotas_auto_renew
ON quotas(auto_renew, valid_until)
WHERE auto_renew = true AND status = 'active';

-- ✅ 8. 计划ID索引 (用于统计和分组)
CREATE INDEX IF NOT EXISTS idx_quotas_plan_id
ON quotas(plan_id, status);

-- ✅ 9. 创建时间索引 (用于按时间查询和统计)
CREATE INDEX IF NOT EXISTS idx_quotas_created_at
ON quotas(created_at DESC);

-- ============================================================
-- 性能优化配置
-- ============================================================

-- 分析表统计信息
ANALYZE quotas;

-- 查看索引使用情况
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename = 'quotas'
ORDER BY idx_scan DESC;

-- 查看表大小
SELECT
    pg_size_pretty(pg_total_relation_size('quotas')) as total_size,
    pg_size_pretty(pg_relation_size('quotas')) as table_size,
    pg_size_pretty(pg_indexes_size('quotas')) as indexes_size;

-- ============================================================
-- 清理建议
-- ============================================================

-- 定期清理过期配额 (可以设置为定时任务)
-- DELETE FROM quotas
-- WHERE status = 'expired'
--     AND valid_until < NOW() - INTERVAL '90 days';

-- 定期 VACUUM 以回收空间
-- VACUUM ANALYZE quotas;

COMMIT;

\echo '✅ 配额管理索引优化完成!'
\echo '📊 请查看上方的索引使用统计信息'
