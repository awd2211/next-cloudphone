#!/bin/bash
# 数据库拆分执行脚本

set -e

echo "========================================="
echo "云手机平台 - 数据库拆分"
echo "========================================="

# 数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

export PGPASSWORD=$DB_PASSWORD

echo "1. 检查原数据库是否存在..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw cloudphone
if [ $? -ne 0 ]; then
  echo "❌ 错误: 原数据库 cloudphone 不存在"
  exit 1
fi
echo "✅ 原数据库存在"

echo ""
echo "2. 备份原数据库..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER cloudphone > /tmp/cloudphone_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ 备份完成: /tmp/cloudphone_backup_*.sql"

echo ""
echo "3. 执行数据库拆分脚本..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f ./002_split_databases.sql

echo ""
echo "4. 验证新数据库..."
for db in cloudphone_core cloudphone_billing cloudphone_analytics; do
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $db
  if [ $? -eq 0 ]; then
    echo "✅ $db - 创建成功"
  else
    echo "❌ $db - 创建失败"
  fi
done

echo ""
echo "5. 验证数据迁移..."
echo "Core DB 用户数:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER cloudphone_core -t -c "SELECT COUNT(*) FROM users;"

echo "Core DB 设备数:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER cloudphone_core -t -c "SELECT COUNT(*) FROM devices;"

echo "Billing DB 订单数:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER cloudphone_billing -t -c "SELECT COUNT(*) FROM orders;"

echo ""
echo "========================================="
echo "✅ 数据库拆分完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 更新各服务的 DB_DATABASE 环境变量"
echo "2. 重启服务验证连接"
echo "3. 测试跨库查询功能"
echo ""

