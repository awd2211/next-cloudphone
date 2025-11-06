-- 邀请返利模块数据库迁移
-- 创建日期: 2025-11-03
-- 描述: 创建邀请返利相关表

-- =====================================================
-- 1. 创建邀请记录状态枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'confirmed', 'rewarded', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. 创建提现状态枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE withdraw_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. 创建提现方式枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE withdraw_method AS ENUM ('alipay', 'wechat', 'bank');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 4. 创建收益类型枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE earnings_type AS ENUM ('invite', 'bonus', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 5. 创建邀请配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    invite_code VARCHAR(20) NOT NULL UNIQUE,
    available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    frozen_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_withdrawn DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_invites INTEGER NOT NULL DEFAULT 0,
    confirmed_invites INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_referral_configs_user_id ON referral_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_configs_invite_code ON referral_configs(invite_code);

-- 注释
COMMENT ON TABLE referral_configs IS '邀请配置表';
COMMENT ON COLUMN referral_configs.user_id IS '用户ID';
COMMENT ON COLUMN referral_configs.invite_code IS '邀请码';
COMMENT ON COLUMN referral_configs.available_balance IS '可提现余额';
COMMENT ON COLUMN referral_configs.frozen_balance IS '冻结余额';
COMMENT ON COLUMN referral_configs.total_earned IS '总收益';
COMMENT ON COLUMN referral_configs.total_withdrawn IS '总提现金额';
COMMENT ON COLUMN referral_configs.total_invites IS '总邀请人数';
COMMENT ON COLUMN referral_configs.confirmed_invites IS '确认的邀请人数';

-- =====================================================
-- 6. 创建邀请记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL,
    referee_id UUID NOT NULL,
    referee_username VARCHAR(100) NOT NULL,
    referee_email VARCHAR(100),
    referee_phone VARCHAR(20),
    status referral_status NOT NULL DEFAULT 'pending',
    reward DECIMAL(10, 2) NOT NULL DEFAULT 0,
    registered_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    rewarded_at TIMESTAMP,
    expired_at TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：一个被邀请人只能被一个邀请人邀请
    CONSTRAINT uk_referee_id UNIQUE (referee_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_referral_records_referrer_id ON referral_records(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_referee_id ON referral_records(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_status ON referral_records(status);

-- 注释
COMMENT ON TABLE referral_records IS '邀请记录表';
COMMENT ON COLUMN referral_records.referrer_id IS '邀请人ID';
COMMENT ON COLUMN referral_records.referee_id IS '被邀请人ID';
COMMENT ON COLUMN referral_records.status IS '邀请状态';
COMMENT ON COLUMN referral_records.reward IS '奖励金额';

-- =====================================================
-- 7. 创建提现记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS withdraw_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status withdraw_status NOT NULL DEFAULT 'pending',
    method withdraw_method NOT NULL,
    account VARCHAR(200) NOT NULL,
    account_name VARCHAR(100),
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(10, 2) NOT NULL,
    remark TEXT,
    reject_reason TEXT,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_withdraw_records_user_id ON withdraw_records(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_records_status ON withdraw_records(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_records_applied_at ON withdraw_records(applied_at);

-- 注释
COMMENT ON TABLE withdraw_records IS '提现记录表';
COMMENT ON COLUMN withdraw_records.user_id IS '用户ID';
COMMENT ON COLUMN withdraw_records.amount IS '提现金额';
COMMENT ON COLUMN withdraw_records.status IS '提现状态';
COMMENT ON COLUMN withdraw_records.method IS '提现方式';
COMMENT ON COLUMN withdraw_records.fee IS '手续费';
COMMENT ON COLUMN withdraw_records.actual_amount IS '实际到账金额';

-- =====================================================
-- 8. 创建收益记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS earnings_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type earnings_type NOT NULL DEFAULT 'invite',
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    related_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_earnings_records_user_id ON earnings_records(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_records_type ON earnings_records(type);
CREATE INDEX IF NOT EXISTS idx_earnings_records_created_at ON earnings_records(created_at);

-- 注释
COMMENT ON TABLE earnings_records IS '收益记录表';
COMMENT ON COLUMN earnings_records.user_id IS '用户ID';
COMMENT ON COLUMN earnings_records.type IS '收益类型';
COMMENT ON COLUMN earnings_records.amount IS '金额';
COMMENT ON COLUMN earnings_records.description IS '描述';
COMMENT ON COLUMN earnings_records.related_id IS '关联ID';

-- =====================================================
-- 9. 创建触发器：自动更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_referral_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_configs_updated_at ON referral_configs;
CREATE TRIGGER trigger_update_referral_configs_updated_at
    BEFORE UPDATE ON referral_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_configs_updated_at();

CREATE OR REPLACE FUNCTION update_referral_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_records_updated_at ON referral_records;
CREATE TRIGGER trigger_update_referral_records_updated_at
    BEFORE UPDATE ON referral_records
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_records_updated_at();

CREATE OR REPLACE FUNCTION update_withdraw_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_withdraw_records_updated_at ON withdraw_records;
CREATE TRIGGER trigger_update_withdraw_records_updated_at
    BEFORE UPDATE ON withdraw_records
    FOR EACH ROW
    EXECUTE FUNCTION update_withdraw_records_updated_at();

-- 迁移完成
SELECT '邀请返利模块迁移完成！' AS message;
