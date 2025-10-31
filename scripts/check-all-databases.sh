#!/bin/bash

echo "🔍 检查所有微服务数据库初始化状态..."
echo ""

# 函数：检查数据库表
check_database() {
  local db_name=$1
  local service_name=$2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 $service_name ($db_name)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 检查表数量
  TABLE_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db_name -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' \n\r')
  
  if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" = "0" ]; then
    echo "❌ 表数量: 0 (数据库为空或不存在)"
    echo ""
    return 1
  fi
  
  echo "✅ 表数量: $TABLE_COUNT"
  echo ""
  
  # 列出所有表
  echo "📋 表列表:"
  docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db_name -c "\dt" 2>/dev/null | grep "public" | awk '{print "   - " $3}'
  
  echo ""
  
  # 检查关键表的记录数
  echo "📈 数据统计:"
  docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db_name -t -c "
      SELECT 
        schemaname || '.' || tablename as table_name,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as rows
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10;
    " 2>/dev/null | awk 'NF' | while read line; do echo "   $line"; done
  
  echo ""
}

# 1. cloudphone_user (user-service)
check_database "cloudphone_user" "User Service"

# 2. cloudphone_device (device-service)
check_database "cloudphone_device" "Device Service"

# 3. cloudphone_billing (billing-service)
check_database "cloudphone_billing" "Billing Service"

# 4. cloudphone_app (app-service)
check_database "cloudphone_app" "App Service"

# 5. cloudphone_notification (notification-service)
check_database "cloudphone_notification" "Notification Service"

# 6. cloudphone (shared)
check_database "cloudphone" "Shared Database (roles, permissions)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 建议的初始化操作"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 plans 表
PLANS_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_billing -t -c "SELECT COUNT(*) FROM plans;" 2>/dev/null | tr -d ' \n\r')

if [ "$PLANS_COUNT" = "0" ]; then
  echo "⚠️  Plans 表为空"
  echo "   初始化命令: cd backend/billing-service && pnpm seed"
  echo ""
fi

# 检查 notification_templates 表
TEMPLATES_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_notification -t -c "SELECT COUNT(*) FROM notification_templates;" 2>/dev/null | tr -d ' \n\r')

if [ "$TEMPLATES_COUNT" = "0" ] || [ -z "$TEMPLATES_COUNT" ]; then
  echo "⚠️  Notification Templates 表为空"
  echo "   初始化命令: cd backend/notification-service && npx ts-node src/scripts/init-templates.ts"
  echo ""
fi

# 检查 settings 表
SETTINGS_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_user -t -c "SELECT COUNT(*) FROM settings;" 2>/dev/null | tr -d ' \n\r')

if [ "$SETTINGS_COUNT" = "0" ] || [ -z "$SETTINGS_COUNT" ]; then
  echo "⚠️  Settings 表为空或不存在"
  echo "   初始化命令: curl -X POST http://localhost:30000/settings/initialize -H 'Authorization: Bearer ADMIN_TOKEN'"
  echo ""
fi

# 检查 users 表
USERS_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_user -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n\r')

if [ "$USERS_COUNT" = "0" ] || [ -z "$USERS_COUNT" ]; then
  echo "⚠️  Users 表为空"
  echo "   需要创建初始管理员用户"
  echo ""
fi

echo "✅ 检查完成！"

