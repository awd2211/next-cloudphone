#!/bin/bash

# EventOutbox Pattern 完整测试
# 测试事件发布、重试和失败处理

set -e

echo "============================================"
echo "   EventOutbox Pattern 完整测试"
echo "============================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查 EventOutbox 初始状态
echo "1. 检查 EventOutbox 初始状态..."
INITIAL_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -t -c "SELECT COUNT(*) FROM event_outbox;")

echo "   初始记录数: $INITIAL_COUNT"
echo ""

# 2. 检查 device-service 是否运行
echo "2. 检查 device-service 状态..."
DEVICE_SERVICE_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="device-service") | .pm2_env.status')
if [ "$DEVICE_SERVICE_STATUS" != "online" ]; then
  echo -e "${RED}❌ device-service 未运行${NC}"
  exit 1
fi
echo -e "${GREEN}✅ device-service 运行中${NC}"
echo ""

# 3. 检查 RabbitMQ 状态
echo "3. 检查 RabbitMQ 连接..."
RABBITMQ_CONNECTIONS=$(curl -s -u admin:admin123 http://localhost:15672/api/connections | jq 'length')
echo "   活跃连接数: $RABBITMQ_CONNECTIONS"
echo ""

# 4. 统计当前消费者
echo "4. 统计 RabbitMQ 消费者..."
TOTAL_CONSUMERS=$(curl -s -u admin:admin123 http://localhost:15672/api/consumers/cloudphone | jq 'length')
echo "   总消费者数: $TOTAL_CONSUMERS"
echo ""

# 5. 检查 EventOutbox 轮询服务
echo "5. 检查 EventOutbox 轮询日志..."
pm2 logs device-service --nostream --lines 50 | grep -i "outbox\|polling" | tail -5 || echo "   未找到轮询日志"
echo ""

# 6. 检查已发布的事件
echo "6. 统计事件状态分布..."
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -c "SELECT status, COUNT(*) as count FROM event_outbox GROUP BY status;"
echo ""

# 7. 检查最近的事件
echo "7. 最近的事件记录 (Top 5)..."
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -c "SELECT
        SUBSTRING(id::text, 1, 8) as id_prefix,
        aggregate_type,
        event_type,
        status,
        retry_count,
        TO_CHAR(created_at, 'HH24:MI:SS') as time
      FROM event_outbox
      ORDER BY created_at DESC
      LIMIT 5;"
echo ""

# 8. 检查失败的事件
echo "8. 检查失败的事件..."
FAILED_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'failed';")

if [ "$FAILED_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  发现 $FAILED_COUNT 条失败的事件${NC}"
  docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device \
    -c "SELECT
          SUBSTRING(id::text, 1, 8) as id,
          event_type,
          retry_count,
          error,
          TO_CHAR(created_at, 'MM-DD HH24:MI') as created
        FROM event_outbox
        WHERE status = 'failed'
        LIMIT 3;"
else
  echo -e "${GREEN}✅ 没有失败的事件${NC}"
fi
echo ""

# 9. 检查待处理的事件
echo "9. 检查待处理的事件..."
PENDING_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'pending';")

if [ "$PENDING_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  发现 $PENDING_COUNT 条待处理的事件${NC}"
  docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device \
    -c "SELECT
          SUBSTRING(id::text, 1, 8) as id,
          event_type,
          retry_count,
          TO_CHAR(created_at, 'MM-DD HH24:MI') as created
        FROM event_outbox
        WHERE status = 'pending'
        LIMIT 3;"
else
  echo -e "${GREEN}✅ 没有待处理的事件${NC}"
fi
echo ""

# 10. 测试总结
echo "============================================"
echo "   测试总结"
echo "============================================"
echo ""

PUBLISHED_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'published';")

echo "事件统计:"
echo "  - 总记录数: $INITIAL_COUNT"
echo "  - 已发布: $PUBLISHED_COUNT"
echo "  - 待处理: $PENDING_COUNT"
echo "  - 失败: $FAILED_COUNT"
echo ""

echo "RabbitMQ 状态:"
echo "  - 连接数: $RABBITMQ_CONNECTIONS"
echo "  - 消费者数: $TOTAL_CONSUMERS"
echo ""

# 评估健康度
if [ "$PENDING_COUNT" -eq 0 ] && [ "$FAILED_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ EventOutbox 健康状态: 优秀${NC}"
  echo "   所有事件都已成功发布"
elif [ "$PENDING_COUNT" -gt 0 ] && [ "$FAILED_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  EventOutbox 健康状态: 良好${NC}"
  echo "   有待处理的事件，等待轮询发布"
else
  echo -e "${YELLOW}⚠️  EventOutbox 健康状态: 需要关注${NC}"
  echo "   存在失败的事件，可能需要人工介入"
fi
echo ""

echo "📝 说明:"
echo "  - pending 状态: 等待 EventOutbox 轮询器发布 (每 5 秒)"
echo "  - published 状态: 已成功发布到 RabbitMQ"
echo "  - failed 状态: 重试 3 次后仍失败 (需要检查)"
echo ""
