#!/bin/bash

# 检查所有服务的健康状态

echo "====================================="
echo "   云手机平台 - 健康检查"
echo "====================================="
echo ""

check_service() {
    local name=$1
    local url=$2

    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "✅ $name - 运行中"
    else
        echo "❌ $name - 未运行"
    fi
}

echo "检查后端服务:"
check_service "API 网关       " "http://localhost:3000/api/health"
check_service "流媒体服务     " "http://localhost:3003/health"
check_service "调度服务       " "http://localhost:3004/health"
check_service "计费服务       " "http://localhost:3006/api/health"

echo ""
echo "检查前端服务:"
check_service "管理后台       " "http://localhost:3001"
check_service "用户端         " "http://localhost:3002"

echo ""
echo "检查基础设施:"
check_service "PostgreSQL     " "http://localhost:5432" 2>/dev/null || echo "⚠️  PostgreSQL - 需要使用 psql 检查"
check_service "Redis          " "http://localhost:6379" 2>/dev/null || echo "⚠️  Redis - 需要使用 redis-cli 检查"
check_service "RabbitMQ       " "http://localhost:15672"
check_service "MinIO          " "http://localhost:9001"

echo ""
echo "====================================="
