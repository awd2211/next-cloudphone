-- 创建生命周期执行历史表
-- 执行: docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_device < backend/device-service/migrations/20251121_create_lifecycle_execution_history.sql

-- 创建执行状态枚举
DO $$ BEGIN
    CREATE TYPE execution_status AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建触发类型枚举
DO $$ BEGIN
    CREATE TYPE trigger_type AS ENUM ('scheduled', 'manual', 'event', 'api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建生命周期执行历史表
CREATE TABLE IF NOT EXISTS lifecycle_execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 规则关联
    "ruleId" UUID NOT NULL,
    "ruleName" VARCHAR(255) NOT NULL,
    "ruleType" VARCHAR(50) NOT NULL,

    -- 执行状态
    status execution_status NOT NULL DEFAULT 'pending',
    "triggerType" trigger_type NOT NULL DEFAULT 'scheduled',
    "triggeredBy" VARCHAR(100),

    -- 时间信息
    "startedAt" TIMESTAMP NOT NULL,
    "completedAt" TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,

    -- 执行结果
    "affectedDevices" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    summary JSONB,

    -- 错误信息
    "errorMessage" TEXT,
    "errorDetails" JSONB,

    -- 配置快照
    config JSONB,

    -- 审计字段
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    -- 注意：外键约束在 lifecycle_rules 表创建后通过 ALTER TABLE 添加
);

-- 尝试添加外键约束（如果 lifecycle_rules 表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lifecycle_rules') THEN
        ALTER TABLE lifecycle_execution_history
            DROP CONSTRAINT IF EXISTS fk_execution_rule;
        ALTER TABLE lifecycle_execution_history
            ADD CONSTRAINT fk_execution_rule
            FOREIGN KEY ("ruleId") REFERENCES lifecycle_rules(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'lifecycle_rules table not found, skipping foreign key constraint';
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_execution_history_rule_id ON lifecycle_execution_history ("ruleId");
CREATE INDEX IF NOT EXISTS idx_execution_history_status ON lifecycle_execution_history (status);
CREATE INDEX IF NOT EXISTS idx_execution_history_started_at ON lifecycle_execution_history ("startedAt");
CREATE INDEX IF NOT EXISTS idx_execution_history_rule_status ON lifecycle_execution_history ("ruleId", status);

-- 添加表注释
COMMENT ON TABLE lifecycle_execution_history IS '生命周期规则执行历史记录表';
COMMENT ON COLUMN lifecycle_execution_history."ruleId" IS '关联的规则ID';
COMMENT ON COLUMN lifecycle_execution_history."ruleName" IS '规则名称（快照）';
COMMENT ON COLUMN lifecycle_execution_history."ruleType" IS '规则类型（快照）';
COMMENT ON COLUMN lifecycle_execution_history.status IS '执行状态: pending, running, success, failed, cancelled, timeout';
COMMENT ON COLUMN lifecycle_execution_history."triggerType" IS '触发类型: scheduled(定时), manual(手动), event(事件), api(API调用)';
COMMENT ON COLUMN lifecycle_execution_history."triggeredBy" IS '触发者（用户ID或system）';
COMMENT ON COLUMN lifecycle_execution_history."durationMs" IS '执行时长（毫秒）';
COMMENT ON COLUMN lifecycle_execution_history."affectedDevices" IS '影响的设备数量';
COMMENT ON COLUMN lifecycle_execution_history.summary IS '执行摘要（JSON格式）';
COMMENT ON COLUMN lifecycle_execution_history.config IS '执行时的配置快照';

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE 'Successfully created lifecycle_execution_history table';
END $$;
