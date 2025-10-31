#!/bin/bash

set -e

echo "🚀 开始迁移 notification-service 到独立数据库..."
echo ""

# 1. 创建新数据库
echo "1️⃣ 创建 cloudphone_notification 数据库..."
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -c "CREATE DATABASE cloudphone_notification;" 2>/dev/null || echo "  数据库已存在，跳过创建"

echo "✅ 数据库已准备"
echo ""

# 2. 导出 notification 相关的表
echo "2️⃣ 导出 notification 相关的表和数据..."

TABLES="notifications notification_templates notification_preferences sms_records"

for table in $TABLES; do
  echo "  导出表: $table"
  docker compose -f docker-compose.dev.yml exec postgres \
    pg_dump -U postgres -d cloudphone -t $table --no-owner --no-acl \
    > /tmp/notification_${table}.sql 2>/dev/null || echo "  ⚠️  表 $table 不存在，跳过"
done

echo "✅ 表结构和数据已导出"
echo ""

# 3. 导入到新数据库
echo "3️⃣ 导入到 cloudphone_notification 数据库..."

for table in $TABLES; do
  if [ -f /tmp/notification_${table}.sql ]; then
    echo "  导入表: $table"
    docker compose -f docker-compose.dev.yml exec -T postgres \
      psql -U postgres -d cloudphone_notification < /tmp/notification_${table}.sql 2>&1 | grep -v "already exists" || true
    rm /tmp/notification_${table}.sql
  fi
done

echo "✅ 数据已导入到新数据库"
echo ""

# 4. 验证迁移
echo "4️⃣ 验证迁移结果..."
echo "新数据库的表列表:"
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_notification -c "\dt"

echo ""
echo "数据记录数:"
for table in $TABLES; do
  COUNT=$(docker compose -f docker-compose.dev.yml exec postgres \
    psql -U postgres -d cloudphone_notification -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' \n\r' || echo "0")
  if [ ! -z "$COUNT" ]; then
    echo "  $table: $COUNT 条记录"
  fi
done

echo ""
echo "✅ 迁移验证完成"
echo ""

# 5. 提示后续步骤
echo "📝 后续步骤:"
echo ""
echo "1. 更新 notification-service 配置:"
echo "   编辑 backend/notification-service/.env"
echo "   修改: DB_DATABASE=cloudphone_notification"
echo ""
echo "2. 重启 notification-service:"
echo "   pm2 restart notification-service"
echo ""
echo "3. 验证服务正常:"
echo "   curl http://localhost:30006/health"
echo ""
echo "4. （可选）清理旧数据库中的表:"
echo "   docker compose -f docker-compose.dev.yml exec postgres \\"
echo "     psql -U postgres -d cloudphone -c \"DROP TABLE IF EXISTS notifications, notification_templates, notification_preferences, sms_records CASCADE;\""
echo ""
echo "✅ 迁移脚本执行完成！"

