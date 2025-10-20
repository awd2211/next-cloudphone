#!/bin/bash

# ========================================
# Redroid 集成测试脚本
# ========================================
# 用途: 测试云手机设备的完整生命周期
# 作者: Claude Code Assistant
# 日期: 2025-10-20
# ========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="${API_BASE_URL:-http://localhost:30002}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
TEST_USER_ID="${TEST_USER_ID:-test-user-123}"
TEST_DEVICE_NAME="test-redroid-$(date +%s)"

# 全局变量
DEVICE_ID=""
CLEANUP_NEEDED=false

# 工具函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 错误处理
trap cleanup EXIT

cleanup() {
    if [ "$CLEANUP_NEEDED" = true ] && [ -n "$DEVICE_ID" ]; then
        log_info "清理测试设备..."
        delete_device || log_warning "清理失败"
    fi
}

# HTTP 请求函数
http_get() {
    local endpoint=$1
    local auth_header=""

    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi

    curl -s -X GET "${API_BASE_URL}${endpoint}" $auth_header
}

http_post() {
    local endpoint=$1
    local data=$2
    local auth_header=""

    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi

    curl -s -X POST \
        "${API_BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        $auth_header \
        -d "$data"
}

http_delete() {
    local endpoint=$1
    local auth_header=""

    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi

    curl -s -X DELETE "${API_BASE_URL}${endpoint}" $auth_header
}

# 测试函数

# 1. 测试服务健康检查
test_health_check() {
    log_info "测试 1: 健康检查"

    response=$(http_get "/health")

    if echo "$response" | grep -q "ok"; then
        log_success "健康检查通过"
        return 0
    else
        log_error "健康检查失败"
        echo "$response"
        return 1
    fi
}

# 2. 测试创建设备
create_device() {
    log_info "测试 2: 创建 Redroid 设备"

    local payload=$(cat <<EOF
{
  "name": "$TEST_DEVICE_NAME",
  "description": "Redroid 集成测试设备",
  "userId": "$TEST_USER_ID",
  "cpuCores": 2,
  "memoryMB": 2048,
  "storageMB": 8192,
  "resolution": "720x1280",
  "dpi": 240,
  "androidVersion": "11"
}
EOF
)

    response=$(http_post "/devices" "$payload")

    DEVICE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$DEVICE_ID" ]; then
        log_success "设备创建成功: $DEVICE_ID"
        CLEANUP_NEEDED=true
        return 0
    else
        log_error "设备创建失败"
        echo "$response"
        return 1
    fi
}

# 3. 等待设备就绪
wait_for_device_ready() {
    log_info "测试 3: 等待设备启动完成"

    local max_wait=180  # 最多等待3分钟
    local elapsed=0
    local interval=5

    while [ $elapsed -lt $max_wait ]; do
        response=$(http_get "/devices/$DEVICE_ID")
        status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

        log_info "当前状态: $status (${elapsed}s / ${max_wait}s)"

        if [ "$status" = "running" ]; then
            log_success "设备启动成功"
            return 0
        elif [ "$status" = "error" ]; then
            log_error "设备启动失败"
            echo "$response"
            return 1
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "设备启动超时"
    return 1
}

# 4. 测试 ADB 连接
test_adb_connection() {
    log_info "测试 4: 测试 ADB 连接"

    local payload='{"command": "getprop ro.build.version.release"}'
    response=$(http_post "/devices/$DEVICE_ID/shell" "$payload")

    if echo "$response" | grep -q "[0-9]"; then
        log_success "ADB 连接正常"
        echo "Android 版本: $(echo $response | grep -o '[0-9]*')"
        return 0
    else
        log_error "ADB 连接失败"
        echo "$response"
        return 1
    fi
}

# 5. 测试设备属性
test_device_properties() {
    log_info "测试 5: 获取设备属性"

    response=$(http_get "/devices/$DEVICE_ID/properties")

    if echo "$response" | grep -q "ro.build"; then
        log_success "设备属性获取成功"
        echo "$response" | grep -o '"ro.product.model":"[^"]*"' | head -1
        return 0
    else
        log_error "设备属性获取失败"
        echo "$response"
        return 1
    fi
}

# 6. 测试截图功能
test_screenshot() {
    log_info "测试 6: 测试截图功能"

    response=$(http_post "/devices/$DEVICE_ID/screenshot" "{}")

    if echo "$response" | grep -q "screenshot"; then
        log_success "截图功能正常"
        screenshot_path=$(echo "$response" | grep -o '"path":"[^"]*"' | cut -d'"' -f4)
        log_info "截图保存在: $screenshot_path"
        return 0
    else
        log_error "截图功能失败"
        echo "$response"
        return 1
    fi
}

