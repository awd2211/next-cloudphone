#!/bin/bash

# API 接口测试脚本
# 用于测试所有后端接口的连通性和数据返回

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Gateway 地址
API_BASE="http://localhost:30000/api"
USER_SERVICE="http://localhost:30001"

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 打印标题
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local token=${4:-""}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # 构建 curl 命令
    local curl_cmd="curl -s -w '\n%{http_code}' -o /tmp/api_response.txt"
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    curl_cmd="$curl_cmd '$url'"
    
    # 执行请求
    local response=$(eval $curl_cmd)
    local status_code=$(echo "$response" | tail -n 1)
    local body=$(cat /tmp/api_response.txt)
    
    # 检查状态码
    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name"
        echo -e "  ${GREEN}Status: $status_code${NC}"
        
        # 尝试解析 JSON 并显示关键信息
        if command -v python3 &> /dev/null; then
            local summary=$(echo "$body" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, dict):
        if 'success' in data:
            print(f\"  Success: {data.get('success')}\")
        if 'total' in data:
            print(f\"  Total: {data.get('total')}\")
        if 'data' in data and isinstance(data['data'], list):
            print(f\"  Records: {len(data['data'])}\")
        if 'message' in data:
            print(f\"  Message: {data.get('message')}\")
except:
    pass
" 2>/dev/null)
            if [ -n "$summary" ]; then
                echo "$summary"
            fi
        fi
        
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $name"
        echo -e "  ${RED}Expected: $expected_status, Got: $status_code${NC}"
        echo -e "  ${YELLOW}Response:${NC} $(echo "$body" | head -c 100)..."
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# 测试带 Token 的端点
test_with_auth() {
    local name=$1
    local url=$2
    local token=$3
    
    test_endpoint "$name (需要认证)" "$url" "200" "$token"
}

# 获取登录 Token
get_auth_token() {
    print_header "🔐 获取认证 Token"
    
    # 首先获取验证码
    echo "1. 获取验证码..."
    local captcha_response=$(curl -s "${API_BASE}/auth/captcha")
    local captcha_id=$(echo "$captcha_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
    
    if [ -z "$captcha_id" ]; then
        echo -e "${YELLOW}⚠ 无法获取验证码，使用测试 captchaId${NC}"
        captcha_id="test-captcha-id"
    else
        echo -e "${GREEN}✓ 验证码ID: $captcha_id${NC}"
    fi
    
    # 登录获取 Token
    echo "2. 使用 admin/admin123 登录..."
    local login_response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"admin\",\"password\":\"admin123\",\"captcha\":\"test\",\"captchaId\":\"$captcha_id\"}")
    
    local token=$(echo "$login_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)
    
    if [ -n "$token" ] && [ "$token" != "None" ]; then
        echo -e "${GREEN}✓ Token 获取成功${NC}"
        echo "$token"
    else
        echo -e "${YELLOW}⚠ Token 获取失败，部分测试可能失败${NC}"
        echo -e "${YELLOW}Response: $login_response${NC}"
        echo ""
    fi
}

# 主测试流程
main() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║     CloudPhone API 接口测试工具         ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 获取认证 Token
    AUTH_TOKEN=$(get_auth_token)
    
    # 测试公开接口
    print_header "📡 测试公开接口"
    test_endpoint "验证码生成" "${API_BASE}/auth/captcha" "200"
    test_endpoint "数据范围类型（元数据）" "${API_BASE}/data-scopes/meta/scope-types" "200"
    
    # 测试需要认证的接口
    print_header "🔒 测试认证接口"
    test_with_auth "当前用户信息" "${API_BASE}/auth/me" "$AUTH_TOKEN"
    test_with_auth "角色列表" "${API_BASE}/roles" "$AUTH_TOKEN"
    test_with_auth "权限列表" "${API_BASE}/permissions" "$AUTH_TOKEN"
    test_with_auth "数据范围列表" "${API_BASE}/data-scopes" "$AUTH_TOKEN"
    test_with_auth "数据范围列表（isActive=true）" "${API_BASE}/data-scopes?isActive=true" "$AUTH_TOKEN"
    test_with_auth "用户列表" "${API_BASE}/users" "$AUTH_TOKEN"
    
    # 测试微服务健康检查
    print_header "🏥 测试服务健康状态"
    test_endpoint "API Gateway 健康检查" "http://localhost:30000/api/health" "200"
    test_endpoint "User Service 健康检查" "http://localhost:30001/health" "200"
    test_endpoint "Device Service 健康检查" "http://localhost:30002/health" "200"
    test_endpoint "App Service 健康检查" "http://localhost:30003/health" "200"
    test_endpoint "Billing Service 健康检查" "http://localhost:30005/health" "200"
    test_endpoint "Notification Service 健康检查" "http://localhost:30006/health" "200"
    
    # 测试直接访问 User Service（对比）
    print_header "🔍 对比测试（直接访问 User Service）"
    test_endpoint "数据范围列表（直接访问）" "${USER_SERVICE}/data-scopes?isActive=true" "200"
    
    # 打印测试结果
    print_header "📊 测试结果汇总"
    echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失败: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 所有测试通过！${NC}\n"
        exit 0
    else
        echo -e "\n${RED}⚠ 部分测试失败，请检查日志${NC}\n"
        exit 1
    fi
}

# 运行主函数
main
