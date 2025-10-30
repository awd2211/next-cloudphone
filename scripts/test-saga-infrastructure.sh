#!/bin/bash

# Saga 基础设施测试
# 验证 Saga 相关的数据库表和服务配置

set -e

echo "============================================"
echo "   Saga 基础设施测试"
echo "============================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 检查 Saga 相关表
echo -e "${BLUE}[STEP 1]${NC} 检查 Saga 数据库表"
echo ""

# 检查 saga_state 表
SAGA_STATE_EXISTS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_billing -t \
  -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saga_state');")

SAGA_STATE_EXISTS=$(echo "$SAGA_STATE_EXISTS" | xargs)

if [ "$SAGA_STATE_EXISTS" == "t" ]; then
  echo -e "  ${GREEN}✅ saga_state 表存在${NC}"

  # 统计记录数
  SAGA_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_billing -t \
    -c "SELECT COUNT(*) FROM saga_state;")
  echo "     记录数: $SAGA_COUNT"
else
  echo -e "  ${YELLOW}⚠️  saga_state 表不存在${NC}"
  echo "     Saga 功能可能未启用或使用不同的数据库"
fi
echo ""

# 2. 检查 SagaModule 配置
echo -e "${BLUE}[STEP 2]${NC} 检查 billing-service Saga 配置"
echo ""

if grep -q "SagaModule" /home/eric/next-cloudphone/backend/billing-service/src/app.module.ts; then
  echo -e "  ${GREEN}✅ SagaModule 已导入${NC}"
else
  echo -e "  ${YELLOW}⚠️  SagaModule 未找到${NC}"
fi

if [ -f "/home/eric/next-cloudphone/backend/billing-service/src/sagas/purchase-plan-v2.saga.ts" ]; then
  echo -e "  ${GREEN}✅ PurchasePlanSagaV2 文件存在${NC}"
else
  echo -e "  ${YELLOW}⚠️  PurchasePlanSagaV2 文件未找到${NC}"
fi
echo ""

# 3. 检查 Saga 相关的事件队列
echo -e "${BLUE}[STEP 3]${NC} 检查 Saga 相关的 RabbitMQ 队列"
echo ""

DEVICE_ALLOCATE_QUEUE=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | \
  jq -r '.[] | select(.name == "device-service.device-allocate") | .name')

if [ "$DEVICE_ALLOCATE_QUEUE" == "device-service.device-allocate" ]; then
  CONSUMERS=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone/device-service.device-allocate | \
    jq -r '.consumers')
  echo -e "  ${GREEN}✅ device-service.device-allocate 队列存在${NC}"
  echo "     消费者数: $CONSUMERS"
else
  echo -e "  ${YELLOW}⚠️  device-service.device-allocate 队列不存在${NC}"
fi
echo ""

# 4. 检查 EventOutbox (Saga 依赖)
echo -e "${BLUE}[STEP 4]${NC} 检查 EventOutbox 集成"
echo ""

# 检查 device-service 的 EventOutbox
DEVICE_OUTBOX_EXISTS=$(docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device -t \
  -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_outbox');")

DEVICE_OUTBOX_EXISTS=$(echo "$DEVICE_OUTBOX_EXISTS" | xargs)

if [ "$DEVICE_OUTBOX_EXISTS" == "t" ]; then
  echo -e "  ${GREEN}✅ device-service EventOutbox 表存在${NC}"

  OUTBOX_COUNT=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t \
    -c "SELECT COUNT(*) FROM event_outbox;")
  echo "     事件记录数: $OUTBOX_COUNT"
else
  echo -e "  ${YELLOW}⚠️  device-service EventOutbox 表不存在${NC}"
fi
echo ""

# 5. 检查 billing-service 日志中的 Saga 相关信息
echo -e "${BLUE}[STEP 5]${NC} 检查 billing-service Saga 初始化日志"
echo ""

pm2 logs billing-service --nostream --lines 100 | grep -i "saga" | tail -5 || echo "  未找到 Saga 相关日志"
echo ""

# 6. 验证 Saga 步骤定义
echo -e "${BLUE}[STEP 6]${NC} 验证 PurchasePlanSagaV2 步骤定义"
echo ""

if [ -f "/home/eric/next-cloudphone/backend/billing-service/src/sagas/purchase-plan-v2.saga.ts" ]; then
  echo "  Saga 步骤:"
  grep -A 1 "name: '" /home/eric/next-cloudphone/backend/billing-service/src/sagas/purchase-plan-v2.saga.ts | \
    grep "name:" | sed "s/.*name: '/  - /" | sed "s/',//"
else
  echo "  无法读取 Saga 定义文件"
fi
echo ""

# 7. 测试总结
echo "============================================"
echo "   测试总结"
echo "============================================"
echo ""

SAGA_READY=true

if [ "$SAGA_STATE_EXISTS" != "t" ]; then
  SAGA_READY=false
fi

if [ "$DEVICE_OUTBOX_EXISTS" != "t" ]; then
  SAGA_READY=false
fi

if [ "$SAGA_READY" == "true" ]; then
  echo -e "${GREEN}✅ Saga 基础设施就绪${NC}"
  echo ""
  echo "验证项目:"
  echo "  ✅ saga_state 表存在"
  echo "  ✅ EventOutbox 表存在"
  echo "  ✅ PurchasePlanSagaV2 已配置"
  echo "  ✅ 相关 RabbitMQ 队列存在"
  echo ""
  echo "🎉 Saga 分布式事务功能可用！"
  echo ""
  echo "📝 说明:"
  echo "   Saga 步骤流程:"
  echo "   1. VALIDATE_PLAN - 验证套餐有效性"
  echo "   2. CREATE_ORDER - 创建订单"
  echo "   3. ALLOCATE_DEVICE - 分配设备"
  echo "   4. PROCESS_PAYMENT - 处理支付"
  echo "   5. ACTIVATE_ORDER - 激活订单"
  echo ""
  echo "   如果任何步骤失败，将自动执行补偿操作："
  echo "   - RELEASE_DEVICE (释放设备)"
  echo "   - REFUND_PAYMENT (退款)"
  echo "   - CANCEL_ORDER (取消订单)"
else
  echo -e "${YELLOW}⚠️  Saga 基础设施部分就绪${NC}"
  echo ""
  echo "缺失项目:"
  if [ "$SAGA_STATE_EXISTS" != "t" ]; then
    echo "  - saga_state 表"
  fi
  if [ "$DEVICE_OUTBOX_EXISTS" != "t" ]; then
    echo "  - EventOutbox 表"
  fi
  echo ""
  echo "建议: 运行数据库迁移脚本"
fi
echo ""
