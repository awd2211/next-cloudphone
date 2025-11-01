-- Migration: Create allocation_queue table
-- Date: 2025-10-30
-- Purpose: 添加优先级队列功能，支持无设备时排队等待

CREATE TYPE queue_status AS ENUM (
  'waiting',
  'processing',
  'fulfilled',
  'expired',
  'cancelled'
);

CREATE TABLE allocation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  status queue_status NOT NULL DEFAULT 'waiting',

  -- 优先级配置
  priority INT NOT NULL DEFAULT 0,
  user_tier VARCHAR(50) DEFAULT 'standard',

  -- 设备偏好
  device_type VARCHAR(100),
  min_cpu INT,
  min_memory INT,
  duration_minutes INT NOT NULL DEFAULT 60,

  -- 队列信息
  queue_position INT,
  estimated_wait_minutes INT,
  max_wait_minutes INT DEFAULT 30,

  -- 处理结果
  allocated_device_id VARCHAR(255),
  allocation_id VARCHAR(255),
  processed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,

  -- 取消信息
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 过期信息
  expired_at TIMESTAMPTZ,
  expiry_reason TEXT,

  -- 重试信息
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- 元数据
  metadata JSONB,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 核心复合索引：用于优先级队列排序
-- 按状态 -> 优先级（降序）-> 创建时间（升序）排序
CREATE INDEX idx_allocation_queue_priority_sort
  ON allocation_queue(status, priority DESC, created_at ASC)
  WHERE status = 'waiting';

-- 用户查询索引
CREATE INDEX idx_allocation_queue_user_id
  ON allocation_queue(user_id);

CREATE INDEX idx_allocation_queue_user_status
  ON allocation_queue(user_id, status);

-- 状态索引
CREATE INDEX idx_allocation_queue_status
  ON allocation_queue(status);

-- 设备类型索引
CREATE INDEX idx_allocation_queue_device_type
  ON allocation_queue(device_type)
  WHERE device_type IS NOT NULL;

-- 过期检查索引（用于cron任务）
CREATE INDEX idx_allocation_queue_expiry_check
  ON allocation_queue(status, created_at)
  WHERE status = 'waiting';

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_allocation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_allocation_queue_updated_at
  BEFORE UPDATE ON allocation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_queue_updated_at();

-- 注释
COMMENT ON TABLE allocation_queue IS '设备分配优先级队列表';
COMMENT ON COLUMN allocation_queue.id IS '队列条目ID';
COMMENT ON COLUMN allocation_queue.user_id IS '用户ID';
COMMENT ON COLUMN allocation_queue.status IS '队列状态';
COMMENT ON COLUMN allocation_queue.priority IS '优先级（数字越大越高）';
COMMENT ON COLUMN allocation_queue.user_tier IS '用户等级';
COMMENT ON COLUMN allocation_queue.queue_position IS '排队位置';
COMMENT ON COLUMN allocation_queue.estimated_wait_minutes IS '预估等待时间（分钟）';
COMMENT ON COLUMN allocation_queue.max_wait_minutes IS '最大等待时间（分钟）';
COMMENT ON COLUMN allocation_queue.retry_count IS '重试次数';
