-- User Service 极致优化 - Phase 2: 表分区
-- 日期: 2025-10-29
-- 描述: 为 user_events 表实施按月分区，提升大数据量查询性能

-- ========================================
-- 准备工作：备份和验证
-- ========================================

DO $$
DECLARE
  events_count BIGINT;
  table_size TEXT;
BEGIN
  SELECT COUNT(*) INTO events_count FROM user_events;
  SELECT pg_size_pretty(pg_total_relation_size('user_events')) INTO table_size;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Phase 2: 表分区优化准备';
  RAISE NOTICE '========================================';
  RAISE NOTICE '当前 user_events 记录数: %', events_count;
  RAISE NOTICE '当前表大小: %', table_size;
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 1. 重命名现有表为临时表
-- ========================================

-- 重命名现有表
ALTER TABLE IF EXISTS user_events RENAME TO user_events_old;

-- 重命名现有索引
ALTER INDEX IF EXISTS "PK_user_events" RENAME TO "PK_user_events_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_AGGREGATE" RENAME TO "IDX_USER_EVENT_AGGREGATE_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_TYPE" RENAME TO "IDX_USER_EVENT_TYPE_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_CREATED" RENAME TO "IDX_USER_EVENT_CREATED_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_AGGREGATE_TIME" RENAME TO "IDX_USER_EVENT_AGGREGATE_TIME_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_TENANT_TIME" RENAME TO "IDX_USER_EVENT_TENANT_TIME_old";
ALTER INDEX IF EXISTS "IDX_USER_EVENT_REPLAY_COVERING" RENAME TO "IDX_USER_EVENT_REPLAY_COVERING_old";
ALTER INDEX IF EXISTS "UQ_USER_EVENT_AGGREGATE_VERSION" RENAME TO "UQ_USER_EVENT_AGGREGATE_VERSION_old";

RAISE NOTICE '✓ 现有表已重命名为 user_events_old';

-- ========================================
-- 2. 创建分区主表
-- ========================================

