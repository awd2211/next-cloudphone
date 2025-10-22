#!/bin/bash

# Envoy Proxy 启动脚本
# 云手机平台 - API Gateway 边缘代理

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    log_info "检查 Docker 是否安装..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    log_success "Docker 已安装"
}

# 检查 Docker Compose
check_docker_compose() {
    log_info "检查 Docker Compose 是否安装..."
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    log_success "Docker Compose 已安装"
}

# 检查配置文件
check_config() {
    log_info "检查 Envoy 配置文件..."
    if [ ! -f "envoy.yaml" ]; then
        log_error "envoy.yaml 配置文件不存在"
        exit 1
    fi
    
    # 验证配置语法
    log_info "验证配置语法..."
    docker run --rm -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml \
        envoyproxy/envoy:v1.28-latest \
        envoy --mode validate -c /etc/envoy/envoy.yaml
    
    if [ $? -eq 0 ]; then
        log_success "配置文件语法正确"
    else
        log_error "配置文件语法错误"
        exit 1
    fi
}

# 检查网络
check_network() {
    log_info "检查 Docker 网络..."
    if ! docker network inspect cloudphone-network &> /dev/null; then
        log_warn "cloudphone-network 网络不存在，正在创建..."
        docker network create cloudphone-network
        log_success "网络创建成功"
    else
        log_success "网络已存在"
    fi
}

# 停止旧容器
stop_old_container() {
    log_info "检查是否有旧的 Envoy 容器..."
    if docker ps -a | grep -q cloudphone-envoy; then
        log_warn "发现旧容器，正在停止并删除..."
        docker-compose -f docker-compose.envoy.yml down
        log_success "旧容器已删除"
    fi
}

# 启动 Envoy
start_envoy() {
    log_info "启动 Envoy Proxy..."
    docker-compose -f docker-compose.envoy.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "Envoy 启动成功"
    else
        log_error "Envoy 启动失败"
        exit 1
    fi
}

# 等待 Envoy 就绪
wait_for_ready() {
    log_info "等待 Envoy 就绪..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:9901/ready &> /dev/null; then
            log_success "Envoy 已就绪"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done
    
    echo ""
    log_error "Envoy 启动超时"
    log_info "查看日志："
    docker-compose -f docker-compose.envoy.yml logs --tail=50
    exit 1
}

# 显示状态
show_status() {
    echo ""
    echo "============================================"
    log_success "Envoy Proxy 已成功启动！"
    echo "============================================"
    echo ""
    echo "📡 服务入口：http://localhost:10000"
    echo "🎛️  管理界面：http://localhost:9901"
    echo ""
    echo "常用命令："
    echo "  查看日志：docker-compose -f docker-compose.envoy.yml logs -f"
    echo "  查看状态：curl http://localhost:9901/ready"
    echo "  集群状态：curl http://localhost:9901/clusters"
    echo "  统计信息：curl http://localhost:9901/stats"
    echo ""
    echo "测试请求："
    echo "  curl http://localhost:10000/api/users"
    echo "  curl http://localhost:10000/api/devices"
    echo ""
    echo "停止 Envoy："
    echo "  docker-compose -f docker-compose.envoy.yml down"
    echo ""
}

# 主流程
main() {
    echo ""
    echo "============================================"
    echo "  Envoy Proxy 启动脚本"
    echo "  云手机平台 API Gateway 边缘代理"
    echo "============================================"
    echo ""
    
    check_docker
    check_docker_compose
    check_config
    check_network
    stop_old_container
    start_envoy
    wait_for_ready
    show_status
}

# 执行主流程
main

