-- 创建资源使用历史表
-- Migration: 20251103_create_resource_usage_history_table
-- Description: 创建资源使用历史记录表，用于趋势分析

-- 创建资源使用历史表
CREATE TABLE IF NOT EXISTS resource_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cpu_usage_percent DECIMAL(5, 2) NOT NULL,
    used_cpu_cores DECIMAL(5, 2) NOT NULL,
    total_cpu_cores INT NOT NULL,
    memory_usage_percent DECIMAL(5, 2) NOT NULL,
    used_memory_mb INT NOT NULL,
    total_memory_mb INT NOT NULL,
    storage_usage_percent DECIMAL(5, 2) NOT NULL,
    used_storage_gb DECIMAL(10, 2) NOT NULL,
    total_storage_gb INT NOT NULL,
    active_devices INT NOT NULL DEFAULT 0,
    max_devices INT,
    load_score DECIMAL(5, 2) NOT NULL,
    node_status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_node FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_resource_usage_history_node_time
ON resource_usage_history(node_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_usage_history_recorded_at
ON resource_usage_history(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_usage_history_node_id
ON resource_usage_history(node_id);

-- 创建部分索引用于集群级别数据（node_id为NULL）
CREATE INDEX IF NOT EXISTS idx_resource_usage_history_cluster
ON resource_usage_history(recorded_at DESC)
WHERE node_id IS NULL;

-- 添加注释
COMMENT ON TABLE resource_usage_history IS '资源使用历史记录表，用于趋势分析和监控';
COMMENT ON COLUMN resource_usage_history.node_id IS '节点ID，如果为NULL表示集群级别汇总数据';
COMMENT ON COLUMN resource_usage_history.recorded_at IS '记录时间戳';
COMMENT ON COLUMN resource_usage_history.load_score IS '负载分数 (0-100，100表示满载)';

-- 创建自动清理旧数据的函数（保留30天数据）
CREATE OR REPLACE FUNCTION cleanup_old_resource_usage_history()
RETURNS void AS $$
BEGIN
    DELETE FROM resource_usage_history
    WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理的触发器（可选，也可以通过定时任务调用）
-- 这里我们不创建触发器，而是通过应用层定时任务来调用
