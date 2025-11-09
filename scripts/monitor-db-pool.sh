#!/bin/bash

# ========================================
# 数据库连接池监控脚本
# ========================================
# 用途: 实时监控所有服务的数据库连接池使用情况
# 使用: ./scripts/monitor-db-pool.sh [watch]
#       watch 模式: 每5秒自动刷新

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 数据库连接信息（从环境变量或默认值）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"

# 是否为 watch 模式
WATCH_MODE=false
if [ "$1" == "watch" ]; then
  WATCH_MODE=true
fi

# 显示函数
show_pool_status() {
  clear

  echo -e "${BOLD}=========================================${NC}"
  echo -e "${BOLD}📊 数据库连接池监控${NC}"
  echo -e "${BOLD}=========================================${NC}"
  echo -e "数据库: ${CYAN}${DB_HOST}:${DB_PORT}${NC}"
  echo -e "时间: ${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo ""

  # 1. 连接池总览
  echo -e "${BOLD}1️⃣  连接池使用情况${NC}"
  echo "----------------------------------------"

  POOL_QUERY="
  SELECT
    application_name,
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active,
    COUNT(*) FILTER (WHERE state = 'idle') as idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    ROUND(100.0 * COUNT(*) FILTER (WHERE state = 'active') / NULLIF(COUNT(*), 0), 2) as usage_pct
  FROM pg_stat_activity
  WHERE application_name IN (
    'billing-service',
    'device-service',
    'app-service',
    'notification-service',
    'proxy-service',
    'sms-receive-service',
    'user-service'
  )
  GROUP BY application_name
  ORDER BY usage_pct DESC NULLS LAST, application_name;
  "

  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -A -F '|' -c "$POOL_QUERY" 2>/dev/null | while IFS='|' read -r app_name total active idle idle_in_tx usage_pct; do
    if [ -n "$app_name" ]; then
      # 根据使用率设置颜色
      if (( $(echo "$usage_pct >= 90" | bc -l) )); then
        COLOR=$RED
        STATUS="🔴 严重"
      elif (( $(echo "$usage_pct >= 70" | bc -l) )); then
        COLOR=$YELLOW
        STATUS="🟡 警告"
      else
        COLOR=$GREEN
        STATUS="🟢 正常"
      fi

      echo -e "${BOLD}$app_name${NC}"
      echo -e "  总连接: ${CYAN}$total${NC}  |  活跃: ${COLOR}$active${NC}  |  空闲: $idle  |  事务中: $idle_in_tx"
      echo -e "  使用率: ${COLOR}${usage_pct}%${NC}  |  状态: $STATUS"
      echo ""
    fi
  done

  # 2. 慢查询监控
  echo ""
  echo -e "${BOLD}2️⃣  慢查询统计（>1秒）${NC}"
  echo "----------------------------------------"

  SLOW_QUERY="
  SELECT
    LEFT(query, 80) as query_preview,
    calls,
    ROUND(mean_exec_time::numeric, 2) as avg_ms,
    ROUND(max_exec_time::numeric, 2) as max_ms
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 5;
  "

  SLOW_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "$SLOW_QUERY" 2>/dev/null || echo "")

  if [ -z "$SLOW_RESULT" ] || [ "$SLOW_RESULT" == "" ]; then
    echo -e "${GREEN}✅ 没有慢查询（太棒了！）${NC}"
  else
    echo "$SLOW_RESULT" | head -5
  fi

  # 3. 连接等待时间
  echo ""
  echo -e "${BOLD}3️⃣  长时间运行的查询${NC}"
  echo "----------------------------------------"

  LONG_RUNNING_QUERY="
  SELECT
    application_name,
    pid,
    LEFT(query, 60) as query_preview,
    EXTRACT(EPOCH FROM (now() - query_start))::int as duration_sec,
    state
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND application_name IN (
      'billing-service',
      'device-service',
      'app-service',
      'notification-service',
      'proxy-service',
      'sms-receive-service',
      'user-service'
    )
    AND query_start < now() - interval '5 seconds'
  ORDER BY duration_sec DESC
  LIMIT 5;
  "

  LONG_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "$LONG_RUNNING_QUERY" 2>/dev/null || echo "")

  if [ -z "$LONG_RESULT" ] || [ "$LONG_RESULT" == "" ]; then
    echo -e "${GREEN}✅ 没有长时间运行的查询${NC}"
  else
    echo "$LONG_RESULT" | head -5
  fi

  # 4. 数据库整体统计
  echo ""
  echo -e "${BOLD}4️⃣  数据库整体状态${NC}"
  echo "----------------------------------------"

  OVERALL_QUERY="
  SELECT
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
    MAX(EXTRACT(EPOCH FROM (now() - query_start)))::int as longest_query_sec
  FROM pg_stat_activity
  WHERE pid != pg_backend_pid();
  "

  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -A -F '|' -c "$OVERALL_QUERY" 2>/dev/null | while IFS='|' read -r total active idle longest; do
    echo -e "  总连接数: ${CYAN}$total${NC}"
    echo -e "  活跃连接: ${GREEN}$active${NC}"
    echo -e "  空闲连接: $idle"
    if [ "$longest" != "" ] && [ "$longest" -gt 30 ]; then
      echo -e "  最长查询: ${RED}${longest}秒${NC} ⚠️"
    else
      echo -e "  最长查询: ${GREEN}${longest}秒${NC}"
    fi
  done

  echo ""
  echo -e "${BOLD}=========================================${NC}"

  if [ "$WATCH_MODE" = true ]; then
    echo -e "${CYAN}🔄 自动刷新中... (Ctrl+C 退出)${NC}"
  else
    echo -e "${CYAN}💡 提示: 使用 './scripts/monitor-db-pool.sh watch' 启用自动刷新${NC}"
  fi

  echo -e "${BOLD}=========================================${NC}"
}

# 主逻辑
if [ "$WATCH_MODE" = true ]; then
  # Watch 模式：每5秒刷新
  while true; do
    show_pool_status
    sleep 5
  done
else
  # 单次显示
  show_pool_status
fi
