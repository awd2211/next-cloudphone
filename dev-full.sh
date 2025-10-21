#!/bin/bash

# 完整开发环境 - 启动所有服务

set -e

echo "🚀 启动完整开发环境..."
echo ""

# 启动所有服务
echo "📦 启动所有服务（这可能需要几分钟）..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

echo ""
echo "✅ 所有服务状态："
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 开发环境已启动！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 访问地址："
echo "  管理后台:     http://localhost:5173"
echo "  用户端:       http://localhost:5174"
echo "  API 网关:     http://localhost:30000"
echo "  API 文档:     http://localhost:30000/api/docs"
echo "  MinIO 控制台: http://localhost:9001"
echo ""
echo "📝 后端服务端口："
echo "  API Gateway:         30000"
echo "  User Service:        30001"
echo "  Device Service:      30002"
echo "  App Service:         30003"
echo "  Scheduler Service:   30004"
echo "  Billing Service:     30005"
echo "  Notification Service: 30006"
echo "  Media Service:       30007"
echo ""
echo "🔧 常用命令："
echo "  查看所有日志:     docker compose -f docker-compose.dev.yml logs -f"
echo "  查看单个服务日志: docker compose -f docker-compose.dev.yml logs -f user-service"
echo "  重启服务:         docker compose -f docker-compose.dev.yml restart user-service"
echo "  停止所有服务:     docker compose -f docker-compose.dev.yml down"
echo "  查看服务状态:     docker compose -f docker-compose.dev.yml ps"
echo ""
echo "💡 提示："
echo "  - 修改代码会自动热重载，无需重启容器"
echo "  - 如果热重载失败，使用 restart 命令"
echo "  - 查看实时日志以监控代码变化"
echo ""
