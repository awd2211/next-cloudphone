-- User Service 极致优化 - Phase 3: 查询级优化
-- 日期: 2025-10-29
-- 描述: 物化视图、预计算聚合表、查询优化

-- ========================================
-- 1. 用户统计物化视图
-- ========================================

-- 1.1 用户总体统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE status = 'active') AS active_users,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_users,
  COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_users,
  COUNT(*) FILTER (WHERE is_locked = true) AS locked_users,
  COUNT(*) FILTER (WHERE is_super_admin = true) AS super_admin_count,
  COUNT(*) FILTER (WHERE last_login_at > CURRENT_DATE - INTERVAL '7 days') AS active_last_7_days,
  COUNT(*) FILTER (WHERE last_login_at > CURRENT_DATE - INTERVAL '30 days') AS active_last_30_days,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') AS new_users_last_7_days,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') AS new_users_last_30_days,
  CURRENT_TIMESTAMP AS last_refreshed
FROM users;

-- 创建唯一索引（物化视图需要唯一索引才能使用 CONCURRENTLY 刷新）
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_stats_refresh
  ON mv_user_stats (last_refreshed);

COMMENT ON MATERIALIZED VIEW mv_user_stats IS
  '用户统计物化视图 - 每小时刷新一次，提供快速的用户统计数据';

-- 1.2 按租户的用户统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats_by_tenant AS
SELECT
  tenant_id,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE status = 'active') AS active_users,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_users,
  COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_users,
  COUNT(*) FILTER (WHERE is_locked = true) AS locked_users,
  COUNT(*) FILTER (WHERE last_login_at > CURRENT_DATE - INTERVAL '7 days') AS active_last_7_days,
  COUNT(*) FILTER (WHERE last_login_at > CURRENT_DATE - INTERVAL '30 days') AS active_last_30_days,
  MAX(last_login_at) AS last_activity,
  MIN(created_at) AS first_user_created_at,
  MAX(created_at) AS last_user_created_at,
  CURRENT_TIMESTAMP AS last_refreshed
FROM users
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id;

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_stats_by_tenant_pk
  ON mv_user_stats_by_tenant (tenant_id);

-- 性能索引
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_by_tenant_refresh
  ON mv_user_stats_by_tenant (last_refreshed);

COMMENT ON MATERIALIZED VIEW mv_user_stats_by_tenant IS
  '按租户的用户统计物化视图 - 每小时刷新一次';

-- 1.3 用户事件统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_event_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS event_date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT aggregate_id) AS unique_users,
  CURRENT_TIMESTAMP AS last_refreshed
FROM user_events
WHERE created_at > CURRENT_DATE - INTERVAL '90 days'  -- 只统计最近 90 天
GROUP BY DATE_TRUNC('day', created_at), event_type;

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_event_stats_pk
  ON mv_user_event_stats (event_date, event_type);

-- 性能索引
CREATE INDEX IF NOT EXISTS idx_mv_user_event_stats_date
  ON mv_user_event_stats (event_date DESC);

COMMENT ON MATERIALIZED VIEW mv_user_event_stats IS
  '用户事件统计物化视图（最近 90 天）- 每小时刷新一次';

-- 1.4 用户活跃度物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity AS
SELECT
  aggregate_id AS user_id,
  COUNT(*) AS total_events,
  MIN(created_at) AS first_event_at,
  MAX(created_at) AS last_event_at,
  COUNT(DISTINCT event_type) AS unique_event_types,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') AS events_last_7_days,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') AS events_last_30_days,
  CURRENT_TIMESTAMP AS last_refreshed
FROM user_events
GROUP BY aggregate_id;

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_activity_pk
  ON mv_user_activity (user_id);

-- 性能索引
CREATE INDEX IF NOT EXISTS idx_mv_user_activity_last_event
  ON mv_user_activity (last_event_at DESC);

CREATE INDEX IF NOT EXISTS idx_mv_user_activity_events_7days
  ON mv_user_activity (events_last_7_days DESC)
  WHERE events_last_7_days > 0;

COMMENT ON MATERIALIZED VIEW mv_user_activity IS
  '用户活跃度物化视图 - 统计每个用户的事件数量和活跃度';

RAISE NOTICE '✓ 物化视图已创建';

