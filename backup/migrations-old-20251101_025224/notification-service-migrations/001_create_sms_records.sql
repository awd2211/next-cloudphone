-- 创建 SMS 状态枚举类型
DO $$ BEGIN
    CREATE TYPE sms_records_status_enum AS ENUM('pending', 'sent', 'delivered', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建 SMS 记录表
CREATE TABLE IF NOT EXISTS sms_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    status sms_records_status_enum NOT NULL DEFAULT 'pending',
    provider VARCHAR(50) NOT NULL,
    "userId" UUID,
    "userName" VARCHAR(100),
    "templateCode" VARCHAR(50),
    variables JSONB,
    "messageId" VARCHAR(100),
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "IDX_sms_records_phone" ON sms_records (phone);
CREATE INDEX IF NOT EXISTS "IDX_sms_records_status" ON sms_records (status);
CREATE INDEX IF NOT EXISTS "IDX_sms_records_userId" ON sms_records ("userId");
CREATE INDEX IF NOT EXISTS "IDX_sms_records_userId_createdAt" ON sms_records ("userId", "createdAt");

-- 创建触发器更新 updatedAt
CREATE OR REPLACE FUNCTION update_sms_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sms_records_updated_at ON sms_records;
CREATE TRIGGER trigger_sms_records_updated_at
    BEFORE UPDATE ON sms_records
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_records_updated_at();

COMMENT ON TABLE sms_records IS 'SMS 发送记录表';
COMMENT ON COLUMN sms_records.phone IS '手机号';
COMMENT ON COLUMN sms_records.content IS '短信内容';
COMMENT ON COLUMN sms_records.status IS '发送状态';
COMMENT ON COLUMN sms_records.provider IS 'SMS 供应商';

