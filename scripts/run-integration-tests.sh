#!/bin/bash

# Week 1 P0 集成测试运行脚本
#
# 功能：
# 1. 创建测试数据库
# 2. 运行所有集成测试
# 3. 清理测试数据库
#
# 使用方法：
# ./scripts/run-integration-tests.sh

set -e

echo "======================================"
echo "  Week 1 P0 集成测试"
echo "======================================"
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 数据库配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USERNAME:-postgres}
DB_PASS=${DB_PASSWORD:-postgres}

# 测试数据库名称
TEST_DB_USER="cloudphone_user_test"
TEST_DB_BILLING="cloudphone_test"

echo "📊 测试环境配置:"
echo "  - 数据库主机: $DB_HOST:$DB_PORT"
echo "  - 数据库用户: $DB_USER"
echo "  - 测试数据库: $TEST_DB_USER, $TEST_DB_BILLING"
echo ""

# 检查 PostgreSQL 是否运行
echo "🔍 检查 PostgreSQL 连接..."
if ! PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\q' 2>/dev/null; then
  echo -e "${RED}❌ 无法连接到 PostgreSQL${NC}"
  echo ""
  echo "请确保:"
  echo "  1. PostgreSQL 正在运行"
  echo "  2. 连接参数正确"
  echo "  3. Docker Compose 已启动: docker compose -f docker-compose.dev.yml up -d postgres"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL 连接成功${NC}"
echo ""

# 创建测试数据库
echo "🗄️  准备测试数据库..."

# user-service 测试数据库
echo "  创建 $TEST_DB_USER..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_USER;" 2>/dev/null || true
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $TEST_DB_USER;" 2>/dev/null || echo "  (数据库已存在)"

# billing-service 测试数据库
echo "  创建 $TEST_DB_BILLING..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_BILLING;" 2>/dev/null || true
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $TEST_DB_BILLING;" 2>/dev/null || echo "  (数据库已存在)"

echo -e "${GREEN}✅ 测试数据库准备完成${NC}"
echo ""

# 运行测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_SERVICES=()

# 函数：运行单个服务的集成测试
run_service_tests() {
  local service_name=$1
  local service_path=$2

  echo "======================================"
  echo "🧪 测试服务: $service_name"
  echo "======================================"
  echo ""

  cd $service_path

  # 设置测试环境变量
  export NODE_ENV=test
  export DB_HOST=$DB_HOST
  export DB_PORT=$DB_PORT
  export DB_USERNAME=$DB_USER
  export DB_PASSWORD=$DB_PASS

  if [ "$service_name" = "billing-service" ]; then
    export DB_DATABASE=$TEST_DB_BILLING
  else
    export DB_DATABASE=$TEST_DB_USER
  fi

  # 运行集成测试
  echo "运行集成测试..."
  if pnpm test:integration 2>&1 | tee /tmp/${service_name}_test.log; then
    echo -e "${GREEN}✅ $service_name 集成测试通过${NC}"

    # 统计测试数量
    local test_count=$(grep -o "Tests:.*passed" /tmp/${service_name}_test.log | grep -o "[0-9]* passed" | grep -o "[0-9]*" || echo "0")
    TOTAL_TESTS=$((TOTAL_TESTS + test_count))
    PASSED_TESTS=$((PASSED_TESTS + test_count))
  else
    echo -e "${RED}❌ $service_name 集成测试失败${NC}"

    # 统计失败
    local test_count=$(grep -o "Tests:.*failed" /tmp/${service_name}_test.log | grep -o "[0-9]* failed" | grep -o "[0-9]*" || echo "1")
    TOTAL_TESTS=$((TOTAL_TESTS + test_count))
    FAILED_TESTS=$((FAILED_TESTS + test_count))
    FAILED_SERVICES+=("$service_name")
  fi

  echo ""
  cd - > /dev/null
}

# 运行 billing-service 集成测试
run_service_tests "billing-service" "backend/billing-service"

# 运行 user-service 集成测试
run_service_tests "user-service" "backend/user-service"

# 打印测试总结
echo "======================================"
echo "  📊 集成测试总结"
echo "======================================"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}失败: $FAILED_TESTS${NC}"
  echo ""
  echo "失败的服务:"
  for service in "${FAILED_SERVICES[@]}"; do
    echo "  - $service"
  done
  echo ""
  echo "查看详细日志:"
  echo "  cat /tmp/${service}_test.log"
fi

echo ""

# 清理测试数据库（可选）
read -p "是否清理测试数据库? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🧹 清理测试数据库..."
  PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_USER;" 2>/dev/null
  PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_BILLING;" 2>/dev/null
  echo -e "${GREEN}✅ 清理完成${NC}"
fi

echo ""
echo "======================================"
echo "  集成测试完成"
echo "======================================"

# 退出码
if [ $FAILED_TESTS -gt 0 ]; then
  exit 1
else
  exit 0
fi
