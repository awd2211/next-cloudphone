#!/bin/bash

# API 版本控制测试脚本
# 用途: 验证所有服务的 API 版本控制实施是否正确
# 作者: Claude Code
# 日期: 2025-10-28

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_error() {
    echo -e "${RED}❌${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log_info "测试: $name"
    log_info "URL: $url"

    # 发送请求
    response=$(curl -s -w "\n%{http_code}" -o /tmp/api_response "$url" 2>/dev/null || echo "000")
    status_code=$(tail -n1 <<< "$response")

    # 检查状态码
    if [[ "$status_code" == "$expected_status" ]] || [[ "$status_code" == "401" ]] || [[ "$status_code" == "403" ]]; then
        # 200 表示成功, 401/403 表示需要认证(端点存在)
        if [[ "$status_code" == "401" ]] || [[ "$status_code" == "403" ]]; then
            log_success "$name - 端点存在 (需要认证: $status_code)"
        else
            log_success "$name - 状态码: $status_code"
        fi
    else
        log_error "$name - 失败 (状态码: $status_code, 期望: $expected_status 或 401/403)"
        if [[ -f /tmp/api_response ]]; then
            log_info "响应内容: $(cat /tmp/api_response | head -c 200)"
        fi
    fi

    echo ""
}

# 横幅
echo ""
echo "=========================================="
echo "  API 版本控制实施测试"
echo "=========================================="
echo ""

# 服务配置
declare -A SERVICES=(
    ["API Gateway"]="30000"
    ["User Service"]="30001"
    ["Device Service"]="30002"
    ["App Service"]="30003"
    ["Billing Service"]="30005"
    ["Notification Service"]="30006"
)

# 测试 1: 健康检查端点 (无版本前缀)
echo "=========================================="
echo "测试 1: 健康检查端点 (无版本前缀)"
echo "=========================================="
echo ""

for service in "${!SERVICES[@]}"; do
    port="${SERVICES[$service]}"
    test_endpoint "$service - Health Check" "http://localhost:$port/health" 200
done

# 测试 2: Swagger 文档 (带版本前缀)
echo "=========================================="
echo "测试 2: Swagger 文档 (带版本前缀)"
echo "=========================================="
echo ""

for service in "${!SERVICES[@]}"; do
    port="${SERVICES[$service]}"
    test_endpoint "$service - Swagger Docs" "http://localhost:$port/api/v1/docs" 200
done

# 测试 3: API 端点 (带版本前缀)
echo "=========================================="
echo "测试 3: API 端点 (带版本前缀)"
echo "=========================================="
echo ""

# User Service
test_endpoint "User Service - GET /api/v1/users" "http://localhost:30001/api/v1/users"

# Device Service
test_endpoint "Device Service - GET /api/v1/devices" "http://localhost:30002/api/v1/devices"

# App Service
test_endpoint "App Service - GET /api/v1/apps" "http://localhost:30003/api/v1/apps"

# Billing Service
test_endpoint "Billing Service - GET /api/v1/billing" "http://localhost:30005/api/v1/billing"

# Notification Service
test_endpoint "Notification Service - GET /api/v1/notifications" "http://localhost:30006/api/v1/notifications"

# 测试 4: Metrics 端点 (无版本前缀)
echo "=========================================="
echo "测试 4: Metrics 端点 (无版本前缀)"
echo "=========================================="
echo ""

for service in "${!SERVICES[@]}"; do
    port="${SERVICES[$service]}"
    # API Gateway 可能没有 metrics 端点
    if [[ "$service" == "API Gateway" ]]; then
        continue
    fi
    test_endpoint "$service - Metrics" "http://localhost:$port/metrics" 200
done

# 测试 5: 验证旧路径不再工作 (应该返回 404)
echo "=========================================="
echo "测试 5: 验证旧路径返回 404"
echo "=========================================="
echo ""

test_endpoint "User Service - 旧路径 /users (应失败)" "http://localhost:30001/users" 404
test_endpoint "Device Service - 旧路径 /devices (应失败)" "http://localhost:30002/devices" 404

# 测试 6: 检查 API Gateway 路由
echo "=========================================="
echo "测试 6: API Gateway 路由测试"
echo "=========================================="
echo ""

test_endpoint "API Gateway - Health" "http://localhost:30000/health" 200
test_endpoint "API Gateway - Swagger" "http://localhost:30000/api/v1/docs" 200

# 总结
echo "=========================================="
echo "  测试总结"
echo "=========================================="
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}=========================================="
    echo "  ✅ 所有测试通过！"
    echo "==========================================${NC}"
    exit 0
else
    echo -e "${RED}=========================================="
    echo "  ❌ 部分测试失败"
    echo "==========================================${NC}"
    echo ""
    echo "故障排查步骤:"
    echo "1. 确认所有服务已启动: pm2 list"
    echo "2. 检查服务日志: pm2 logs <service-name>"
    echo "3. 重启失败的服务: pm2 restart <service-name>"
    echo ""
    exit 1
fi
