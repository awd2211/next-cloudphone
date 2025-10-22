#!/bin/bash

# ============================================================================
# Device Service 功能验证脚本
# 用途: 验证所有新增功能是否正常工作
# ============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="http://localhost:30002"
API_TOKEN=""  # 需要设置有效的 JWT Token

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_section() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 检查服务是否运行
check_service() {
    print_section "检查服务状态"

    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "Device Service 运行中"
    else
        print_error "Device Service 未运行"
        echo "请先启动 Device Service: cd backend/device-service && pnpm run dev"
        exit 1
    fi
}

# 检查健康状态
check_health() {
    print_section "健康检查"

    print_info "基础健康检查..."
    HEALTH=$(curl -s "$BASE_URL/health")
    if echo "$HEALTH" | grep -q "ok"; then
        print_success "基础健康检查通过"
    else
        print_error "基础健康检查失败"
    fi

    print_info "详细健康检查..."
    DETAILED_HEALTH=$(curl -s "$BASE_URL/health/detailed")
    echo "$DETAILED_HEALTH" | python3 -m json.tool 2>/dev/null || echo "$DETAILED_HEALTH"
}

# 检查 Prometheus 指标
check_metrics() {
    print_section "Prometheus 指标"

    print_info "获取指标..."
    METRICS=$(curl -s "$BASE_URL/metrics")

    # 检查关键指标
    if echo "$METRICS" | grep -q "device_count_total"; then
        print_success "device_count_total 指标存在"
    else
        print_error "device_count_total 指标缺失"
    fi

    if echo "$METRICS" | grep -q "device_cpu_usage_percent"; then
        print_success "device_cpu_usage_percent 指标存在"
    else
        print_error "device_cpu_usage_percent 指标缺失"
    fi

    if echo "$METRICS" | grep -q "device_operation_duration_seconds"; then
        print_success "device_operation_duration_seconds 指标存在"
    else
        print_error "device_operation_duration_seconds 指标缺失"
    fi

    echo ""
    print_info "指标统计:"
    echo "$METRICS" | grep "^device_" | wc -l | xargs echo "  设备相关指标数量:"
}

# 检查生命周期管理
check_lifecycle() {
    print_section "生命周期管理"

    # 需要认证
    if [ -z "$API_TOKEN" ]; then
        print_error "需要设置 API_TOKEN 才能测试认证端点"
        return
    fi

    AUTH_HEADER="Authorization: Bearer $API_TOKEN"

    print_info "获取清理统计..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/lifecycle/cleanup/statistics" | python3 -m json.tool 2>/dev/null

    print_info "获取扩缩容状态..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/lifecycle/autoscaling/status" | python3 -m json.tool 2>/dev/null

    print_info "获取备份配置..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/lifecycle/backup/config" | python3 -m json.tool 2>/dev/null
}

# 检查重试统计
check_retry() {
    print_section "重试机制统计"

    if [ -z "$API_TOKEN" ]; then
        print_error "需要设置 API_TOKEN"
        return
    fi

    AUTH_HEADER="Authorization: Bearer $API_TOKEN"

    print_info "获取重试统计摘要..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/retry/statistics/summary" | python3 -m json.tool 2>/dev/null
}

# 检查故障转移
check_failover() {
    print_section "故障转移"

    if [ -z "$API_TOKEN" ]; then
        print_error "需要设置 API_TOKEN"
        return
    fi

    AUTH_HEADER="Authorization: Bearer $API_TOKEN"

    print_info "获取故障转移配置..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/failover/config" | python3 -m json.tool 2>/dev/null

    print_info "获取故障统计..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/failover/statistics" | python3 -m json.tool 2>/dev/null
}

# 检查状态恢复
check_state_recovery() {
    print_section "状态恢复"

    if [ -z "$API_TOKEN" ]; then
        print_error "需要设置 API_TOKEN"
        return
    fi

    AUTH_HEADER="Authorization: Bearer $API_TOKEN"

    print_info "获取状态恢复配置..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/state-recovery/config" | python3 -m json.tool 2>/dev/null

    print_info "获取状态恢复统计..."
    curl -s -H "$AUTH_HEADER" "$BASE_URL/state-recovery/statistics" | python3 -m json.tool 2>/dev/null
}

# 检查 API 文档
check_api_docs() {
    print_section "API 文档"

    print_info "检查 Swagger UI..."
    if curl -s "$BASE_URL/api" | grep -q "swagger"; then
        print_success "Swagger UI 可用: $BASE_URL/api"
    else
        print_error "Swagger UI 不可用"
    fi
}

# 生成测试报告
generate_report() {
    print_section "测试报告"

    echo ""
    print_info "功能验证完成！"
    echo ""
    echo "可用的端点:"
    echo "  - 健康检查: $BASE_URL/health"
    echo "  - 详细健康: $BASE_URL/health/detailed"
    echo "  - Prometheus: $BASE_URL/metrics"
    echo "  - Swagger UI: $BASE_URL/api"
    echo ""
    echo "管理端点 (需要认证):"
    echo "  - 生命周期: $BASE_URL/lifecycle/*"
    echo "  - 重试统计: $BASE_URL/retry/*"
    echo "  - 故障转移: $BASE_URL/failover/*"
    echo "  - 状态恢复: $BASE_URL/state-recovery/*"
    echo ""

    if [ -z "$API_TOKEN" ]; then
        print_error "未设置 API_TOKEN，无法测试认证端点"
        echo ""
        echo "要测试认证端点，请设置 API_TOKEN:"
        echo "  export API_TOKEN=your_jwt_token"
        echo "  ./scripts/test-device-service-features.sh"
    fi
}

# 主函数
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Device Service 功能验证"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    check_service
    check_health
    check_metrics
    check_api_docs

    # 如果有 token，测试认证端点
    if [ -n "$API_TOKEN" ]; then
        check_lifecycle
        check_retry
        check_failover
        check_state_recovery
    fi

    generate_report
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --token)
            API_TOKEN="$2"
            shift 2
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --token TOKEN    设置 JWT Token"
            echo "  --url URL        设置 Base URL (默认: http://localhost:30002)"
            echo "  --help           显示此帮助信息"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 运行主函数
main

exit 0
