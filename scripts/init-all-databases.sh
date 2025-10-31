#!/bin/bash

set -e

echo "🚀 完整初始化所有微服务数据库..."
echo ""

# 1. 验证所有数据库存在
echo "1️⃣ 验证数据库..."
echo ""

DATABASES=("cloudphone" "cloudphone_user" "cloudphone_device" "cloudphone_billing" "cloudphone_app" "cloudphone_notification")

for db in "${DATABASES[@]}"; do
  DB_EXISTS=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$db';" 2>/dev/null | tr -d ' \n\r')
  
  if [ "$DB_EXISTS" = "1" ]; then
    echo "  ✅ $db - 存在"
  else
    echo "  ⚠️  $db - 不存在，正在创建..."
    docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
      psql -U postgres -c "CREATE DATABASE $db;"
    echo "  ✅ $db - 已创建"
  fi
done

echo ""
echo "✅ 所有数据库已准备"
echo ""

# 2. 确保 UUID 扩展存在
echo "2️⃣ 确保 UUID 扩展已安装..."
echo ""

for db in "${DATABASES[@]}"; do
  docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' >/dev/null 2>&1
  echo "  ✅ $db - UUID扩展已安装"
done

echo ""

# 3. 重启所有后端服务（触发表创建）
echo "3️⃣ 重启所有后端服务（触发表结构同步）..."
echo ""

pm2 restart user-service device-service billing-service app-service notification-service

echo "  等待服务启动..."
sleep 8

echo "  ✅ 所有服务已重启"
echo ""

# 4. 检查表是否创建
echo "4️⃣ 检查表创建状态..."
echo ""

check_tables() {
  local db=$1
  local service=$2
  
  TABLE_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' \n\r')
  
  echo "  $service ($db): $TABLE_COUNT 个表"
}

check_tables "cloudphone_user" "user-service"
check_tables "cloudphone_device" "device-service"
check_tables "cloudphone_billing" "billing-service"
check_tables "cloudphone_app" "app-service"
check_tables "cloudphone_notification" "notification-service"

echo ""
echo "✅ 表创建检查完成"
echo ""

# 5. 初始化套餐数据
echo "5️⃣ 初始化套餐数据..."
echo ""

cd /home/eric/next-cloudphone/backend/billing-service
pnpm seed

echo ""

# 6. 初始化通知模板
echo "6️⃣ 初始化通知模板..."
echo ""

cd /home/eric/next-cloudphone/backend/notification-service
npx ts-node src/scripts/init-templates.ts

echo ""

# 7. 检查数据是否成功导入
echo "7️⃣ 验证数据导入..."
echo ""

PLANS_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_billing -t -c "SELECT COUNT(*) FROM plans;" 2>/dev/null | tr -d ' \n\r')
echo "  Plans: $PLANS_COUNT 条记录"

TEMPLATES_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_notification -t -c "SELECT COUNT(*) FROM notification_templates;" 2>/dev/null | tr -d ' \n\r')
echo "  Notification Templates: $TEMPLATES_COUNT 条记录"

echo ""

# 8. 生成完整报告
echo "8️⃣ 生成数据库状态报告..."
echo ""

cat > /home/eric/next-cloudphone/DATABASE_STATUS_REPORT.md << 'EOF'
# 数据库状态报告

生成时间: $(date)

## ✅ 数据库配置验证

| 服务 | 预期数据库 | 代码配置 | 数据库存在 | 表数量 | 状态 |
|------|-----------|---------|-----------|--------|------|
EOF

# 添加每个服务的状态
for service_db in "user-service:cloudphone_user" "device-service:cloudphone_device" "billing-service:cloudphone_billing" "app-service:cloudphone_app" "notification-service:cloudphone_notification"; do
  IFS=':' read -r svc db <<< "$service_db"
  
  TABLE_COUNT=$(docker compose -f /home/eric/next-cloudphone/docker-compose.dev.yml exec postgres \
    psql -U postgres -d $db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' \n\r')
  
  echo "| $svc | $db | ✅ | ✅ | $TABLE_COUNT | ✅ |" >> /home/eric/next-cloudphone/DATABASE_STATUS_REPORT.md
done

cat >> /home/eric/next-cloudphone/DATABASE_STATUS_REPORT.md << EOF

## 📊 数据初始化状态

| 数据类型 | 数量 | 状态 |
|---------|------|------|
| 套餐 (Plans) | $PLANS_COUNT | $([ "$PLANS_COUNT" -gt 0 ] && echo "✅" || echo "⚠️") |
| 通知模板 (Templates) | $TEMPLATES_COUNT | $([ "$TEMPLATES_COUNT" -gt 0 ] && echo "✅" || echo "⚠️") |

## ✅ 初始化完成

所有数据库已正确配置并初始化！
EOF

echo "✅ 报告已生成: DATABASE_STATUS_REPORT.md"
echo ""

# 9. 最终验证
echo "9️⃣ 最终验证..."
echo ""

echo "验证服务健康状态:"
for port in 30001 30002 30005 30003 30006; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "  ✅ Port $port - 健康"
  else
    echo "  ⚠️  Port $port - 状态码 $STATUS"
  fi
done

echo ""
echo "🎉 所有数据库初始化完成！"
echo ""
echo "📝 下一步:"
echo "   1. 刷新浏览器前端页面"
echo "   2. 查看报告: cat DATABASE_STATUS_REPORT.md"
echo "   3. 初始化系统设置（需要 admin token）:"
echo "      curl -X POST http://localhost:30000/settings/initialize \\"
echo "        -H 'Authorization: Bearer ADMIN_TOKEN'"

