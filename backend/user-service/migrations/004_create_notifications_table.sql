-- 创建通知类型枚举
DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM ('info', 'warning', 'error', 'success', 'announcement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type notification_type_enum NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID,
    "readAt" TIMESTAMP,
    "resourceType" VARCHAR(100),
    "resourceId" VARCHAR(255),
    "actionUrl" VARCHAR(500),
    metadata JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notification_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_user_isread ON notifications("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications("userId");

-- 添加注释
COMMENT ON TABLE notifications IS '系统通知表';
COMMENT ON COLUMN notifications.title IS '通知标题';
COMMENT ON COLUMN notifications.content IS '通知内容';
COMMENT ON COLUMN notifications.type IS '通知类型';
COMMENT ON COLUMN notifications."isRead" IS '是否已读';
COMMENT ON COLUMN notifications."userId" IS '接收用户ID';
COMMENT ON COLUMN notifications."readAt" IS '已读时间';
COMMENT ON COLUMN notifications."resourceType" IS '关联资源类型';
COMMENT ON COLUMN notifications."resourceId" IS '关联资源ID';
COMMENT ON COLUMN notifications."actionUrl" IS '操作链接';
COMMENT ON COLUMN notifications.metadata IS '附加元数据';
