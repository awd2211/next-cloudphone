#!/bin/bash
set -e

# 彻底重建所有服务的脚本
# 解决 Docker volume 挂载和依赖问题

PROJECT_ROOT="/home/eric/next-cloudphone"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

echo "=========================================="
echo "  彻底重建所有服务和依赖"
echo "=========================================="
echo ""

# 定义服务列表
BACKEND_SERVICES=(
    "api-gateway"
    "user-service"
    "device-service"
    "app-service"
    "billing-service"
)

FRONTEND_SERVICES=(
    "admin-frontend"
    "user-frontend"
)

# 步骤1: 停止所有服务
echo "步骤 1/5: 停止所有服务..."
cd "$PROJECT_ROOT"
docker compose -f "$COMPOSE_FILE" down
echo "✅ 所有服务已停止"
echo ""

# 步骤2: 删除所有 node_modules volumes (保留数据库数据)
echo "步骤 2/5: 清理 node_modules volumes..."
for service in "${BACKEND_SERVICES[@]}"; do
    volume_name="${service//-/_}_node_modules"
    if docker volume ls | grep -q "$volume_name"; then
        echo "  删除 volume: $volume_name"
        docker volume rm "next-cloudphone_${volume_name}" 2>/dev/null || true
    fi
done

for service in "${FRONTEND_SERVICES[@]}"; do
    volume_name="${service//-/_}_node_modules"
    if docker volume ls | grep -q "$volume_name"; then
        echo "  删除 volume: $volume_name"
        docker volume rm "next-cloudphone_${volume_name}" 2>/dev/null || true
    fi
done
echo "✅ node_modules volumes 已清理"
echo ""

# 步骤3: 重新构建所有镜像
echo "步骤 3/5: 重新构建所有服务镜像..."
docker compose -f "$COMPOSE_FILE" build --no-cache \
    api-gateway \
    user-service \
    device-service \
    app-service \
    billing-service \
    admin-frontend \
    user-frontend
echo "✅ 所有镜像已重新构建"
echo ""

# 步骤4: 启动基础设施服务
echo "步骤 4/5: 启动基础设施服务..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis minio
echo "等待基础设施服务健康检查..."
sleep 15
echo "✅ 基础设施服务已启动"
echo ""

# 步骤5: 启动所有应用服务
echo "步骤 5/5: 启动所有应用服务..."
docker compose -f "$COMPOSE_FILE" up -d
echo "等待服务启动..."
sleep 20
echo "✅ 所有服务已启动"
echo ""

# 验证服务状态
echo "=========================================="
echo "  服务状态检查"
echo "=========================================="
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 验证 node_modules
echo "=========================================="
echo "  验证 node_modules 依赖"
echo "=========================================="
for service in "${BACKEND_SERVICES[@]}"; do
    echo "检查 $service..."
    container_name="cloudphone-${service}"

    # 检查 @nestjs/cli 是否存在
    if docker exec "$container_name" test -f /app/node_modules/@nestjs/cli/bin/nest.js 2>/dev/null; then
        echo "  ✅ @nestjs/cli 已安装"
    else
        echo "  ❌ @nestjs/cli 未找到"
    fi

    # 检查 node_modules 数量
    module_count=$(docker exec "$container_name" sh -c "ls -1 /app/node_modules 2>/dev/null | wc -l" || echo "0")
    echo "  📦 node_modules 包数量: $module_count"
done
echo ""

echo "=========================================="
echo "  ✅ 重建完成！"
echo "=========================================="
echo ""
echo "后续步骤:"
echo "1. 查看服务日志: docker compose -f $COMPOSE_FILE logs -f <service-name>"
echo "2. 检查健康状态: ./scripts/check-health.sh"
echo "3. 访问应用:"
echo "   - 管理后台: http://localhost:5173"
echo "   - 用户端: http://localhost:5174"
echo "   - API 网关: http://localhost:30000/api/health"
echo ""
