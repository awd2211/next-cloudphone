-- Notification Service Database Schema
-- 通知服务数据库架构

-- 创建枚举类型
CREATE TYPE notification_type_enum AS ENUM (
  'ticket_reply',
  'ticket_assigned',
  'ticket_resolved',
  'balance_low',
  'balance_recharged',
  'balance_consumed',
  'quota_exceeded',
  'quota_warning',
  'invoice_generated',
  'invoice_due',
  'invoice_overdue',
  'device_started',
  'device_stopped',
  'device_error',
  'system_maintenance',
  'system_update'
);

CREATE TYPE notification_channel_enum AS ENUM (
  'websocket',
  'email',
  'sms',
  'in_app'
);

CREATE TYPE notification_priority_enum AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE notification_status_enum AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- 通知记录表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type notification_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channels notification_channel_enum[] DEFAULT ARRAY['in_app'::notification_channel_enum],
    priority notification_priority_enum DEFAULT 'medium',
    status notification_status_enum DEFAULT 'pending',
    data JSONB,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action_url VARCHAR(500),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type notification_type_enum NOT NULL,
    channel notification_channel_enum NOT NULL,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    locale VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type_status ON notifications(type, status);
CREATE INDEX IF NOT EXISTS idx_notifications_resource ON notifications(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON notification_templates(code);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE notifications IS '通知记录表';
COMMENT ON TABLE notification_templates IS '通知模板表';

COMMENT ON COLUMN notifications.type IS '通知类型：工单、余额、配额、设备、系统等';
COMMENT ON COLUMN notifications.channels IS '通知渠道数组：websocket, email, sms, in_app';
COMMENT ON COLUMN notifications.priority IS '优先级：low, medium, high, urgent';
COMMENT ON COLUMN notifications.status IS '状态：pending, sent, delivered, read, failed';
COMMENT ON COLUMN notifications.data IS '附加数据（JSON格式）';
COMMENT ON COLUMN notifications.resource_type IS '关联资源类型（ticket, device, invoice等）';
COMMENT ON COLUMN notifications.resource_id IS '关联资源ID';

COMMENT ON COLUMN notification_templates.code IS '模板代码（唯一标识）';
COMMENT ON COLUMN notification_templates.template IS '模板内容（支持 Handlebars 语法）';
COMMENT ON COLUMN notification_templates.variables IS '模板变量列表';
COMMENT ON COLUMN notification_templates.locale IS '语言/地区代码（zh-CN, en-US等）';
