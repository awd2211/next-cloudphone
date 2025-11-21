-- 创建 tickets 和 ticket_replies 表
-- 执行: docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user < backend/user-service/migrations/20251121_create_tickets_tables.sql

-- 创建工单状态枚举
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建工单优先级枚举
DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建工单分类枚举
DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('technical', 'billing', 'account', 'feature_request', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建回复类型枚举
DO $$ BEGIN
    CREATE TYPE reply_type AS ENUM ('user', 'staff', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建 tickets 表
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticketNumber" VARCHAR(50) NOT NULL UNIQUE,
    "userId" UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ticket_category NOT NULL DEFAULT 'other',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    "assignedTo" UUID,
    attachments JSONB,
    tags JSONB,
    "firstResponseAt" TIMESTAMP,
    "resolvedAt" TIMESTAMP,
    "closedAt" TIMESTAMP,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "lastReplyAt" TIMESTAMP,
    "internalNotes" TEXT,
    rating INTEGER,
    feedback TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- 外键约束
    CONSTRAINT fk_tickets_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_assignee FOREIGN KEY ("assignedTo") REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets ("ticketNumber");
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets ("userId");
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets ("assignedTo");
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets (status, priority, "createdAt");
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets ("assignedTo", status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets ("userId", status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_tickets_category_status ON tickets (category, status);

-- 创建 ticket_replies 表
CREATE TABLE IF NOT EXISTS ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    type reply_type NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- 外键约束
    CONSTRAINT fk_replies_ticket FOREIGN KEY ("ticketId") REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_replies_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies ("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_replies_user_id ON ticket_replies ("userId");
CREATE INDEX IF NOT EXISTS idx_ticket_replies_type ON ticket_replies (type);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created_at ON ticket_replies ("createdAt");

-- 创建更新 updatedAt 触发器
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON tickets;
CREATE TRIGGER trigger_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_tickets_updated_at();

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE 'Successfully created tickets and ticket_replies tables';
END $$;
