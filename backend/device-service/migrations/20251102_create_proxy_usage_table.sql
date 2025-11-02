-- ========================================
-- 代理使用统计表
-- ========================================
-- 用于追踪每个代理的分配历史、使用时长、性能指标
-- ========================================

-- 创建代理使用记录表
CREATE TABLE IF NOT EXISTS proxy_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 关联信息
    device_id UUID NOT NULL,
    device_name VARCHAR(255),
    user_id UUID,
    user_name VARCHAR(255),

    -- 代理信息
    proxy_id VARCHAR(255) NOT NULL,
    proxy_host VARCHAR(255) NOT NULL,
    proxy_port INTEGER NOT NULL,
    proxy_type VARCHAR(50),
    proxy_country VARCHAR(2),

    -- 时间信息
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    released_at TIMESTAMP,
    duration_minutes INTEGER,  -- 计算字段：(released_at - assigned_at) / 60

    -- 性能指标（设备删除时收集）
    success_rate DECIMAL(5,2),  -- 成功率 0-100
    avg_latency_ms INTEGER,     -- 平均延迟（毫秒）
    total_requests INTEGER,      -- 总请求数
    failed_requests INTEGER,     -- 失败请求数

    -- 健康状态
    health_status VARCHAR(50),   -- 'healthy', 'degraded', 'unhealthy'
    health_checks_passed INTEGER DEFAULT 0,
    health_checks_failed INTEGER DEFAULT 0,
    last_health_check TIMESTAMP,

    -- 元数据
    release_reason VARCHAR(100), -- 'device_deleted', 'health_check_failed', 'manual', 'auto_cleanup'
    metadata JSONB,              -- 扩展字段

    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_proxy_usage_proxy_id ON proxy_usage(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_device_id ON proxy_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_user_id ON proxy_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_assigned_at ON proxy_usage(assigned_at);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_released_at ON proxy_usage(released_at);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_health_status ON proxy_usage(health_status);

-- 创建部分索引：只索引未释放的代理（活跃代理）
CREATE INDEX IF NOT EXISTS idx_proxy_usage_active ON proxy_usage(proxy_id, device_id)
WHERE released_at IS NULL;

-- 创建复合索引：用于统计查询
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats ON proxy_usage(proxy_id, assigned_at, released_at);

-- 添加注释
COMMENT ON TABLE proxy_usage IS '代理使用历史记录表，追踪代理分配、性能和健康状态';
COMMENT ON COLUMN proxy_usage.id IS '主键 UUID';
COMMENT ON COLUMN proxy_usage.device_id IS '关联设备 ID';
COMMENT ON COLUMN proxy_usage.proxy_id IS '代理服务 ID (proxy-service 返回)';
COMMENT ON COLUMN proxy_usage.assigned_at IS '代理分配时间';
COMMENT ON COLUMN proxy_usage.released_at IS '代理释放时间（NULL 表示仍在使用）';
COMMENT ON COLUMN proxy_usage.duration_minutes IS '使用时长（分钟）';
COMMENT ON COLUMN proxy_usage.success_rate IS '请求成功率（0-100）';
COMMENT ON COLUMN proxy_usage.avg_latency_ms IS '平均响应延迟（毫秒）';
COMMENT ON COLUMN proxy_usage.health_status IS '健康状态：healthy/degraded/unhealthy';
COMMENT ON COLUMN proxy_usage.release_reason IS '释放原因：device_deleted/health_check_failed/manual/auto_cleanup';

-- ========================================
-- 创建视图：活跃代理统计
-- ========================================
CREATE OR REPLACE VIEW v_active_proxy_usage AS
SELECT
    proxy_id,
    proxy_host,
    proxy_port,
    proxy_country,
    COUNT(*) as active_devices,
    MIN(assigned_at) as earliest_assignment,
    MAX(assigned_at) as latest_assignment,
    AVG(health_checks_passed::DECIMAL / NULLIF(health_checks_passed + health_checks_failed, 0)) * 100 as avg_health_rate
FROM proxy_usage
WHERE released_at IS NULL
GROUP BY proxy_id, proxy_host, proxy_port, proxy_country;

COMMENT ON VIEW v_active_proxy_usage IS '活跃代理使用统计视图';

-- ========================================
-- 创建视图：代理性能统计
-- ========================================
CREATE OR REPLACE VIEW v_proxy_performance_stats AS
SELECT
    proxy_id,
    proxy_country,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN released_at IS NOT NULL THEN 1 END) as completed_assignments,
    AVG(duration_minutes) as avg_duration_minutes,
    AVG(success_rate) as avg_success_rate,
    AVG(avg_latency_ms) as avg_latency_ms,
    SUM(total_requests) as total_requests,
    SUM(failed_requests) as total_failed_requests,
    AVG(health_checks_passed::DECIMAL / NULLIF(health_checks_passed + health_checks_failed, 0)) * 100 as overall_health_rate,
    MAX(assigned_at) as last_used_at
FROM proxy_usage
GROUP BY proxy_id, proxy_country;

COMMENT ON VIEW v_proxy_performance_stats IS '代理性能汇总统计视图';

-- ========================================
-- 创建函数：自动计算使用时长
-- ========================================
CREATE OR REPLACE FUNCTION calculate_proxy_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.released_at - NEW.assigned_at)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_calculate_proxy_duration ON proxy_usage;
CREATE TRIGGER trigger_calculate_proxy_duration
    BEFORE UPDATE ON proxy_usage
    FOR EACH ROW
    EXECUTE FUNCTION calculate_proxy_duration();

COMMENT ON FUNCTION calculate_proxy_duration IS '自动计算代理使用时长（释放时触发）';

-- ========================================
-- 创建函数：清理历史记录（保留最近 90 天）
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_old_proxy_usage()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM proxy_usage
    WHERE released_at IS NOT NULL
      AND released_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_proxy_usage IS '清理 90 天前的代理使用记录';

-- ========================================
-- 回滚脚本
-- ========================================
-- DROP FUNCTION IF EXISTS cleanup_old_proxy_usage();
-- DROP TRIGGER IF EXISTS trigger_calculate_proxy_duration ON proxy_usage;
-- DROP FUNCTION IF EXISTS calculate_proxy_duration();
-- DROP VIEW IF EXISTS v_proxy_performance_stats;
-- DROP VIEW IF EXISTS v_active_proxy_usage;
-- DROP TABLE IF EXISTS proxy_usage;
