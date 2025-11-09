#!/bin/bash

# 集成测试一键运行脚本（带清理）
# 用途: 清理旧的测试数据并运行完整的集成测试

set -e

echo "🧹 清理旧的测试基础设施..."
docker compose -f docker-compose.test.yml down -v 2>/dev/null || true

echo ""
echo "🚀 启动测试基础设施..."
docker compose -f docker-compose.test.yml up -d

echo ""
echo "⏳ 等待服务就绪..."
echo "   - PostgreSQL (5433)"
echo "   - Redis (6380)"
echo "   - RabbitMQ (5673)"

# 等待 PostgreSQL
until docker compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test_user > /dev/null 2>&1; do
  echo "   等待 PostgreSQL..."
  sleep 1
done
echo "✅ PostgreSQL 就绪"

# 等待 Redis
until docker compose -f docker-compose.test.yml exec -T redis-test redis-cli ping > /dev/null 2>&1; do
  echo "   等待 Redis..."
  sleep 1
done
echo "✅ Redis 就绪"

# 等待 RabbitMQ
until docker compose -f docker-compose.test.yml exec -T rabbitmq-test rabbitmq-diagnostics -q ping > /dev/null 2>&1; do
  echo "   等待 RabbitMQ..."
  sleep 1
done
echo "✅ RabbitMQ 就绪"

echo ""
echo "🧪 运行集成测试..."
echo ""

# 运行测试
pnpm test:integration

TEST_EXIT_CODE=$?

echo ""
echo "📊 测试完成"
echo ""

# 显示测试结果
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ 所有测试通过！"
else
  echo "⚠️  部分测试失败（退出码: $TEST_EXIT_CODE）"
  echo ""
  echo "💡 提示:"
  echo "   - 查看上方的测试输出了解详情"
  echo "   - 如果是 RabbitMQ E2E 测试失败，可能是旧消息干扰"
  echo "   - 重新运行此脚本将清理所有旧数据"
fi

echo ""
echo "🔧 保持测试基础设施运行 (如需清理，运行: docker compose -f docker-compose.test.yml down -v)"

exit $TEST_EXIT_CODE
