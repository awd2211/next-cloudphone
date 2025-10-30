#!/bin/bash

# 错误通知系统测试脚本
# 用于测试各种错误场景的通知功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_GATEWAY="http://localhost:30000"
USER_SERVICE="http://localhost:30001"
DEVICE_SERVICE="http://localhost:30002"
BILLING_SERVICE="http://localhost:30005"
APP_SERVICE="http://localhost:30003"

# 函数：打印标题
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# 函数：打印成功
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印警告
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 函数：等待用户确认
wait_for_enter() {
    echo -e "\n${YELLOW}按 Enter 继续...${NC}"
    read
}

# 检查服务是否运行
check_services() {
    print_header "检查服务状态"

    services=("user-service:$USER_SERVICE" "device-service:$DEVICE_SERVICE" "billing-service:$BILLING_SERVICE" "app-service:$APP_SERVICE")

    for service_url in "${services[@]}"; do
        service_name="${service_url%%:*}"
        url="${service_url#*:}"

        if curl -s "${url}/health" > /dev/null 2>&1; then
            print_success "$service_name is running"
        else
            print_error "$service_name is NOT running"
            echo "请先启动所有服务: pm2 start ecosystem.config.js"
            exit 1
        fi
    done
}

# 测试 1: 账号锁定错误 (ACCOUNT_LOCKED)
test_account_locked() {
    print_header "测试 1: 账号锁定错误 (ACCOUNT_LOCKED)"

    echo "模拟连续 5 次错误登录以触发账号锁定..."

    for i in {1..5}; do
        echo "尝试 $i/5..."
        response=$(curl -s -X POST "${API_GATEWAY}/api/users/auth/login" \
            -H "Content-Type: application/json" \
            -d '{
                "username": "test_lock_user",
                "password": "wrong_password_123",
                "captcha": "test",
                "captchaId": "test"
            }')

        echo "Response: $response"
        sleep 1
    done

    print_success "账号锁定测试完成"
    print_warning "查看 notification-service 日志确认错误聚合: pm2 logs notification-service"
    wait_for_enter
}

# 测试 2: 数据库连接失败 (DATABASE_CONNECTION_FAILED)
test_database_connection() {
    print_header "测试 2: 数据库连接失败"

    print_warning "此测试需要手动停止 PostgreSQL 服务"
    echo "1. 停止 PostgreSQL: docker compose -f docker-compose.dev.yml stop postgres"
    echo "2. 尝试登录以触发数据库连接错误"
    echo "3. 重启 PostgreSQL: docker compose -f docker-compose.dev.yml start postgres"

    print_warning "跳过自动测试，请手动执行"
    wait_for_enter
}

# 测试 3: 设备启动失败 (DEVICE_START_FAILED)
test_device_start_failed() {
    print_header "测试 3: 设备启动失败 (DEVICE_START_FAILED)"

    echo "需要有效的 JWT Token 进行测试"
    echo "请输入 JWT Token (或按 Enter 跳过):"
    read TOKEN

    if [ -z "$TOKEN" ]; then
        print_warning "跳过设备启动测试"
        return
    fi

    echo "尝试启动不存在的设备..."
    response=$(curl -s -X POST "${API_GATEWAY}/api/devices/non-existent-device-id/start" \
        -H "Authorization: Bearer $TOKEN")

    echo "Response: $response"

    print_success "设备启动失败测试完成"
    print_warning "查看 notification-service 日志: pm2 logs notification-service"
    wait_for_enter
}

# 测试 4: 支付创建失败 (PAYMENT_INITIATION_FAILED)
test_payment_failed() {
    print_header "测试 4: 支付创建失败"

    print_warning "此测试需要配置无效的支付网关凭证"
    echo "1. 修改 billing-service 的支付网关配置为无效值"
    echo "2. 尝试创建支付订单"
    echo "3. 恢复正确的配置"

    print_warning "跳过自动测试，请手动执行"
    wait_for_enter
}

