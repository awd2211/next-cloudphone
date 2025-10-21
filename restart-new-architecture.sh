#!/bin/bash
# 快速重启新架构

echo "🚀 启动新架构..."
cd /home/eric/next-cloudphone

# 启动所有服务
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "等待服务启动（60秒）..."
sleep 60

echo ""
echo "📊 服务状态:"
docker compose -f docker-compose.dev.yml ps

echo ""
echo "✅ 完成！访问:"
echo "  • Consul: http://localhost:8500"
echo "  • RabbitMQ: http://localhost:15672 (admin/admin123)"
echo "  • API Gateway: http://localhost:30000/api/docs"

