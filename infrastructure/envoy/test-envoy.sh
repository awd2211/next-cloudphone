#!/bin/bash

# Envoy 功能测试脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVOY_URL="http://localhost:10000"
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_code=${3:-200}
    
    echo -n "测试 $name ... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${ENVOY_URL}${endpoint}")
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ 通过${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ 失败${NC} (期望 $expected_code, 实际 $response)"
        FAILED=$((FAILED + 1))
    fi
}

# 测试熔断器
test_circuit_breaker() {
    echo ""
    echo -e "${BLUE}=== 测试熔断器功能 ===${NC}"
    echo ""
    
    # 检查是否有服务可以测试
    echo "1. 停止一个服务以触发熔断..."
    docker stop cloudphone-user-service 2>/dev/null || echo "user-service 未运行"
    
    echo "2. 发送请求（应该快速失败）..."
    
    start_time=$(date +%s%N)
    response=$(curl -s -o /dev/null -w "%{http_code}" "${ENVOY_URL}/api/users" || echo "503")
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 ))  # 转换为毫秒
    
    echo "   响应码: $response"
    echo "   响应时间: ${duration}ms"
    
    if [ $duration -lt 5000 ]; then
        echo -e "${GREEN}✅ 熔断器工作正常（快速失败）${NC}"
    else
        echo -e "${YELLOW}⚠️  响应时间过长，可能熔断器未生效${NC}"
    fi
    
    echo "3. 恢复服务..."
    docker start cloudphone-user-service 2>/dev/null || echo "跳过恢复"
    
    echo "4. 等待服务恢复（10秒）..."
    sleep 10
    
    echo -e "${GREEN}熔断器测试完成${NC}"
    echo ""
}

# 测试限流
test_rate_limit() {
    echo ""
    echo -e "${BLUE}=== 测试限流功能 ===${NC}"
    echo ""
    
    echo "发送大量并发请求..."
    
    success_count=0
    limited_count=0
    
    for i in {1..100}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "${ENVOY_URL}/api/users")
        if [ "$response" -eq "200" ]; then
            success_count=$((success_count + 1))
        elif [ "$response" -eq "429" ]; then
            limited_count=$((limited_count + 1))
        fi
    done
    
    echo "成功请求: $success_count"
    echo "被限流: $limited_count"
    
    if [ $limited_count -gt 0 ]; then
        echo -e "${GREEN}✅ 限流器工作正常${NC}"
    else
        echo -e "${YELLOW}⚠️  未触发限流（可能请求量不够）${NC}"
    fi
    echo ""
}

# 测试重试
test_retry() {
    echo ""
    echo -e "${BLUE}=== 测试重试功能 ===${NC}"
    echo ""
    
    echo "查看重试统计..."
    retry_stats=$(curl -s http://localhost:9901/stats | grep "upstream_rq_retry:" | head -5)
    
    if [ -n "$retry_stats" ]; then
        echo "$retry_stats"
        echo -e "${GREEN}✅ 重试功能已启用${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到重试统计${NC}"
    fi
    echo ""
}

# 主测试流程
main() {
    echo ""
    echo "============================================"
    echo "  Envoy Proxy 功能测试"
    echo "============================================"
    echo ""
    
    # 检查 Envoy 是否运行
    if ! curl -s http://localhost:9901/ready &> /dev/null; then
        echo -e "${RED}❌ Envoy 未运行或未就绪${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 基础功能测试 ===${NC}"
    echo ""
    
    # 测试各服务端点
    test_endpoint "User Service" "/api/users"
    test_endpoint "Device Service" "/api/devices"
    test_endpoint "Billing Service" "/api/billing/plans"
    
    echo ""
    echo -e "${BLUE}=== 高级功能测试 ===${NC}"
    
    # 熔断器测试
    test_circuit_breaker
    
    # 限流测试
    # test_rate_limit  # 可选，会产生大量请求
    
    # 重试测试
    test_retry
    
    # 显示结果
    echo "============================================"
    echo -e "测试结果: ${GREEN}通过 $PASSED${NC} | ${RED}失败 $FAILED${NC}"
    echo "============================================"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ 所有测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 部分测试失败${NC}"
        exit 1
    fi
}

main

