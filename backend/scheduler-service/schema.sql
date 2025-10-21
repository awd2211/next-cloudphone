-- Scheduler Service Database Schema
-- 调度服务数据库架构

-- 设备分配记录表
CREATE TABLE IF NOT EXISTS device_allocations (
    id VARCHAR(255) PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'allocated',  -- allocated, released, expired
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    extra_metadata TEXT,  -- JSON string
    
    -- 索引
    CONSTRAINT device_allocations_device_id_idx UNIQUE (device_id, allocated_at)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_device_allocations_device_id ON device_allocations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_allocations_user_id ON device_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_allocations_tenant_id ON device_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_allocations_status ON device_allocations(status);
CREATE INDEX IF NOT EXISTS idx_device_allocations_allocated_at ON device_allocations(allocated_at);

-- 节点资源信息表
CREATE TABLE IF NOT EXISTS node_resources (
    id VARCHAR(255) PRIMARY KEY,
    node_name VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    total_devices INTEGER DEFAULT 0,
    available_devices INTEGER DEFAULT 0,
    cpu_usage FLOAT DEFAULT 0.0,
    memory_usage FLOAT DEFAULT 0.0,
    disk_usage FLOAT DEFAULT 0.0,
    is_healthy BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_node_resources_node_name ON node_resources(node_name);
CREATE INDEX IF NOT EXISTS idx_node_resources_is_healthy ON node_resources(is_healthy);
CREATE INDEX IF NOT EXISTS idx_node_resources_available_devices ON node_resources(available_devices);
CREATE INDEX IF NOT EXISTS idx_node_resources_last_heartbeat ON node_resources(last_heartbeat);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_node_resources_updated_at 
    BEFORE UPDATE ON node_resources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE device_allocations IS '设备分配记录表，记录设备分配给用户的历史';
COMMENT ON TABLE node_resources IS '节点资源信息表，存储各节点的资源使用情况';

COMMENT ON COLUMN device_allocations.status IS '分配状态: allocated-已分配, released-已释放, expired-已过期';
COMMENT ON COLUMN device_allocations.extra_metadata IS '额外的元数据信息，JSON格式';
COMMENT ON COLUMN node_resources.is_healthy IS '节点健康状态';
COMMENT ON COLUMN node_resources.last_heartbeat IS '最后心跳时间';

