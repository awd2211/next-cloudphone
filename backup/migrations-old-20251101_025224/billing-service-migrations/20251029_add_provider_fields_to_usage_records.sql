-- Migration: Add provider fields to usage_records
-- Date: 2025-10-29
-- Description: 添加设备提供商相关字段以支持差异化计费

-- 1. 添加 provider_type 字段（设备提供商类型）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20);

-- 2. 添加 device_type 字段（设备类型：phone/tablet）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(10);

-- 3. 添加 device_config 字段（设备配置快照，用于计费）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS device_config JSONB;

-- 4. 添加 billing_rate 字段（实际计费费率，每小时）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10, 4) DEFAULT 0;

-- 5. 添加 pricing_tier 字段（定价层级：basic/standard/premium）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(20);

-- 6. 添加 device_name 字段（设备名称，用于报表展示）
ALTER TABLE usage_records
  ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);

-- 7. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_usage_records_provider_type
  ON usage_records(provider_type);

CREATE INDEX IF NOT EXISTS idx_usage_records_device_type
  ON usage_records(device_type);

CREATE INDEX IF NOT EXISTS idx_usage_records_pricing_tier
  ON usage_records(pricing_tier);

-- 8. 创建复合索引用于常见查询场景
CREATE INDEX IF NOT EXISTS idx_usage_records_user_provider
  ON usage_records("userId", provider_type, "startTime" DESC);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_provider
  ON usage_records("tenantId", provider_type, "startTime" DESC);

-- 9. 添加注释
COMMENT ON COLUMN usage_records.provider_type IS '设备提供商类型: redroid, physical, huawei_cph, aliyun_ecp';
COMMENT ON COLUMN usage_records.device_type IS '设备类型: phone, tablet';
COMMENT ON COLUMN usage_records.device_config IS '设备配置快照（JSONB）: {cpuCores, memoryMB, storageGB, gpuEnabled, model, androidVersion}';
COMMENT ON COLUMN usage_records.billing_rate IS '计费费率（元/小时）';
COMMENT ON COLUMN usage_records.pricing_tier IS '定价层级: basic, standard, premium';
COMMENT ON COLUMN usage_records.device_name IS '设备名称（用户友好）';

-- 10. 为现有数据设置默认值（可选，如果表中已有数据）
-- UPDATE usage_records
--   SET provider_type = 'redroid',
--       device_type = 'phone',
--       billing_rate = 1.0,
--       pricing_tier = 'basic'
--   WHERE provider_type IS NULL;