-- ========================================
-- 2. 预计算聚合表（实时更新）
-- ========================================

-- 2.1 每日用户统计表
CREATE TABLE IF NOT EXISTS daily_user_stats (
  stat_date DATE NOT NULL PRIMARY KEY,
  total_users INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  deleted_users INT NOT NULL DEFAULT 0,
  active_users_7d INT NOT NULL DEFAULT 0,
  active_users_30d INT NOT NULL DEFAULT 0,
  login_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_user_stats_date
  ON daily_user_stats (stat_date DESC);

COMMENT ON TABLE daily_user_stats IS
  '每日用户统计表 - 通过触发器实时更新';

-- 2.2 每小时事件统计表
CREATE TABLE IF NOT EXISTS hourly_event_stats (
  stat_hour TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_count BIGINT NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_hour, event_type)
);

CREATE INDEX IF NOT EXISTS idx_hourly_event_stats_hour
  ON hourly_event_stats (stat_hour DESC);

CREATE INDEX IF NOT EXISTS idx_hourly_event_stats_type
  ON hourly_event_stats (event_type, stat_hour DESC);

COMMENT ON TABLE hourly_event_stats IS
  '每小时事件统计表 - 通过触发器实时更新';

-- 2.3 租户配额使用统计表
CREATE TABLE IF NOT EXISTS tenant_quota_stats (
  tenant_id VARCHAR(36) NOT NULL PRIMARY KEY,
  total_users INT NOT NULL DEFAULT 0,
  total_devices INT NOT NULL DEFAULT 0,
  total_storage_bytes BIGINT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_quota_stats_activity
  ON tenant_quota_stats (last_activity_at DESC NULLS LAST);

COMMENT ON TABLE tenant_quota_stats IS
  '租户配额使用统计表 - 通过应用层更新';

RAISE NOTICE '✓ 预计算聚合表已创建';

-- ========================================
-- 3. 物化视图自动刷新函数
-- ========================================

-- 3.1 刷新所有物化视图函数
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL, rows_affected BIGINT) AS $$
DECLARE
  view_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
  row_count BIGINT;
BEGIN
  FOR view_record IN
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname LIKE 'mv_%'
    ORDER BY matviewname
  LOOP
    start_time := clock_timestamp();

    -- 并发刷新（不阻塞读取）
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_record.matviewname);

    end_time := clock_timestamp();
    duration := end_time - start_time;

    -- 获取行数
    EXECUTE format('SELECT COUNT(*) FROM %I', view_record.matviewname) INTO row_count;

    view_name := view_record.matviewname;
    refresh_time := duration;
    rows_affected := row_count;

    RETURN NEXT;

    RAISE NOTICE '✓ 刷新物化视图: % (耗时: %, 行数: %)', view_record.matviewname, duration, row_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_materialized_views() IS
  '刷新所有物化视图（并发模式，不阻塞读取）';

-- 3.2 刷新单个物化视图函数
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
BEGIN
  start_time := clock_timestamp();

  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);

  end_time := clock_timestamp();
  duration := end_time - start_time;

  RAISE NOTICE '✓ 刷新物化视图 % 完成 (耗时: %)', view_name, duration;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_materialized_view(TEXT) IS
  '刷新指定物化视图（并发模式）';

-- ========================================
-- 4. 触发器：实时更新预计算表
-- ========================================

-- 4.1 更新每日用户统计的触发器函数
CREATE OR REPLACE FUNCTION update_daily_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  stat_date DATE;
BEGIN
  stat_date := CURRENT_DATE;

  -- 初始化当天记录（如果不存在）
  INSERT INTO daily_user_stats (stat_date, total_users)
  VALUES (stat_date, 0)
  ON CONFLICT (stat_date) DO NOTHING;

  IF TG_OP = 'INSERT' THEN
    -- 新增用户
    UPDATE daily_user_stats
    SET
      total_users = total_users + 1,
      new_users = new_users + 1,
      active_users = active_users + CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END,
      updated_at = CURRENT_TIMESTAMP
    WHERE stat_date = DATE(NEW.created_at);

  ELSIF TG_OP = 'UPDATE' THEN
    -- 状态变更
    IF OLD.status != NEW.status THEN
      UPDATE daily_user_stats
      SET
        active_users = active_users
          + CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END
          - CASE WHEN OLD.status = 'active' THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP
      WHERE stat_date = stat_date;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- 删除用户
    UPDATE daily_user_stats
    SET
      total_users = total_users - 1,
      deleted_users = deleted_users + 1,
      active_users = active_users - CASE WHEN OLD.status = 'active' THEN 1 ELSE 0 END,
      updated_at = CURRENT_TIMESTAMP
    WHERE stat_date = stat_date;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_daily_user_stats ON users;