# 测试 5: APK 上传失败 (APK_UPLOAD_FAILED)
test_apk_upload_failed() {
    print_header "测试 5: APK 上传失败 (APK_UPLOAD_FAILED)"

    echo "需要有效的 JWT Token 进行测试"
    echo "请输入 JWT Token (或按 Enter 跳过):"
    read TOKEN

    if [ -z "$TOKEN" ]; then
        print_warning "跳过 APK 上传测试"
        return
    fi

    echo "创建无效的 APK 文件..."
    echo "invalid apk content" > /tmp/invalid.apk

    echo "尝试上传无效 APK..."
    response=$(curl -s -X POST "${API_GATEWAY}/api/apps/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@/tmp/invalid.apk" \
        -F "name=TestApp" \
        -F "category=game")

    echo "Response: $response"
    rm -f /tmp/invalid.apk

    print_success "APK 上传失败测试完成"
    print_warning "查看 notification-service 日志: pm2 logs notification-service"
    wait_for_enter
}

# 测试 6: Redis 连接失败 (REDIS_CONNECTION_FAILED)
test_redis_connection() {
    print_header "测试 6: Redis 连接失败"

    print_warning "此测试需要手动停止 Redis 服务"
    echo "1. 停止 Redis: docker compose -f docker-compose.dev.yml stop redis"
    echo "2. 重启 user-service: pm2 restart user-service"
    echo "3. 查看日志确认 Redis 连接错误"
    echo "4. 重启 Redis: docker compose -f docker-compose.dev.yml start redis"

    print_warning "跳过自动测试，请手动执行"
    wait_for_enter
}

# 查看错误通知统计
view_error_stats() {
    print_header "错误通知统计"

    echo "正在获取 notification-service 的错误统计..."

    # 从日志中提取错误通知
    echo -e "\n${BLUE}最近的错误通知:${NC}"
    pm2 logs notification-service --lines 50 --nostream | grep -i "error\|failed" | tail -20

    echo -e "\n${BLUE}错误聚合情况:${NC}"
    pm2 logs notification-service --lines 100 --nostream | grep -i "threshold\|aggregat" | tail -10
}

# 主菜单
show_menu() {
    print_header "错误通知系统测试菜单"

    echo "请选择测试场景:"
    echo "1. 测试账号锁定 (ACCOUNT_LOCKED)"
    echo "2. 测试数据库连接失败 (DATABASE_CONNECTION_FAILED) - 手动"
    echo "3. 测试设备启动失败 (DEVICE_START_FAILED)"
    echo "4. 测试支付创建失败 (PAYMENT_INITIATION_FAILED) - 手动"
    echo "5. 测试 APK 上传失败 (APK_UPLOAD_FAILED)"
    echo "6. 测试 Redis 连接失败 (REDIS_CONNECTION_FAILED) - 手动"
    echo "7. 查看错误通知统计"
    echo "8. 运行所有自动测试"
    echo "0. 退出"
    echo ""
}

# 运行所有自动测试
run_all_tests() {
    print_header "运行所有自动测试"

    test_account_locked
    test_device_start_failed
    test_apk_upload_failed

    print_success "所有自动测试完成!"
    print_warning "请手动执行数据库、支付和 Redis 相关测试"
}

# 主程序
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   错误通知系统测试工具              ║"
    echo "║   Error Notification Test Suite     ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"

    # 检查服务状态
    check_services

    while true; do
        show_menu
        read -p "请输入选项 (0-8): " choice

        case $choice in
            1)
                test_account_locked
                ;;
            2)
                test_database_connection
                ;;
            3)
                test_device_start_failed
                ;;
            4)
                test_payment_failed
                ;;
            5)
                test_apk_upload_failed
                ;;
            6)
                test_redis_connection
                ;;
            7)
                view_error_stats
                wait_for_enter
                ;;
            8)
                run_all_tests
                ;;
            0)
                print_success "退出测试工具"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
    done
}

# 运行主程序
main
