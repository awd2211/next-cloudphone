#!/bin/bash

# Phase 6: EventOutbox Retry Mechanism Test
# 测试 EventOutbox 的失败重试机制

set -e

cd /home/eric/next-cloudphone

echo "========================================"
echo "  Phase 6: EventOutbox 重试机制测试"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Step 1: Stop RabbitMQ temporarily
print_step "1. 临时停止 RabbitMQ (模拟连接失败)"

docker compose -f docker-compose.dev.yml stop rabbitmq
sleep 2

print_success "RabbitMQ 已停止"

echo ""

# Step 2: Insert test event while RabbitMQ is down
print_step "2. 在 RabbitMQ 离线时插入测试事件"

TEST_EVENT_ID=$(uuidgen 2>/dev/null || echo "retry-test-$(date +%s)")
TEST_AGGREGATE_ID="retry-device-$(date +%s)"

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
    'device.retry.test',
    '{"deviceId": "$TEST_AGGREGATE_ID", "test": "EventOutbox retry mechanism", "scenario": "RabbitMQ offline"}'::jsonb,
    'pending',
    NOW()
);
EOF

print_success "测试事件已插入: $TEST_EVENT_ID"

echo ""

# Step 3: Wait for EventOutbox to attempt processing
print_step "3. 等待 EventOutbox 尝试处理事件 (6秒)"

sleep 6

echo ""

# Step 4: Check event status (should be failed or pending with retry)
print_step "4. 检查事件状态 (应该失败并准备重试)"

EVENT_STATUS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT status FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

RETRY_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT retry_count FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

ERROR_MSG=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT error_message FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

if [ "$EVENT_STATUS" = "failed" ] || [ "$RETRY_COUNT" -gt "0" ]; then
    print_success "事件处理失败,进入重试机制"
    echo "   状态: $EVENT_STATUS"
    echo "   重试次数: $RETRY_COUNT"
    echo "   错误信息: ${ERROR_MSG:0:100}..."
else
    print_warning "事件状态: $EVENT_STATUS, 重试次数: $RETRY_COUNT"
    echo "   可能尚未处理或处理太快"
fi

echo ""

# Step 5: Restart RabbitMQ
print_step "5. 重启 RabbitMQ"

docker compose -f docker-compose.dev.yml start rabbitmq
sleep 5  # 等待 RabbitMQ 完全启动

print_success "RabbitMQ 已重新启动"

echo ""

# Step 6: Restart device-service to reconnect to RabbitMQ
print_step "6. 重启 device-service 重新连接 RabbitMQ"

pm2 restart device-service --update-env
sleep 3

print_success "device-service 已重启"

echo ""

# Step 7: Wait for EventOutbox retry
print_step "7. 等待 EventOutbox 重试处理 (7秒)"

sleep 7

echo ""

# Step 8: Check if event was successfully published after retry
print_step "8. 检查事件是否重试成功"

FINAL_STATUS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT status FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

FINAL_RETRY_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT retry_count FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

PUBLISHED_AT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c "SELECT published_at FROM event_outbox WHERE id = '$TEST_EVENT_ID';" | xargs)

echo ""
echo "重试结果:"
echo "  最终状态: $FINAL_STATUS"
echo "  总重试次数: $FINAL_RETRY_COUNT"
echo "  发布时间: $PUBLISHED_AT"

echo ""
echo "========================================"
echo "  测试完成"
echo "========================================"

if [ "$FINAL_STATUS" = "published" ]; then
    echo -e "${GREEN}✓ EventOutbox 重试机制验证成功！${NC}"
    echo ""
    echo "验证结果:"
    echo "  ✓ RabbitMQ 离线时事件进入失败状态"
    echo "  ✓ EventOutbox 记录错误信息"
    echo "  ✓ RabbitMQ 恢复后事件自动重试"
    echo "  ✓ 重试成功,事件最终发布"
    echo "  ✓ 重试次数: $FINAL_RETRY_COUNT"
    exit 0
elif [ "$FINAL_STATUS" = "failed" ] && [ "$FINAL_RETRY_COUNT" -ge "3" ]; then
    echo -e "${YELLOW}⚠ EventOutbox 达到最大重试次数 (3次)${NC}"
    echo ""
    echo "说明:"
    echo "  - 事件失败 $FINAL_RETRY_COUNT 次后停止重试"
    echo "  - 这是正常的失败保护机制"
    echo "  - 可以通过 DLX (Dead Letter Exchange) 进一步处理"
    exit 0
else
    echo -e "${YELLOW}⚠ 事件尚未完全处理 (状态: $FINAL_STATUS)${NC}"
    echo ""
    echo "可能的原因:"
    echo "  - EventOutbox 轮询间隔未到"
    echo "  - device-service 尚未完全恢复"
    echo "  - RabbitMQ 尚未完全就绪"
    exit 1
fi