CREATE TRIGGER trg_update_daily_user_stats
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_user_stats();

COMMENT ON FUNCTION update_daily_user_stats() IS
  '触发器函数：实时更新每日用户统计';

-- 4.2 更新每小时事件统计的触发器函数
CREATE OR REPLACE FUNCTION update_hourly_event_stats()
RETURNS TRIGGER AS $$
DECLARE
  stat_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  stat_hour := DATE_TRUNC('hour', NEW.created_at);

  -- 插入或更新统计
  INSERT INTO hourly_event_stats (stat_hour, event_type, event_count, unique_users)
  VALUES (stat_hour, NEW.event_type, 1, 1)
  ON CONFLICT (stat_hour, event_type) DO UPDATE
  SET
    event_count = hourly_event_stats.event_count + 1,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_hourly_event_stats ON user_events;
CREATE TRIGGER trg_update_hourly_event_stats
  AFTER INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION update_hourly_event_stats();

COMMENT ON FUNCTION update_hourly_event_stats() IS
  '触发器函数：实时更新每小时事件统计';

RAISE NOTICE '✓ 触发器已创建';

-- ========================================
-- 5. 查询优化辅助视图
-- ========================================

-- 5.1 活跃用户视图（最近 30 天有活动）
CREATE OR REPLACE VIEW v_active_users AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.status,
  u.last_login_at,
  u.created_at,
  ma.total_events,
  ma.events_last_7_days,
  ma.events_last_30_days
FROM users u
LEFT JOIN mv_user_activity ma ON ma.user_id = u.id
WHERE u.status = 'active'
  AND (
    u.last_login_at > CURRENT_DATE - INTERVAL '30 days'
    OR ma.events_last_30_days > 0
  );

COMMENT ON VIEW v_active_users IS
  '活跃用户视图 - 最近 30 天有登录或事件活动的用户';

-- 5.2 用户详情视图（包含统计信息）
CREATE OR REPLACE VIEW v_user_details AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.status,
  u.is_locked,
  u.is_super_admin,
  u.last_login_at,
  u.created_at,
  u.updated_at,
  u.tenant_id,
  COALESCE(ma.total_events, 0) AS total_events,
  COALESCE(ma.events_last_7_days, 0) AS events_last_7_days,
  COALESCE(ma.events_last_30_days, 0) AS events_last_30_days,
  ma.last_event_at,
  ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
FROM users u
LEFT JOIN mv_user_activity ma ON ma.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY
  u.id, u.username, u.email, u.full_name, u.status,
  u.is_locked, u.is_super_admin, u.last_login_at,
  u.created_at, u.updated_at, u.tenant_id,
  ma.total_events, ma.events_last_7_days, ma.events_last_30_days, ma.last_event_at;

COMMENT ON VIEW v_user_details IS
  '用户详情视图 - 包含统计信息和角色列表';

RAISE NOTICE '✓ 辅助视图已创建';

-- ========================================
-- 6. 初始化预计算表数据
-- ========================================

-- 6.1 初始化当天的每日统计
INSERT INTO daily_user_stats (stat_date, total_users, new_users, active_users)
SELECT
  CURRENT_DATE,
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at::DATE = CURRENT_DATE),
  COUNT(*) FILTER (WHERE status = 'active')
FROM users
ON CONFLICT (stat_date) DO UPDATE
SET
  total_users = EXCLUDED.total_users,
  new_users = EXCLUDED.new_users,
  active_users = EXCLUDED.active_users,
  updated_at = CURRENT_TIMESTAMP;

-- 6.2 初始化最近 7 天的每日统计
INSERT INTO daily_user_stats (stat_date, total_users, new_users, active_users)
SELECT
  date_series.day,
  (SELECT COUNT(*) FROM users WHERE created_at::DATE <= date_series.day),
  (SELECT COUNT(*) FROM users WHERE created_at::DATE = date_series.day),
  (SELECT COUNT(*) FROM users WHERE status = 'active' AND created_at::DATE <= date_series.day)
