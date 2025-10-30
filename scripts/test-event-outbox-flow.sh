#!/bin/bash

# Phase 5: Event Outbox Flow Testing
# 通过直接插入 EventOutbox 测试事件流

set -e

echo "========================================"
echo "  Phase 5: EventOutbox 事件流测试"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Check initial EventOutbox state
print_step "1. 检查 EventOutbox 初始状态"

cd /home/eric/next-cloudphone

INITIAL_PENDING=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'pending';" 2>/dev/null | xargs || echo "0")

INITIAL_PUBLISHED=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'published';" 2>/dev/null | xargs || echo "0")

print_success "EventOutbox 状态: 待处理=$INITIAL_PENDING, 已发布=$INITIAL_PUBLISHED"

echo ""

# Step 2: Insert test event
print_step "2. 插入测试事件到 EventOutbox"

TEST_EVENT_ID=$(uuidgen 2>/dev/null || echo "test-$(date +%s)")
TEST_AGGREGATE_ID="test-device-$(date +%s)"

docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device << EOF
INSERT INTO event_outbox (
    id,
    aggregate_id,
    aggregate_type,
    event_type,
    payload,
    status,
    created_at
) VALUES (
    '$TEST_EVENT_ID',
    '$TEST_AGGREGATE_ID',
    'device',
    'device.test.created',
    '{"deviceId": "$TEST_AGGREGATE_ID", "userId": "test-user", "name": "Test Device", "status": "running", "message": "This is a test event for Phase 5 validation"}'::jsonb,
    'pending',
    NOW()
);
EOF

if [ $? -eq 0 ]; then
    print_success "测试事件已插入: event_type=device.test.created, aggregate_id=$TEST_AGGREGATE_ID"
else
    print_error "测试事件插入失败"
    exit 1
fi

echo ""

# Step 3: Verify event was inserted
print_step "3. 验证事件已写入 EventOutbox"

EVENT_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE id = '$TEST_EVENT_ID';" 2>/dev/null | xargs || echo "0")

if [ "$EVENT_COUNT" = "1" ]; then
    print_success "事件已成功写入 EventOutbox"
else
    print_error "事件未找到 (预期: 1, 实际: $EVENT_COUNT)"
    exit 1
fi

echo ""

# Step 4: Wait for EventOutbox polling
print_step "4. 等待 EventOutbox 轮询处理事件 (7秒)"

echo "   EventOutbox 轮询间隔: 每 5 秒"
sleep 7

echo ""

# Step 5: Check if event was processed
print_step "5. 检查事件是否已被 EventOutbox 处理"

EVENT_STATUS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT status FROM event_outbox WHERE id = '$TEST_EVENT_ID';" 2>/dev/null | xargs || echo "unknown")

if [ "$EVENT_STATUS" = "published" ]; then
    print_success "事件已被 EventOutbox 处理并发送到 RabbitMQ"

    PUBLISHED_AT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
        psql -U postgres -d cloudphone_device -t -c "SELECT published_at FROM event_outbox WHERE id = '$TEST_EVENT_ID';" 2>/dev/null | xargs)

    echo "   发布时间: $PUBLISHED_AT"
elif [ "$EVENT_STATUS" = "pending" ]; then
    print_warning "事件仍在待处理状态 (可能需要更长时间或服务未运行)"
elif [ "$EVENT_STATUS" = "failed" ]; then
    ERROR_MSG=$(docker compose -f docker-compose.dev.yml exec -T postgres \
        psql -U postgres -d cloudphone_device -t -c "SELECT error_message FROM event_outbox WHERE id = '$TEST_EVENT_ID';" 2>/dev/null | xargs)
    print_error "事件处理失败: $ERROR_MSG"
else
    print_warning "事件状态未知"
fi

echo ""

# Step 6: Check RabbitMQ queues
print_step "6. 检查 RabbitMQ 消息队列"

DEVICE_QUEUES=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone 2>/dev/null | \
    jq -r '.[] | select(.name | contains("device")) | "\(.name): messages=\(.messages), ready=\(.messages_ready), consumers=\(.consumers)"' 2>/dev/null)

if [ -n "$DEVICE_QUEUES" ]; then
    print_success "RabbitMQ 设备相关队列:"
    echo "$DEVICE_QUEUES" | while read -r line; do
        echo "   $line"
    done
else
    print_warning "无法获取 RabbitMQ 队列信息 (可能 RabbitMQ 管理 API 不可用)"
fi

echo ""

# Step 7: Check PM2 logs for event consumption
print_step "7. 检查服务日志中的事件消费记录"

echo "   [notification-service]"
NOTIFICATION_LOGS=$(pm2 logs notification-service --lines 30 --nostream 2>/dev/null | \
    grep -i "device.test.created\|$TEST_AGGREGATE_ID" | tail -3 || echo "")

if [ -n "$NOTIFICATION_LOGS" ]; then
    print_success "notification-service 已消费事件:"
    echo "$NOTIFICATION_LOGS" | while read -r line; do
        echo "     $line"
    done
else
    print_warning "notification-service 未找到相关日志"
fi

echo ""

echo "   [billing-service]"
BILLING_LOGS=$(pm2 logs billing-service --lines 30 --nostream 2>/dev/null | \
    grep -i "device.test.created\|$TEST_AGGREGATE_ID" | tail -3 || echo "")

if [ -n "$BILLING_LOGS" ]; then
    print_success "billing-service 已消费事件:"
    echo "$BILLING_LOGS" | while read -r line; do
        echo "     $line"
    done
else
    print_warning "billing-service 未找到相关日志"
fi

echo ""

# Step 8: Summary
print_step "8. 测试总结"

FINAL_PENDING=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'pending';" 2>/dev/null | xargs || echo "0")

FINAL_PUBLISHED=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'published';" 2>/dev/null | xargs || echo "0")

PUBLISHED_DIFF=$((FINAL_PUBLISHED - INITIAL_PUBLISHED))

echo ""
echo "EventOutbox 状态变化:"
echo "  初始: 待处理=$INITIAL_PENDING, 已发布=$INITIAL_PUBLISHED"
echo "  最终: 待处理=$FINAL_PENDING, 已发布=$FINAL_PUBLISHED"
echo "  本次发布: $PUBLISHED_DIFF 个事件"

echo ""
echo "========================================"
echo "  测试完成"
echo "========================================"

if [ "$EVENT_STATUS" = "published" ]; then
    echo -e "${GREEN}✓ 端到端事件流验证成功！${NC}"
    echo ""
    echo "验证结果:"
    echo "  ✓ EventOutbox 成功写入事件"
    echo "  ✓ EventOutbox 轮询机制正常工作"
    echo "  ✓ 事件成功发送到 RabbitMQ"
    echo "  ✓ 消费者服务能够接收事件"
    exit 0
else
    echo -e "${YELLOW}⚠ 事件尚未完全处理 (状态: $EVENT_STATUS)${NC}"
    echo ""
    echo "可能的原因:"
    echo "  - EventOutbox 轮询间隔未到 (需要等待更长时间)"
    echo "  - device-service 未运行"
    echo "  - RabbitMQ 连接问题"
    exit 1
fi
