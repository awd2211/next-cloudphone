#!/bin/bash
#
# 远程开发环境更新脚本
# 用于在 console.cloudphone.run 上更新和重启服务
#

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "========================================="
log_info "远程开发环境更新脚本"
log_info "========================================="
echo ""

# 1. 拉取最新代码
log_info "步骤 1/5: 拉取最新代码..."
git fetch origin
git pull origin main
log_success "代码更新完成"
echo ""

# 2. 安装依赖
log_info "步骤 2/5: 安装/更新依赖..."
pnpm install
log_success "依赖安装完成"
echo ""

# 3. 重新构建 shared 模块
log_info "步骤 3/5: 重新构建 shared 模块..."
cd backend/shared
pnpm build
cd ../..
log_success "Shared 模块构建完成"
echo ""

# 4. 重新构建所有服务
log_info "步骤 4/5: 重新构建所有后端服务..."
SERVICES=(
    "api-gateway"
    "user-service"
    "device-service"
    "app-service"
    "billing-service"
    "notification-service"
    "livechat-service"
)

for service in "${SERVICES[@]}"; do
    if [ -d "backend/$service" ]; then
        log_info "  构建 $service..."
        cd "backend/$service"
        pnpm build
        cd ../..
        log_success "  $service 构建完成"
    else
        log_warning "  $service 目录不存在，跳过"
    fi
done
echo ""

# 5. 重启 PM2 服务
log_info "步骤 5/5: 重启 PM2 服务..."
pm2 restart ecosystem.config.js --update-env
log_success "服务重启完成"
echo ""

# 等待服务启动
log_info "等待服务启动（10秒）..."
sleep 10
echo ""

# 检查服务状态
log_info "检查服务状态..."
pm2 list
echo ""

# 检查关键服务健康状态
log_info "检查服务健康状态..."
echo ""

check_health() {
    local service=$1
    local port=$2
    local url="http://localhost:${port}/health"

    if curl -s -f "$url" > /dev/null 2>&1; then
        log_success "  ✓ $service (端口 $port) - 健康"
        return 0
    else
        log_error "  ✗ $service (端口 $port) - 不健康"
        return 1
    fi
}

check_health "API Gateway" 30000
check_health "User Service" 30001
check_health "Device Service" 30002
check_health "App Service" 30003
check_health "Billing Service" 30005
check_health "Notification Service" 30006
check_health "LiveChat Service" 30010

echo ""
log_success "========================================="
log_success "更新完成！"
log_success "========================================="
echo ""

log_info "如果服务仍有问题，可以："
log_info "1. 查看日志: pm2 logs <service-name>"
log_info "2. 重启特定服务: pm2 restart <service-name>"
log_info "3. 查看详细状态: pm2 describe <service-name>"
