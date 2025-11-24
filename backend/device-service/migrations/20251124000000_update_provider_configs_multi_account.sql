-- 迁移：支持多账号配置
-- 日期：2025-11-24
-- 说明：移除 providerType 的 unique 约束，添加多账号支持字段

-- 1. 添加新字段
ALTER TABLE provider_configs
  ADD COLUMN IF NOT EXISTS name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(200),
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS test_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS test_message TEXT;

-- 2. 为现有记录设置默认名称（使用 TypeORM 的驼峰命名）
UPDATE provider_configs
SET name = CASE "providerType"
  WHEN 'redroid' THEN 'Redroid 默认配置'
  WHEN 'physical' THEN '物理设备默认配置'
  WHEN 'huawei_cph' THEN '华为云默认配置'
  WHEN 'aliyun_ecp' THEN '阿里云默认配置'
  ELSE "providerType" || ' 默认配置'
END
WHERE name IS NULL;

-- 3. 设置现有记录为默认配置（使用 TypeORM 的驼峰命名）
UPDATE provider_configs SET "isDefault" = true WHERE "isDefault" = false OR "isDefault" IS NULL;

-- 4. 移除 providerType 的 unique 约束（使用 TypeORM 的驼峰命名）
-- 注意：需要先找到约束名称
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'provider_configs'
      AND con.contype = 'u'
      AND EXISTS (
          SELECT 1 FROM unnest(con.conkey) AS key
          JOIN pg_attribute att ON att.attnum = key AND att.attrelid = con.conrelid
          WHERE att.attname = 'providerType'
      );

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE provider_configs DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint found on providerType column';
    END IF;
END $$;

-- 5. 设置 name 字段为 NOT NULL
ALTER TABLE provider_configs ALTER COLUMN name SET NOT NULL;

-- 6. 创建索引（使用 TypeORM 的驼峰命名）
CREATE INDEX IF NOT EXISTS idx_provider_configs_name ON provider_configs(name);
CREATE INDEX IF NOT EXISTS idx_provider_configs_tenant_id ON provider_configs("tenantId");
CREATE INDEX IF NOT EXISTS idx_provider_configs_provider_tenant ON provider_configs("providerType", "tenantId");

COMMENT ON COLUMN provider_configs.name IS '配置名称';
COMMENT ON COLUMN provider_configs.tenant_id IS '租户ID';
COMMENT ON COLUMN provider_configs.is_default IS '是否为该类型的默认配置';
COMMENT ON COLUMN provider_configs.last_tested_at IS '最后测试时间';
COMMENT ON COLUMN provider_configs.test_status IS '测试状态：success, failed, unknown';
COMMENT ON COLUMN provider_configs.test_message IS '测试结果消息';