CREATE TABLE user_events (
  id UUID NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  version INT NOT NULL,
  user_id UUID,
  tenant_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 主键包含分区键
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE user_events IS '用户事件表（按月分区）- Event Sourcing 存储';

-- ========================================
-- 3. 在主表上创建索引模板
-- ========================================

-- 唯一约束索引（使用 UNIQUE INDEX 替代 CONSTRAINT，支持分区）
-- 注意：分区表的唯一索引必须包含分区键
CREATE UNIQUE INDEX UQ_USER_EVENT_AGGREGATE_VERSION
  ON user_events (aggregate_id, version, created_at);

COMMENT ON INDEX UQ_USER_EVENT_AGGREGATE_VERSION IS
  '唯一索引：防止事件版本冲突（包含分区键以支持分区）';

-- 聚合查询索引
CREATE INDEX IDX_USER_EVENT_AGGREGATE
  ON user_events (aggregate_id, version);

-- 事件类型查询索引
CREATE INDEX IDX_USER_EVENT_TYPE
  ON user_events (event_type, created_at);

-- 时间范围查询索引
CREATE INDEX IDX_USER_EVENT_CREATED
  ON user_events (created_at);

-- 事件重放优化索引
CREATE INDEX IDX_USER_EVENT_AGGREGATE_TIME
  ON user_events (aggregate_id, created_at);

-- 租户查询优化索引
CREATE INDEX IDX_USER_EVENT_TENANT_TIME
  ON user_events (tenant_id, created_at)
  WHERE tenant_id IS NOT NULL;

-- 覆盖索引：事件重放
CREATE INDEX IDX_USER_EVENT_REPLAY_COVERING
  ON user_events (aggregate_id, version ASC, created_at)
  INCLUDE (event_type, event_data);

-- Metadata 查询索引（GIN 索引）
CREATE INDEX IDX_USER_EVENT_METADATA_CORRELATION
  ON user_events USING GIN ((metadata->'correlationId'))
  WHERE metadata ? 'correlationId';

RAISE NOTICE '✓ 分区主表和索引模板已创建';

-- ========================================
-- 4. 创建历史分区（过去 6 个月）
-- ========================================

-- 创建分区的辅助函数
CREATE OR REPLACE FUNCTION create_partition_if_not_exists(
  partition_name TEXT,
  start_date DATE,
  end_date DATE
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF user_events
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    start_date,
    end_date
  );

  RAISE NOTICE '✓ 分区已创建: % (% - %)', partition_name, start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- 创建过去 6 个月的分区
DO $$
DECLARE
  current_month DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  i INT;
BEGIN
  current_month := date_trunc('month', CURRENT_DATE);

  FOR i IN 0..5 LOOP
    start_date := current_month - (i || ' months')::INTERVAL;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'user_events_' || to_char(start_date, 'YYYY_MM');

    PERFORM create_partition_if_not_exists(partition_name, start_date, end_date);
  END LOOP;
END $$;

-- ========================================
-- 5. 创建未来分区（未来 3 个月）
-- ========================================

DO $$
DECLARE
  current_month DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  i INT;
BEGIN
  current_month := date_trunc('month', CURRENT_DATE);

  FOR i IN 1..3 LOOP
    start_date := current_month + (i || ' months')::INTERVAL;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'user_events_' || to_char(start_date, 'YYYY_MM');

    PERFORM create_partition_if_not_exists(partition_name, start_date, end_date);
  END LOOP;
END $$;

-- ========================================
-- 6. 创建默认分区（捕获未匹配的数据）
-- ========================================

CREATE TABLE IF NOT EXISTS user_events_default PARTITION OF user_events DEFAULT;

COMMENT ON TABLE user_events_default IS '默认分区：捕获未匹配任何时间范围的事件';

RAISE NOTICE '✓ 默认分区已创建';

-- ========================================
-- 7. 迁移历史数据
-- ========================================

DO $$
DECLARE
  migrated_count BIGINT;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '开始迁移历史数据...';
  RAISE NOTICE '========================================';

  start_time := clock_timestamp();

  -- 批量插入数据到新分区表
  -- 使用 INSERT ... SELECT 一次性迁移
  INSERT INTO user_events (
    id, aggregate_id, event_type, event_data, version,
    user_id, tenant_id, metadata, created_at
  )
  SELECT
    id, aggregate_id, event_type, event_data, version,
    user_id, tenant_id, metadata, created_at
  FROM user_events_old
  ORDER BY created_at; -- 按时间排序以优化插入性能

  GET DIAGNOSTICS migrated_count = ROW_COUNT;

  end_time := clock_timestamp();
  duration := end_time - start_time;

  RAISE NOTICE '✓ 数据迁移完成';
  RAISE NOTICE '  - 迁移记录数: %', migrated_count;
  RAISE NOTICE '  - 耗时: %', duration;
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 8. 验证数据完整性
-- ========================================

DO $$
DECLARE
  old_count BIGINT;
  new_count BIGINT;
  count_match BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO old_count FROM user_events_old;
  SELECT COUNT(*) INTO new_count FROM user_events;

  count_match := (old_count = new_count);

  RAISE NOTICE '========================================';
  RAISE NOTICE '数据完整性验证';
  RAISE NOTICE '========================================';
  RAISE NOTICE '原表记录数: %', old_count;
  RAISE NOTICE '新表记录数: %', new_count;
  RAISE NOTICE '数据一致性: %', CASE WHEN count_match THEN '✓ 通过' ELSE '✗ 失败' END;

  IF NOT count_match THEN
    RAISE EXCEPTION '数据迁移失败：记录数不匹配！';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 9. 自动分区管理函数
-- ========================================

-- 9.1 创建新分区函数（提前创建未来分区）
CREATE OR REPLACE FUNCTION create_future_partitions()
RETURNS VOID AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  partition_exists BOOLEAN;
BEGIN
  -- 检查并创建未来 3 个月的分区
  FOR i IN 1..3 LOOP
    next_month := date_trunc('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
    partition_name := 'user_events_' || to_char(next_month, 'YYYY_MM');
    start_date := next_month;
    end_date := next_month + INTERVAL '1 month';

    -- 检查分区是否存在
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) INTO partition_exists;

    IF NOT partition_exists THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF user_events
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        start_date,
        end_date
      );

      RAISE NOTICE '✓ 自动创建未来分区: % (% - %)', partition_name, start_date, end_date;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_future_partitions() IS
  '自动创建未来 3 个月的分区，防止分区不存在导致插入失败';

-- 9.2 清理旧分区函数（保留策略：12 个月）
CREATE OR REPLACE FUNCTION cleanup_old_partitions(retention_months INT DEFAULT 12)
RETURNS TABLE(dropped_partition TEXT, partition_date DATE) AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
  partition_date_extracted DATE;
BEGIN
  cutoff_date := date_trunc('month', CURRENT_DATE) - (retention_months || ' months')::INTERVAL;

  RAISE NOTICE '清理旧分区（保留 % 个月）', retention_months;
  RAISE NOTICE '截止日期: %', cutoff_date;

  FOR partition_record IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname LIKE 'user_events_____\___'
      AND n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    -- 提取分区日期（格式：user_events_YYYY_MM）
    partition_date_extracted := to_date(
      substring(partition_record.relname from 'user_events_(\d{4}_\d{2})'),
      'YYYY_MM'
    );

    IF partition_date_extracted < cutoff_date THEN
      -- 先 DETACH 再 DROP（更安全）
      EXECUTE format('ALTER TABLE user_events DETACH PARTITION %I', partition_record.relname);
      EXECUTE format('DROP TABLE %I', partition_record.relname);

      dropped_partition := partition_record.relname;
      partition_date := partition_date_extracted;

      RETURN NEXT;

      RAISE NOTICE '✓ 已删除旧分区: % (日期: %)', partition_record.relname, partition_date_extracted;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_partitions(INT) IS
  '清理超过保留期的旧分区（默认保留 12 个月）';

