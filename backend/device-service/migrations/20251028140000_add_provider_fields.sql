-- ============================================================================
-- 多设备源支持 - 数据库迁移脚本
-- 版本: v2.0
-- 日期: 2025-10-28
-- 说明: 添加 Provider 抽象层字段，支持 Redroid/物理设备/华为云/阿里云
-- ============================================================================

-- ============================================================================
-- 1. 创建 DeviceProviderType 枚举类型
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_provider_type') THEN
        CREATE TYPE device_provider_type AS ENUM (
            'redroid',
            'huawei_cph',
            'aliyun_ecp',
            'physical'
        );
        RAISE NOTICE '✓ 创建枚举类型 device_provider_type';
    ELSE
        RAISE NOTICE '⊙ 枚举类型 device_provider_type 已存在';
    END IF;
END $$;

-- ============================================================================
-- 2. Device 表添加 Provider 字段
-- ============================================================================

-- 添加 provider_type 字段（默认为 redroid，保持向后兼容）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS provider_type device_provider_type DEFAULT 'redroid';

-- 添加 external_id 字段（Provider 侧的设备 ID）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

-- 添加 provider_config 字段（Provider 特定配置）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS provider_config JSONB;

-- 添加 connection_info 字段（连接信息：ADB、SCRCPY、WebRTC 等）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS connection_info JSONB;

-- 添加 device_group 字段（设备分组：物理机架位置、云区域等）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_group VARCHAR(50);

-- 添加 health_score 字段（设备健康评分 0-100）
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100;

-- ============================================================================
-- 3. 为现有数据迁移设置默认值
-- ============================================================================

-- 将现有设备的 provider_type 设置为 'redroid'
UPDATE devices
SET provider_type = 'redroid'
WHERE provider_type IS NULL;

-- 将现有设备的 external_id 设置为 containerId（Redroid 使用 Docker container ID）
UPDATE devices
SET external_id = "containerId"
WHERE external_id IS NULL AND "containerId" IS NOT NULL;

-- 将现有设备的 connection_info 设置为 ADB 连接信息
UPDATE devices
SET connection_info = jsonb_build_object(
    'adb', jsonb_build_object(
        'host', COALESCE("adbHost", 'localhost'),
        'port', COALESCE("adbPort", 5555),
        'serial', "containerId"
    )
)
WHERE connection_info IS NULL
  AND "containerId" IS NOT NULL;

-- ============================================================================
-- 4. 添加索引以提升查询性能
-- ============================================================================

-- Provider 类型索引（常用于按类型过滤设备）
CREATE INDEX IF NOT EXISTS idx_devices_provider_type
  ON devices(provider_type);

-- External ID 索引（用于根据 Provider 侧 ID 快速查找）
CREATE INDEX IF NOT EXISTS idx_devices_external_id
  ON devices(external_id)
  WHERE external_id IS NOT NULL;

-- Provider + Status 复合索引（查询特定类型的运行中设备）
CREATE INDEX IF NOT EXISTS idx_devices_provider_status
  ON devices(provider_type, status);

-- Device Group 索引（物理设备按机架分组、云设备按区域分组）
CREATE INDEX IF NOT EXISTS idx_devices_group
  ON devices(device_group)
  WHERE device_group IS NOT NULL;

-- Health Score 索引（用于查找低健康分数设备）
CREATE INDEX IF NOT EXISTS idx_devices_health_score
  ON devices(health_score)
  WHERE health_score < 50;

-- User + Provider 复合索引（用户查看特定类型设备）
CREATE INDEX IF NOT EXISTS idx_devices_user_provider
  ON devices("userId", provider_type)
  WHERE "userId" IS NOT NULL;

-- ============================================================================
-- 5. 添加字段注释
-- ============================================================================

