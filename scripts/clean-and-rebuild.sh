#!/bin/bash
# 完全清理并重建新架构

set -e

echo "========================================="
echo "云手机平台 - 完全清理并重建"
echo "========================================="
echo ""
echo "⚠️  警告: 这将删除所有容器、volumes 和数据！"
echo "按 Ctrl+C 取消，或按 Enter 继续..."
read

cd /home/eric/next-cloudphone

echo ""
echo "1. 停止所有容器..."
docker compose -f docker-compose.dev.yml down

echo ""
echo "2. 删除所有 volumes（包括数据库数据）..."
docker volume rm -f next-cloudphone_postgres_data || true
docker volume rm -f next-cloudphone_redis_data || true
docker volume rm -f next-cloudphone_minio_data || true
docker volume rm -f next-cloudphone_rabbitmq_data || true
docker volume rm -f next-cloudphone_consul_data || true

echo ""
echo "3. 删除所有 node_modules volumes..."
docker volume rm -f next-cloudphone_api_gateway_node_modules || true
docker volume rm -f next-cloudphone_user_service_node_modules || true
docker volume rm -f next-cloudphone_device_service_node_modules || true
docker volume rm -f next-cloudphone_app_service_node_modules || true
docker volume rm -f next-cloudphone_billing_service_node_modules || true
docker volume rm -f next-cloudphone_notification_service_node_modules || true
docker volume rm -f next-cloudphone_admin_frontend_node_modules || true
docker volume rm -f next-cloudphone_user_frontend_node_modules || true

echo ""
echo "4. 删除旧镜像（可选）..."
docker images | grep next-cloudphone | awk '{print $3}' | xargs docker rmi -f || true

echo ""
echo "5. 编译 Shared 模块..."
cd /home/eric/next-cloudphone/backend/shared
pnpm install
pnpm run build
echo "✅ Shared 模块编译完成"

echo ""
echo "6. 重新构建所有镜像..."
cd /home/eric/next-cloudphone
docker compose -f docker-compose.dev.yml build --no-cache

echo ""
echo "7. 启动基础设施（PostgreSQL, Redis, RabbitMQ, Consul, MinIO）..."
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio

echo ""
echo "8. 等待基础设施就绪（30秒）..."
sleep 30

echo ""
echo "9. 初始化数据库..."
# 创建 3 个数据库
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_core;"
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_billing;"
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_analytics;"

echo "✅ 数据库创建完成"

echo ""
echo "10. 启动所有微服务..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "11. 等待服务启动（60秒）..."
sleep 60

echo ""
echo "12. 验证部署..."
echo ""
echo "  Consul UI: http://localhost:8500"
echo "  RabbitMQ UI: http://localhost:15672 (admin/admin123)"
echo ""
echo "  服务注册:"
curl -s http://localhost:8500/v1/agent/services | python3 -m json.tool | grep '"Service":' || echo "    (等待服务注册...)"

echo ""
echo "========================================="
echo "✅ 清理并重建完成！"
echo "========================================="
echo ""
echo "下一步:"
echo "1. 访问 Consul UI 验证服务注册"
echo "2. 访问 RabbitMQ UI 验证队列创建"
echo "3. 运行测试: ./scripts/test-async-architecture.sh"
echo ""