FROM generate_series(
  CURRENT_DATE - INTERVAL '6 days',
  CURRENT_DATE - INTERVAL '1 day',
  INTERVAL '1 day'
) AS date_series(day)
ON CONFLICT (stat_date) DO NOTHING;

RAISE NOTICE '✓ 预计算表数据已初始化';

-- ========================================
-- 7. 性能优化：初始刷新物化视图
-- ========================================

SELECT refresh_all_materialized_views();

RAISE NOTICE '✓ 物化视图已初始刷新';

-- ========================================
-- 8. 设置 pg_cron 定时任务（需要 pg_cron 扩展）
-- ========================================

-- 注意：需要先安装 pg_cron 扩展
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每小时刷新物化视图
-- SELECT cron.schedule('refresh-materialized-views', '0 * * * *', 'SELECT refresh_all_materialized_views()');

-- 每天凌晨清理旧的每小时统计数据（保留 90 天）
-- SELECT cron.schedule('cleanup-hourly-stats', '0 2 * * *',
--   'DELETE FROM hourly_event_stats WHERE stat_hour < CURRENT_DATE - INTERVAL ''90 days''');

RAISE NOTICE '========================================';
RAISE NOTICE '提示：物化视图刷新定时任务';
RAISE NOTICE '如需启用自动刷新，请安装 pg_cron 扩展并取消注释定时任务';
RAISE NOTICE '或在应用层实现定时刷新';
RAISE NOTICE '========================================';

-- ========================================
-- 9. 查询优化统计函数
-- ========================================

-- 9.1 获取物化视图刷新状态
CREATE OR REPLACE FUNCTION get_materialized_view_status()
RETURNS TABLE(
  view_name TEXT,
  last_refreshed TIMESTAMP WITH TIME ZONE,
  is_stale BOOLEAN,
  row_count BIGINT,
  size TEXT
) AS $$
DECLARE
  view_record RECORD;
  last_refresh TIMESTAMP WITH TIME ZONE;
  stale BOOLEAN;
  rows BIGINT;
  view_size TEXT;
BEGIN
  FOR view_record IN
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname LIKE 'mv_%'
  LOOP
    -- 获取最后刷新时间
    EXECUTE format('SELECT last_refreshed FROM %I LIMIT 1', view_record.matviewname)
      INTO last_refresh;

    -- 判断是否过期（超过 2 小时）
    stale := (last_refresh IS NULL OR last_refresh < CURRENT_TIMESTAMP - INTERVAL '2 hours');

    -- 获取行数
    EXECUTE format('SELECT COUNT(*) FROM %I', view_record.matviewname) INTO rows;

    -- 获取大小
    EXECUTE format('SELECT pg_size_pretty(pg_total_relation_size(%L))', view_record.matviewname)
      INTO view_size;

    view_name := view_record.matviewname;
    last_refreshed := last_refresh;
    is_stale := stale;
    row_count := rows;
    size := view_size;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_materialized_view_status() IS
  '获取所有物化视图的刷新状态和大小';

-- ========================================
-- 10. 最终报告
-- ========================================

DO $$
DECLARE
  mv_count INT;
  table_count INT;
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO mv_count
  FROM pg_matviews
  WHERE schemaname = 'public' AND matviewname LIKE 'mv_%';

  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('daily_user_stats', 'hourly_event_stats', 'tenant_quota_stats');

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'trg_%';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Phase 3: 查询级优化完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '物化视图数量: %', mv_count;
  RAISE NOTICE '预计算表数量: %', table_count;
  RAISE NOTICE '触发器数量: %', trigger_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '后续操作:';
  RAISE NOTICE '1. 查看物化视图状态: SELECT * FROM get_materialized_view_status();';
  RAISE NOTICE '2. 手动刷新物化视图: SELECT refresh_all_materialized_views();';
  RAISE NOTICE '3. 查看每日统计: SELECT * FROM daily_user_stats ORDER BY stat_date DESC LIMIT 30;';
  RAISE NOTICE '4. 查看用户详情: SELECT * FROM v_user_details LIMIT 10;';
  RAISE NOTICE '========================================';
END $$;
