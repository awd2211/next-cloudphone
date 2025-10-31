-- ============================================
-- 配额表改进：添加 planId 和其他必要字段
-- 将 Quota 从简单配额变为"用户配额实例"
-- 关联到 Plans 表（配额模板）
-- ============================================

-- 使用 cloudphone_user 数据库
\c cloudphone_user

-- 1. 添加新字段
ALTER TABLE quotas
ADD COLUMN IF NOT EXISTS "planId" UUID,                                    -- 关联的套餐模板 ID
ADD COLUMN IF NOT EXISTS "planName" VARCHAR(255),                          -- 套餐名称（冗余但方便查询）
ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP DEFAULT now(),              -- 生效时间
ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP,                           -- 过期时间
ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN DEFAULT false,                -- 是否自动续费
ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'active',            -- 状态
ADD COLUMN IF NOT EXISTS "lastWarningAt" TIMESTAMP,                        -- 最后一次配额告警时间
ADD COLUMN IF NOT EXISTS "alertThreshold" INTEGER DEFAULT 80;              -- 告警阈值 (%)

-- 2. 添加状态约束
ALTER TABLE quotas
ADD CONSTRAINT IF NOT EXISTS "check_quota_status"
CHECK (status IN ('active', 'exceeded', 'suspended', 'expired'));

-- 3. 扩展配额字段（对齐 Plans 表）
ALTER TABLE quotas
ADD COLUMN IF NOT EXISTS "maxConcurrentDevices" INTEGER DEFAULT 1,        -- 最大并发设备数
ADD COLUMN IF NOT EXISTS "currentConcurrentDevices" INTEGER DEFAULT 0,    -- 当前并发设备数
ADD COLUMN IF NOT EXISTS "maxTrafficGB" INTEGER DEFAULT 10,               -- 每月流量配额 (GB)
ADD COLUMN IF NOT EXISTS "currentTrafficGB" INTEGER DEFAULT 0,            -- 本月已用流量 (GB)
ADD COLUMN IF NOT EXISTS "maxBandwidthMbps" INTEGER DEFAULT 10,           -- 最大带宽 (Mbps)
ADD COLUMN IF NOT EXISTS "maxUsageHoursPerMonth" INTEGER DEFAULT 720,     -- 每月使用时长配额 (小时)
ADD COLUMN IF NOT EXISTS "currentUsageHours" INTEGER DEFAULT 0;           -- 本月已用时长 (小时)

-- 4. 添加元数据字段
ALTER TABLE quotas
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;            -- 额外元数据

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS "idx_quotas_planId" ON quotas("planId");
CREATE INDEX IF NOT EXISTS "idx_quotas_status" ON quotas(status);
CREATE INDEX IF NOT EXISTS "idx_quotas_validUntil" ON quotas("validUntil");

-- 6. 创建复合索引（常用查询优化）
CREATE INDEX IF NOT EXISTS "idx_quotas_userId_status"
ON quotas("userId", status);

-- 7. 添加注释
COMMENT ON COLUMN quotas."planId" IS '关联的套餐模板 ID (Plans 表)';
COMMENT ON COLUMN quotas."planName" IS '套餐名称（冗余字段，方便查询）';
COMMENT ON COLUMN quotas."validFrom" IS '配额生效时间';
COMMENT ON COLUMN quotas."validUntil" IS '配额过期时间';
COMMENT ON COLUMN quotas."autoRenew" IS '是否自动续费';
COMMENT ON COLUMN quotas.status IS '配额状态: active-正常, exceeded-已超限, suspended-已暂停, expired-已过期';
COMMENT ON COLUMN quotas."lastWarningAt" IS '最后一次配额告警时间（用于控制告警频率）';
COMMENT ON COLUMN quotas."alertThreshold" IS '配额告警阈值（百分比，默认 80%）';
COMMENT ON COLUMN quotas."maxConcurrentDevices" IS '最大并发运行设备数';
COMMENT ON COLUMN quotas."currentConcurrentDevices" IS '当前并发运行设备数';
COMMENT ON COLUMN quotas."maxTrafficGB" IS '每月流量配额 (GB)';
COMMENT ON COLUMN quotas."currentTrafficGB" IS '本月已使用流量 (GB)';
COMMENT ON COLUMN quotas."maxBandwidthMbps" IS '最大带宽限制 (Mbps)';
COMMENT ON COLUMN quotas."maxUsageHoursPerMonth" IS '每月使用时长配额 (小时)';
COMMENT ON COLUMN quotas."currentUsageHours" IS '本月已使用时长 (小时)';
COMMENT ON COLUMN quotas.metadata IS '额外元数据（JSON 格式）';

-- 8. 为现有记录设置默认值
UPDATE quotas
SET
  "planName" = '免费版（历史数据）',
  "validFrom" = "createdAt",
  "validUntil" = "createdAt" + INTERVAL '1 year',  -- 默认1年有效期
  status = 'active'
WHERE "planId" IS NULL;

-- 9. 输出统计信息
SELECT
  '配额表改进完成' AS message,
  COUNT(*) AS total_quotas,
  COUNT(CASE WHEN "planId" IS NULL THEN 1 END) AS quotas_without_plan,
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_quotas
FROM quotas;

-- 10. 查看更新后的表结构
\d quotas
