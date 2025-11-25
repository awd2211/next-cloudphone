#!/bin/bash

# =============================================================================
# 测试通知适配器服务
# 功能：验证 Lark 和 Telegram webhook 适配器是否正常工作
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
LARK_WEBHOOK_PORT=30011
TELEGRAM_WEBHOOK_PORT=30012
TEST_ALERT_FILE="../test-alert.json"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}通知适配器服务测试${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# 函数：打印步骤
print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

# 函数：打印成功
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印信息
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# =============================================================================
# 1. 检查服务运行状态
# =============================================================================
print_step "步骤 1: 检查服务运行状态"
echo ""

# 检查 Lark Webhook Adapter
print_info "检查 Lark Webhook Adapter (端口 ${LARK_WEBHOOK_PORT})..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${LARK_WEBHOOK_PORT}/health" | grep -q "200"; then
    print_success "Lark Webhook Adapter 运行正常"
    LARK_RUNNING=true
else
    print_error "Lark Webhook Adapter 未运行或无法访问"
    print_info "请先启动服务: cd alertmanager-lark-webhook && docker compose up -d"
    LARK_RUNNING=false
fi

echo ""

# 检查 Telegram Bot Adapter
print_info "检查 Telegram Bot Adapter (端口 ${TELEGRAM_WEBHOOK_PORT})..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TELEGRAM_WEBHOOK_PORT}/health" | grep -q "200"; then
    print_success "Telegram Bot Adapter 运行正常"
    TELEGRAM_RUNNING=true
else
    print_error "Telegram Bot Adapter 未运行或无法访问"
    print_info "请先启动服务: cd alertmanager-telegram-bot && docker compose up -d"
    TELEGRAM_RUNNING=false
fi

echo ""

# 如果两个服务都没运行，退出
if [ "$LARK_RUNNING" = false ] && [ "$TELEGRAM_RUNNING" = false ]; then
    print_error "没有运行中的适配器服务，无法继续测试"
    exit 1
fi

# =============================================================================
# 2. 测试 Lark Webhook Adapter
# =============================================================================
if [ "$LARK_RUNNING" = true ]; then
    echo ""
    print_step "步骤 2: 测试 Lark Webhook Adapter"
    echo ""

    # 检查测试文件
    if [ ! -f "$TEST_ALERT_FILE" ]; then
        print_error "测试告警文件不存在: $TEST_ALERT_FILE"
    else
        print_info "发送测试告警到 Lark Webhook Adapter..."

        RESPONSE=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d @"$TEST_ALERT_FILE" \
            -w "\n%{http_code}" \
            "http://localhost:${LARK_WEBHOOK_PORT}/lark-webhook")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)

        if [ "$HTTP_CODE" = "200" ]; then
            print_success "Lark Webhook 测试成功 (HTTP $HTTP_CODE)"
            print_info "响应: $BODY"

            # 检查是否配置了实际的 Lark Webhook URL
            if echo "$BODY" | grep -q "模拟模式"; then
                print_info "⚠️  当前运行在模拟模式（未配置实际 Lark Webhook URL）"
                print_info "   若要发送真实消息，请在 .env 中配置 LARK_WEBHOOK_URL"
            else
                print_success "✓ 已向飞书群组发送测试消息"
            fi
        else
            print_error "Lark Webhook 测试失败 (HTTP $HTTP_CODE)"
            print_error "响应: $BODY"
        fi
    fi
fi

# =============================================================================
# 3. 测试 Telegram Bot Adapter
# =============================================================================
if [ "$TELEGRAM_RUNNING" = true ]; then
    echo ""
    print_step "步骤 3: 测试 Telegram Bot Adapter"
    echo ""

    # 检查测试文件
    if [ ! -f "$TEST_ALERT_FILE" ]; then
        print_error "测试告警文件不存在: $TEST_ALERT_FILE"
    else
        print_info "发送测试告警到 Telegram Bot Adapter..."

        RESPONSE=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d @"$TEST_ALERT_FILE" \
            -w "\n%{http_code}" \
            "http://localhost:${TELEGRAM_WEBHOOK_PORT}/telegram-webhook")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)

        if [ "$HTTP_CODE" = "200" ]; then
            print_success "Telegram Webhook 测试成功 (HTTP $HTTP_CODE)"
            print_info "响应: $BODY"

            # 检查是否配置了实际的 Telegram Bot
            if echo "$BODY" | grep -q "模拟模式"; then
                print_info "⚠️  当前运行在模拟模式（未配置实际 Telegram Bot）"
                print_info "   若要发送真实消息，请在 .env 中配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID"
            else
                print_success "✓ 已向 Telegram 群组发送测试消息"
            fi
        else
            print_error "Telegram Webhook 测试失败 (HTTP $HTTP_CODE)"
            print_error "响应: $BODY"
        fi
    fi
fi

# =============================================================================
# 4. 查看服务日志
# =============================================================================
echo ""
print_step "步骤 4: 查看服务日志（最近 10 行）"
echo ""

if [ "$LARK_RUNNING" = true ]; then
    print_info "Lark Webhook Adapter 日志:"
    docker logs alertmanager-lark-webhook --tail 10 2>&1 || echo "无法获取日志"
    echo ""
fi

if [ "$TELEGRAM_RUNNING" = true ]; then
    print_info "Telegram Bot Adapter 日志:"
    docker logs alertmanager-telegram-bot --tail 10 2>&1 || echo "无法获取日志"
    echo ""
fi

# =============================================================================
# 总结
# =============================================================================
echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}测试总结${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

print_info "服务状态:"
echo "  • Lark Webhook Adapter:    $([ "$LARK_RUNNING" = true ] && echo -e "${GREEN}运行中${NC}" || echo -e "${RED}未运行${NC}")"
echo "  • Telegram Bot Adapter:    $([ "$TELEGRAM_RUNNING" = true ] && echo -e "${GREEN}运行中${NC}" || echo -e "${RED}未运行${NC}")"
echo ""

print_info "下一步操作:"
echo "  1. 配置实际的 Webhook URL 和 Bot Token（在各自的 .env 文件中）"
echo "  2. 重启适配器服务: docker compose restart"
echo "  3. 重启 AlertManager 以应用配置: cd ../prometheus && docker compose restart alertmanager"
echo "  4. 触发真实告警测试: pm2 stop user-service"
echo "  5. 检查是否收到通知，然后恢复服务: pm2 start user-service"
echo ""

print_success "测试完成！"
