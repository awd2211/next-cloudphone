#!/bin/bash

# 云手机平台一键启动脚本
# 此脚本会启动所有后端服务和前端应用

echo "====================================="
echo "   云手机平台 - 一键启动脚本"
echo "====================================="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. 启动基础设施
echo "📦 启动基础设施 (PostgreSQL, Redis, RabbitMQ, MinIO)..."
docker-compose up -d

# 等待数据库就绪
echo "⏳ 等待数据库启动 (10秒)..."
sleep 10

# 2. 启动后端服务（在后台运行）
echo ""
echo "🚀 启动后端服务..."

# API 网关
echo "  - API 网关 (端口 3000)..."
cd "$PROJECT_ROOT/backend/api-gateway"
pnpm install > /dev/null 2>&1 &
(sleep 5 && pnpm dev > /dev/null 2>&1 &)

# 流媒体服务 (Go)
echo "  - 流媒体服务 (端口 3003)..."
cd "$PROJECT_ROOT/backend/media-service"
(go run main.go > /dev/null 2>&1 &)

# 调度服务 (Python)
echo "  - 调度服务 (端口 3004)..."
cd "$PROJECT_ROOT/backend/scheduler-service"
(source venv/bin/activate && python main.py > /dev/null 2>&1 &)

# 计费服务
echo "  - 计费服务 (端口 3006)..."
cd "$PROJECT_ROOT/backend/billing-service"
pnpm install > /dev/null 2>&1 &
(sleep 5 && pnpm dev > /dev/null 2>&1 &)

# 等待服务启动
echo "⏳ 等待服务启动 (15秒)..."
sleep 15

# 3. 启动前端
echo ""
echo "🎨 启动前端应用..."

# 管理后台
echo "  - 管理后台 (端口 3001)..."
cd "$PROJECT_ROOT/frontend/admin"
pnpm install > /dev/null 2>&1 &
(sleep 5 && pnpm dev > /dev/null 2>&1 &)

# 用户端
echo "  - 用户端 (端口 3002)..."
cd "$PROJECT_ROOT/frontend/user"
pnpm install > /dev/null 2>&1 &
(sleep 5 && pnpm dev > /dev/null 2>&1 &)

echo ""
echo "✅ 所有服务启动完成！"
echo ""
echo "====================================="
echo "  服务访问地址"
echo "====================================="
echo "  API 网关:      http://localhost:3000/api/health"
echo "  流媒体服务:    http://localhost:3003/health"
echo "  调度服务:      http://localhost:3004/health"
echo "  计费服务:      http://localhost:3006/api/health"
echo ""
echo "  管理后台:      http://localhost:3001"
echo "  用户端:        http://localhost:3002"
echo ""
echo "  RabbitMQ UI:   http://localhost:15672"
echo "  MinIO Console: http://localhost:9001"
echo "====================================="
echo ""
echo "💡 提示: 按 Ctrl+C 停止所有服务"
echo ""

# 保持脚本运行
tail -f /dev/null
