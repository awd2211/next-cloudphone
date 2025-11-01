-- 添加双因素认证字段到users表
-- Migration: 20251031_add_2fa_fields
-- Description: 为users表添加两个字段以支持双因素认证(2FA/TOTP)

-- 添加twoFactorSecret字段 - 存储TOTP密钥
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) NULL;

-- 添加twoFactorEnabled字段 - 是否启用2FA
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 添加注释
COMMENT ON COLUMN users.two_factor_secret IS '双因素认证密钥(TOTP secret)';
COMMENT ON COLUMN users.two_factor_enabled IS '是否启用双因素认证';

-- 创建索引以优化查询启用2FA的用户
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = TRUE;
