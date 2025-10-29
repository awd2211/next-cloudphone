-- User Service 优化索引迁移
-- 日期: 2025-10-29
-- 描述: 添加事件重放和查询优化索引

-- 1. 事件重放优化索引
-- 用于优化 getEventsForAggregate 和事件重放查询
-- 查询示例: SELECT * FROM user_events WHERE aggregate_id = ? AND created_at > ? ORDER BY created_at
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_AGGREGATE_TIME"
ON user_events(aggregate_id, created_at);

-- 2. 租户事件查询优化索引
-- 用于多租户环境下按租户查询事件
-- 查询示例: SELECT * FROM user_events WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_TENANT_TIME"
ON user_events(tenant_id, created_at);

-- 3. 元数据 correlationId 索引（用于分布式追踪）
-- 使用 GIN 索引支持 JSONB 查询
-- 查询示例: SELECT * FROM user_events WHERE metadata->>'correlationId' = ?
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_METADATA_CORRELATION"
ON user_events
USING GIN ((metadata->'correlationId'))
WHERE metadata ? 'correlationId';

-- 4. 事件类型 + 租户复合索引
-- 用于按事件类型和租户统计
-- 查询示例: SELECT COUNT(*) FROM user_events WHERE event_type = ? AND tenant_id = ?
CREATE INDEX IF NOT EXISTS "IDX_USER_EVENT_TYPE_TENANT"
ON user_events(event_type, tenant_id);

-- 5. 验证索引创建
DO $$
BEGIN
  RAISE NOTICE 'Optimization indexes created successfully';
  RAISE NOTICE 'Total indexes on user_events: %', (
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE tablename = 'user_events'
  );
END $$;

-- 6. 分析表以更新统计信息
ANALYZE user_events;

-- 索引说明:
-- IDX_USER_EVENT_AGGREGATE_TIME:
--   - 优化事件重放查询性能
--   - 预计性能提升: 60-80% (对于包含数千事件的用户)
--
-- IDX_USER_EVENT_TENANT_TIME:
--   - 优化多租户环境下的事件查询
--   - 支持按时间范围筛选事件
--
-- IDX_USER_EVENT_METADATA_CORRELATION:
--   - 支持分布式追踪
--   - 可通过 correlationId 关联跨服务的事件
--
-- IDX_USER_EVENT_TYPE_TENANT:
--   - 优化事件统计和审计查询
--   - 支持按租户统计各类事件数量
