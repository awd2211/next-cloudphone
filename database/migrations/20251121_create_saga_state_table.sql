-- ===========================================================
-- Saga State Table Migration
-- ===========================================================
-- 此迁移需要在以下数据库中执行:
--   - cloudphone_user (user-service)
--   - cloudphone_app (app-service)
--   - cloudphone_billing (billing-service)
--   - cloudphone_device (device-service)
--
-- 执行方式:
--   for db in cloudphone_user cloudphone_app cloudphone_billing cloudphone_device; do
--     docker compose -f docker-compose.dev.yml exec -T postgres \
--       psql -U postgres -d $db < database/migrations/20251121_create_saga_state_table.sql
--   done
-- ===========================================================

-- 创建 saga_state 表（用于 Saga 模式分布式事务协调）
CREATE TABLE IF NOT EXISTS saga_state (
    -- 主键
    id uuid DEFAULT gen_random_uuid() NOT NULL,

    -- Saga 标识
    saga_id character varying(100) NOT NULL,
    saga_type character varying(50) NOT NULL,

    -- 状态信息
    status character varying(20) DEFAULT 'RUNNING'::character varying NOT NULL,
    -- status 枚举: RUNNING, COMPLETED, COMPENSATING, COMPENSATED, FAILED, TIMEOUT

    -- 步骤跟踪
    current_step character varying(100),
    step_index integer DEFAULT 0 NOT NULL,

    -- Saga 数据
    state jsonb DEFAULT '{}'::jsonb NOT NULL,

    -- 重试机制
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,

    -- 超时控制
    timeout_at timestamp without time zone,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,

    -- 错误信息
    error_message text,

    -- 元数据
    metadata jsonb DEFAULT '{}'::jsonb,

    -- 审计字段
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,

    -- 约束
    CONSTRAINT saga_state_pkey PRIMARY KEY (id),
    CONSTRAINT saga_state_saga_id_key UNIQUE (saga_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_saga_state_saga_id ON saga_state(saga_id);
CREATE INDEX IF NOT EXISTS idx_saga_state_status ON saga_state(status);
CREATE INDEX IF NOT EXISTS idx_saga_state_created_at ON saga_state(created_at);
CREATE INDEX IF NOT EXISTS idx_saga_state_saga_type ON saga_state(saga_type);
CREATE INDEX IF NOT EXISTS idx_saga_state_timeout ON saga_state(timeout_at) WHERE status = 'RUNNING';

-- 添加表注释
COMMENT ON TABLE saga_state IS 'Saga 协调器状态表 - 用于跟踪分布式事务的执行状态';
COMMENT ON COLUMN saga_state.saga_id IS 'Saga 唯一标识符，格式: {saga_type}-{uuid}';
COMMENT ON COLUMN saga_state.saga_type IS 'Saga 类型: PAYMENT_PURCHASE, DEVICE_DELETION, APP_INSTALLATION, USER_REGISTRATION 等';
COMMENT ON COLUMN saga_state.status IS 'Saga 状态: RUNNING, COMPLETED, COMPENSATING, COMPENSATED, FAILED, TIMEOUT';
COMMENT ON COLUMN saga_state.current_step IS '当前执行步骤名称';
COMMENT ON COLUMN saga_state.state IS 'Saga 状态数据 (JSON)';
COMMENT ON COLUMN saga_state.retry_count IS '当前步骤重试次数';
COMMENT ON COLUMN saga_state.max_retries IS '最大重试次数';
COMMENT ON COLUMN saga_state.timeout_at IS 'Saga 超时时间';

-- 创建更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_saga_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saga_state_updated_at ON saga_state;
CREATE TRIGGER trigger_saga_state_updated_at
    BEFORE UPDATE ON saga_state
    FOR EACH ROW
    EXECUTE FUNCTION update_saga_state_updated_at();

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '✅ saga_state table created/updated successfully';
END $$;
