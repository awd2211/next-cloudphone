-- 更新调度策略枚举类型
-- Migration: 20251111_update_scheduling_strategies_enum
-- Description: 更新调度策略类型枚举,添加新的策略类型和优先级字段

-- 1. 先删除旧的枚举类型 (如果表还没有数据)
-- 如果表已有数据,需要先备份
DO $$
BEGIN
    -- 检查表是否存在
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduling_strategies') THEN
        -- 如果表存在,删除旧类型并重建
        DROP TYPE IF EXISTS strategy_type_enum CASCADE;

        -- 创建新的枚举类型
        CREATE TYPE strategy_type_enum AS ENUM (
            'load_balancing',
            'resource_efficiency',
            'locality_aware',
            'cost_optimization'
        );

        -- 删除旧表
        DROP TABLE IF EXISTS scheduling_strategies CASCADE;
    END IF;
END $$;

-- 2. 创建新的调度策略表
CREATE TABLE IF NOT EXISTS scheduling_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    type strategy_type_enum NOT NULL,
    description TEXT,
    config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_strategy_name ON scheduling_strategies(name);
CREATE INDEX IF NOT EXISTS idx_strategy_type ON scheduling_strategies(type);
CREATE INDEX IF NOT EXISTS idx_strategy_is_active ON scheduling_strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_strategy_priority ON scheduling_strategies(priority);
CREATE INDEX IF NOT EXISTS idx_strategy_created_at ON scheduling_strategies(created_at DESC);

-- 4. 创建唯一索引：确保同时只有一个激活的策略
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_strategy
ON scheduling_strategies (is_active)
WHERE is_active = TRUE;

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_scheduling_strategies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scheduling_strategies_updated_at ON scheduling_strategies;
CREATE TRIGGER trigger_update_scheduling_strategies_updated_at
    BEFORE UPDATE ON scheduling_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduling_strategies_updated_at();

-- 6. 插入默认策略
INSERT INTO scheduling_strategies (name, type, description, config, is_active, priority)
VALUES
    (
        '负载均衡策略',
        'load_balancing',
        '基于节点当前负载进行均衡分配',
        '{"algorithm": "weighted_round_robin", "enableFailover": true, "maxRetries": 3}'::jsonb,
        TRUE,
        1
    ),
    (
        '资源效率策略',
        'resource_efficiency',
        '优先分配到资源利用率低的节点',
        '{"threshold": 0.8, "enableFailover": true}'::jsonb,
        FALSE,
        2
    ),
    (
        '本地优先策略',
        'locality_aware',
        '优先分配到地理位置最近的节点',
        '{"regionWeight": 0.7, "enableFailover": true}'::jsonb,
        FALSE,
        3
    ),
    (
        '成本优化策略',
        'cost_optimization',
        '优先使用成本最低的节点',
        '{"costMetric": "per_hour", "maxCostPerDevice": 100}'::jsonb,
        FALSE,
        4
    )
ON CONFLICT (name) DO NOTHING;

-- 7. 添加注释
COMMENT ON TABLE scheduling_strategies IS '调度策略配置表 - 用于管理设备调度算法';
COMMENT ON COLUMN scheduling_strategies.id IS '策略唯一标识';
COMMENT ON COLUMN scheduling_strategies.name IS '策略名称（唯一）';
COMMENT ON COLUMN scheduling_strategies.type IS '策略类型（负载均衡/资源效率/本地优先/成本优化）';
COMMENT ON COLUMN scheduling_strategies.description IS '策略描述';
COMMENT ON COLUMN scheduling_strategies.config IS '策略配置参数（JSON格式）';
COMMENT ON COLUMN scheduling_strategies.is_active IS '是否为当前激活策略（同时只能有一个）';
COMMENT ON COLUMN scheduling_strategies.priority IS '策略优先级（数值越小优先级越高）';
COMMENT ON COLUMN scheduling_strategies.created_at IS '创建时间';
COMMENT ON COLUMN scheduling_strategies.updated_at IS '更新时间';
