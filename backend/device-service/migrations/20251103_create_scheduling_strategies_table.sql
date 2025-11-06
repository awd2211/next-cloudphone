-- 创建调度策略表
-- Migration: 20251103_create_scheduling_strategies_table
-- Description: 创建调度策略管理表，支持多种调度算法配置

-- 创建策略类型枚举
DO $$ BEGIN
    CREATE TYPE strategy_type_enum AS ENUM (
        'round-robin',
        'least-loaded',
        'random',
        'priority',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建调度策略表
CREATE TABLE IF NOT EXISTS scheduling_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type strategy_type_enum NOT NULL DEFAULT 'round-robin',
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建唯一索引：确保同时只有一个激活的策略
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_strategy
ON scheduling_strategies (is_active)
WHERE is_active = TRUE;

-- 创建常规索引
CREATE INDEX IF NOT EXISTS idx_strategy_type ON scheduling_strategies(type);
CREATE INDEX IF NOT EXISTS idx_strategy_active ON scheduling_strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_strategy_created_at ON scheduling_strategies(created_at DESC);

-- 创建更新时间触发器
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

-- 插入默认调度策略
INSERT INTO scheduling_strategies (name, type, description, config, is_active)
VALUES
    (
        'Round Robin',
        'round-robin',
        '轮询调度策略，按顺序分配设备到各个节点',
        '{}'::jsonb,
        TRUE
    ),
    (
        'Least Loaded',
        'least-loaded',
        '最少负载策略，优先分配到负载最低的节点',
        '{"weightCpu": 0.4, "weightMemory": 0.3, "weightStorage": 0.3}'::jsonb,
        FALSE
    ),
    (
        'Priority Based',
        'priority',
        '基于优先级的调度策略，高优先级用户优先分配',
        '{"vipPriority": 10, "normalPriority": 5, "freePriority": 1}'::jsonb,
        FALSE
    )
ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE scheduling_strategies IS '调度策略配置表';
COMMENT ON COLUMN scheduling_strategies.id IS '策略唯一标识';
COMMENT ON COLUMN scheduling_strategies.name IS '策略名称';
COMMENT ON COLUMN scheduling_strategies.type IS '策略类型';
COMMENT ON COLUMN scheduling_strategies.description IS '策略描述';
COMMENT ON COLUMN scheduling_strategies.config IS '策略配置参数（JSON格式）';
COMMENT ON COLUMN scheduling_strategies.is_active IS '是否为当前激活策略';
COMMENT ON COLUMN scheduling_strategies.created_at IS '创建时间';
COMMENT ON COLUMN scheduling_strategies.updated_at IS '更新时间';
