-- 营销活动模块数据库迁移
-- 创建日期: 2025-11-03
-- 描述: 创建营销活动表和参与记录表

-- =====================================================
-- 1. 创建活动类型枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('discount', 'gift', 'flash_sale', 'new_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. 创建活动状态枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE activity_status AS ENUM ('upcoming', 'ongoing', 'ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. 创建参与状态枚举
-- =====================================================
DO $$ BEGIN
    CREATE TYPE participation_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 4. 创建营销活动表
-- =====================================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type activity_type NOT NULL DEFAULT 'discount',
    status activity_status NOT NULL DEFAULT 'upcoming',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    cover_image VARCHAR(500),
    banner_image VARCHAR(500),
    rules TEXT,
    discount DECIMAL(5, 2), -- 折扣率 (0-100)
    max_participants INTEGER, -- 最大参与人数
    current_participants INTEGER NOT NULL DEFAULT 0, -- 当前参与人数
    rewards JSONB, -- 奖励列表
    conditions JSONB, -- 参与条件
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_end_time ON activities(end_time);
CREATE INDEX IF NOT EXISTS idx_activities_is_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_time_range ON activities(start_time, end_time);

-- 注释
COMMENT ON TABLE activities IS '营销活动表';
COMMENT ON COLUMN activities.id IS '活动ID';
COMMENT ON COLUMN activities.title IS '活动标题';
COMMENT ON COLUMN activities.description IS '活动描述';
COMMENT ON COLUMN activities.type IS '活动类型';
COMMENT ON COLUMN activities.status IS '活动状态';
COMMENT ON COLUMN activities.start_time IS '开始时间';
COMMENT ON COLUMN activities.end_time IS '结束时间';
COMMENT ON COLUMN activities.cover_image IS '封面图片URL';
COMMENT ON COLUMN activities.banner_image IS '横幅图片URL';
COMMENT ON COLUMN activities.rules IS '活动规则';
COMMENT ON COLUMN activities.discount IS '折扣率';
COMMENT ON COLUMN activities.max_participants IS '最大参与人数';
COMMENT ON COLUMN activities.current_participants IS '当前参与人数';
COMMENT ON COLUMN activities.rewards IS '奖励列表（JSON）';
COMMENT ON COLUMN activities.conditions IS '参与条件（JSON）';
COMMENT ON COLUMN activities.is_active IS '是否激活';

-- =====================================================
-- 5. 创建活动参与记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rewards JSONB, -- 获得的奖励
    status participation_status NOT NULL DEFAULT 'pending',
    participated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    CONSTRAINT fk_participation_activity FOREIGN KEY (activity_id)
        REFERENCES activities(id) ON DELETE CASCADE,

    -- 唯一约束：每个用户只能参与每个活动一次
    CONSTRAINT uk_participation_activity_user UNIQUE (activity_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_participations_activity_id ON activity_participations(activity_id);
CREATE INDEX IF NOT EXISTS idx_participations_user_id ON activity_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_participations_status ON activity_participations(status);
CREATE INDEX IF NOT EXISTS idx_participations_participated_at ON activity_participations(participated_at);

-- 注释
COMMENT ON TABLE activity_participations IS '活动参与记录表';
COMMENT ON COLUMN activity_participations.id IS '参与记录ID';
COMMENT ON COLUMN activity_participations.activity_id IS '活动ID';
COMMENT ON COLUMN activity_participations.user_id IS '用户ID';
COMMENT ON COLUMN activity_participations.rewards IS '获得的奖励（JSON）';
COMMENT ON COLUMN activity_participations.status IS '参与状态';
COMMENT ON COLUMN activity_participations.participated_at IS '参与时间';

-- =====================================================
-- 6. 创建触发器：自动更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activities_updated_at ON activities;
CREATE TRIGGER trigger_update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- =====================================================
-- 7. 插入示例数据（可选，用于测试）
-- =====================================================
-- 注释掉，生产环境不需要示例数据
-- INSERT INTO activities (title, description, type, status, start_time, end_time, discount, max_participants, rewards, conditions)
-- VALUES
-- ('新用户注册礼包', '新用户注册即可获得优惠券', 'new_user', 'ongoing',
--  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days',
--  NULL, 1000,
--  '["coupon_new_user_10"]'::jsonb,
--  '["is_new_user"]'::jsonb);

-- 迁移完成
SELECT '营销活动模块迁移完成！' AS message;
