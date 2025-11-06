-- 生成趋势分析测试数据
-- 用于演示和测试资源使用趋势功能

\echo '🚀 开始生成趋势分析测试数据...'
\echo ''

-- 1. 创建或查找测试节点
DO $$
DECLARE
    v_node_id UUID;
    v_node_exists BOOLEAN;
BEGIN
    -- 检查测试节点是否存在
    SELECT EXISTS(SELECT 1 FROM nodes WHERE name = 'test-node-1') INTO v_node_exists;

    IF NOT v_node_exists THEN
        RAISE NOTICE '📦 创建测试节点...';
        INSERT INTO nodes (id, name, hostname, "ipAddress", "dockerPort", status, capacity, usage, "loadScore", region, zone, labels)
        VALUES (
            gen_random_uuid(),
            'test-node-1',
            'test-node-1.local',
            '192.168.1.100',
            2375,
            'online',
            '{"totalCpuCores": 16, "totalMemoryMB": 32768, "totalStorageGB": 500, "maxDevices": 50}'::jsonb,
            '{"usedCpuCores": 0, "usedMemoryMB": 0, "usedStorageGB": 0, "activeDevices": 0, "cpuUsagePercent": 0, "memoryUsagePercent": 0, "storageUsagePercent": 0}'::jsonb,
            0,
            'us-west',
            'us-west-1a',
            '{"env": "test"}'::jsonb
        )
        RETURNING id INTO v_node_id;
        RAISE NOTICE '✅ 测试节点创建成功: %', v_node_id;
    ELSE
        SELECT id INTO v_node_id FROM nodes WHERE name = 'test-node-1';
        RAISE NOTICE '✅ 使用现有测试节点: %', v_node_id;
    END IF;
END $$;

\echo ''
\echo '📊 生成节点历史数据（过去24小时，每5分钟一条）...'

-- 2. 生成节点历史数据
INSERT INTO resource_usage_history (
    id, node_id, recorded_at,
    cpu_usage_percent, used_cpu_cores, total_cpu_cores,
    memory_usage_percent, used_memory_mb, total_memory_mb,
    storage_usage_percent, used_storage_gb, total_storage_gb,
    active_devices, max_devices, load_score, node_status, metadata
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM nodes WHERE name = 'test-node-1'),
    NOW() - (generate_series * interval '5 minutes'),
    -- CPU使用率（业务时间9-18点更高）
    GREATEST(10, LEAST(95,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 20 - 10)  -- 业务时间: 50-70%
            ELSE 30 + (random() * 20 - 10)  -- 非业务时间: 20-40%
        END
    ))::numeric(5,2),
    -- 已使用CPU核心数
    (16 * GREATEST(10, LEAST(95,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 20 - 10)
            ELSE 30 + (random() * 20 - 10)
        END
    )) / 100)::numeric(5,2),
    16,
    -- 内存使用率
    GREATEST(15, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 65 + (random() * 20 - 10)
            ELSE 35 + (random() * 20 - 10)
        END
    ))::numeric(5,2),
    -- 已使用内存
    (32768 * GREATEST(15, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 65 + (random() * 20 - 10)
            ELSE 35 + (random() * 20 - 10)
        END
    )) / 100)::integer,
    32768,
    -- 存储使用率（相对稳定）
    GREATEST(20, LEAST(80, 35 + (random() * 10)))::numeric(5,2),
    (500 * GREATEST(20, LEAST(80, 35 + (random() * 10))) / 100)::numeric(10,2),
    500,
    -- 活跃设备数
    (50 * GREATEST(10, LEAST(95,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 20 - 10)
            ELSE 30 + (random() * 20 - 10)
        END
    )) / 100)::integer,
    50,
    -- 负载分数
    ((GREATEST(10, LEAST(95,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 20 - 10)
            ELSE 30 + (random() * 20 - 10)
        END
    )) + GREATEST(15, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 65 + (random() * 20 - 10)
            ELSE 35 + (random() * 20 - 10)
        END
    ))) / 2)::numeric(5,2),
    'online',
    NULL
FROM generate_series(0, 287) AS generate_series;  -- 24小时 * 12条/小时 = 288条

\echo '✅ 节点历史数据生成完成'
\echo ''
\echo '📊 生成集群历史数据（过去24小时，每5分钟一条）...'