-- 9.3 分区统计函数
CREATE OR REPLACE FUNCTION get_partition_stats()
RETURNS TABLE(
  partition_name TEXT,
  partition_start DATE,
  partition_end DATE,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT,
    -- 从分区名提取日期
    to_date(substring(c.relname from 'user_events_(\d{4}_\d{2})'), 'YYYY_MM') AS partition_start,
    (to_date(substring(c.relname from 'user_events_(\d{4}_\d{2})'), 'YYYY_MM') + INTERVAL '1 month')::DATE AS partition_end,
    -- 行数（估算）
    COALESCE(c.reltuples::BIGINT, 0) AS row_count,
    -- 表大小
    pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
    -- 索引大小
    pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
    -- 总大小
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname LIKE 'user_events_%'
    AND n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_partition_stats() IS
  '获取所有分区的统计信息（大小、行数等）';

-- ========================================
-- 10. 创建分区维护视图
-- ========================================

CREATE OR REPLACE VIEW v_partition_info AS
SELECT
  pt.relname AS partition_name,
  pg_get_expr(pt.relpartbound, pt.oid) AS partition_bounds,
  pg_size_pretty(pg_total_relation_size(pt.oid)) AS size,
  (SELECT COUNT(*) FROM ONLY pg_catalog.pg_class WHERE oid = pt.oid) as has_data
FROM pg_class pt
JOIN pg_inherits i ON i.inhrelid = pt.oid
JOIN pg_class parent ON parent.oid = i.inhparent
WHERE parent.relname = 'user_events'
ORDER BY pt.relname;

COMMENT ON VIEW v_partition_info IS '分区信息视图：显示所有分区的边界和大小';

-- ========================================
-- 11. 设置 pg_cron 定时任务（需要 pg_cron 扩展）
-- ========================================

-- 注意：需要先安装 pg_cron 扩展
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每月 1 号凌晨 2 点创建未来分区
-- SELECT cron.schedule('create-future-partitions', '0 2 1 * *', 'SELECT create_future_partitions()');

-- 每月 1 号凌晨 3 点清理旧分区
-- SELECT cron.schedule('cleanup-old-partitions', '0 3 1 * *', 'SELECT cleanup_old_partitions(12)');

RAISE NOTICE '========================================';
RAISE NOTICE '提示：分区自动维护函数已创建';
RAISE NOTICE '如需启用自动维护，请安装 pg_cron 扩展并取消注释定时任务';
RAISE NOTICE '========================================';

-- ========================================
-- 12. 性能优化：更新统计信息
-- ========================================

ANALYZE user_events;

-- ========================================
-- 13. 最终报告
-- ========================================

DO $$
DECLARE
  partition_count INT;
  total_rows BIGINT;
  total_size TEXT;
BEGIN
  SELECT COUNT(*) INTO partition_count
  FROM pg_class pt
  JOIN pg_inherits i ON i.inhrelid = pt.oid
  JOIN pg_class parent ON parent.oid = i.inhparent
  WHERE parent.relname = 'user_events';

  SELECT COUNT(*) INTO total_rows FROM user_events;
  SELECT pg_size_pretty(pg_total_relation_size('user_events')) INTO total_size;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Phase 2: 表分区优化完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '分区数量: %', partition_count;
  RAISE NOTICE '总记录数: %', total_rows;
  RAISE NOTICE '总表大小: %', total_size;
  RAISE NOTICE '========================================';
  RAISE NOTICE '后续操作:';
  RAISE NOTICE '1. 验证查询性能: SELECT * FROM user_events WHERE created_at > CURRENT_DATE - INTERVAL ''7 days'';';
  RAISE NOTICE '2. 查看分区信息: SELECT * FROM v_partition_info;';
  RAISE NOTICE '3. 查看分区统计: SELECT * FROM get_partition_stats();';
  RAISE NOTICE '4. 删除旧表（确认无问题后）: DROP TABLE user_events_old;';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 14. 保留旧表备注（手动操作）
-- ========================================

COMMENT ON TABLE user_events_old IS
  '旧表备份 - 分区迁移完成后可删除（建议保留 7 天以备回滚）
   删除命令: DROP TABLE user_events_old;';
