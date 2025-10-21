#!/bin/bash

# 本地开发模式 - 只启动基础设施

set -e

echo "🚀 启动本地开发环境..."
echo ""

# 启动基础设施服务
echo "📦 启动基础设施（PostgreSQL, Redis, MinIO）..."
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 5

# 检查服务状态
echo ""
echo "✅ 基础设施服务状态："
docker compose -f docker-compose.dev.yml ps postgres redis minio

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 基础设施已启动！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 服务访问地址："
echo "  PostgreSQL:  localhost:5432 (用户名: postgres / 密码: postgres)"
echo "  Redis:       localhost:6379"
echo "  MinIO API:   http://localhost:9000"
echo "  MinIO 控制台: http://localhost:9001 (minioadmin / minioadmin)"
echo ""
echo "📝 现在可以本地运行服务："
echo ""
echo "  后端服务示例："
echo "    cd backend/user-service && pnpm install && pnpm run dev"
echo "    cd backend/device-service && pnpm install && pnpm run dev"
echo ""
echo "  前端应用示例："
echo "    cd frontend/admin && pnpm install && pnpm run dev"
echo "    cd frontend/user && pnpm install && pnpm run dev"
echo ""
echo "💡 提示："
echo "  - 代码修改后会自动热重载（1秒内生效）"
echo "  - 使用 Ctrl+C 停止本地服务"
echo "  - 停止基础设施：docker compose -f docker-compose.dev.yml down"
echo ""
