-- notification-service 基础数据库迁移
-- 创建 notifications 表和相关枚举类型

-- 1. 创建枚举类型
DO $$ BEGIN
  CREATE TYPE notification_status_enum AS ENUM('pending', 'sent', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type_enum AS ENUM('system', 'device', 'order', 'billing', 'alert', 'message');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel_enum AS ENUM('websocket', 'email', 'sms', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 创建 notifications 表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  type notification_type_enum NOT NULL DEFAULT 'system',
  status notification_status_enum NOT NULL DEFAULT 'pending',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  channels TEXT,
  "templateId" UUID,
  "sentAt" TIMESTAMP,
  "readAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "retryCount" INTEGER DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON notifications("userId");
CREATE INDEX IF NOT EXISTS "IDX_notifications_status" ON notifications(status);
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_status" ON notifications("userId", status);
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_createdAt" ON notifications("userId", "createdAt");

-- 完成
SELECT 'Notification tables created successfully' as status;
