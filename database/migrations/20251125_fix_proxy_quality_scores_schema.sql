-- 修复 proxy_quality_scores 表缺失的列
-- 日期: 2025-11-25
-- 问题: TypeORM 实体定义了 38 列，但数据库只有 18 列

-- ========================================
-- 1. 修复 proxy_quality_scores 表
-- ========================================

-- 添加 proxy_type 列（关键列，当前报错的原因）
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS proxy_type VARCHAR(50) DEFAULT 'http';

-- 添加 total_score 和 quality_score 列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0;

-- 从 overall_score 复制数据到 total_score 和 quality_score
UPDATE proxy_quality_scores
SET total_score = overall_score, quality_score = overall_score
WHERE (total_score = 0 OR total_score IS NULL) AND overall_score IS NOT NULL;

-- 添加 rating 列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS rating VARCHAR(1) DEFAULT 'C';

-- 添加各维度评分列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS availability_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS consistency_score DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS anonymity_score DECIMAL(5,2) DEFAULT 0;

-- 添加统计数据列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS failed_requests INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p50_latency INTEGER DEFAULT 0;

-- 添加可用性统计列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS availability_rate DECIMAL(5,2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS uptime_hours_24h DECIMAL(5,2) DEFAULT 24,
    ADD COLUMN IF NOT EXISTS downtime_count_24h INTEGER DEFAULT 0;

-- 添加稳定性指标列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS latency_std_dev DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS jitter INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS packet_loss_rate DECIMAL(5,2) DEFAULT 0;

-- 添加匿名性检测列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS anonymity_level VARCHAR(20) DEFAULT 'elite',
    ADD COLUMN IF NOT EXISTS is_webrtc_leak BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_dns_leak BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS detected_country VARCHAR(10);

-- 添加健康状态列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS health_check_at TIMESTAMP;

-- 重命名 is_healthy 为兼容性（如果存在）
-- 注意：保留 is_healthy 列以避免破坏现有功能

-- 添加趋势分析列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'stable',
    ADD COLUMN IF NOT EXISTS score_change_24h DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS score_change_7d DECIMAL(5,2) DEFAULT 0;

-- 添加元数据和计算时间列
ALTER TABLE proxy_quality_scores
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP;

-- 从 last_check_at 复制数据到 last_calculated_at
UPDATE proxy_quality_scores
SET last_calculated_at = last_check_at
WHERE last_calculated_at IS NULL AND last_check_at IS NOT NULL;

-- 从 is_healthy 更新 health_status
UPDATE proxy_quality_scores
SET health_status = CASE WHEN is_healthy = true THEN 'healthy' ELSE 'unknown' END
WHERE health_status = 'unknown' AND is_healthy IS NOT NULL;

-- 创建索引
DROP INDEX IF EXISTS idx_proxy_quality_scores_total_score;
CREATE INDEX IF NOT EXISTS idx_proxy_quality_scores_total_score ON proxy_quality_scores(total_score DESC);

DROP INDEX IF EXISTS idx_proxy_quality_scores_rating;
CREATE INDEX IF NOT EXISTS idx_proxy_quality_scores_rating ON proxy_quality_scores(rating);

DROP INDEX IF EXISTS idx_proxy_quality_scores_health_status;
CREATE INDEX IF NOT EXISTS idx_proxy_quality_scores_health_status ON proxy_quality_scores(health_status);

-- ========================================
-- 2. 修复 isp_providers 表
-- ========================================
ALTER TABLE isp_providers
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS api_documentation_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pricing_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS supported_protocols TEXT[] DEFAULT ARRAY['http', 'https', 'socks5'],
    ADD COLUMN IF NOT EXISTS supported_proxy_types TEXT[] DEFAULT ARRAY['residential', 'datacenter'],
    ADD COLUMN IF NOT EXISTS supported_countries TEXT[],
    ADD COLUMN IF NOT EXISTS min_price_per_gb DECIMAL(10,4),
    ADD COLUMN IF NOT EXISTS max_price_per_gb DECIMAL(10,4),
    ADD COLUMN IF NOT EXISTS avg_price_per_gb DECIMAL(10,4),
    ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) DEFAULT 'per_gb',
    ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS has_trial BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS trial_data_limit BIGINT,
    ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER,
    ADD COLUMN IF NOT EXISTS api_rate_limit INTEGER,
    ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER,
    ADD COLUMN IF NOT EXISTS session_duration_limit INTEGER,
    ADD COLUMN IF NOT EXISTS supports_sticky_sessions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_rotating_sessions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS supports_authentication BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 3. 修复 device_geo_settings 表
-- ========================================
ALTER TABLE device_geo_settings
    ADD COLUMN IF NOT EXISTS device_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS device_status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS preferred_region VARCHAR(50),
    ADD COLUMN IF NOT EXISTS preferred_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS fallback_countries TEXT[],
    ADD COLUMN IF NOT EXISTS fallback_regions TEXT[],
    ADD COLUMN IF NOT EXISTS excluded_countries TEXT[],
    ADD COLUMN IF NOT EXISTS excluded_cities TEXT[],
    ADD COLUMN IF NOT EXISTS max_latency INTEGER DEFAULT 500,
    ADD COLUMN IF NOT EXISTS min_quality_score INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS preferred_proxy_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS preferred_protocol VARCHAR(20),
    ADD COLUMN IF NOT EXISTS auto_switch_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS auto_switch_threshold INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS sticky_session_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS sticky_session_duration INTEGER DEFAULT 3600,
    ADD COLUMN IF NOT EXISTS last_proxy_switch_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS switch_count_24h INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 4. 修复 proxy_usage_summaries 表
-- ========================================
ALTER TABLE proxy_usage_summaries
    ADD COLUMN IF NOT EXISTS avg_latency INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p50_latency INTEGER,
    ADD COLUMN IF NOT EXISTS p95_latency INTEGER,
    ADD COLUMN IF NOT EXISTS p99_latency INTEGER,
    ADD COLUMN IF NOT EXISTS avg_quality_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS min_quality_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS max_quality_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_per_gb DECIMAL(10,4),
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 5. 修复 proxy_recommendations 表
-- ========================================
ALTER TABLE proxy_recommendations
    ADD COLUMN IF NOT EXISTS recommendation_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS recommendation_reason TEXT,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS latency_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS cost_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS combined_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS is_applied BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS applied_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 6. 修复 proxy_session_renewals 表
-- ========================================
ALTER TABLE proxy_session_renewals
    ADD COLUMN IF NOT EXISTS renewal_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS old_proxy_quality DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS new_proxy_quality DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS old_proxy_latency INTEGER,
    ADD COLUMN IF NOT EXISTS new_proxy_latency INTEGER,
    ADD COLUMN IF NOT EXISTS renewal_duration_ms INTEGER,
    ADD COLUMN IF NOT EXISTS is_successful BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS old_proxy_host VARCHAR(255),
    ADD COLUMN IF NOT EXISTS old_proxy_port INTEGER,
    ADD COLUMN IF NOT EXISTS new_proxy_host VARCHAR(255),
    ADD COLUMN IF NOT EXISTS new_proxy_port INTEGER,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- 验证修改
-- ========================================
SELECT 'proxy_quality_scores columns after migration:' AS info;
SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'proxy_quality_scores';

SELECT 'isp_providers columns after migration:' AS info;
SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'isp_providers';

SELECT 'device_geo_settings columns after migration:' AS info;
SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'device_geo_settings';
