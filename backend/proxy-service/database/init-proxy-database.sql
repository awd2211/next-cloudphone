-- ================================================
-- Proxy Service 数据库初始化脚本
-- ================================================
-- 功能：创建 cloudphone_proxy 数据库及所有表
-- 注意：开发环境可以使用 TypeORM synchronize:true 自动创建
--       生产环境应该使用此SQL脚本手动创建
-- ================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS cloudphone_proxy;

-- 连接到数据库
\c cloudphone_proxy

-- ================================================
-- 1. proxy_providers 表 - 代理供应商配置
-- ================================================
CREATE TABLE IF NOT EXISTS proxy_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'iproyal' | 'brightdata' | 'oxylabs'
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    config JSONB, -- 供应商配置信息
    cost_per_gb DECIMAL(10, 2) DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    success_rate DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_proxy_providers_type ON proxy_providers(type);
CREATE INDEX IF NOT EXISTS idx_proxy_providers_enabled ON proxy_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_proxy_providers_priority ON proxy_providers(priority);

-- ================================================
-- 2. proxy_usage 表 - 代理使用记录
-- ================================================
CREATE TABLE IF NOT EXISTS proxy_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    device_id VARCHAR(100),
    country VARCHAR(10) NOT NULL,
    bandwidth_mb INTEGER DEFAULT 0,
    cost DECIMAL(10, 4) DEFAULT 0,
    success BOOLEAN DEFAULT true,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_proxy_usage_proxy_id ON proxy_usage(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_provider ON proxy_usage(provider);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_device_id ON proxy_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_used_at ON proxy_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_provider_used_at ON proxy_usage(provider, used_at);

-- ================================================
-- 3. proxy_health 表 - 代理健康检查记录
-- ================================================
CREATE TABLE IF NOT EXISTS proxy_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    healthy BOOLEAN DEFAULT true,
    response_time INTEGER, -- 毫秒
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_proxy_health_proxy_id ON proxy_health(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_health_provider ON proxy_health(provider);
CREATE INDEX IF NOT EXISTS idx_proxy_health_checked_at ON proxy_health(checked_at);
CREATE INDEX IF NOT EXISTS idx_proxy_health_healthy ON proxy_health(healthy);

-- ================================================
-- 4. proxy_sessions 表 - 代理会话管理
-- ================================================
CREATE TABLE IF NOT EXISTS proxy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    proxy_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    device_id VARCHAR(100),
    user_id VARCHAR(100),
    country VARCHAR(10),
    city VARCHAR(100),
    protocol VARCHAR(10) DEFAULT 'http',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    ended_at TIMESTAMP,
    total_bandwidth_mb INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 4) DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_proxy_sessions_session_id ON proxy_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_proxy_sessions_proxy_id ON proxy_sessions(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_sessions_device_id ON proxy_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_proxy_sessions_user_id ON proxy_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_sessions_started_at ON proxy_sessions(started_at);

-- ================================================
-- 5. cost_records 表 - 成本记录
-- ================================================
CREATE TABLE IF NOT EXISTS cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    record_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    total_bandwidth_mb DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 4) DEFAULT 0,
    avg_cost_per_request DECIMAL(10, 4) DEFAULT 0,
    avg_cost_per_gb DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cost_records_provider ON cost_records(provider);
CREATE INDEX IF NOT EXISTS idx_cost_records_record_date ON cost_records(record_date);
CREATE INDEX IF NOT EXISTS idx_cost_records_provider_date ON cost_records(provider, record_date);

-- ================================================
-- 初始数据
-- ================================================

-- 插入默认供应商配置（示例）
INSERT INTO proxy_providers (name, type, enabled, priority, cost_per_gb, config)
VALUES
    ('IPRoyal', 'iproyal', true, 70, 1.75, '{"apiUrl": "https://resi-api.iproyal.com/v1"}'),
    ('Bright Data', 'brightdata', true, 100, 10.00, '{"apiUrl": "https://api.brightdata.com", "zone": "residential"}'),
    ('Oxylabs', 'oxylabs', true, 90, 12.00, '{"apiUrl": "https://api.oxylabs.io", "proxyType": "residential"}')
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 创建视图：今日使用统计
-- ================================================
CREATE OR REPLACE VIEW daily_usage_stats AS
SELECT
    provider,
    DATE(used_at) as usage_date,
    COUNT(*) as total_requests,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
    SUM(bandwidth_mb) as total_bandwidth_mb,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost_per_request
FROM proxy_usage
GROUP BY provider, DATE(used_at)
ORDER BY usage_date DESC, provider;

-- ================================================
-- 创建视图：供应商性能统计
-- ================================================
CREATE OR REPLACE VIEW provider_performance AS
SELECT
    p.name,
    p.type,
    p.enabled,
    p.priority,
    p.cost_per_gb,
    COUNT(u.id) as total_requests,
    SUM(CASE WHEN u.success THEN 1 ELSE 0 END) as successful_requests,
    CASE
        WHEN COUNT(u.id) > 0
        THEN ROUND((SUM(CASE WHEN u.success THEN 1 ELSE 0 END)::numeric / COUNT(u.id)::numeric) * 100, 2)
        ELSE 0
    END as success_rate_percent,
    SUM(u.bandwidth_mb) as total_bandwidth_mb,
    SUM(u.cost) as total_cost
FROM proxy_providers p
LEFT JOIN proxy_usage u ON p.name = u.provider
GROUP BY p.id, p.name, p.type, p.enabled, p.priority, p.cost_per_gb;

-- ================================================
-- 完成
-- ================================================
\echo '✅ Proxy Service 数据库初始化完成！'
\echo ''
\echo '已创建的表：'
\echo '  - proxy_providers (供应商配置)'
\echo '  - proxy_usage (使用记录)'
\echo '  - proxy_health (健康检查)'
\echo '  - proxy_sessions (会话管理)'
\echo '  - cost_records (成本记录)'
\echo ''
\echo '已创建的视图：'
\echo '  - daily_usage_stats (每日使用统计)'
\echo '  - provider_performance (供应商性能统计)'
\echo ''
\echo '已插入的初始数据：'
\echo '  - 3个默认供应商配置'
