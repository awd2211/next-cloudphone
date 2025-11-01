#!/bin/bash

# 清理 cloudphone 主数据库中的重复空表
# 这些表实际上应该在各个服务的独立数据库中

set -e

echo "=========================================="
echo "清理 cloudphone 主数据库重复表"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 备份
echo -e "${BLUE}📦 步骤 1: 备份 cloudphone 数据库...${NC}"
BACKUP_FILE="backup/cloudphone_main_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backup
docker compose -f docker-compose.dev.yml exec -T postgres \
  pg_dump -U postgres -d cloudphone > "$BACKUP_FILE"
echo -e "${GREEN}✓ 备份完成: $BACKUP_FILE${NC}"
echo ""

# 2. 检查表数据
echo -e "${BLUE}📊 步骤 2: 检查表数据量...${NC}"
TABLES=(
  "balance_transactions"
  "billing_rules"
  "invoices"
  "notification_preferences"
  "notification_templates"
  "notifications"
  "orders"
  "payments"
  "plans"
  "saga_state"
  "sms_records"
  "subscriptions"
  "usage_records"
  "user_balances"
)

HAS_DATA=false
for table in "${TABLES[@]}"; do
  count=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')

  if [ "$count" -gt 0 ]; then
    echo -e "${RED}⚠️  表 $table 有 $count 条数据${NC}"
    HAS_DATA=true
  else
    echo -e "${GREEN}✓ 表 $table: 0 行${NC}"
  fi
done
echo ""

# 3. 决定操作
if [ "$HAS_DATA" = true ]; then
  echo -e "${RED}❌ 发现数据，停止清理！${NC}"
  echo -e "${YELLOW}建议手动检查这些数据的来源${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 所有表为空，可以安全删除${NC}"
  echo ""

  # 询问用户确认
  echo -e "${YELLOW}即将删除以下空表:${NC}"
  for table in "${TABLES[@]}"; do
    echo "  - $table"
  done
  echo ""
  echo -e "${YELLOW}以及错误的迁移记录 (timestamp: 1730419200000)${NC}"
  echo ""

  read -p "确认删除？(yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ 取消清理${NC}"
    exit 0
  fi

  echo ""
  echo -e "${BLUE}🗑️  步骤 3: 删除空表...${NC}"

  # 删除表
  docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone <<EOF
-- 删除所有业务表
DROP TABLE IF EXISTS balance_transactions CASCADE;
DROP TABLE IF EXISTS billing_rules CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS saga_state CASCADE;
DROP TABLE IF EXISTS sms_records CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;

-- 删除错误的迁移记录
DELETE FROM typeorm_migrations WHERE timestamp = 1730419200000;
EOF

  echo -e "${GREEN}✓ 清理完成${NC}"
  echo ""

  # 4. 验证
  echo -e "${BLUE}📋 步骤 4: 验证清理结果...${NC}"
  TABLE_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'typeorm%';" | tr -d ' ')

  MIGRATION_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone -t -c "SELECT COUNT(*) FROM typeorm_migrations;" | tr -d ' ')

  echo "剩余业务表: $TABLE_COUNT (应该为 0)"
  echo "迁移记录数: $MIGRATION_COUNT (应该为 0)"
  echo ""

  if [ "$TABLE_COUNT" -eq 0 ] && [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 清理成功！cloudphone 主数据库已清理干净${NC}"
  else
    echo -e "${YELLOW}⚠️  还有一些表或记录未清理${NC}"
  fi

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ 数据库清理完成${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "备份文件: $BACKUP_FILE"
  echo ""
  echo "当前数据库架构:"
  echo "  ✓ cloudphone (主数据库) - 已清理"
  echo "  ✓ cloudphone_user - user-service"
  echo "  ✓ cloudphone_device - device-service"
  echo "  ✓ cloudphone_app - app-service"
  echo "  ✓ cloudphone_billing - billing-service"
  echo "  ✓ cloudphone_notification - notification-service"
  echo ""
fi
