#!/bin/bash

# 云手机平台 - 本地开发环境启动脚本
# 此脚本会在后台启动所有 Node.js 微服务

set -e

PROJECT_ROOT="/home/eric/next-cloudphone"
LOG_DIR="$PROJECT_ROOT/logs"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 启动云手机平台本地开发环境..."
echo ""

# 检查基础设施
echo "📦 检查基础设施服务..."
docker compose -f "$PROJECT_ROOT/docker-compose.dev.yml" ps | grep -q "cloudphone-postgres.*Up" && echo "✅ PostgreSQL 运行中" || echo "❌ PostgreSQL 未运行"
docker compose -f "$PROJECT_ROOT/docker-compose.dev.yml" ps | grep -q "cloudphone-redis.*Up" && echo "✅ Redis 运行中" || echo "❌ Redis 未运行"
docker compose -f "$PROJECT_ROOT/docker-compose.dev.yml" ps | grep -q "cloudphone-minio.*Up" && echo "✅ MinIO 运行中" || echo "❌ MinIO 未运行"
echo ""

# 停止旧的进程
echo "🛑 停止旧的开发服务..."
pkill -f "nest start --watch" 2>/dev/null || true
sleep 2
echo ""

# 启动服务的函数
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3

    echo "🔧 启动 $service_name (端口 $port)..."

    cd "$service_path"

    # 在后台启动服务，输出重定向到日志文件
    nohup pnpm run dev > "$LOG_DIR/${service_name}.log" 2>&1 &
    local pid=$!

    echo "$pid" > "$LOG_DIR/${service_name}.pid"
    echo "   ✅ $service_name 已启动 (PID: $pid)"
    echo "   📄 日志: $LOG_DIR/${service_name}.log"
}

# 启动所有 Node.js 服务
echo "🚀 启动后端微服务..."
echo ""

start_service "user-service" "$PROJECT_ROOT/backend/user-service" "30001"
start_service "device-service" "$PROJECT_ROOT/backend/device-service" "30002"
start_service "app-service" "$PROJECT_ROOT/backend/app-service" "30003"
start_service "billing-service" "$PROJECT_ROOT/backend/billing-service" "30005"
start_service "api-gateway" "$PROJECT_ROOT/backend/api-gateway" "30000"

echo ""
echo "⏳ 等待服务启动（30秒）..."
sleep 30

echo ""
echo "✅ 本地开发环境启动完成！"
echo ""
echo "═══════════════════════════════════════════════"
echo "📊 服务访问地址"
echo "═══════════════════════════════════════════════"
echo "  API Gateway:       http://localhost:30000"
echo "  User Service:      http://localhost:30001"
echo "  Device Service:    http://localhost:30002"
echo "  App Service:       http://localhost:30003"
echo "  Billing Service:   http://localhost:30005"
echo ""
echo "═══════════════════════════════════════════════"
echo "🔍 查看日志"
echo "═══════════════════════════════════════════════"
echo "  所有日志: tail -f $LOG_DIR/*.log"
echo "  User Service: tail -f $LOG_DIR/user-service.log"
echo "  API Gateway: tail -f $LOG_DIR/api-gateway.log"
echo ""
echo "═══════════════════════════════════════════════"
echo "🛑 停止服务"
echo "═══════════════════════════════════════════════"
echo "  运行: ./stop-local-dev.sh"
echo ""
echo "═══════════════════════════════════════════════"
echo "🔐 默认账号"
echo "═══════════════════════════════════════════════"
echo "  管理员: admin / admin123456"
echo "  测试用户: testuser / test123456"
echo "═══════════════════════════════════════════════"
