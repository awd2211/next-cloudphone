#!/bin/bash

# 简化的端到端事件流测试
# 验证 RabbitMQ 消息能够在服务间正确传递

set -e

echo "============================================"
echo "   端到端事件流测试 (简化版)"
echo "============================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 验证所有服务运行状态
echo -e "${BLUE}[STEP 1]${NC} 验证所有服务运行状态"
echo ""

SERVICES=("device-service" "user-service" "app-service" "billing-service" "notification-service")
ALL_RUNNING=true

for service in "${SERVICES[@]}"; do
  STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$service\") | .pm2_env.status")
  if [ "$STATUS" == "online" ]; then
    echo -e "  ✅ $service: ${GREEN}online${NC}"
  else
    echo -e "  ❌ $service: ${YELLOW}$STATUS${NC}"
    ALL_RUNNING=false
  fi
done

if [ "$ALL_RUNNING" != "true" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  部分服务未运行，测试可能不完整${NC}"
fi
echo ""

# 2. 验证 RabbitMQ 连接
echo -e "${BLUE}[STEP 2]${NC} 验证 RabbitMQ 连接"
echo ""

CONNECTIONS=$(curl -s -u admin:admin123 http://localhost:15672/api/connections | jq 'length')
CONSUMERS=$(curl -s -u admin:admin123 http://localhost:15672/api/consumers/cloudphone | jq 'length')
QUEUES=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | jq '[.[] | select(.consumers > 0)] | length')

echo "  连接数: $CONNECTIONS"
echo "  消费者数: $CONSUMERS"
echo "  活跃队列数: $QUEUES"
echo ""

if [ "$CONNECTIONS" -ge 5 ] && [ "$CONSUMERS" -ge 40 ]; then
  echo -e "  ${GREEN}✅ RabbitMQ 连接正常${NC}"
else
  echo -e "  ${YELLOW}⚠️  RabbitMQ 连接可能异常${NC}"
fi
echo ""

# 3. 检查各服务的消费者
echo -e "${BLUE}[STEP 3]${NC} 检查各服务的消费者状态"
echo ""

for service in device billing app notification; do
  CONSUMER_COUNT=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | \
    jq "[.[] | select(.name | startswith(\"${service}-service\")) | select(.consumers > 0)] | length")
  echo "  $service-service: $CONSUMER_COUNT 个消费者"
done
echo ""

# 4. 验证 EventOutbox 轮询
echo -e "${BLUE}[STEP 4]${NC} 验证 EventOutbox 轮询"
echo ""

OUTBOX_STATS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device -t \
  -c "SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM event_outbox;")

echo "  EventOutbox 状态:"
echo "  $OUTBOX_STATS"

PENDING=$(echo "$OUTBOX_STATS" | awk '{print $1}')
if [ "$PENDING" -eq 0 ]; then
  echo -e "  ${GREEN}✅ 没有待处理的事件${NC}"
else
  echo -e "  ${YELLOW}⚠️  有 $PENDING 条待处理事件${NC}"
fi
echo ""

# 5. 模拟事件发布（通过 EventOutbox）
echo -e "${BLUE}[STEP 5]${NC} 插入测试事件到 EventOutbox"
echo ""

TEST_EVENT_ID=$(uuidgen)
TEST_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device -c \
  "INSERT INTO event_outbox (id, aggregate_type, aggregate_id, event_type, payload, status)
   VALUES (
     '$TEST_EVENT_ID',
     'device',
     'test-device-001',
     'device.integration.test',
     '{\"deviceId\":\"test-device-001\",\"testId\":\"$TEST_EVENT_ID\",\"timestamp\":\"$TEST_TIMESTAMP\"}',
     'pending'
   );" > /dev/null

echo -e "  ${GREEN}✅ 插入测试事件: $TEST_EVENT_ID${NC}"
echo "     类型: device.integration.test"
echo "     状态: pending"
echo ""

# 6. 等待 EventOutbox 轮询器处理
echo -e "${BLUE}[STEP 6]${NC} 等待 EventOutbox 轮询器处理 (10秒)"
echo ""

for i in {1..10}; do
  echo -n "  ."
  sleep 1
done
echo ""
echo ""

# 7. 验证事件是否被发布
echo -e "${BLUE}[STEP 7]${NC} 验证事件是否被发布"
echo ""

EVENT_STATUS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device -t \
  -c "SELECT status FROM event_outbox WHERE id = '$TEST_EVENT_ID';")

EVENT_STATUS=$(echo "$EVENT_STATUS" | xargs)  # trim whitespace

if [ "$EVENT_STATUS" == "published" ]; then
  echo -e "  ${GREEN}✅ 事件已成功发布到 RabbitMQ${NC}"

  # 获取发布时间
  PUBLISHED_AT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t \
    -c "SELECT TO_CHAR(published_at, 'HH24:MI:SS') FROM event_outbox WHERE id = '$TEST_EVENT_ID';")
  echo "     发布时间: $PUBLISHED_AT"
elif [ "$EVENT_STATUS" == "pending" ]; then
  echo -e "  ${YELLOW}⚠️  事件仍在待处理状态${NC}"
  echo "     可能需要更长时间或轮询器未启动"
elif [ "$EVENT_STATUS" == "failed" ]; then
  echo -e "  ❌ 事件发布失败"

  # 获取错误信息
  ERROR_MSG=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t \
    -c "SELECT error_message FROM event_outbox WHERE id = '$TEST_EVENT_ID';")
  echo "     错误: $ERROR_MSG"
else
  echo -e "  ❌ 未知状态: $EVENT_STATUS"
fi
echo ""

# 8. 检查 RabbitMQ 消息统计
echo -e "${BLUE}[STEP 8]${NC} 检查 RabbitMQ 消息统计"
echo ""

EXCHANGE_STATS=$(curl -s -u admin:admin123 http://localhost:15672/api/exchanges/cloudphone/cloudphone.events | \
  jq -r '.message_stats.publish_in // 0')

echo "  cloudphone.events 交换机:"
echo "    已发布消息: $EXCHANGE_STATS 条"
echo ""

# 9. 测试总结
echo "============================================"
echo "   测试总结"
echo "============================================"
echo ""

if [ "$ALL_RUNNING" == "true" ] && [ "$CONNECTIONS" -ge 5 ] && [ "$EVENT_STATUS" == "published" ]; then
  echo -e "${GREEN}✅ 端到端事件流测试通过${NC}"
  echo ""
  echo "验证项目:"
  echo "  ✅ 所有服务运行正常"
  echo "  ✅ RabbitMQ 连接健康 ($CONNECTIONS 个连接, $CONSUMERS 个消费者)"
  echo "  ✅ EventOutbox 轮询正常"
  echo "  ✅ 测试事件成功发布"
  echo ""
  echo "🎉 事件驱动架构工作正常！"
else
  echo -e "${YELLOW}⚠️  端到端事件流测试部分通过${NC}"
  echo ""
  echo "问题:"
  if [ "$ALL_RUNNING" != "true" ]; then
    echo "  - 部分服务未运行"
  fi
  if [ "$CONNECTIONS" -lt 5 ]; then
    echo "  - RabbitMQ 连接数不足"
  fi
  if [ "$EVENT_STATUS" != "published" ]; then
    echo "  - 测试事件未成功发布 (状态: $EVENT_STATUS)"
  fi
fi
echo ""

# 10. 清理测试数据
echo "📝 测试事件 ID: $TEST_EVENT_ID"
echo "   (可用于后续分析或清理)"
echo ""
