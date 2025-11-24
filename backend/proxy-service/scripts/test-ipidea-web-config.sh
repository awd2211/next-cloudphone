#!/bin/bash

# IPIDEA Web 配置测试脚本
# 用于验证通过 Web 界面配置的 IPIDEA 是否正常工作

set -e

# 配置
API_BASE="${API_BASE:-http://localhost:30000}"
TOKEN="${TOKEN:-your-jwt-token-here}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 检查依赖
check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Install with: sudo apt-get install jq"
        exit 1
    fi

    print_success "Dependencies OK"
}

# 测试 API 连接
test_api_connection() {
    print_info "Testing API connection..."

    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/health")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "API connection OK"
    else
        print_error "API connection failed (HTTP $HTTP_CODE)"
        exit 1
    fi
}

# 获取所有提供商
get_providers() {
    print_info "Fetching all proxy providers..."

    RESPONSE=$(curl -s "$API_BASE/proxy/providers" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
        PROVIDER_COUNT=$(echo "$RESPONSE" | jq 'length')
        print_success "Found $PROVIDER_COUNT provider(s)"

        # 查找 IPIDEA 提供商
        IPIDEA_PROVIDERS=$(echo "$RESPONSE" | jq '[.[] | select(.type == "ipidea")]')
        IPIDEA_COUNT=$(echo "$IPIDEA_PROVIDERS" | jq 'length')

        if [ "$IPIDEA_COUNT" -gt 0 ]; then
            print_success "Found $IPIDEA_COUNT IPIDEA provider(s)"
            echo "$IPIDEA_PROVIDERS" | jq -r '.[] | "\(.name) (ID: \(.id), Enabled: \(.enabled))"'

            # 返回第一个 IPIDEA 提供商的 ID
            PROVIDER_ID=$(echo "$IPIDEA_PROVIDERS" | jq -r '.[0].id')
            echo "$PROVIDER_ID"
        else
            print_error "No IPIDEA provider found. Please add one via web interface first."
            exit 1
        fi
    else
        print_error "Failed to fetch providers"
        exit 1
    fi
}

# 测试提供商连接
test_provider_connection() {
    local PROVIDER_ID=$1
    print_info "Testing IPIDEA provider connection..."

    RESPONSE=$(curl -s "$API_BASE/proxy/providers/$PROVIDER_ID/test" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")

    if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
        LATENCY=$(echo "$RESPONSE" | jq -r '.latency')
        MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
        print_success "Connection test passed (Latency: ${LATENCY}ms)"
        print_info "$MESSAGE"
    else
        MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
        print_error "Connection test failed: $MESSAGE"
        exit 1
    fi
}

# 获取剩余流量
get_flow_stats() {
    local PROVIDER_ID=$1
    print_info "Getting flow statistics..."

    RESPONSE=$(curl -s "$API_BASE/proxy/ipidea/$PROVIDER_ID/flow/remaining" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
        FLOW_GB=$(echo "$RESPONSE" | jq -r '.flowLeftGB')
        FLOW_MB=$(echo "$RESPONSE" | jq -r '.flowLeftMB')
        print_success "Remaining flow: ${FLOW_GB} GB (${FLOW_MB} MB)"

        # 检查流量是否充足
        if [ "$(echo "$FLOW_GB < 1" | bc)" -eq 1 ]; then
            print_error "⚠️  Low flow warning: less than 1 GB remaining!"
        fi
    else
        print_error "Failed to get flow statistics"
    fi
}

# 获取白名单
get_whitelist() {
    local PROVIDER_ID=$1
    print_info "Getting IP whitelist..."

    RESPONSE=$(curl -s "$API_BASE/proxy/ipidea/$PROVIDER_ID/whitelist" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
        IP_COUNT=$(echo "$RESPONSE" | jq 'length')
        print_success "Whitelist has $IP_COUNT IP(s)"

        if [ "$IP_COUNT" -gt 0 ]; then
            echo "$RESPONSE" | jq -r '.[]' | while read IP; do
                echo "  - $IP"
            done
        else
            print_error "⚠️  No IPs in whitelist. Add your server IP via web interface."
        fi
    else
        print_error "Failed to get whitelist"
    fi
}

# 获取账户列表
get_accounts() {
    local PROVIDER_ID=$1
    print_info "Getting proxy accounts..."

    RESPONSE=$(curl -s "$API_BASE/proxy/ipidea/$PROVIDER_ID/accounts" \
        -H "Authorization: Bearer $TOKEN")

    if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
        ACCOUNT_COUNT=$(echo "$RESPONSE" | jq '.total')
        print_success "Found $ACCOUNT_COUNT account(s)"

        if [ "$ACCOUNT_COUNT" -gt 0 ]; then
            echo "$RESPONSE" | jq -r '.accounts[] | "\(.account) - Flow: \(.flowRemaining)MB remaining"'
        fi
    else
        print_error "Failed to get accounts"
    fi
}

# 测试代理获取
test_proxy_acquisition() {
    print_info "Testing proxy acquisition..."

    RESPONSE=$(curl -s "$API_BASE/proxy/acquire" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "provider": "ipidea",
            "country": "us"
        }')

    if echo "$RESPONSE" | jq -e '.host' >/dev/null 2>&1; then
        HOST=$(echo "$RESPONSE" | jq -r '.host')
        PORT=$(echo "$RESPONSE" | jq -r '.port')
        COUNTRY=$(echo "$RESPONSE" | jq -r '.location.country')
        print_success "Proxy acquired successfully"
        print_info "Proxy: $HOST:$PORT (Country: $COUNTRY)"
    else
        print_error "Failed to acquire proxy"
        echo "$RESPONSE" | jq .
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  IPIDEA Web Configuration Test"
    echo "=========================================="
    echo ""

    # 检查是否提供了 TOKEN
    if [ "$TOKEN" = "your-jwt-token-here" ]; then
        print_error "Please set TOKEN environment variable"
        echo "Usage: TOKEN=your-token ./test-ipidea-web-config.sh"
        exit 1
    fi

    # 运行测试
    check_dependencies
    test_api_connection

    PROVIDER_ID=$(get_providers)

    if [ -n "$PROVIDER_ID" ]; then
        echo ""
        test_provider_connection "$PROVIDER_ID"
        echo ""
        get_flow_stats "$PROVIDER_ID"
        echo ""
        get_whitelist "$PROVIDER_ID"
        echo ""
        get_accounts "$PROVIDER_ID"
        echo ""
        test_proxy_acquisition
    fi

    echo ""
    echo "=========================================="
    print_success "All tests completed!"
    echo "=========================================="
}

# 运行主函数
main
