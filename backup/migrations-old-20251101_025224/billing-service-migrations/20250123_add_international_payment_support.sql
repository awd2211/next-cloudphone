-- 海外支付功能数据库迁移
-- 日期: 2025-01-23
-- 描述: 添加 Stripe、PayPal、Paddle 支付支持，增加多货币、订阅等功能

-- ============================================
-- 1. 更新 payments 表
-- ============================================

-- 添加新的支付方式到枚举
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'stripe';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paypal';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paddle';

-- 创建支付模式枚举
DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('hosted', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 添加新字段到 payments 表
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CNY',
ADD COLUMN IF NOT EXISTS payment_mode payment_mode,
ADD COLUMN IF NOT EXISTS subscription_id UUID,
ADD COLUMN IF NOT EXISTS client_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_payments_currency ON payments(currency);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

-- 添加注释
COMMENT ON COLUMN payments.currency IS '货币类型（USD, EUR, GBP, CNY 等）';
COMMENT ON COLUMN payments.payment_mode IS '支付模式：hosted-托管页面, custom-自定义UI';
COMMENT ON COLUMN payments.subscription_id IS '关联的订阅ID（如果是订阅支付）';
COMMENT ON COLUMN payments.client_secret IS '客户端密钥（用于前端集成，如 Stripe Client Secret）';
COMMENT ON COLUMN payments.customer_id IS '支付平台的客户ID';
COMMENT ON COLUMN payments.metadata IS '额外元数据（JSON格式，存储平台特定信息）';

-- ============================================
-- 2. 创建 subscriptions 表
-- ============================================

-- 创建订阅状态枚举
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'trialing',
        'unpaid',
        'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建订阅计费周期枚举
DO $$ BEGIN
    CREATE TYPE subscription_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建订阅提供商枚举
DO $$ BEGIN
    CREATE TYPE subscription_provider AS ENUM ('stripe', 'paypal', 'paddle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    provider subscription_provider NOT NULL,
    status subscription_status DEFAULT 'active' NOT NULL,

    -- 第三方平台信息
    external_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    external_customer_id VARCHAR(255),

    -- 价格信息
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    interval subscription_interval DEFAULT 'month' NOT NULL,
    interval_count INTEGER DEFAULT 1 NOT NULL,

    -- 周期信息
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,

    -- 试用期
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,

    -- 续费信息
    next_billing_date TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,

    -- 额外信息
    metadata JSONB,
    failed_payment_count INTEGER DEFAULT 0,
    latest_payment_id UUID,
    coupon_code VARCHAR(100),
    discount DECIMAL(10, 2),

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束（如果需要）
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
    -- FOREIGN KEY (latest_payment_id) REFERENCES payments(id) ON DELETE SET NULL

    CONSTRAINT chk_interval_count CHECK (interval_count > 0),
    CONSTRAINT chk_failed_payment_count CHECK (failed_payment_count >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_id ON subscriptions(external_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- 添加注释
COMMENT ON TABLE subscriptions IS '订阅管理表';
COMMENT ON COLUMN subscriptions.provider IS '订阅提供商：stripe, paypal, paddle';
COMMENT ON COLUMN subscriptions.status IS '订阅状态：active, canceled, trialing 等';
COMMENT ON COLUMN subscriptions.external_subscription_id IS '第三方平台的订阅ID（唯一）';
COMMENT ON COLUMN subscriptions.external_customer_id IS '第三方平台的客户ID';
COMMENT ON COLUMN subscriptions.interval IS '计费周期：day, week, month, year';
COMMENT ON COLUMN subscriptions.interval_count IS '计费周期数量（如 interval=month, interval_count=3 表示每3个月）';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS '是否在周期结束时取消';
COMMENT ON COLUMN subscriptions.failed_payment_count IS '续费失败次数';

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- 3. 数据迁移（如需要）
-- ============================================

-- 为现有的支付记录设置默认货币
UPDATE payments SET currency = 'CNY' WHERE currency IS NULL;

-- ============================================
-- 4. 权限设置（根据实际情况调整）
-- ============================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO billing_service_user;
-- GRANT USAGE, SELECT ON SEQUENCE subscriptions_id_seq TO billing_service_user;

-- ============================================
-- 完成
-- ============================================

SELECT 'Migration completed: International payment support added!' AS status;
