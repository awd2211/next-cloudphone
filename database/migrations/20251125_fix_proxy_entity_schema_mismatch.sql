-- 修复 proxy-service 实体与数据库架构不匹配的问题
-- 日期: 2025-11-25
-- 问题: TypeORM 实体定义了许多字段，但数据库表缺少这些列

-- ========================================
-- 1. 修复 proxy_provider_scores 表
-- ========================================
-- 当前表使用 overall_score，实体使用 total_score

-- 添加 total_score 列（如果不存在）
ALTER TABLE proxy_provider_scores
    ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2) DEFAULT 0;

-- 从 overall_score 复制数据到 total_score
UPDATE proxy_provider_scores SET total_score = overall_score WHERE total_score = 0 OR total_score IS NULL;

-- 添加实体需要的其他列
ALTER TABLE proxy_provider_scores
    ADD COLUMN IF NOT EXISTS ranking INTEGER,
    ADD COLUMN IF NOT EXISTS ranking_change INTEGER,
    ADD COLUMN IF NOT EXISTS cost_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS availability_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS success_rate_weight DECIMAL(3,2) DEFAULT 0.35,
    ADD COLUMN IF NOT EXISTS latency_weight DECIMAL(3,2) DEFAULT 0.25,
    ADD COLUMN IF NOT EXISTS cost_weight DECIMAL(3,2) DEFAULT 0.20,
    ADD COLUMN IF NOT EXISTS stability_weight DECIMAL(3,2) DEFAULT 0.15,
    ADD COLUMN IF NOT EXISTS availability_weight DECIMAL(3,2) DEFAULT 0.05,
    ADD COLUMN IF NOT EXISTS total_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS healthy_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS proxy_availability_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_success_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p50_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p95_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p99_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS latency_std_dev DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_gb DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "avg_cost_per_GB" DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_request DECIMAL(10,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_hour DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_competitiveness DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS successful_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_data_transferred BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_usage_hours DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uptime_percentage_24h DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS uptime_percentage_7d DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS uptime_percentage_30d DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS mtbf DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS mttr DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS quality_distribution JSONB,
    ADD COLUMN IF NOT EXISTS countries_covered TEXT[],
    ADD COLUMN IF NOT EXISTS cities_covered TEXT[],
    ADD COLUMN IF NOT EXISTS total_locations INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS supported_types TEXT[] DEFAULT ARRAY['http', 'https', 'socks5'],
    ADD COLUMN IF NOT EXISTS supports_residential BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_datacenter BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_mobile BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_rotating BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_sticky BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS market_share DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS popularity_rank INTEGER,
    ADD COLUMN IF NOT EXISTS user_rating DECIMAL(3,1),
    ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'stable',
    ADD COLUMN IF NOT EXISTS score_change_24h DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS score_change_7d DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS score_change_30d DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS recommendation_reasons TEXT[],
    ADD COLUMN IF NOT EXISTS warnings TEXT[],
    ADD COLUMN IF NOT EXISTS calculation_duration INTEGER,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 创建或替换 total_score 索引
DROP INDEX IF EXISTS idx_proxy_provider_scores_total_score;
CREATE INDEX idx_proxy_provider_scores_total_score ON proxy_provider_scores(total_score DESC);

-- ========================================
-- 2. 修复 proxy_quality_history 表
-- ========================================
-- 添加 total_score 列（如果不存在）
ALTER TABLE proxy_quality_history
    ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2) DEFAULT 0;

-- 从 overall_score 复制数据到 total_score
UPDATE proxy_quality_history SET total_score = overall_score WHERE total_score = 0 OR total_score IS NULL;

-- 添加实体需要的其他列
ALTER TABLE proxy_quality_history
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating VARCHAR(1) DEFAULT 'C',
    ADD COLUMN IF NOT EXISTS availability_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS consistency_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS anonymity_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS availability_rate DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS successful_requests INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_requests INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'healthy',
    ADD COLUMN IF NOT EXISTS record_type VARCHAR(20) DEFAULT 'scheduled',
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 3. 修复 proxy_provider_score_history 表
-- ========================================
-- 添加 total_score 列（如果不存在）
ALTER TABLE proxy_provider_score_history
    ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2) DEFAULT 0;

-- 从 overall_score 复制数据到 total_score
UPDATE proxy_provider_score_history SET total_score = overall_score WHERE total_score = 0 OR total_score IS NULL;

-- 添加实体需要的其他列
ALTER TABLE proxy_provider_score_history
    ADD COLUMN IF NOT EXISTS score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ranking INTEGER,
    ADD COLUMN IF NOT EXISTS cost_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS availability_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS healthy_proxies INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS proxy_availability_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_success_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS latency_std_dev DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_gb DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "avg_cost_per_GB" DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_request DECIMAL(10,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_per_hour DECIMAL(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS successful_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_requests BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_data_transferred BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_usage_hours DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS quality_distribution JSONB,
    ADD COLUMN IF NOT EXISTS total_locations INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS countries_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS market_share DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS popularity_rank INTEGER,
    ADD COLUMN IF NOT EXISTS score_change_from_previous DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS ranking_change_from_previous INTEGER,
    ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'stable',
    ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS anomaly_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS anomaly_details TEXT,
    ADD COLUMN IF NOT EXISTS record_type VARCHAR(20) DEFAULT 'scheduled',
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 验证修改
-- ========================================
SELECT 'proxy_provider_scores columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'proxy_provider_scores' ORDER BY ordinal_position;

SELECT 'proxy_quality_history columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'proxy_quality_history' ORDER BY ordinal_position;

SELECT 'proxy_provider_score_history columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'proxy_provider_score_history' ORDER BY ordinal_position;
