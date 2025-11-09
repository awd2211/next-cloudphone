#!/bin/bash

# ========================================
# 数据库连接池优化 - 快速部署脚本
# ========================================
# 用途: 快速为所有优化过的服务应用环境变量配置
# 使用: ./scripts/apply-db-optimization.sh

set -e

echo "========================================="
echo "🚀 云手机平台 - 数据库优化快速部署"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 优化过的服务列表
OPTIMIZED_SERVICES=(
  "billing-service"
  "device-service"
  "app-service"
  "notification-service"
  "proxy-service"
  "sms-receive-service"
)

echo "📋 将为以下服务应用数据库优化配置:"
for service in "${OPTIMIZED_SERVICES[@]}"; do
  echo "   - $service"
done
echo ""

# 检查是否需要确认
read -p "⚠️  是否继续? 这将复制 .env.example 到 .env (如果 .env 不存在) (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 操作已取消"
  exit 1
fi

echo ""
echo "🔧 开始处理服务..."
echo ""

SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

for service in "${OPTIMIZED_SERVICES[@]}"; do
  SERVICE_DIR="backend/$service"

  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${RED}❌ 目录不存在: $SERVICE_DIR${NC}"
    ((ERROR_COUNT++))
    continue
  fi

  cd "$SERVICE_DIR"

  # 检查 .env.example 是否存在
  if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ $service: .env.example 不存在${NC}"
    ((ERROR_COUNT++))
    cd "$PROJECT_ROOT"
    continue
  fi

  # 检查 .env 是否已存在
  if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  $service: .env 已存在，跳过复制${NC}"
    echo "   提示: 请手动检查并合并新增的数据库连接池配置"
    echo "   参考: .env.example 中以 'DB_POOL_' 开头的配置"
    ((SKIP_COUNT++))
  else
    # 复制 .env.example 到 .env
    cp .env.example .env
    echo -e "${GREEN}✅ $service: 已创建 .env 文件${NC}"
    echo "   ⚠️  请编辑 .env 填入数据库密码等敏感信息"
    ((SUCCESS_COUNT++))
  fi

  cd "$PROJECT_ROOT"
  echo ""
done

echo "========================================="
echo "📊 部署统计"
echo "========================================="
echo -e "${GREEN}✅ 成功创建: $SUCCESS_COUNT${NC}"
echo -e "${YELLOW}⚠️  已跳过: $SKIP_COUNT${NC}"
echo -e "${RED}❌ 错误: $ERROR_COUNT${NC}"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
  echo "========================================="
  echo "🎯 下一步操作"
  echo "========================================="
  echo ""
  echo "1. 编辑各服务的 .env 文件，填入敏感信息:"
  echo ""

  for service in "${OPTIMIZED_SERVICES[@]}"; do
    if [ -f "backend/$service/.env" ]; then
      echo "   vim backend/$service/.env"
    fi
  done

  echo ""
  echo "2. 重启优化过的服务:"
  echo ""
  echo "   pm2 restart billing-service device-service app-service \\"
  echo "                notification-service proxy-service sms-receive-service"
  echo ""
  echo "3. 查看连接池配置日志:"
  echo ""
  echo "   pm2 logs billing-service | grep '数据库连接池配置'"
  echo ""
  echo "4. 监控连接池使用情况:"
  echo ""
  echo "   ./scripts/monitor-db-pool.sh"
  echo ""
fi

if [ $SKIP_COUNT -gt 0 ]; then
  echo "========================================="
  echo "⚠️  已有 .env 文件的服务"
  echo "========================================="
  echo ""
  echo "以下服务需要手动合并配置:"
  echo ""

  for service in "${OPTIMIZED_SERVICES[@]}"; do
    if [ -f "backend/$service/.env" ] && [ -f "backend/$service/.env.example" ]; then
      echo "📝 $service:"
      echo "   1. 打开: vim backend/$service/.env"
      echo "   2. 参考: backend/$service/.env.example"
      echo "   3. 新增以下配置（如果没有的话）:"
      echo "      - DB_POOL_MIN=2"
      echo "      - DB_POOL_MAX=9"
      echo "      - DB_CONNECTION_TIMEOUT=10000"
      echo "      - DB_PREPARED_STATEMENT_CACHE_QUERIES=256"
      echo "      - DB_SLOW_QUERY_THRESHOLD=1000"
      echo "      - ... (共31个配置项)"
      echo ""
    fi
  done
fi

echo "========================================="
echo "✅ 部署脚本执行完成"
echo "========================================="
