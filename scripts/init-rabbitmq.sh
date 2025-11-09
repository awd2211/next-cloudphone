#!/bin/bash
# RabbitMQ 初始化脚本
# 创建所有必需的 exchanges 和 queues
# 用法: ./scripts/init-rabbitmq.sh

set -e

RABBITMQ_USER="admin"
RABBITMQ_PASS="admin123"
VHOST="cloudphone"
COMPOSE_FILE="/home/eric/next-cloudphone/docker-compose.dev.yml"

echo "🐰 开始初始化 RabbitMQ..."
echo ""

# 检查 RabbitMQ 是否运行
echo "1️⃣  检查 RabbitMQ 状态..."
if ! docker compose -f $COMPOSE_FILE ps rabbitmq | grep -q "Up"; then
    echo "❌ RabbitMQ 未运行，请先启动: docker compose -f $COMPOSE_FILE up -d rabbitmq"
    exit 1
fi
echo "✅ RabbitMQ 正在运行"
echo ""

# 创建主事件 exchange (如果不存在)
echo "2️⃣  创建主事件 exchange..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  declare exchange name=cloudphone.events type=topic durable=true 2>/dev/null || echo "已存在"
echo "✅ cloudphone.events exchange 已就绪"
echo ""

# 创建 notification-service DLX
echo "3️⃣  创建 notification-service Dead Letter Exchange..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  declare exchange name=cloudphone.notifications.dlx type=fanout durable=true 2>/dev/null || echo "已存在"
echo "✅ cloudphone.notifications.dlx exchange 已创建"
echo ""

# 创建 notification-service DLQ
echo "4️⃣  创建 notification-service Dead Letter Queue..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  declare queue name=cloudphone.notifications.dlq durable=true 2>/dev/null || echo "已存在"
echo "✅ cloudphone.notifications.dlq queue 已创建"
echo ""

# 绑定 DLX 到 DLQ
echo "5️⃣  绑定 DLX 到 DLQ..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  declare binding source=cloudphone.notifications.dlx \
  destination=cloudphone.notifications.dlq 2>/dev/null || echo "已存在"
echo "✅ DLX → DLQ 绑定完成"
echo ""

# 显示所有 exchanges
echo "6️⃣  验证 exchanges..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  list exchanges | grep cloudphone
echo ""

# 显示所有 queues
echo "7️⃣  验证 queues..."
docker compose -f $COMPOSE_FILE exec rabbitmq \
  rabbitmqadmin -u $RABBITMQ_USER -p $RABBITMQ_PASS -V $VHOST \
  list queues | grep cloudphone
echo ""

echo "✅ RabbitMQ 初始化完成！"
echo ""
echo "💡 提示："
echo "   - 如果服务有连接问题，请重启服务: pm2 restart notification-service"
echo "   - 查看 RabbitMQ 管理界面: http://localhost:15672 (admin/admin123)"
