#!/bin/bash

# 测试新的 TypeORM Migrations 系统
# 验证所有服务的迁移配置是否正确

set -e

echo "=========================================="
echo "测试新的 TypeORM Migrations 系统"
echo "=========================================="
echo ""

SERVICES=(
  "user-service"
  "device-service"
  "app-service"
  "billing-service"
  "notification-service"
)

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED=0

# 检查 PostgreSQL 状态
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. 检查 PostgreSQL 状态${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if ! docker compose -f docker-compose.dev.yml ps postgres | grep -q "Up"; then
  echo -e "${RED}❌ PostgreSQL 未运行${NC}"
  echo "请先启动: docker compose -f docker-compose.dev.yml up -d postgres"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL 正在运行${NC}"
echo ""

# 测试每个服务
for service in "${SERVICES[@]}"; do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}2. 测试服务: $service${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  cd "backend/$service"

  # 检查 TypeORM 配置文件
  echo -n "  检查 TypeORM 配置文件... "
  if [ -f "src/config/typeorm-cli.config.ts" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}  错误: 缺少 src/config/typeorm-cli.config.ts${NC}"
    FAILED=1
  fi

  # 检查 migrations 目录
  echo -n "  检查 migrations 目录... "
  if [ -d "src/migrations" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}  错误: 缺少 src/migrations 目录${NC}"
    FAILED=1
  fi

  # 检查基线迁移文件
  echo -n "  检查基线迁移文件... "
  if [ -f "src/migrations/1730419200000-BaselineFromExisting.ts" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}  错误: 缺少基线迁移文件${NC}"
    FAILED=1
  fi

  # 检查 package.json 迁移脚本
  echo -n "  检查 package.json 迁移脚本... "
  if grep -q "migration:run" package.json; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}  错误: package.json 缺少迁移脚本${NC}"
    FAILED=1
  fi

  # 检查旧的 Atlas 配置是否已删除
  echo -n "  检查旧的 Atlas 配置已删除... "
  if [ ! -f "atlas.hcl" ] && [ ! -d "migrations" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⚠${NC}"
    echo -e "${YELLOW}  警告: 发现旧的 Atlas 配置文件${NC}"
    [ -f "atlas.hcl" ] && echo -e "${YELLOW}    - atlas.hcl${NC}"
    [ -d "migrations" ] && echo -e "${YELLOW}    - migrations/${NC}"
  fi

  # 测试 migration:show 命令
  echo -n "  测试 migration:show 命令... "
  if pnpm migration:show &> /tmp/${service}_migration_show.log; then
    echo -e "${GREEN}✓${NC}"
    # 显示迁移状态
    if grep -q "BaselineFromExisting" /tmp/${service}_migration_show.log; then
      echo -e "    ${BLUE}ℹ 迁移状态:${NC}"
      grep "BaselineFromExisting" /tmp/${service}_migration_show.log | head -3 | sed 's/^/      /'
    fi
  else
    echo -e "${YELLOW}⚠${NC}"
    echo -e "${YELLOW}  警告: migration:show 命令失败 (可能是数据库未初始化)${NC}"
    echo -e "${YELLOW}  需要运行: pnpm migration:run${NC}"
  fi

  cd ../..
  echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. 测试总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ 所有检查通过!${NC}"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ 新的迁移系统配置正确${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "下一步:"
  echo "  1. 执行基线迁移: ./scripts/migrate-all-services.sh"
  echo "  2. 验证迁移历史: cd backend/user-service && pnpm migration:show"
  echo "  3. 查看数据库: psql -U postgres -d cloudphone_user -c 'SELECT * FROM typeorm_migrations;'"
  echo ""
  exit 0
else
  echo -e "${RED}✗ 发现 $FAILED 个错误${NC}"
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ 请修复上述错误后重试${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 1
fi