-- 3. 生成集群级别历史数据
INSERT INTO resource_usage_history (
    id, node_id, recorded_at,
    cpu_usage_percent, used_cpu_cores, total_cpu_cores,
    memory_usage_percent, used_memory_mb, total_memory_mb,
    storage_usage_percent, used_storage_gb, total_storage_gb,
    active_devices, max_devices, load_score, node_status, metadata
)
SELECT
    gen_random_uuid(),
    NULL,  -- NULL表示集群级别数据
    NOW() - (generate_series * interval '5 minutes'),
    -- CPU使用率
    GREATEST(10, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 55 + (random() * 15 - 7.5)
            ELSE 25 + (random() * 15 - 7.5)
        END
    ))::numeric(5,2),
    -- 集群总CPU使用（假设4个节点）
    (64 * GREATEST(10, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 55 + (random() * 15 - 7.5)
            ELSE 25 + (random() * 15 - 7.5)
        END
    )) / 100)::numeric(5,2),
    64,
    -- 内存使用率
    GREATEST(15, LEAST(85,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 15 - 7.5)
            ELSE 30 + (random() * 15 - 7.5)
        END
    ))::numeric(5,2),
    (131072 * GREATEST(15, LEAST(85,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 15 - 7.5)
            ELSE 30 + (random() * 15 - 7.5)
        END
    )) / 100)::integer,
    131072,
    -- 存储使用率
    GREATEST(20, LEAST(75, 35 + (random() * 10)))::numeric(5,2),
    (2000 * GREATEST(20, LEAST(75, 35 + (random() * 10))) / 100)::numeric(10,2),
    2000,
    -- 活跃设备数
    (200 * GREATEST(10, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 55 + (random() * 15 - 7.5)
            ELSE 25 + (random() * 15 - 7.5)
        END
    )) / 100)::integer,
    200,
    -- 负载分数
    ((GREATEST(10, LEAST(90,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 55 + (random() * 15 - 7.5)
            ELSE 25 + (random() * 15 - 7.5)
        END
    )) + GREATEST(15, LEAST(85,
        CASE
            WHEN EXTRACT(HOUR FROM NOW() - (generate_series * interval '5 minutes')) BETWEEN 9 AND 18
            THEN 60 + (random() * 15 - 7.5)
            ELSE 30 + (random() * 15 - 7.5)
        END
    ))) / 2)::numeric(5,2),
    'cluster',
    '{"onlineNodes": 4, "offlineNodes": 0, "totalNodes": 4}'::jsonb
FROM generate_series(0, 287) AS generate_series;

\echo '✅ 集群历史数据生成完成'
\echo ''
\echo '📈 数据统计:'
\echo ''

-- 4. 显示统计信息
\echo '   节点数据:'
SELECT
    COUNT(*) as "总记录数",
    MIN(recorded_at)::text as "最早时间",
    MAX(recorded_at)::text as "最新时间",
    ROUND(AVG(cpu_usage_percent), 2)::text || '%' as "平均CPU",
    ROUND(AVG(memory_usage_percent), 2)::text || '%' as "平均内存",
    ROUND(AVG(active_devices), 0)::text as "平均设备数"
FROM resource_usage_history
WHERE node_id = (SELECT id FROM nodes WHERE name = 'test-node-1');

\echo ''
\echo '   集群数据:'
SELECT
    COUNT(*) as "总记录数",
    MIN(recorded_at)::text as "最早时间",
    MAX(recorded_at)::text as "最新时间",
    ROUND(AVG(cpu_usage_percent), 2)::text || '%' as "平均CPU",
    ROUND(AVG(memory_usage_percent), 2)::text || '%' as "平均内存",
    ROUND(AVG(active_devices), 0)::text as "平均设备数"
FROM resource_usage_history
WHERE node_id IS NULL;

\echo ''
\echo '✨ 测试数据生成完成！'
\echo ''
\echo '💡 获取测试节点ID:'
SELECT id as "测试节点ID", name as "节点名称" FROM nodes WHERE name = 'test-node-1';

\echo ''
\echo '💡 现在可以测试趋势API:'
\echo '   节点趋势: curl -H "Authorization: Bearer $TOKEN" "http://localhost:30002/scheduler/nodes/{nodeId}/usage-trend?hours=24"'
\echo '   集群趋势: curl -H "Authorization: Bearer $TOKEN" "http://localhost:30002/scheduler/cluster/usage-trend?hours=24"'
\echo ''
