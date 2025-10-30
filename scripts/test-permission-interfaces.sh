#!/bin/bash

# 权限接口测试脚本
# 测试新增的前端权限接口是否能正常调用后端

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 直接使用 user-service 的端口（30001）而不是 API Gateway（30000）
# 因为权限相关接口都在 user-service 中
API_BASE_URL="${API_BASE_URL:-http://localhost:30001}"
TOKEN=""

echo "=========================================="
echo "  权限接口测试脚本"
echo "=========================================="
echo ""

# 函数：打印带颜色的消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 函数：检查服务是否运行
check_service() {
    local service_port=$1
    local service_name=$2

    if curl -s "http://localhost:${service_port}/health" > /dev/null 2>&1; then
        print_success "${service_name} is running on port ${service_port}"
        return 0
    else
        print_error "${service_name} is NOT running on port ${service_port}"
        return 1
    fi
}

# 函数：获取 JWT Token
get_token() {
    print_info "Getting JWT token..."

    # 第一步：获取验证码
    print_info "Step 1: Getting captcha..."
    captcha_response=$(curl -s -X GET "${API_BASE_URL}/api/v1/auth/captcha")
    captcha_id=$(echo "$captcha_response" | jq -r '.data.captchaId // empty')
    captcha_text=$(echo "$captcha_response" | jq -r '.data.text // empty')

    if [ -z "$captcha_id" ] || [ "$captcha_id" == "null" ]; then
        print_error "Failed to get captcha"
        print_info "Response: $captcha_response"
        exit 1
    fi

    print_success "Captcha obtained: ID=$captcha_id, Text=$captcha_text"

    # 第二步：使用验证码登录
    print_info "Step 2: Logging in with captcha..."
    response=$(curl -s -X POST "${API_BASE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"admin\",
            \"password\": \"Admin@123\",
            \"captchaId\": \"$captcha_id\",
            \"captcha\": \"$captcha_text\"
        }")

    TOKEN=$(echo "$response" | jq -r '.data.accessToken // .accessToken // empty')

    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        print_error "Failed to get JWT token. Please check credentials."
        print_info "Response: $response"
        exit 1
    fi

    print_success "JWT token obtained"
}

# 函数：测试接口
test_endpoint() {
    local method=$1
    local path=$2
    local description=$3
    local data=$4

    echo ""
    print_info "Testing: ${description}"
    print_info "  ${method} ${path}"

    local curl_cmd="curl -s -X ${method} \"${API_BASE_URL}${path}\" \
        -H \"Authorization: Bearer ${TOKEN}\" \
        -H \"Content-Type: application/json\""

    if [ -n "$data" ]; then
        curl_cmd="${curl_cmd} -d '${data}'"
    fi

    response=$(eval "$curl_cmd")

    # 检查响应
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        print_success "✓ ${description} - OK"
        return 0
    elif echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
        print_error "✗ ${description} - Failed (success: false)"
        echo "  Response: $(echo "$response" | jq -r '.message // .error // "Unknown error"')"
        return 1
    else
        print_error "✗ ${description} - Failed (invalid response)"
        echo "  Response: $response"
        return 1
    fi
}

# 主测试流程
main() {
    echo "Step 1: Checking services..."
    check_service 30000 "API Gateway" || exit 1
    check_service 30001 "User Service" || exit 1
    echo ""

    echo "Step 2: Getting authentication token..."
    get_token
    echo ""

    echo "Step 3: Testing new permission interfaces..."
    echo "=========================================="

    # 测试计数器
    total_tests=0
    passed_tests=0
    failed_tests=0

    # P1 优先级接口测试
    echo ""
    echo "=== P1 Priority Interfaces ==="

    # 注意：DELETE 请求需要先创建角色和权限才能测试移除
    print_info "Skipping DELETE /roles/:id/permissions (需要先创建角色和权限)"

    # P2 优先级接口测试
    echo ""
    echo "=== P2 Priority Interfaces ==="

    # 测试：获取单个权限详情
    # 首先获取一个权限列表，然后获取第一个权限的详情
    print_info "Getting permission list first..."
    permissions_response=$(curl -s -X GET "${API_BASE_URL}/permissions?page=1&limit=10" \
        -H "Authorization: Bearer ${TOKEN}")

    permission_id=$(echo "$permissions_response" | jq -r '.data[0].id // empty')

    if [ -n "$permission_id" ] && [ "$permission_id" != "null" ]; then
        total_tests=$((total_tests + 1))
        if test_endpoint "GET" "/permissions/${permission_id}" "获取单个权限详情"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    else
        print_info "No permissions found, skipping single permission test"
    fi

    # 测试：按资源获取权限
    total_tests=$((total_tests + 1))
    if test_endpoint "GET" "/permissions/resource/user" "按资源获取权限"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    # 测试：批量创建权限（使用测试数据）
    print_info "Skipping POST /permissions/bulk (避免创建重复数据)"

    # P3 优先级接口测试
    echo ""
    echo "=== P3 Priority Interfaces ==="

    # 测试：获取字段转换规则示例
    total_tests=$((total_tests + 1))
    if test_endpoint "GET" "/field-permissions/meta/transform-examples" "获取字段转换规则示例"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    # 额外测试：验证其他元数据接口
    echo ""
    echo "=== Additional Metadata Tests ==="

    total_tests=$((total_tests + 1))
    if test_endpoint "GET" "/field-permissions/meta/access-levels" "获取访问级别元数据"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    total_tests=$((total_tests + 1))
    if test_endpoint "GET" "/field-permissions/meta/operation-types" "获取操作类型元数据"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    total_tests=$((total_tests + 1))
    if test_endpoint "GET" "/data-scopes/meta/scope-types" "获取范围类型元数据"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    # 测试结果统计
    echo ""
    echo "=========================================="
    echo "  测试结果统计"
    echo "=========================================="
    echo "总测试数: ${total_tests}"
    print_success "通过: ${passed_tests}"

    if [ $failed_tests -gt 0 ]; then
        print_error "失败: ${failed_tests}"
    else
        echo "失败: ${failed_tests}"
    fi

    success_rate=$(awk "BEGIN {printf \"%.2f\", ($passed_tests / $total_tests) * 100}")
    echo "成功率: ${success_rate}%"
    echo ""

    if [ $failed_tests -eq 0 ]; then
        print_success "所有测试通过！ ✓"
        exit 0
    else
        print_error "部分测试失败，请检查日志"
        exit 1
    fi
}

# 运行主程序
main