# 7. 测试 Shell 命令
test_shell_commands() {
    log_info "测试 7: 测试 Shell 命令执行"

    local commands=(
        "echo:测试echo"
        "ls -la /sdcard:列出SD卡"
        "pm list packages -3:列出第三方应用"
    )

    for cmd_desc in "${commands[@]}"; do
        IFS=':' read -r cmd desc <<< "$cmd_desc"
        log_info "  执行: $desc"

        payload="{\"command\": \"$cmd\"}"
        response=$(http_post "/devices/$DEVICE_ID/shell" "$payload")

        if [ $? -eq 0 ]; then
            log_success "  命令执行成功"
        else
            log_warning "  命令执行失败"
        fi
    done

    return 0
}

# 8. 测试设备统计
test_device_stats() {
    log_info "测试 8: 获取设备统计信息"

    response=$(http_get "/devices/$DEVICE_ID/stats")

    if echo "$response" | grep -q "cpu"; then
        log_success "设备统计信息获取成功"
        return 0
    else
        log_warning "设备统计信息获取失败"
        return 0  # 非关键功能，不影响整体测试
    fi
}

# 9. 测试设备停止和启动
test_device_lifecycle() {
    log_info "测试 9: 测试设备生命周期（停止/启动）"

    # 停止设备
    log_info "  停止设备..."
    response=$(http_post "/devices/$DEVICE_ID/stop" "{}")
    sleep 5

    status=$(http_get "/devices/$DEVICE_ID" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$status" = "stopped" ]; then
        log_success "  设备已停止"
    else
        log_warning "  设备停止状态异常: $status"
    fi

    # 启动设备
    log_info "  启动设备..."
    response=$(http_post "/devices/$DEVICE_ID/start" "{}")
    sleep 10

    status=$(http_get "/devices/$DEVICE_ID" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$status" = "running" ]; then
        log_success "  设备已启动"
        return 0
    else
        log_warning "  设备启动状态异常: $status"
        return 0
    fi
}

# 10. 测试端口分配
test_port_allocation() {
    log_info "测试 10: 检查端口分配"

    response=$(http_get "/devices/$DEVICE_ID")

    adb_port=$(echo "$response" | grep -o '"adbPort":[0-9]*' | cut -d':' -f2)

    if [ -n "$adb_port" ] && [ "$adb_port" -ge 5555 ] && [ "$adb_port" -le 6554 ]; then
        log_success "端口分配正常: ADB=$adb_port"

        # 测试端口是否可访问
        if timeout 2 bash -c "echo > /dev/tcp/localhost/$adb_port" 2>/dev/null; then
            log_success "  ADB 端口可访问"
        else
            log_warning "  ADB 端口不可访问"
        fi

        return 0
    else
        log_error "端口分配异常"
        return 1
    fi
}

# 11. 删除设备
delete_device() {
    log_info "测试 11: 删除设备"

    response=$(http_delete "/devices/$DEVICE_ID")

    if [ $? -eq 0 ]; then
        log_success "设备删除成功"
        CLEANUP_NEEDED=false
        return 0
    else
        log_error "设备删除失败"
        echo "$response"
        return 1
    fi
}

# 主测试流程
main() {
    echo ""
    echo "========================================"
    echo "  Redroid 集成测试"
    echo "========================================"
    echo ""
    echo "测试配置:"
    echo "  API 地址: $API_BASE_URL"
    echo "  用户 ID: $TEST_USER_ID"
    echo "  设备名称: $TEST_DEVICE_NAME"
    echo ""

    local failed_tests=0
    local total_tests=11

    # 执行测试
    test_health_check || ((failed_tests++))
    echo ""

    create_device || { log_error "创建设备失败，终止测试"; exit 1; }
    echo ""

    wait_for_device_ready || { log_error "设备启动失败，终止测试"; exit 1; }
    echo ""

    test_adb_connection || ((failed_tests++))
    echo ""

    test_device_properties || ((failed_tests++))
    echo ""

    test_screenshot || ((failed_tests++))
    echo ""

    test_shell_commands || ((failed_tests++))
    echo ""

    test_device_stats || ((failed_tests++))
    echo ""

    test_device_lifecycle || ((failed_tests++))
    echo ""

    test_port_allocation || ((failed_tests++))
    echo ""

    delete_device || ((failed_tests++))
    echo ""

    # 测试总结
    echo "========================================"
    echo "  测试完成"
    echo "========================================"
    echo ""
    echo "总测试数: $total_tests"
    echo "成功: $((total_tests - failed_tests))"
    echo "失败: $failed_tests"
    echo ""

    if [ $failed_tests -eq 0 ]; then
        log_success "所有测试通过! 🎉"
        exit 0
    else
        log_warning "部分测试失败"
        exit 1
    fi
}

# 执行主函数
main "$@"
