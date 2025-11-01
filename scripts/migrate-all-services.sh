#!/bin/bash

# 所有服务数据库迁移脚本
# 用于开发环境快速迁移所有服务

set -e

echo "======================================"
echo "开始执行所有服务的数据库迁移"
echo "======================================"

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
NC='\033[0m' # No Color

# 检查 PostgreSQL 是否运行
echo ""
echo "检查 PostgreSQL 状态..."
if ! docker compose -f docker-compose.dev.yml ps postgres | grep -q "Up"; then
  echo -e "${RED}❌ PostgreSQL 未运行,请先启动${NC}"
  echo "运行: docker compose -f docker-compose.dev.yml up -d postgres"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL 正在运行${NC}"

# 等待 PostgreSQL 就绪
echo ""
echo "等待 PostgreSQL 就绪..."
sleep 2

# 遍历所有服务
for service in "${SERVICES[@]}"; do
  echo ""
  echo "======================================"
  echo "处理服务: $service"
  echo "======================================"

  SERVICE_DIR="backend/$service"

  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${YELLOW}⚠ 服务目录不存在: $SERVICE_DIR${NC}"
    continue
  fi

  cd "$SERVICE_DIR"

  # 检查是否有迁移脚本
  if ! grep -q "migration:run" package.json; then
    echo -e "${YELLOW}⚠ 服务未配置迁移脚本,跳过${NC}"
    cd ../..
    continue
  fi

  # 显示待执行的迁移
  echo ""
  echo "查看待执行的迁移..."
  if pnpm migration:show 2>/dev/null; then
    echo ""
    echo "执行迁移..."

    if pnpm migration:run; then
      echo -e "${GREEN}✓ $service 迁移成功${NC}"
    else
      echo -e "${RED}❌ $service 迁移失败${NC}"
      cd ../..
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠ 无法查看迁移状态,可能尚未配置${NC}"
  fi

  cd ../..
done

echo ""
echo "======================================"
echo -e "${GREEN}所有服务迁移完成!${NC}"
echo "======================================"
echo ""
echo "验证建议:"
echo "  1. 检查各服务日志: pm2 logs"
echo "  2. 检查数据库表: psql -U postgres -d cloudphone_user -c '\dt'"
echo "  3. 运行健康检查: ./scripts/check-health.sh"
