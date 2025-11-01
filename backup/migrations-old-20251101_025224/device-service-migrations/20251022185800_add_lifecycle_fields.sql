-- ============================================================================
-- Device Service 生态增强 - 数据库迁移脚本
-- 版本: v1.0
-- 说明: 添加生命周期自动化、故障转移、状态恢复相关字段
-- ============================================================================

-- ============================================================================
-- 1. Device 表增强
-- ============================================================================

-- 添加到期时间字段
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- 添加自动备份配置字段
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS auto_backup_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS backup_interval_hours INT;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS last_backup_at TIMESTAMP;

-- 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_devices_expires_at
  ON devices(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devices_auto_backup
  ON devices(auto_backup_enabled)
  WHERE auto_backup_enabled = TRUE;

-- 添加注释
COMMENT ON COLUMN devices.expires_at IS '设备到期时间（用于临时设备或有时限的设备）';
COMMENT ON COLUMN devices.auto_backup_enabled IS '是否启用自动备份';
COMMENT ON COLUMN devices.backup_interval_hours IS '自动备份间隔（小时）';
COMMENT ON COLUMN devices.last_backup_at IS '最后备份时间';

-- ============================================================================
-- 2. DeviceSnapshot 表增强
-- ============================================================================

-- 添加保留策略字段
ALTER TABLE device_snapshots
  ADD COLUMN IF NOT EXISTS retention_days INT;

-- 添加到期时间字段
ALTER TABLE device_snapshots
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- 添加是否为自动备份标记
ALTER TABLE device_snapshots
  ADD COLUMN IF NOT EXISTS is_auto_backup BOOLEAN DEFAULT FALSE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_device_snapshots_expires_at
  ON device_snapshots(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_snapshots_auto_backup
  ON device_snapshots(is_auto_backup)
  WHERE is_auto_backup = TRUE;

CREATE INDEX IF NOT EXISTS idx_device_snapshots_device_id_created_at
  ON device_snapshots("deviceId", "createdAt" DESC);

-- 添加注释
COMMENT ON COLUMN device_snapshots.retention_days IS '快照保留天数（NULL表示永久保留）';
COMMENT ON COLUMN device_snapshots.expires_at IS '快照到期时间';
COMMENT ON COLUMN device_snapshots.is_auto_backup IS '是否为自动备份';

-- ============================================================================
-- 3. 验证迁移
-- ============================================================================

-- 检查 devices 表新增字段
DO $$
DECLARE
    col_count INT;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'devices'
      AND column_name IN ('expires_at', 'auto_backup_enabled', 'backup_interval_hours', 'last_backup_at');

    IF col_count = 4 THEN
        RAISE NOTICE '✓ devices 表迁移成功: 添加了 4 个新字段';
    ELSE
        RAISE WARNING '✗ devices 表迁移不完整: 只添加了 % 个字段', col_count;
    END IF;
END $$;

-- 检查 device_snapshots 表新增字段
DO $$
DECLARE
    col_count INT;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'device_snapshots'
      AND column_name IN ('retention_days', 'expires_at', 'is_auto_backup');

    IF col_count = 3 THEN
        RAISE NOTICE '✓ device_snapshots 表迁移成功: 添加了 3 个新字段';
    ELSE
        RAISE WARNING '✗ device_snapshots 表迁移不完整: 只添加了 % 个字段', col_count;
    END IF;
END $$;

-- 检查索引
DO $$
DECLARE
    idx_count INT;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE tablename IN ('devices', 'device_snapshots')
      AND indexname LIKE 'idx_device%backup%'
      OR indexname LIKE 'idx_device%expires_at%';

    RAISE NOTICE '✓ 创建了 % 个新索引', idx_count;
END $$;

-- ============================================================================
-- 4. 数据初始化（可选）
-- ============================================================================

-- 示例: 为所有现有设备启用自动备份（24小时间隔）
-- 取消注释以下行来执行
-- UPDATE devices
-- SET auto_backup_enabled = TRUE,
--     backup_interval_hours = 24
-- WHERE status IN ('running', 'allocated');

-- 示例: 为现有的手动快照设置30天保留期
-- 取消注释以下行来执行
-- UPDATE device_snapshots
-- SET retention_days = 30,
--     expires_at = created_at + INTERVAL '30 days'
-- WHERE is_auto_backup = FALSE
--   AND retention_days IS NULL;

-- ============================================================================
-- 5. 迁移完成
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '  数据库迁移完成！';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '新增功能:';
    RAISE NOTICE '  ✓ 设备到期管理';
    RAISE NOTICE '  ✓ 自动备份调度';
    RAISE NOTICE '  ✓ 快照保留策略';
    RAISE NOTICE '';
    RAISE NOTICE '后续步骤:';
    RAISE NOTICE '  1. 重启 Device Service';
    RAISE NOTICE '  2. 验证新功能: ./scripts/test-device-service-features.sh';
    RAISE NOTICE '  3. 配置环境变量（参考 .env.example）';
    RAISE NOTICE '';
END $$;