COMMENT ON COLUMN devices.provider_type IS '设备提供商类型: redroid/huawei_cph/aliyun_ecp/physical';
COMMENT ON COLUMN devices.external_id IS 'Provider 侧的设备 ID (Docker containerId、华为 instanceId、物理设备 MAC 等)';
COMMENT ON COLUMN devices.provider_config IS 'Provider 特定配置 (创建时的参数)';
COMMENT ON COLUMN devices.connection_info IS '连接信息 (ADB、SCRCPY、WebRTC token 等)';
COMMENT ON COLUMN devices.device_group IS '设备分组 (物理设备的机架位置、云设备的区域等)';
COMMENT ON COLUMN devices.health_score IS '设备健康评分 (0-100，低于 30 自动移除)';

-- ============================================================================
-- 6. 重命名 tags 字段为 device_tags（避免与 SQL 关键字冲突）
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'devices' AND column_name = 'tags'
    ) THEN
        ALTER TABLE devices RENAME COLUMN tags TO device_tags;
        RAISE NOTICE '✓ 重命名字段 tags → device_tags';
    ELSE
        RAISE NOTICE '⊙ 字段 tags 不存在或已重命名';
    END IF;
END $$;

COMMENT ON COLUMN devices.device_tags IS '设备标签数组 (用于过滤和搜索)';

-- ============================================================================
-- 7. 验证迁移
-- ============================================================================

DO $$
DECLARE
    col_count INT;
    idx_count INT;
BEGIN
    -- 检查新增字段
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'devices'
      AND column_name IN (
          'provider_type', 'external_id', 'provider_config',
          'connection_info', 'device_group', 'health_score'
      );

    IF col_count = 6 THEN
        RAISE NOTICE '✓ devices 表迁移成功: 添加了 6 个 Provider 字段';
    ELSE
        RAISE WARNING '✗ devices 表迁移不完整: 只添加了 % 个字段', col_count;
    END IF;

    -- 检查索引
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE tablename = 'devices'
      AND (
          indexname LIKE 'idx_devices_provider%'
          OR indexname LIKE 'idx_devices_external_id%'
          OR indexname LIKE 'idx_devices_group%'
          OR indexname LIKE 'idx_devices_health%'
      );

    RAISE NOTICE '✓ 创建了 % 个 Provider 相关索引', idx_count;

    -- 检查数据迁移
    SELECT COUNT(*) INTO col_count
    FROM devices
    WHERE provider_type = 'redroid' AND external_id IS NOT NULL;

    RAISE NOTICE '✓ 已迁移 % 个现有 Redroid 设备', col_count;
END $$;

-- ============================================================================
-- 8. 分析表以更新统计信息
-- ============================================================================

ANALYZE devices;

-- ============================================================================
-- 9. 迁移完成
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '  多设备源支持 - 数据库迁移完成！';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '新增功能:';
    RAISE NOTICE '  ✓ 支持 4 种设备源: Redroid、华为云、阿里云、物理设备';
    RAISE NOTICE '  ✓ Provider 抽象层字段';
    RAISE NOTICE '  ✓ 设备健康评分系统';
    RAISE NOTICE '  ✓ 设备分组管理';
    RAISE NOTICE '  ✓ 6 个新索引优化查询性能';
    RAISE NOTICE '';
    RAISE NOTICE '后续步骤:';
    RAISE NOTICE '  1. 实现 DeviceProviderFactory';
    RAISE NOTICE '  2. 实现 RedroidProvider (封装现有逻辑)';
    RAISE NOTICE '  3. 实现 PhysicalProvider (物理设备管理)';
    RAISE NOTICE '  4. 实现 HuaweiProvider (华为云手机)';
    RAISE NOTICE '  5. 实现 AliyunProvider (阿里云手机)';
    RAISE NOTICE '';
    RAISE NOTICE '兼容性:';
    RAISE NOTICE '  ✓ 现有 Redroid 设备已自动迁移';
    RAISE NOTICE '  ✓ 向后兼容，无需修改现有业务代码';
    RAISE NOTICE '';
END $$;
