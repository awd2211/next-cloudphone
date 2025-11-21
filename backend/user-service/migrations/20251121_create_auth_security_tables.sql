-- 20251121_create_auth_security_tables.sql
-- 认证安全功能相关表：密码重置令牌、用户会话、登录历史

-- 1. 为 users 表添加新字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. 创建密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'phone')),
    target VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    request_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 密码重置令牌索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- 3. 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('web', 'mobile', 'desktop', 'api', 'unknown')),
    device_name VARCHAR(255),
    browser VARCHAR(255),
    os VARCHAR(255),
    ip VARCHAR(45),
    location VARCHAR(255),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    is_current BOOLEAN DEFAULT false,
    last_active_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    terminated_at TIMESTAMP,
    terminated_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话索引
CREATE INDEX IF NOT EXISTS idx_session_user ON user_sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_active ON user_sessions(user_id, is_active);

-- 4. 创建登录历史表
CREATE TYPE login_result AS ENUM (
    'success',
    'failed_password',
    'failed_captcha',
    'failed_2fa',
    'account_locked',
    'account_disabled',
    'user_not_found'
);

CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    result login_result NOT NULL,
    failure_reason TEXT,
    ip VARCHAR(45),
    location VARCHAR(255),
    user_agent TEXT,
    device_type VARCHAR(20) DEFAULT 'unknown' CHECK (device_type IN ('web', 'mobile', 'desktop', 'api', 'unknown')),
    browser VARCHAR(255),
    os VARCHAR(255),
    used_2fa BOOLEAN DEFAULT false,
    session_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 登录历史索引
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_username ON login_history(username);
CREATE INDEX IF NOT EXISTS idx_login_history_result ON login_history(result);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_created ON login_history(user_id, created_at);

-- 5. 添加触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 添加注释
COMMENT ON TABLE password_reset_tokens IS '密码重置令牌表 - 存储密码重置请求';
COMMENT ON TABLE user_sessions IS '用户会话表 - 跟踪用户活跃会话';
COMMENT ON TABLE login_history IS '登录历史表 - 记录所有登录尝试';

COMMENT ON COLUMN password_reset_tokens.token IS '哈希后的重置令牌';
COMMENT ON COLUMN password_reset_tokens.target IS '脱敏的发送目标（邮箱或手机号）';
COMMENT ON COLUMN user_sessions.token_hash IS 'JWT Token 的哈希值（不存储原始 Token）';
COMMENT ON COLUMN user_sessions.is_current IS '标记是否为当前请求的会话';
COMMENT ON COLUMN login_history.metadata IS '额外的登录元数据（JSON格式）';
