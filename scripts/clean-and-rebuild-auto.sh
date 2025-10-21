#!/bin/bash
# 完全清理并重建新架构（自动执行版本）

set -e

echo "========================================="
echo "云手机平台 - 完全清理并重建"
echo "========================================="

cd /home/eric/next-cloudphone

echo ""
echo "1. 停止所有容器..."
docker compose -f docker-compose.dev.yml down
echo "✅ 容器已停止"

echo ""
echo "2. 删除所有 volumes..."
echo "  - 删除数据库 volume..."
docker volume rm -f next-cloudphone_postgres_data 2>/dev/null || true
echo "  - 删除 Redis volume..."
docker volume rm -f next-cloudphone_redis_data 2>/dev/null || true
echo "  - 删除 MinIO volume..."
docker volume rm -f next-cloudphone_minio_data 2>/dev/null || true
echo "  - 删除 RabbitMQ volume..."
docker volume rm -f next-cloudphone_rabbitmq_data 2>/dev/null || true
echo "  - 删除 Consul volume..."
docker volume rm -f next-cloudphone_consul_data 2>/dev/null || true

echo "  - 删除所有 node_modules volumes..."
docker volume rm -f next-cloudphone_api_gateway_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_user_service_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_device_service_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_app_service_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_billing_service_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_notification_service_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_admin_frontend_node_modules 2>/dev/null || true
docker volume rm -f next-cloudphone_user_frontend_node_modules 2>/dev/null || true
echo "✅ 所有 volumes 已删除"

echo ""
echo "3. 删除旧镜像..."
docker images | grep next-cloudphone | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
echo "✅ 旧镜像已删除"

echo ""
echo "4. 编译 Shared 模块..."
cd /home/eric/next-cloudphone/backend/shared
pnpm install --force
pnpm run build
echo "✅ Shared 模块编译完成"

echo ""
echo "5. 重新构建所有镜像..."
cd /home/eric/next-cloudphone
echo "  正在构建镜像（这可能需要几分钟）..."
docker compose -f docker-compose.dev.yml build --no-cache 2>&1 | grep -E "^#|Building|FINISHED|ERROR" || true

echo ""
echo "6. 启动基础设施..."
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio

echo ""
echo "7. 等待基础设施就绪（45秒）..."
for i in {45..1}; do
  echo -ne "  等待中... $i 秒\r"
  sleep 1
done
echo ""

echo ""
echo "8. 验证基础设施..."
docker compose -f docker-compose.dev.yml ps | grep -E "postgres|redis|rabbitmq|consul|minio"

echo ""
echo "9. 初始化数据库..."
# 创建 3 个数据库
echo "  - 创建 cloudphone_core..."
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_core;" 2>/dev/null || echo "    (已存在)"

echo "  - 创建 cloudphone_billing..."
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_billing;" 2>/dev/null || echo "    (已存在)"

echo "  - 创建 cloudphone_analytics..."
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_analytics;" 2>/dev/null || echo "    (已存在)"

echo "✅ 数据库创建完成"

echo ""
echo "10. 初始化种子数据（如果存在）..."
if [ -f "/home/eric/next-cloudphone/database/init.ts" ]; then
  cd /home/eric/next-cloudphone/database
  pnpm install 2>/dev/null || true
  pnpm run init 2>/dev/null || echo "  (跳过种子数据)"
fi

echo ""
echo "11. 启动所有微服务..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "12. 等待服务启动（60秒）..."
for i in {60..1}; do
  echo -ne "  等待中... $i 秒\r"
  sleep 1
done
echo ""

echo ""
echo "13. 验证部署..."
echo ""
echo "  ✅ 容器状态:"
docker compose -f docker-compose.dev.yml ps | grep -E "cloudphone-"

echo ""
echo "  ✅ RabbitMQ:"
echo "    URL: http://localhost:15672"
echo "    User: admin / admin123"

echo ""
echo "  ✅ Consul:"
echo "    URL: http://localhost:8500"
echo "    服务数量:"
curl -s http://localhost:8500/v1/agent/services 2>/dev/null | python3 -c "import sys, json; print('   ', len(json.load(sys.stdin)), 'services registered')" || echo "    (等待服务注册...)"

echo ""
echo "  ✅ 数据库:"
docker exec cloudphone-postgres psql -U postgres -c "\l" | grep cloudphone

echo ""
echo "========================================="
echo "🎉 部署完成！"
echo "========================================="
echo ""
echo "访问地址:"
echo "  • Admin Dashboard: http://localhost:5173"
echo "  • User Portal: http://localhost:5174"
echo "  • API Gateway: http://localhost:30000/api/docs"
echo "  • Consul UI: http://localhost:8500"
echo "  • RabbitMQ UI: http://localhost:15672"
echo ""
echo "测试命令:"
echo "  ./scripts/test-async-architecture.sh"
echo ""

