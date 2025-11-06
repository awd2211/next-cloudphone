-- 优惠券模块数据库迁移
-- 创建日期: 2025-11-03
-- 描述: 创建优惠券表

-- =====================================================
-- 1. 创建优惠券类型枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE coupon_type AS ENUM ('discount', 'cash', 'gift');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. 创建优惠券状态枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE coupon_status AS ENUM ('available', 'used', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. 创建优惠券表
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type coupon_type NOT NULL DEFAULT 'discount',
    value DECIMAL(10, 2) NOT NULL, -- 面额或折扣率
    min_amount DECIMAL(10, 2), -- 最低消费金额
    status coupon_status NOT NULL DEFAULT 'available',
    user_id UUID NOT NULL,
    activity_id UUID, -- 关联的活动ID（可选）
    activity_title VARCHAR(200), -- 活动标题（冗余字段，提高查询性能）
    start_time TIMESTAMP NOT NULL, -- 生效时间
    end_time TIMESTAMP NOT NULL, -- 失效时间
    order_id UUID, -- 使用的订单ID
    used_at TIMESTAMP, -- 使用时间
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_activity_id ON coupons(activity_id);
CREATE INDEX IF NOT EXISTS idx_coupons_end_time ON coupons(end_time);
CREATE INDEX IF NOT EXISTS idx_coupons_user_status ON coupons(user_id, status);

-- 注释
COMMENT ON TABLE coupons IS '优惠券表';
COMMENT ON COLUMN coupons.id IS '优惠券ID';
COMMENT ON COLUMN coupons.code IS '优惠券代码';
COMMENT ON COLUMN coupons.name IS '优惠券名称';
COMMENT ON COLUMN coupons.type IS '优惠券类型';
COMMENT ON COLUMN coupons.value IS '面额或折扣率';
COMMENT ON COLUMN coupons.min_amount IS '最低消费金额';
COMMENT ON COLUMN coupons.status IS '优惠券状态';
COMMENT ON COLUMN coupons.user_id IS '用户ID';
COMMENT ON COLUMN coupons.activity_id IS '活动ID';
COMMENT ON COLUMN coupons.activity_title IS '活动标题';
COMMENT ON COLUMN coupons.start_time IS '生效时间';
COMMENT ON COLUMN coupons.end_time IS '失效时间';
COMMENT ON COLUMN coupons.order_id IS '使用的订单ID';
COMMENT ON COLUMN coupons.used_at IS '使用时间';

-- =====================================================
-- 4. 创建触发器：自动更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_coupons_updated_at ON coupons;
CREATE TRIGGER trigger_update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupons_updated_at();

-- 迁移完成
SELECT '优惠券模块迁移完成！' AS message;
