#!/bin/bash

# Envoy 状态检查脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查 Envoy 是否运行
check_running() {
    echo -e "${BLUE}=== Envoy 运行状态 ===${NC}"
    
    if docker ps | grep -q cloudphone-envoy; then
        echo -e "${GREEN}✅ Envoy 正在运行${NC}"
        
        # 显示容器信息
        docker ps --filter "name=cloudphone-envoy" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "${RED}❌ Envoy 未运行${NC}"
        return 1
    fi
    echo ""
}

# 检查健康状态
check_health() {
    echo -e "${BLUE}=== 健康检查 ===${NC}"
    
    response=$(curl -s http://localhost:9901/ready)
    
    if [ "$response" == "LIVE" ]; then
        echo -e "${GREEN}✅ Envoy 健康状态：正常${NC}"
    else
        echo -e "${RED}❌ Envoy 健康状态：异常${NC}"
        echo "响应: $response"
    fi
    echo ""
}

# 检查所有集群状态
check_clusters() {
    echo -e "${BLUE}=== 上游集群状态 ===${NC}"
    
    clusters=$(curl -s http://localhost:9901/clusters | grep "::health_flags" | head -20)
    
    if [ -z "$clusters" ]; then
        echo -e "${RED}❌ 无法获取集群信息${NC}"
        return 1
    fi
    
    echo "$clusters" | while IFS= read -r line; do
        cluster_name=$(echo "$line" | cut -d':' -f1)
        health_status=$(echo "$line" | grep -o "healthy\|unhealthy\|/failed_active_hc\|/failed_outlier_check")
        
        if echo "$line" | grep -q "healthy"; then
            echo -e "${GREEN}✅${NC} $cluster_name"
        else
            echo -e "${RED}❌${NC} $cluster_name - $health_status"
        fi
    done
    echo ""
}

# 显示关键统计
check_stats() {
    echo -e "${BLUE}=== 关键统计信息 ===${NC}"
    
    stats=$(curl -s http://localhost:9901/stats)
    
    # 总请求数
    total_requests=$(echo "$stats" | grep "listener.0.0.0.0_10000.downstream_rq_total" | cut -d':' -f2 | tr -d ' ')
    echo "总请求数: ${total_requests:-0}"
    
    # 活跃连接数
    active_connections=$(echo "$stats" | grep "listener.0.0.0.0_10000.downstream_cx_active" | cut -d':' -f2 | tr -d ' ')
    echo "活跃连接: ${active_connections:-0}"
    
    # 熔断器打开次数
    circuit_breaker_open=$(echo "$stats" | grep "circuit_breakers.*\.rq_open:" | wc -l)
    if [ "$circuit_breaker_open" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  熔断器打开次数: $circuit_breaker_open${NC}"
    else
        echo -e "${GREEN}✅ 熔断器状态: 正常${NC}"
    fi
    
    echo ""
}

# 显示各服务请求统计
check_service_stats() {
    echo -e "${BLUE}=== 各服务请求统计 ===${NC}"
    
    stats=$(curl -s http://localhost:9901/stats)
    
    for service in user-service device-service app-service billing-service notification-service; do
        total=$(echo "$stats" | grep "cluster.${service}.upstream_rq_total:" | cut -d':' -f2 | tr -d ' ')
        success=$(echo "$stats" | grep "cluster.${service}.upstream_rq_2xx:" | cut -d':' -f2 | tr -d ' ')
        errors=$(echo "$stats" | grep "cluster.${service}.upstream_rq_5xx:" | cut -d':' -f2 | tr -d ' ')
        
        if [ -n "$total" ] && [ "$total" -gt 0 ]; then
            echo -e "${GREEN}$service${NC}:"
            echo "  总请求: ${total:-0}"
            echo "  成功: ${success:-0}"
            echo "  错误: ${errors:-0}"
        fi
    done
    echo ""
}

# 检查最近的访问日志
check_recent_logs() {
    echo -e "${BLUE}=== 最近访问日志 (最新 5 条) ===${NC}"
    docker logs cloudphone-envoy --tail 5 2>/dev/null || echo "无法获取日志"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "============================================"
    echo "  Envoy Proxy 状态检查"
    echo "============================================"
    echo ""
    
    check_running
    
    if [ $? -eq 0 ]; then
        check_health
        check_clusters
        check_stats
        check_service_stats
        check_recent_logs
    fi
    
    echo "============================================"
    echo ""
    echo "详细信息："
    echo "  管理界面: http://localhost:9901"
    echo "  配置详情: curl http://localhost:9901/config_dump"
    echo "  完整统计: curl http://localhost:9901/stats"
    echo ""
}

main

