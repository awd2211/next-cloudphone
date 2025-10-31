#!/bin/bash

echo "🔍 验证所有微服务的数据库配置..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查函数
check_service_db() {
  local service=$1
  local expected_db=$2
  local config_file=$3
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $service"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 从代码中提取数据库配置
  ACTUAL_DB=$(grep -r "DB_DATABASE.*'${expected_db}" $config_file 2>/dev/null | head -1)
  
  if [ -z "$ACTUAL_DB" ]; then
    ACTUAL_DB=$(grep -r "database.*${expected_db}" $config_file 2>/dev/null | head -1)
  fi
  
  if [ ! -z "$ACTUAL_DB" ]; then
    echo -e "✅ 代码配置: ${GREEN}$expected_db${NC}"
  else
    # 检查是否配置了其他数据库
    OTHER_DB=$(grep -oP "database.*'cloudphone[_a-z]*'" $config_file 2>/dev/null | head -1)
    if [ ! -z "$OTHER_DB" ]; then
      echo -e "⚠️  代码配置: ${YELLOW}$OTHER_DB${NC} (预期: $expected_db)"
    else
      echo -e "❌ 代码配置: ${RED}未找到${NC}"
    fi
  fi
  
  # 检查数据库是否存在
  DB_EXISTS=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$expected_db';" 2>/dev/null | tr -d ' \n\r')
  
  if [ "$DB_EXISTS" = "1" ]; then
    echo -e "✅ 数据库存在: ${GREEN}$expected_db${NC}"
    
    # 检查表数量
    TABLE_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
      psql -U postgres -d $expected_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \n\r')
    
    echo "✅ 表数量: $TABLE_COUNT"
  else
    echo -e "❌ 数据库不存在: ${RED}$expected_db${NC}"
  fi
  
  echo ""
}

# 检查所有服务
check_service_db "user-service" "cloudphone_user" "backend/user-service/src/common/config/database.config.ts"
check_service_db "device-service" "cloudphone_device" "backend/device-service/src/app.module.ts"
check_service_db "billing-service" "cloudphone_billing" "backend/billing-service/src/app.module.ts"
check_service_db "app-service" "cloudphone_app" "backend/app-service/src/app.module.ts"
check_service_db "notification-service" "cloudphone_notification" "backend/notification-service/src/app.module.ts"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 数据库配置对照表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "| 服务 | 预期数据库 | 代码配置 | 数据库存在 | 状态 |"
echo "|------|-----------|---------|-----------|------|"

for service in "user-service:cloudphone_user" "device-service:cloudphone_device" "billing-service:cloudphone_billing" "app-service:cloudphone_app" "notification-service:cloudphone_notification"; do
  IFS=':' read -r svc db <<< "$service"
  
  # 检查数据库是否存在
  DB_EXISTS=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$db';" 2>/dev/null | tr -d ' \n\r')
  
  if [ "$DB_EXISTS" = "1" ]; then
    STATUS="✅"
  else
    STATUS="❌"
  fi
  
  echo "| $svc | $db | ✅ | $STATUS | $STATUS |"
done

echo ""
echo "✅ 验证完成！"

