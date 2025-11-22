-- 创建 proxy-service 缺失的表
-- 日期: 2025-11-22
-- 说明: 根据 TypeORM 实体定义创建缺失的数据库表

-- 1. device_geo_settings - 设备地理位置设置
CREATE TABLE IF NOT EXISTS device_geo_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    target_country VARCHAR(10) NOT NULL,
    target_city VARCHAR(100),
    preferred_provider VARCHAR(50),
    fallback_providers JSONB,
    auto_rotation BOOLEAN DEFAULT false,
    rotation_interval INTEGER DEFAULT 3600,
    sticky_session BOOLEAN DEFAULT true,
    sticky_duration INTEGER DEFAULT 1800,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_geo_device_id ON device_geo_settings(device_id);
CREATE INDEX IF NOT EXISTS idx_device_geo_user_id ON device_geo_settings(user_id);

-- 2. isp_providers - ISP 提供商
CREATE TABLE IF NOT EXISTS isp_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_name VARCHAR(100) NOT NULL,
    country VARCHAR(10) NOT NULL,
    isp_type VARCHAR(50) NOT NULL,
    asn VARCHAR(20),
    ip_ranges JSONB,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    success_rate DECIMAL(5,2) DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_isp_country_type ON isp_providers(country, isp_type);
CREATE INDEX IF NOT EXISTS idx_isp_name ON isp_providers(isp_name);

