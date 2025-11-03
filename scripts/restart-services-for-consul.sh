#!/bin/bash

# 重启微服务以注册到 Consul
# 使用独立数据库配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo ""
echo "============================================"
echo "  重启微服务（注册到 Consul）"
echo "============================================"
echo ""

# 定义服务列表
declare -A services=(
    ["user-service"]="30001"
    ["device-service"]="30002"
    ["app-service"]="30003"
    ["billing-service"]="30005"
    ["notification-service"]="30006"
)

# 停止所有服务
log_info "停止所有微服务..."
for service in "${!services[@]}"; do
    log_info "停止 $service..."
    pkill -f "ts-node.*$service/src/main.ts" 2>/dev/null || log_warn "$service 未运行"
    pkill -f "node.*$service.*main.js" 2>/dev/null || true
done

sleep 2

log_success "所有服务已停止"
echo ""

# 启动所有服务
log_info "启动所有微服务..."
cd /home/eric/next-cloudphone

for service in "${!services[@]}"; do
    port=${services[$service]}
    log_info "启动 $service (port $port)..."
    
    cd backend/$service
    
    # 后台启动服务，输出到日志
    nohup pnpm run dev >> ../../logs/$service.log 2>&1 &
    
    echo "   进程 PID: $!"
    
    cd ../..
    
    # 等待 2 秒让服务启动
    sleep 2
done

log_success "所有服务已启动"
echo ""

# 等待服务就绪
log_info "等待服务就绪（30秒）..."
sleep 30

# 检查服务状态
echo ""
log_info "检查服务健康状态..."
echo ""

for service in "${!services[@]}"; do
    port=${services[$service]}
    
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        health=$(curl -s http://localhost:$port/health | jq -r '.status')
        
        if [ "$health" = "healthy" ]; then
            echo -e "${GREEN}✅${NC} $service - healthy"
        elif [ "$health" = "degraded" ]; then
            echo -e "${YELLOW}⚠️${NC} $service - degraded"
        else
            echo -e "${RED}❌${NC} $service - $health"
        fi
    else
        echo -e "${RED}❌${NC} $service - 无法访问"
    fi
done

echo ""
log_info "检查 Consul 注册状态..."
sleep 5

# 检查 Consul 注册
registered=$(curl -s http://localhost:8500/v1/catalog/services | jq -r 'keys[]' | grep -v consul | wc -l)

echo ""
log_info "Consul 注册服务数: $registered"
echo ""

if [ $registered -gt 0 ]; then
    log_success "服务已注册到 Consul！"
    echo ""
    curl -s http://localhost:8500/v1/catalog/services | jq -r 'keys[]' | grep -v consul | while read svc; do
        echo -e "  ${GREEN}✅${NC} $svc"
    done
    echo ""
    echo "访问 Consul UI: http://localhost:8500/ui"
else
    log_warn "服务尚未注册到 Consul"
    echo ""
    echo "请等待几秒后运行检查脚本："
    echo "  ./scripts/check-consul-integration.sh"
fi

echo ""
echo "============================================"
echo "完成！"
echo "============================================"
echo ""
















