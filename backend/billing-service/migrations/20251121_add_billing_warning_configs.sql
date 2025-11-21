-- 创建计费预警配置表
-- 用于存储用户的预算和告警设置

CREATE TABLE IF NOT EXISTS billing_warning_configs (
    user_id UUID PRIMARY KEY,
    daily_budget DECIMAL(10, 2) DEFAULT 100,
    monthly_budget DECIMAL(10, 2) DEFAULT 3000,
    low_balance_threshold DECIMAL(10, 2) DEFAULT 50,
    critical_balance_threshold DECIMAL(10, 2) DEFAULT 20,
    enable_email_notification BOOLEAN DEFAULT true,
    enable_sms_notification BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE billing_warning_configs IS '用户计费预警配置表';
COMMENT ON COLUMN billing_warning_configs.user_id IS '用户ID (主键)';
COMMENT ON COLUMN billing_warning_configs.daily_budget IS '每日预算 (CNY)';
COMMENT ON COLUMN billing_warning_configs.monthly_budget IS '每月预算 (CNY)';
COMMENT ON COLUMN billing_warning_configs.low_balance_threshold IS '低余额告警阈值 (CNY)';
COMMENT ON COLUMN billing_warning_configs.critical_balance_threshold IS '严重低余额告警阈值 (CNY)';
COMMENT ON COLUMN billing_warning_configs.enable_email_notification IS '是否启用邮件通知';
COMMENT ON COLUMN billing_warning_configs.enable_sms_notification IS '是否启用短信通知';

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_billing_warning_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_billing_warning_configs_updated_at ON billing_warning_configs;
CREATE TRIGGER trigger_update_billing_warning_configs_updated_at
    BEFORE UPDATE ON billing_warning_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_warning_configs_updated_at();
