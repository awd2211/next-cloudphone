-- =========================================
-- 通知偏好表迁移文件
-- =========================================
-- 创建时间: 2025-10-29
-- 描述: 创建用户通知偏好表，支持用户自定义通知设置
-- =========================================

-- 0. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 创建通知渠道类型
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM (
            'websocket',  -- 网页实时通知（站内信）
            'email',      -- 邮件通知
            'sms'         -- 短信通知
        );
        RAISE NOTICE '✓ 创建枚举类型 notification_channel';
    ELSE
        RAISE NOTICE '⊙ 枚举类型 notification_channel 已存在';
    END IF;
END
$$;

-- 2. 创建通知类型枚举
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            -- 设备相关
            'device.created',
            'device.creation_failed',
            'device.started',
            'device.stopped',
            'device.error',
            'device.connection_lost',
            'device.deleted',
            'device.expiring_soon',
            'device.expired',

            -- 应用相关
            'app.installed',
            'app.uninstalled',
            'app.install_failed',
            'app.approved',
            'app.rejected',

            -- 计费相关
            'billing.low_balance',
            'billing.payment_success',
            'billing.payment_failed',
            'billing.invoice_generated',
            'billing.subscription_expiring',
            'billing.subscription_expired',

            -- 用户相关
            'user.registered',
            'user.login',
            'user.password_changed',
            'user.profile_updated',

            -- 系统相关
            'system.maintenance',
            'system.announcement',
            'system.update',
            'system.security_alert'
        );
        RAISE NOTICE '✓ 创建枚举类型 notification_type';
    ELSE
        RAISE NOTICE '⊙ 枚举类型 notification_type 已存在';
    END IF;
END
$$;

-- 3. 创建通知偏好表
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    enabled_channels TEXT[] DEFAULT '{}',  -- 使用 TEXT[] 存储渠道数组
    custom_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_type
  ON notification_preferences(notification_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_type
  ON notification_preferences(user_id, notification_type);

-- 5. 添加注释
COMMENT ON TABLE notification_preferences IS '用户通知偏好设置表';
COMMENT ON COLUMN notification_preferences.id IS '主键';
COMMENT ON COLUMN notification_preferences.user_id IS '用户ID（来自 user-service）';
COMMENT ON COLUMN notification_preferences.notification_type IS '通知类型';
COMMENT ON COLUMN notification_preferences.enabled IS '是否启用该类型通知';
COMMENT ON COLUMN notification_preferences.enabled_channels IS '启用的通知渠道: websocket, email, sms';
COMMENT ON COLUMN notification_preferences.custom_settings IS '自定义设置（如静默时间段、频率限制等）';
COMMENT ON COLUMN notification_preferences.created_at IS '创建时间';
COMMENT ON COLUMN notification_preferences.updated_at IS '更新时间';

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at
  ON notification_preferences;

CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =========================================
-- 迁移完成
-- =========================================
DO $$
BEGIN
    RAISE NOTICE '✓ 通知偏好表创建完成';
    RAISE NOTICE '  - 表: notification_preferences';
    RAISE NOTICE '  - 索引: 3 个';
    RAISE NOTICE '  - 触发器: updated_at 自动更新';
END
$$;
