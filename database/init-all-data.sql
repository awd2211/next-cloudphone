-- ============================================
-- 初始化所有微服务的基础数据
-- ============================================

-- ============================================
-- 1. 初始化 Plans 套餐数据 (cloudphone_billing)
-- ============================================

\c cloudphone_billing

-- 删除已有数据（如果需要重新初始化）
-- TRUNCATE TABLE plans CASCADE;

INSERT INTO plans (id, code, name, description, type, "billingCycle", price, currency, "originalPrice", "maxDevices", "maxCpuCores", "maxMemoryMB", "maxStorageGB", "maxApiCallsPerDay", features, "trialDays", "hasFreeTrial", status, "isPublic", "isRecommended", "sortOrder", badge, color)
VALUES 
  (uuid_generate_v4(), 'free', '免费版', '适合个人开发者和小型项目体验云手机功能', 'prepaid', 'monthly', 0, 'CNY', NULL, 1, 2, 2048, 10, 1000, '["basic_support", "standard_performance"]'::json, 0, false, 'active', true, false, 1, '免费', '#52c41a'),
  (uuid_generate_v4(), 'basic', '基础版', '适合小型团队和轻量级应用', 'subscription', 'monthly', 99, 'CNY', 129, 5, 4, 4096, 50, 10000, '["email_support", "standard_performance", "basic_analytics", "snapshot_backup"]'::json, 7, true, 'active', true, false, 2, NULL, '#1890ff'),
  (uuid_generate_v4(), 'pro', '专业版', '适合中型团队和高性能需求', 'subscription', 'monthly', 299, 'CNY', 399, 20, 8, 8192, 200, 100000, '["priority_support", "high_performance", "advanced_analytics", "snapshot_backup", "gpu_support", "custom_template", "api_access"]'::json, 14, true, 'active', true, true, 3, '推荐', '#722ed1'),
  (uuid_generate_v4(), 'enterprise', '企业版', '适合大型企业和定制化需求', 'subscription', 'monthly', 999, 'CNY', 1299, 100, 32, 32768, 1000, NULL, '["dedicated_support", "ultra_performance", "advanced_analytics", "snapshot_backup", "gpu_support", "custom_template", "api_access", "private_deployment", "sla_guarantee", "custom_integration", "white_label"]'::json, 30, true, 'active', true, false, 4, '企业', '#fa541c'),
  (uuid_generate_v4(), 'payg', '按量付费', '根据实际使用量计费，灵活便捷', 'postpaid', 'hourly', 0.5, 'CNY', NULL, 50, 16, 16384, 500, 50000, '["email_support", "standard_performance", "basic_analytics", "snapshot_backup", "pay_as_you_go"]'::json, 0, false, 'active', true, false, 5, '灵活', '#13c2c2')
ON CONFLICT (code) DO NOTHING;

SELECT '✅ Plans 数据已初始化，共 ' || COUNT(*) || ' 个套餐' FROM plans;

-- ============================================
-- 2. 初始化 Settings 系统设置 (cloudphone_user)
-- ============================================

\c cloudphone_user

-- 创建 settings 表（如果不存在）
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    "isEncrypted" BOOLEAN DEFAULT false,
    "isPublic" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings (category, key);

-- 插入默认设置
INSERT INTO settings (category, key, value, "isPublic") VALUES
  ('basic', 'siteName', '"云手机平台"', true),
  ('basic', 'siteUrl', '"http://localhost:5173"', true),
  ('basic', 'contactEmail', '"support@cloudphone.run"', true),
  ('email', 'smtpHost', '"smtp.example.com"', false),
  ('email', 'smtpPort', '"587"', false),
  ('email', 'smtpFrom', '"noreply@cloudphone.run"', true),
  ('sms', 'provider', '"aliyun"', false),
  ('sms', 'signName', '"云手机平台"', false),
  ('payment', 'enableAlipay', '"true"', false),
  ('payment', 'enableWechat', '"true"', false),
  ('storage', 'provider', '"minio"', false),
  ('storage', 'bucket', '"cloudphone"', false)
ON CONFLICT DO NOTHING;

SELECT '✅ Settings 数据已初始化，共 ' || COUNT(*) || ' 项配置' FROM settings;

-- ============================================
-- 完成
-- ============================================

\c postgres
SELECT '🎉 所有数据初始化完成！';


