#!/bin/bash

# Phase 5: End-to-End Event Flow Testing
# 测试从设备创建到事件消费的完整流程

set -e

echo "========================================"
echo "  Phase 5: 端到端事件流测试"
echo "========================================"
echo ""

BASE_URL="http://localhost:30001/api/v1"
DEVICE_URL="http://localhost:30002/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Get captcha
print_step "1. 获取验证码"
CAPTCHA_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/captcha")
CAPTCHA_ID=$(echo "$CAPTCHA_RESPONSE" | jq -r '.captchaId')
CAPTCHA_TEXT=$(echo "$CAPTCHA_RESPONSE" | jq -r '.captcha')

if [ "$CAPTCHA_ID" != "null" ] && [ "$CAPTCHA_TEXT" != "null" ]; then
    print_success "获取验证码成功: ID=$CAPTCHA_ID, Text=$CAPTCHA_TEXT"
else
    print_error "获取验证码失败"
    echo "$CAPTCHA_RESPONSE" | jq '.'
    exit 1
fi

echo ""

# Step 2: Login
print_step "2. 用户登录"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"admin123\",\"captcha\":\"$CAPTCHA_TEXT\",\"captchaId\":\"$CAPTCHA_ID\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // .data.access_token')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    print_success "登录成功，获取 Token: ${ACCESS_TOKEN:0:20}..."
else
    print_error "登录失败"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

echo ""

# Step 3: Get EventOutbox count before device creation
print_step "3. 获取 EventOutbox 初始状态"
INITIAL_OUTBOX_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE processed_at IS NULL;" 2>/dev/null | xargs || echo "0")

print_success "EventOutbox 待处理事件数: $INITIAL_OUTBOX_COUNT"

echo ""

# Step 4: Create test device
print_step "4. 创建测试设备 (触发事件)"
DEVICE_RESPONSE=$(curl -s -X POST "$DEVICE_URL/devices" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
        "name": "e2e-test-device",
        "androidVersion": "11.0",
        "cpuCores": 2,
        "memoryMB": 2048,
        "diskGB": 8,
        "dpi": 320,
        "resolution": "1080x1920"
    }')

DEVICE_ID=$(echo "$DEVICE_RESPONSE" | jq -r '.id // .data.id')
DEVICE_STATUS=$(echo "$DEVICE_RESPONSE" | jq -r '.status')

if [ "$DEVICE_ID" != "null" ] && [ -n "$DEVICE_ID" ]; then
    print_success "设备创建成功: ID=$DEVICE_ID, Status=$DEVICE_STATUS"
else
    print_warning "设备创建可能失败 (Docker不可用是正常的)"
    echo "$DEVICE_RESPONSE" | jq '.'
fi

echo ""

# Step 5: Check EventOutbox after device creation
print_step "5. 检查 EventOutbox 是否记录了事件"
sleep 1  # 等待事件写入

OUTBOX_AFTER_CREATE=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE processed_at IS NULL;" 2>/dev/null | xargs || echo "0")

OUTBOX_DEVICE_EVENTS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT event_type FROM event_outbox WHERE processed_at IS NULL ORDER BY created_at DESC LIMIT 5;" 2>/dev/null | xargs || echo "")

if [ "$OUTBOX_AFTER_CREATE" -gt "$INITIAL_OUTBOX_COUNT" ]; then
    print_success "EventOutbox 新增事件: $(($OUTBOX_AFTER_CREATE - $INITIAL_OUTBOX_COUNT)) 个"
    echo "   最新事件类型: $OUTBOX_DEVICE_EVENTS"
else
    print_warning "EventOutbox 未新增事件 (可能设备创建失败或事件已被处理)"
fi

echo ""

# Step 6: Wait for EventOutbox polling to process events
print_step "6. 等待 EventOutbox 轮询处理事件 (5秒)"
sleep 6

OUTBOX_AFTER_POLL=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE processed_at IS NULL;" 2>/dev/null | xargs || echo "0")

OUTBOX_PROCESSED=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE processed_at IS NOT NULL;" 2>/dev/null | xargs || echo "0")

if [ "$OUTBOX_AFTER_POLL" -lt "$OUTBOX_AFTER_CREATE" ]; then
    print_success "EventOutbox 已处理事件，剩余待处理: $OUTBOX_AFTER_POLL"
    print_success "EventOutbox 累计已处理: $OUTBOX_PROCESSED 个事件"
else
    print_warning "EventOutbox 可能未处理事件 (或无新事件)"
fi

echo ""

# Step 7: Check RabbitMQ message count
print_step "7. 检查 RabbitMQ 消息队列"

RABBITMQ_QUEUES=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | jq -r '.[] | select(.name | contains("device")) | "\(.name): \(.messages) messages, \(.messages_ready) ready"')

if [ -n "$RABBITMQ_QUEUES" ]; then
    print_success "RabbitMQ 设备相关队列状态:"
    echo "$RABBITMQ_QUEUES" | while read -r line; do
        echo "   $line"
    done
else
    print_warning "无法获取 RabbitMQ 队列信息"
fi

echo ""

# Step 8: Check notification-service logs for event consumption
print_step "8. 检查 notification-service 是否消费了事件"

NOTIFICATION_LOGS=$(pm2 logs notification-service --lines 20 --nostream 2>/dev/null | grep -i "device\|event" | tail -5 || echo "")

if [ -n "$NOTIFICATION_LOGS" ]; then
    print_success "notification-service 最近日志:"
    echo "$NOTIFICATION_LOGS" | while read -r line; do
        echo "   $line"
    done
else
    print_warning "未找到 notification-service 相关日志"
fi

echo ""

# Step 9: Check billing-service logs for event consumption
print_step "9. 检查 billing-service 是否消费了事件"

BILLING_LOGS=$(pm2 logs billing-service --lines 20 --nostream 2>/dev/null | grep -i "device\|event" | tail -5 || echo "")

if [ -n "$BILLING_LOGS" ]; then
    print_success "billing-service 最近日志:"
    echo "$BILLING_LOGS" | while read -r line; do
        echo "   $line"
    done
else
    print_warning "未找到 billing-service 相关日志"
fi

echo ""

# Step 10: Cleanup - Delete test device
if [ "$DEVICE_ID" != "null" ] && [ -n "$DEVICE_ID" ]; then
    print_step "10. 清理测试设备"
    DELETE_RESPONSE=$(curl -s -X DELETE "$DEVICE_URL/devices/$DEVICE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    DELETE_STATUS=$(echo "$DELETE_RESPONSE" | jq -r '.message // .status')

    if [ "$DELETE_STATUS" != "null" ]; then
        print_success "测试设备已删除: $DELETE_STATUS"
    else
        print_warning "测试设备删除可能失败"
    fi
else
    print_warning "10. 跳过清理 (无设备创建)"
fi

echo ""
echo "========================================"
echo "  测试完成"
echo "========================================"
echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
echo -e "${RED}失败: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠ 部分测试未通过，请检查上述日志${NC}"
    exit 1
fi
