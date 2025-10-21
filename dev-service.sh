#!/bin/bash

# 开发单个服务 - 启动基础设施 + 指定服务

set -e

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo "❌ 错误：请指定服务名称"
  echo ""
  echo "用法: ./dev-service.sh <service-name>"
  echo ""
  echo "可用服务："
  echo "  后端服务："
  echo "    - api-gateway"
  echo "    - user-service"
  echo "    - device-service"
  echo "    - app-service"
  echo "    - billing-service"
  echo "    - notification-service"
  echo "    - scheduler-service"
  echo "    - media-service"
  echo ""
  echo "  前端应用："
  echo "    - admin-frontend"
  echo "    - user-frontend"
  echo ""
  echo "示例："
  echo "  ./dev-service.sh user-service"
  echo "  ./dev-service.sh admin-frontend"
  exit 1
fi

echo "🚀 启动开发环境：$SERVICE"
echo ""

# 启动基础设施 + 指定服务
echo "📦 启动基础设施和 $SERVICE..."
docker compose -f docker-compose.dev.yml up -d postgres redis minio $SERVICE

echo ""
echo "⏳ 等待服务启动..."
sleep 3

echo ""
echo "✅ 服务状态："
docker compose -f docker-compose.dev.yml ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 查看实时日志"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示："
echo "  - 修改代码会自动热重载（无需重启）"
echo "  - 按 Ctrl+C 停止查看日志"
echo "  - 重启服务: docker compose -f docker-compose.dev.yml restart $SERVICE"
echo "  - 停止所有: docker compose -f docker-compose.dev.yml down"
echo ""
docker compose -f docker-compose.dev.yml logs -f $SERVICE