-- 3. proxy_alert_channels - 告警通道
CREATE TABLE IF NOT EXISTS proxy_alert_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alert_channel_user_type ON proxy_alert_channels(user_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_alert_channel_active ON proxy_alert_channels(is_active);

-- 4. proxy_alert_rules - 告警规则
CREATE TABLE IF NOT EXISTS proxy_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(15,4),
    threshold_unit VARCHAR(20),
    time_window INTEGER,
    comparison_operator VARCHAR(10),
    severity VARCHAR(20) DEFAULT 'warning',
    is_enabled BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 60,
    channels JSONB,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alert_rule_user ON proxy_alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rule_type_enabled ON proxy_alert_rules(rule_type, is_enabled);

-- 5. proxy_alert_history - 告警历史
CREATE TABLE IF NOT EXISTS proxy_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID,
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    alert_level VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'triggered',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    metric_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    context JSONB,
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSONB,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(100),
    resolved_at TIMESTAMP,
    resolution_note TEXT,
    triggered_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alert_hist_rule_triggered ON proxy_alert_history(rule_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_hist_user_triggered ON proxy_alert_history(user_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_hist_level_status ON proxy_alert_history(alert_level, status);
CREATE INDEX IF NOT EXISTS idx_alert_hist_triggered ON proxy_alert_history(triggered_at);

-- 6. proxy_audit_logs - 审计日志
CREATE TABLE IF NOT EXISTS proxy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    resource_name VARCHAR(200),
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    is_successful BOOLEAN DEFAULT true,
    error_message TEXT,
    duration_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON proxy_audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON proxy_audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON proxy_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON proxy_audit_logs(created_at);

-- 7. proxy_cost_alerts - 成本告警
CREATE TABLE IF NOT EXISTS proxy_cost_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID,
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    alert_level VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    current_cost DECIMAL(15,4),
    budget_limit DECIMAL(15,4),
    usage_percentage DECIMAL(5,2),
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cost_alert_budget ON proxy_cost_alerts(budget_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_cost_alert_user ON proxy_cost_alerts(user_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_cost_alert_level ON proxy_cost_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_cost_alert_triggered ON proxy_cost_alerts(triggered_at);

-- 8. proxy_cost_budgets - 成本预算
CREATE TABLE IF NOT EXISTS proxy_cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    budget_name VARCHAR(100) NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    budget_limit DECIMAL(15,4) NOT NULL,
    current_cost DECIMAL(15,4) DEFAULT 0,
    alert_threshold DECIMAL(5,2) DEFAULT 80,
    warning_threshold DECIMAL(5,2) DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cost_budget_user_device ON proxy_cost_budgets(user_id, device_id, period_type);
CREATE INDEX IF NOT EXISTS idx_cost_budget_user_period ON proxy_cost_budgets(user_id, period_start, period_end);

-- 9. proxy_cost_daily_summaries - 每日成本汇总
CREATE TABLE IF NOT EXISTS proxy_cost_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    provider VARCHAR(50),
    summary_date DATE NOT NULL,
    total_cost DECIMAL(15,4) DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    total_bandwidth_bytes BIGINT DEFAULT 0,
    avg_cost_per_request DECIMAL(10,6) DEFAULT 0,
    avg_cost_per_gb DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_cost_daily_device ON proxy_cost_daily_summaries(device_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_cost_daily_provider ON proxy_cost_daily_summaries(provider, summary_date);
CREATE INDEX IF NOT EXISTS idx_cost_daily_date ON proxy_cost_daily_summaries(summary_date);

-- 10. proxy_cost_records - 成本记录
CREATE TABLE IF NOT EXISTS proxy_cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    proxy_id VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    session_id VARCHAR(100),
    request_type VARCHAR(50),
    target_url VARCHAR(500),
    target_domain VARCHAR(200),
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cost_amount DECIMAL(15,6) NOT NULL,
    cost_currency VARCHAR(10) DEFAULT 'USD',
    pricing_model VARCHAR(50),
    unit_price DECIMAL(10,6),
    status VARCHAR(20),
    is_billable BOOLEAN DEFAULT true,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cost_record_user ON proxy_cost_records(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_cost_record_device ON proxy_cost_records(device_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_cost_record_proxy ON proxy_cost_records(proxy_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_cost_record_provider ON proxy_cost_records(provider, recorded_at);
CREATE INDEX IF NOT EXISTS idx_cost_record_recorded ON proxy_cost_records(recorded_at);

-- 11. proxy_failover_configs - 故障转移配置
CREATE TABLE IF NOT EXISTS proxy_failover_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    device_id VARCHAR(100),
    is_enabled BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    timeout_ms INTEGER DEFAULT 30000,
    fallback_providers JSONB,
    fallback_countries JSONB,
    health_check_interval INTEGER DEFAULT 60,
    health_check_url VARCHAR(500),
    circuit_breaker_enabled BOOLEAN DEFAULT true,
    circuit_breaker_threshold INTEGER DEFAULT 5,
    circuit_breaker_timeout INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(level, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_failover_user ON proxy_failover_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_failover_device ON proxy_failover_configs(device_id);

-- 12. proxy_failover_history - 故障转移历史
CREATE TABLE IF NOT EXISTS proxy_failover_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    device_id VARCHAR(100),
    old_proxy_id VARCHAR(100) NOT NULL,
    new_proxy_id VARCHAR(100) NOT NULL,
    old_provider VARCHAR(50),
    new_provider VARCHAR(50),
    old_country VARCHAR(10),
    new_country VARCHAR(10),
    trigger_reason VARCHAR(100) NOT NULL,
    error_type VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    is_successful BOOLEAN,
    failover_duration_ms INTEGER,
    triggered_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_failover_hist_session ON proxy_failover_history(session_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_failover_hist_old ON proxy_failover_history(old_proxy_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_failover_hist_new ON proxy_failover_history(new_proxy_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_failover_hist_triggered ON proxy_failover_history(triggered_at);

-- 13. proxy_group_devices - 设备组设备关联
CREATE TABLE IF NOT EXISTS proxy_group_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    priority INTEGER DEFAULT 100,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_group_device_group_status ON proxy_group_devices(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_device_device ON proxy_group_devices(device_id);

-- 14. proxy_group_pools - 代理池组
CREATE TABLE IF NOT EXISTS proxy_group_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    pool_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    country VARCHAR(10),
    city VARCHAR(100),
    proxy_type VARCHAR(20),
    priority INTEGER DEFAULT 100,
    weight DECIMAL(5,2) DEFAULT 1.0,
    max_connections INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_group_pool_group ON proxy_group_pools(group_id);
CREATE INDEX IF NOT EXISTS idx_group_pool_provider ON proxy_group_pools(provider);

-- 15. proxy_group_stats - 设备组统计
CREATE TABLE IF NOT EXISTS proxy_group_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    stat_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_bandwidth_bytes BIGINT DEFAULT 0,
    total_cost DECIMAL(15,4) DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    min_latency INTEGER DEFAULT 0,
    max_latency INTEGER DEFAULT 0,
    unique_proxies_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, stat_date)
);
CREATE INDEX IF NOT EXISTS idx_group_stats_group ON proxy_group_stats(group_id);
CREATE INDEX IF NOT EXISTS idx_group_stats_date ON proxy_group_stats(stat_date);

-- 16. proxy_provider_scores - 提供商评分
CREATE TABLE IF NOT EXISTS proxy_provider_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    country VARCHAR(10),
    overall_score DECIMAL(5,2) DEFAULT 0,
    latency_score DECIMAL(5,2) DEFAULT 0,
    success_rate_score DECIMAL(5,2) DEFAULT 0,
    stability_score DECIMAL(5,2) DEFAULT 0,
    cost_efficiency_score DECIMAL(5,2) DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, country)
);
CREATE INDEX IF NOT EXISTS idx_provider_score_provider ON proxy_provider_scores(provider);
CREATE INDEX IF NOT EXISTS idx_provider_score_country ON proxy_provider_scores(country);

-- 17. proxy_provider_score_history - 提供商评分历史
CREATE TABLE IF NOT EXISTS proxy_provider_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    country VARCHAR(10),
    overall_score DECIMAL(5,2),
    latency_score DECIMAL(5,2),
    success_rate_score DECIMAL(5,2),
    stability_score DECIMAL(5,2),
    cost_efficiency_score DECIMAL(5,2),
    sample_size INTEGER,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_score_hist_provider ON proxy_provider_score_history(provider, recorded_at);
CREATE INDEX IF NOT EXISTS idx_score_hist_recorded ON proxy_provider_score_history(recorded_at);

-- 18. proxy_quality_scores - 代理质量评分
CREATE TABLE IF NOT EXISTS proxy_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    country VARCHAR(10),
    city VARCHAR(100),
    overall_score DECIMAL(5,2) DEFAULT 0,
    latency_score DECIMAL(5,2) DEFAULT 0,
    success_rate_score DECIMAL(5,2) DEFAULT 0,
    stability_score DECIMAL(5,2) DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    p95_latency INTEGER DEFAULT 0,
    p99_latency INTEGER DEFAULT 0,
    last_check_at TIMESTAMP,
    is_healthy BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proxy_id)
);
CREATE INDEX IF NOT EXISTS idx_quality_score_provider ON proxy_quality_scores(provider);
CREATE INDEX IF NOT EXISTS idx_quality_score_country ON proxy_quality_scores(country);
CREATE INDEX IF NOT EXISTS idx_quality_score_healthy ON proxy_quality_scores(is_healthy);

-- 19. proxy_quality_history - 代理质量历史
CREATE TABLE IF NOT EXISTS proxy_quality_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    overall_score DECIMAL(5,2),
    latency_score DECIMAL(5,2),
    success_rate_score DECIMAL(5,2),
    stability_score DECIMAL(5,2),
    avg_latency INTEGER,
    success_rate DECIMAL(5,2),
    sample_size INTEGER,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quality_hist_proxy ON proxy_quality_history(proxy_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_quality_hist_recorded ON proxy_quality_history(recorded_at);

-- 20. proxy_recommendations - 代理推荐
CREATE TABLE IF NOT EXISTS proxy_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    target_domain VARCHAR(200),
    target_country VARCHAR(10),
    recommended_proxy_id VARCHAR(100) NOT NULL,
    recommended_provider VARCHAR(50) NOT NULL,
    recommended_country VARCHAR(10),
    recommendation_score DECIMAL(5,2),
    recommendation_reason TEXT,
    is_accepted BOOLEAN,
    accepted_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recommend_user ON proxy_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommend_device ON proxy_recommendations(device_id);
CREATE INDEX IF NOT EXISTS idx_recommend_domain ON proxy_recommendations(target_domain);

-- 21. proxy_sensitive_audit_logs - 敏感操作审计日志
CREATE TABLE IF NOT EXISTS proxy_sensitive_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50),
    username VARCHAR(100),
    user_role VARCHAR(50),
    sensitive_action VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    access_purpose VARCHAR(200),
    action_description TEXT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    resource_name VARCHAR(200),
    encrypted_data TEXT,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    data_hash VARCHAR(64) NOT NULL,
    changes_summary JSONB,
    authorization_method VARCHAR(50) NOT NULL,
    required_approval BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approval_note TEXT,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    accessed_at TIMESTAMP,
    ip_address VARCHAR(50) NOT NULL,
    user_agent VARCHAR(500),
    request_id VARCHAR(50),
    is_successful BOOLEAN NOT NULL,
    failure_reason TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_reasons TEXT,
    security_alert_triggered BOOLEAN DEFAULT false,
    compliance_tags TEXT,
    retention_until TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensitive_user_created ON proxy_sensitive_audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sensitive_action_created ON proxy_sensitive_audit_logs(sensitive_action, created_at);
CREATE INDEX IF NOT EXISTS idx_sensitive_created ON proxy_sensitive_audit_logs(created_at);

-- 22. proxy_session_renewals - 会话续期记录
CREATE TABLE IF NOT EXISTS proxy_session_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id VARCHAR(100),
    device_id VARCHAR(100),
    old_expiry TIMESTAMP,
    new_expiry TIMESTAMP,
    renewal_reason VARCHAR(100),
    is_auto_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_renewal_session ON proxy_session_renewals(session_id);
CREATE INDEX IF NOT EXISTS idx_renewal_device ON proxy_session_renewals(device_id);

-- 23. proxy_target_mappings - 目标网站代理映射
CREATE TABLE IF NOT EXISTS proxy_target_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_domain VARCHAR(200) NOT NULL,
    target_country VARCHAR(10),
    target_city VARCHAR(100),
    target_category VARCHAR(50),
    proxy_id VARCHAR(50) NOT NULL,
    proxy_provider VARCHAR(50) NOT NULL,
    proxy_country VARCHAR(10) NOT NULL,
    proxy_city VARCHAR(100),
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_success_rate DECIMAL(5,2) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    min_latency INTEGER DEFAULT 0,
    max_latency INTEGER DEFAULT 0,
    total_data_transferred BIGINT DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    avg_cost_per_request DECIMAL(10,6) DEFAULT 0,
    total_usage_duration INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    error_types JSONB,
    recommendation_weight DECIMAL(5,2) DEFAULT 1.0,
    is_recommended BOOLEAN DEFAULT true,
    blacklist_reason TEXT,
    blacklist_until TIMESTAMP,
    geo_match_score DECIMAL(5,2),
    isp_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_target_mapping_domain_country ON proxy_target_mappings(target_domain, target_country);
CREATE INDEX IF NOT EXISTS idx_target_mapping_proxy ON proxy_target_mappings(proxy_id);
CREATE INDEX IF NOT EXISTS idx_target_mapping_success_rate ON proxy_target_mappings(avg_success_rate);
CREATE INDEX IF NOT EXISTS idx_target_mapping_domain ON proxy_target_mappings(target_domain);

-- 24. proxy_usage_summaries - 使用量汇总
CREATE TABLE IF NOT EXISTS proxy_usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    provider VARCHAR(50),
    summary_type VARCHAR(20) NOT NULL,
    summary_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_bandwidth_bytes BIGINT DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    unique_targets INTEGER DEFAULT 0,
    peak_hour INTEGER,
    peak_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id, provider, summary_type, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_usage_summary_user ON proxy_usage_summaries(user_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_usage_summary_device ON proxy_usage_summaries(device_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_usage_summary_date ON proxy_usage_summaries(summary_date);

-- 完成
SELECT 'proxy-service 缺失表创建完成!' as status;
