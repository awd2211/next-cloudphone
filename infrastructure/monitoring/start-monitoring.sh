#!/bin/bash

# 监控系统启动脚本
# Jaeger + Prometheus + Grafana

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    log_info "检查 Docker..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    log_success "Docker 已安装"
}

# 检查网络
check_network() {
    log_info "检查 Docker 网络..."
    if ! docker network inspect cloudphone-network &> /dev/null; then
        log_warn "创建 cloudphone-network 网络..."
        docker network create cloudphone-network
        log_success "网络创建成功"
    else
        log_success "网络已存在"
    fi
}

# 启动监控系统
start_monitoring() {
    log_info "启动监控系统..."
    
    cd "$(dirname "$0")"
    
    docker-compose -f docker-compose.monitoring.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "监控系统启动成功"
    else
        log_error "监控系统启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待 Jaeger
    log_info "等待 Jaeger..."
    for i in {1..30}; do
        if curl -s http://localhost:16686 &> /dev/null; then
            log_success "Jaeger 已就绪"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # 等待 Prometheus
    log_info "等待 Prometheus..."
    for i in {1..30}; do
        if curl -s http://localhost:9090/-/healthy &> /dev/null; then
            log_success "Prometheus 已就绪"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # 等待 Grafana
    log_info "等待 Grafana..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health &> /dev/null; then
            log_success "Grafana 已就绪"
            break
        fi
        echo -n "."
        sleep 1
    done
}

# 显示状态
show_status() {
    echo ""
    echo "============================================"
    log_success "监控系统已成功启动！"
    echo "============================================"
    echo ""
    echo "🔍 Jaeger 分布式追踪："
    echo "   访问: http://localhost:16686"
    echo "   用途: 查看请求调用链路、性能分析"
    echo ""
    echo "📊 Prometheus 指标收集："
    echo "   访问: http://localhost:9090"
    echo "   用途: 查询指标、验证告警规则"
    echo ""
    echo "📈 Grafana 可视化仪表盘："
    echo "   访问: http://localhost:3000"
    echo "   账号: admin / admin123"
    echo "   用途: 查看监控大盘、告警管理"
    echo ""
    echo "🔔 AlertManager 告警管理："
    echo "   访问: http://localhost:9093"
    echo "   用途: 查看和管理告警"
    echo ""
    echo "常用命令："
    echo "  查看日志: docker-compose -f docker-compose.monitoring.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose.monitoring.yml down"
    echo "  重启服务: docker-compose -f docker-compose.monitoring.yml restart"
    echo ""
}

# 主流程
main() {
    echo ""
    echo "============================================"
    echo "  监控系统启动脚本"
    echo "  Jaeger + Prometheus + Grafana"
    echo "============================================"
    echo ""
    
    check_docker
    check_network
    start_monitoring
    wait_for_services
    show_status
}

main


