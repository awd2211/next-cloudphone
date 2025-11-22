-- Migration: Create payment_provider_configs table
-- Date: 2025-11-22
-- Description: 支付提供商配置表，支持网页化配置支付 API 密钥

-- Create enum type for provider
DO $$ BEGIN
    CREATE TYPE payment_provider_type AS ENUM ('stripe', 'paypal', 'paddle', 'wechat', 'alipay');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type for mode
DO $$ BEGIN
    CREATE TYPE payment_provider_mode AS ENUM ('test', 'live', 'sandbox', 'production');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment_provider_configs table
CREATE TABLE IF NOT EXISTS payment_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本配置
    provider payment_provider_type NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    mode payment_provider_mode DEFAULT 'test',
    display_name VARCHAR(255),

    -- 通用配置
    public_key VARCHAR(512),
    secret_key_encrypted TEXT,
    webhook_secret_encrypted TEXT,
    webhook_url VARCHAR(512),

    -- Stripe 特有配置
    stripe_test_public_key VARCHAR(512),
    stripe_test_secret_key_encrypted TEXT,
    stripe_live_public_key VARCHAR(512),
    stripe_live_secret_key_encrypted TEXT,

    -- PayPal 特有配置
    paypal_sandbox_client_id VARCHAR(512),
    paypal_sandbox_secret_encrypted TEXT,
    paypal_live_client_id VARCHAR(512),
    paypal_live_secret_encrypted TEXT,
    paypal_webhook_id VARCHAR(255),

    -- Paddle 特有配置
    paddle_api_key_encrypted TEXT,

    -- 微信支付配置
    wechat_app_id VARCHAR(255),
    wechat_mch_id VARCHAR(255),
    wechat_serial_no VARCHAR(255),
    wechat_api_v3_key_encrypted TEXT,
    wechat_private_key_encrypted TEXT,
    wechat_public_key TEXT,

    -- 支付宝配置
    alipay_app_id VARCHAR(255),
    alipay_private_key_encrypted TEXT,
    alipay_public_key TEXT,
    alipay_gateway VARCHAR(512) DEFAULT 'https://openapi.alipay.com/gateway.do',

    -- 元数据
    metadata JSONB,

    -- 连接测试
    last_tested_at TIMESTAMP,
    last_test_success BOOLEAN,
    last_test_message VARCHAR(512),

    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- 唯一约束
    CONSTRAINT uq_payment_provider_configs_provider UNIQUE (provider)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_payment_provider_configs_provider ON payment_provider_configs(provider);
CREATE INDEX IF NOT EXISTS idx_payment_provider_configs_enabled ON payment_provider_configs(enabled);

-- Add comment
COMMENT ON TABLE payment_provider_configs IS '支付提供商配置表 - 存储各支付平台的 API 密钥和配置，敏感信息加密存储';
COMMENT ON COLUMN payment_provider_configs.secret_key_encrypted IS '私钥/密钥 - AES-256-GCM 加密存储';
COMMENT ON COLUMN payment_provider_configs.webhook_secret_encrypted IS 'Webhook 密钥 - AES-256-GCM 加密存储';
