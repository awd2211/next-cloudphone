-- =====================================================
-- 社交账号绑定表迁移
-- 创建时间: 2025-11-05
-- 说明: 支持 Google、Facebook、Twitter 等社交登录
-- =====================================================

-- 创建 social_accounts 表
CREATE TABLE IF NOT EXISTS social_accounts (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 社交平台信息
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,

    -- 用户信息
    email VARCHAR(255),
    display_name VARCHAR(255),
    avatar TEXT,

    -- Token 信息（加密存储）
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,

    -- 原始资料
    raw_profile JSONB,

    -- 登录统计
    last_login_at TIMESTAMP,

    -- 关联用户
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 时间戳
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建唯一索引：同一平台的同一账号只能绑定一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_provider_id
ON social_accounts(provider, provider_id);

-- 创建索引：根据用户查找社交账号
CREATE INDEX IF NOT EXISTS idx_social_user_id
ON social_accounts(user_id);

-- 创建索引：根据邮箱查找
CREATE INDEX IF NOT EXISTS idx_social_email
ON social_accounts(email) WHERE email IS NOT NULL;

-- 创建索引：根据平台查找
CREATE INDEX IF NOT EXISTS idx_social_provider
ON social_accounts(provider);

-- 添加表注释
COMMENT ON TABLE social_accounts IS '社交账号绑定表';

-- 添加列注释
COMMENT ON COLUMN social_accounts.id IS '主键';
COMMENT ON COLUMN social_accounts.provider IS '社交平台类型 (google, facebook, twitter)';
COMMENT ON COLUMN social_accounts.provider_id IS '社交平台用户ID';
COMMENT ON COLUMN social_accounts.email IS '社交平台邮箱';
COMMENT ON COLUMN social_accounts.display_name IS '社交平台显示名称';
COMMENT ON COLUMN social_accounts.avatar IS '社交平台头像URL';
COMMENT ON COLUMN social_accounts.access_token IS '访问令牌（加密存储）';
COMMENT ON COLUMN social_accounts.refresh_token IS '刷新令牌（加密存储）';
COMMENT ON COLUMN social_accounts.token_expires_at IS '令牌过期时间';
COMMENT ON COLUMN social_accounts.raw_profile IS '原始用户资料（JSON格式）';
COMMENT ON COLUMN social_accounts.last_login_at IS '最后登录时间';
COMMENT ON COLUMN social_accounts.user_id IS '关联用户ID';
COMMENT ON COLUMN social_accounts.created_at IS '创建时间';
COMMENT ON COLUMN social_accounts.updated_at IS '更新时间';

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_social_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_social_accounts_updated_at
    BEFORE UPDATE ON social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_accounts_updated_at();
