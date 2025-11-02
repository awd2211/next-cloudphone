#!/bin/bash

# ========================================
# SMS Receive Service API 测试脚本
# ========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="${SMS_SERVICE_URL:-http://localhost:30008}"
TEST_DEVICE_ID="550e8400-e29b-41d4-a716-446655440000"
TEST_SERVICE="telegram"
TEST_COUNTRY="RU"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SMS Receive Service API 测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Base URL: ${YELLOW}${BASE_URL}${NC}"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $name"
    echo -e "  ${YELLOW}→${NC} $method $endpoint"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    # 分离响应体和状态码
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓${NC} Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # 美化 JSON 输出
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null | head -20
        else
            echo "$body" | head -10
        fi
    else
        echo -e "  ${RED}✗${NC} Expected: $expected_status, Got: $status_code"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  Response: $body"
    fi

    echo ""
    sleep 0.5
}

# ========================================
# 1. 健康检查测试
# ========================================
echo -e "${GREEN}=== 健康检查测试 ===${NC}"
echo ""

test_endpoint \
    "基础健康检查" \
    "GET" \
    "/health" \
    "" \
    "200"

test_endpoint \
    "详细健康检查" \
    "GET" \
    "/health/detailed" \
    "" \
    "200"

test_endpoint \
    "Liveness 探针" \
    "GET" \
    "/health/live" \
    "" \
    "200"

test_endpoint \
    "Readiness 探针" \
    "GET" \
    "/health/ready" \
    "" \
    "200"

# ========================================
# 2. Prometheus Metrics 测试
# ========================================
echo -e "${GREEN}=== Prometheus Metrics 测试 ===${NC}"
echo ""

test_endpoint \
    "获取 Prometheus metrics" \
    "GET" \
    "/metrics" \
    "" \
    "200"

# ========================================
# 3. 统计 API 测试
# ========================================
echo -e "${GREEN}=== 统计 API 测试 ===${NC}"
echo ""

test_endpoint \
    "获取轮询统计" \
    "GET" \
    "/numbers/stats/polling" \
    "" \
    "200"

test_endpoint \
    "获取平台统计" \
    "GET" \
    "/numbers/stats/providers" \
    "" \
    "200"

# ========================================
# 4. 管理功能测试
# ========================================
echo -e "${GREEN}=== 管理功能测试 ===${NC}"
echo ""

test_endpoint \
    "手动触发轮询" \
    "POST" \
    "/numbers/poll/trigger" \
    "" \
    "200"

# ========================================
# 5. Swagger UI 测试
# ========================================
echo -e "${GREEN}=== Swagger UI 测试 ===${NC}"
echo ""

echo -e "${BLUE}[INFO]${NC} Swagger UI: ${YELLOW}${BASE_URL}/api/docs${NC}"
echo ""

# ========================================
# 测试摘要
# ========================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  测试结果摘要${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "总测试数: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过!${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
