#!/bin/bash

# 集成测试运行脚本
# 这个脚本会启动测试基础设施（PostgreSQL, Redis, RabbitMQ），运行测试，然后清理

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Notification Service Integration Tests  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")/.."

# 1. 启动测试基础设施
echo -e "\n${YELLOW}📦 Starting test infrastructure...${NC}"
docker-compose -f docker-compose.test.yml up -d

# 2. 等待服务就绪
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# 等待 PostgreSQL
echo -n "  - PostgreSQL: "
for i in {1..30}; do
    if docker exec notification-service-postgres-test pg_isready -U test_user -d cloudphone_notification_test > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
    sleep 1
done

# 等待 Redis
echo -n "  - Redis: "
for i in {1..30}; do
    if docker exec notification-service-redis-test redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
    sleep 1
done

# 等待 RabbitMQ
echo -n "  - RabbitMQ: "
for i in {1..60}; do
    if docker exec notification-service-rabbitmq-test rabbitmq-diagnostics check_port_connectivity > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        exit 1
    fi
    sleep 1
done

echo -e "${GREEN}✓ All services are ready!${NC}"

# 3. 运行集成测试
echo -e "\n${YELLOW}🧪 Running integration tests...${NC}"
if npm run test:integration; then
    echo -e "\n${GREEN}✅ All integration tests passed!${NC}"
    TEST_EXIT_CODE=0
else
    echo -e "\n${RED}❌ Some integration tests failed!${NC}"
    TEST_EXIT_CODE=1
fi

# 4. 清理（可选）
if [ "$1" != "--no-cleanup" ]; then
    echo -e "\n${YELLOW}🧹 Cleaning up test infrastructure...${NC}"
    docker-compose -f docker-compose.test.yml down
    echo -e "${GREEN}✓ Cleanup completed${NC}"
else
    echo -e "\n${YELLOW}⚠️  Skipping cleanup (test infrastructure still running)${NC}"
    echo -e "${BLUE}To stop manually: docker-compose -f docker-compose.test.yml down${NC}"
fi

echo -e "\n${BLUE}===========================================${NC}"
exit $TEST_EXIT_CODE
