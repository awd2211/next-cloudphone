#!/bin/bash

# 云手机平台停止脚本

echo "====================================="
echo "   云手机平台 - 停止所有服务"
echo "====================================="
echo ""

# 停止 Docker 服务
echo "🛑 停止基础设施服务..."
docker-compose down

# 停止 Node.js 进程
echo "🛑 停止 Node.js 服务..."
pkill -f "node.*api-gateway" || true
pkill -f "node.*billing-service" || true
pkill -f "vite.*admin" || true
pkill -f "vite.*user" || true

# 停止 Go 进程
echo "🛑 停止 Go 服务..."
pkill -f "media-service" || true

# 停止 Python 进程
echo "🛑 停止 Python 服务..."
pkill -f "python.*scheduler-service" || true

echo ""
echo "✅ 所有服务已停止"
