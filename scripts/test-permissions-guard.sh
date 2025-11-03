#!/bin/bash

# 权限守卫功能测试脚本
# 测试 proxy-service 和 sms-receive-service 的权限保护

# 不使用 set -e，以便看到所有测试结果

COLORS_RED='\033[0;31m'
COLORS_GREEN='\033[0;32m'
COLORS_YELLOW='\033[1;33m'
COLORS_BLUE='\033[0;34m'
COLORS_NC='\033[0m' # No Color

# 使用会话中已知的 admin token（从之前的会话总结中获取）
# 这个 token 是 admin 用户的，拥有所有权限
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBjbG91ZHBob25lLmNvbSIsInRlbmFudElkIjpudWxsLCJyb2xlcyI6WyJzdXBlcl9hZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJ1c2VyOnJlYWQiLCJ1c2VyOmNyZWF0ZSIsInVzZXI6dXBkYXRlIiwidXNlcjpkZWxldGUiLCJyb2xlOnJlYWQiLCJyb2xlOmNyZWF0ZSIsInJvbGU6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJwZXJtaXNzaW9uOnJlYWQiLCJwZXJtaXNzaW9uOmNyZWF0ZSIsInBlcm1pc3Npb246dXBkYXRlIiwicGVybWlzc2lvbjpkZWxldGUiLCJkZXZpY2U6cmVhZCIsImRldmljZTpjcmVhdGUiLCJkZXZpY2U6dXBkYXRlIiwiZGV2aWNlOmRlbGV0ZSIsImRldmljZTpjb250cm9sIiwiYXBwOnJlYWQiLCJhcHA6Y3JlYXRlIiwiYXBwOnVwZGF0ZSIsImFwcDpkZWxldGUiLCJiaWxsaW5nOnJlYWQiLCJiaWxsaW5nOmNyZWF0ZSIsImJpbGxpbmc6dXBkYXRlIiwiYmlsbGluZzpkZWxldGUiXSwiaWF0IjoxNzYxOTExOTAzLCJleHAiOjE3NjE5OTgzMDMsImF1ZCI6ImNsb3VkcGhvbmUtdXNlcnMiLCJpc3MiOiJjbG91ZHBob25lLXBsYXRmb3JtIn0.N6aoZQMaH1VKRcfiNNPDjs9tD6HcqBk0tKfvI0-GPk"

echo -e "${COLORS_BLUE}================================${COLORS_NC}"
echo -e "${COLORS_BLUE}  权限守卫功能测试${COLORS_NC}"
echo -e "${COLORS_BLUE}================================${COLORS_NC}"
echo ""

# 计数器
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local method="$3"
    local token="$4"
    local expected_status="$5"
    local description="$6"

    echo -e "${COLORS_YELLOW}测试: ${test_name}${COLORS_NC}"
    echo "  描述: ${description}"
    echo "  URL: ${url}"
    echo "  方法: ${method}"

    if [ -z "$token" ]; then
        response=$(curl -s -X "${method}" -w "\n%{http_code}" "${url}" 2>/dev/null)
    else
        response=$(curl -s -X "${method}" -H "Authorization: Bearer ${token}" -w "\n%{http_code}" "${url}" 2>/dev/null)
    fi

    status_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${COLORS_GREEN}✅ PASSED${COLORS_NC} - 状态码: ${status_code}"
        ((PASSED++))
    else
        echo -e "  ${COLORS_RED}❌ FAILED${COLORS_NC} - 期望: ${expected_status}, 实际: ${status_code}"
        echo "  响应: ${body}"
        ((FAILED++))
    fi
    echo ""
}

echo -e "${COLORS_BLUE}=== 测试组 1: 公开端点（无需认证）===${COLORS_NC}"
echo ""

test_endpoint \
    "Proxy-Health" \
    "http://localhost:30007/proxy/health" \
    "GET" \
    "" \
    "200" \
    "Proxy Service 健康检查（@Public 装饰器）"

test_endpoint \
    "SMS-Health" \
    "http://localhost:30008/health" \
    "GET" \
    "" \
    "200" \
    "SMS Service 健康检查（公开端点）"

echo -e "${COLORS_BLUE}=== 测试组 2: 需要权限的端点（使用 Admin Token）===${COLORS_NC}"
echo ""

test_endpoint \
    "Proxy-List" \
    "http://localhost:30007/proxy/list" \
    "GET" \
    "${ADMIN_TOKEN}" \
    "200" \
    "查看代理列表（需要 proxy.list 权限）"

test_endpoint \
    "Proxy-Stats-Pool" \
    "http://localhost:30007/proxy/stats/pool" \
    "GET" \
    "${ADMIN_TOKEN}" \
    "200" \
    "查看代理池统计（需要 proxy.stats 权限）"

test_endpoint \
    "SMS-Stats-Polling" \
    "http://localhost:30008/numbers/stats/polling" \
    "GET" \
    "${ADMIN_TOKEN}" \
    "200" \
    "查看轮询统计（需要 sms.stats 权限）"

test_endpoint \
    "SMS-Stats-Providers" \
    "http://localhost:30008/numbers/stats/providers" \
    "GET" \
    "${ADMIN_TOKEN}" \
    "200" \
    "查看供应商统计（需要 sms.provider-stats 权限）"

echo -e "${COLORS_BLUE}=== 测试组 3: 无权限访问（不提供 Token）===${COLORS_NC}"
echo ""

test_endpoint \
    "Proxy-List-NoAuth" \
    "http://localhost:30007/proxy/list" \
    "GET" \
    "" \
    "401" \
    "无认证访问需要权限的端点（应返回 401 Unauthorized）"

test_endpoint \
    "SMS-Request-NoAuth" \
    "http://localhost:30008/numbers" \
    "POST" \
    "" \
    "401" \
    "无认证创建SMS号码（应返回 401 Unauthorized）"

test_endpoint \
    "Proxy-Refresh-NoAuth" \
    "http://localhost:30007/proxy/admin/refresh-pool" \
    "POST" \
    "" \
    "401" \
    "无认证刷新代理池（应返回 401 Unauthorized）"

echo -e "${COLORS_BLUE}================================${COLORS_NC}"
echo -e "${COLORS_BLUE}  测试结果汇总${COLORS_NC}"
echo -e "${COLORS_BLUE}================================${COLORS_NC}"
echo ""
echo -e "  ${COLORS_GREEN}通过: ${PASSED}${COLORS_NC}"
echo -e "  ${COLORS_RED}失败: ${FAILED}${COLORS_NC}"
echo -e "  总计: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${COLORS_GREEN}✅ 所有测试通过！权限守卫工作正常。${COLORS_NC}"
    exit 0
else
    echo -e "${COLORS_RED}❌ 有 ${FAILED} 个测试失败。${COLORS_NC}"
    exit 1
fi
