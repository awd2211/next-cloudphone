-- Migration: Create device_reservations table
-- Date: 2025-10-30
-- Purpose: 添加设备预约功能支持

CREATE TYPE reservation_status AS ENUM (
  'pending',
  'confirmed',
  'executing',
  'completed',
  'cancelled',
  'expired',
  'failed'
);

CREATE TABLE device_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  status reservation_status NOT NULL DEFAULT 'pending',

  -- 预约时间信息
  reserved_start_time TIMESTAMPTZ NOT NULL,
  reserved_end_time TIMESTAMPTZ,
  duration_minutes INT NOT NULL DEFAULT 60,

  -- 设备偏好
  device_type VARCHAR(100),
  min_cpu INT,
  min_memory INT,

  -- 执行结果
  allocated_device_id VARCHAR(255),
  allocation_id VARCHAR(255),
  executed_at TIMESTAMPTZ,

  -- 取消信息
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 失败信息
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- 提醒设置
  remind_before_minutes INT DEFAULT 15,
  reminder_sent BOOLEAN DEFAULT FALSE,

  -- 元数据
  metadata JSONB,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_device_reservations_user_id ON device_reservations(user_id);
CREATE INDEX idx_device_reservations_user_status ON device_reservations(user_id, status);
CREATE INDEX idx_device_reservations_start_time_status ON device_reservations(reserved_start_time, status);
CREATE INDEX idx_device_reservations_device_type_status ON device_reservations(device_type, status);
CREATE INDEX idx_device_reservations_status ON device_reservations(status);

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_device_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_reservations_updated_at
  BEFORE UPDATE ON device_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_device_reservations_updated_at();

-- 注释
COMMENT ON TABLE device_reservations IS '设备预约表';
COMMENT ON COLUMN device_reservations.id IS '预约ID';
COMMENT ON COLUMN device_reservations.user_id IS '用户ID';
COMMENT ON COLUMN device_reservations.status IS '预约状态';
COMMENT ON COLUMN device_reservations.reserved_start_time IS '预约开始时间';
COMMENT ON COLUMN device_reservations.reserved_end_time IS '预约结束时间';
COMMENT ON COLUMN device_reservations.duration_minutes IS '预约时长（分钟）';
COMMENT ON COLUMN device_reservations.allocated_device_id IS '已分配的设备ID';
COMMENT ON COLUMN device_reservations.allocation_id IS '分配记录ID';
COMMENT ON COLUMN device_reservations.remind_before_minutes IS '提前提醒时间（分钟）';
