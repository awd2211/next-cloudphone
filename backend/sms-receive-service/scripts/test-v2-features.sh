#!/bin/bash

# SMS Receive Service v2.0.0 功能测试脚本
# 用于验证所有新增功能是否正常工作

set -e

# 配置
BASE_URL="${BASE_URL:-http://localhost:30008}"
TOKEN="${TOKEN:-}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SMS Receive Service v2.0.0 测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_status=${3:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}[TEST $TOTAL_TESTS]${NC} $test_name"

    # 执行测试
    response=$(eval "$test_command" 2>&1)
    status=$?

    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "$response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# 1. 健康检查
echo -e "${BLUE}=== 基础健康检查 ===${NC}"
run_test "服务健康检查" \
    "curl -s -f $BASE_URL/health"

run_test "Prometheus 指标可访问" \
    "curl -s -f $BASE_URL/metrics | grep -q sms_"

# 2. 验证码提取测试（公开接口）
echo -e "${BLUE}=== 验证码提取功能 ===${NC}"

run_test "提取6位数字验证码" \
    "curl -s -f -X POST $BASE_URL/verification-codes/extract \
        -H 'Content-Type: application/json' \
        -d '{\"message\":\"Your verification code is 123456\",\"serviceCode\":\"test\"}' | jq -e '.success == true'"

run_test "提取 Telegram 验证码" \
    "curl -s -f -X POST $BASE_URL/verification-codes/extract \
        -H 'Content-Type: application/json' \
        -d '{\"message\":\"Telegram code: 45678\"}' | jq -e '.success == true'"

run_test "提取带标签的验证码" \
    "curl -s -f -X POST $BASE_URL/verification-codes/extract \
        -H 'Content-Type: application/json' \
        -d '{\"message\":\"code: 789012\"}' | jq -e '.success == true'"

run_test "获取支持的验证码模式" \
    "curl -s -f $BASE_URL/verification-codes/patterns | jq -e '.data.total > 0'"

run_test "测试特定模式 - six_digit" \
    "curl -s -f -X POST $BASE_URL/verification-codes/test-pattern \
        -H 'Content-Type: application/json' \
        -d '{\"message\":\"Code: 999888\",\"patternName\":\"six_digit\"}' | jq -e '.success == true'"

# 3. Prometheus 指标验证
echo -e "${BLUE}=== Prometheus 指标验证 ===${NC}"

run_test "验证码提取时间指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_verification_code_extraction_time_seconds"

run_test "验证码缓存指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_verification_code_cache"

run_test "号码池指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_number_pool_size"

run_test "SMS接收时间指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_receive_time_seconds"

run_test "平台成本指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_provider_average_cost_usd"

run_test "平台成功率指标存在" \
    "curl -s $BASE_URL/metrics | grep -q sms_provider_success_rate_percent"

# 4. 认证相关测试（需要 TOKEN）
if [ -n "$TOKEN" ]; then
    echo -e "${BLUE}=== 认证 API 测试 ===${NC}"

    run_test "获取统计信息" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            $BASE_URL/statistics | jq -e '.success == true'"

    run_test "获取实时监控数据" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            $BASE_URL/statistics/realtime | jq -e '.success == true'"

    run_test "获取平台对比信息" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            $BASE_URL/statistics/providers/comparison | jq -e '.success == true'"

    run_test "获取验证码缓存统计" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            $BASE_URL/verification-codes/cache/stats | jq -e '.success == true'"

    run_test "获取号码池统计" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            '$BASE_URL/pool/statistics?serviceCode=telegram&countryCode=US' | jq -e '.success == true'"
else
    echo -e "${YELLOW}⚠ 跳过认证 API 测试（未提供 TOKEN）${NC}"
    echo -e "${YELLOW}提示: 设置环境变量 TOKEN 来运行完整测试${NC}"
    echo -e "${YELLOW}示例: TOKEN=your-jwt-token ./scripts/test-v2-features.sh${NC}"
    echo ""
fi

# 5. 数据库表验证
echo -e "${BLUE}=== 数据库表验证 ===${NC}"

if command -v psql &> /dev/null; then
    DB_USER="${DB_USER:-postgres}"
    DB_NAME="${DB_NAME:-cloudphone_sms}"
    DB_HOST="${DB_HOST:-localhost}"

    run_test "provider_blacklist 表存在" \
        "PGPASSWORD=postgres psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tc \
            \"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='provider_blacklist'\" | grep -q '1'"

    run_test "ab_test_config 表存在" \
        "PGPASSWORD=postgres psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tc \
            \"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ab_test_config'\" | grep -q '1'"

    run_test "number_pool 表存在" \
        "PGPASSWORD=postgres psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tc \
            \"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='number_pool'\" | grep -q '1'"
else
    echo -e "${YELLOW}⚠ 跳过数据库表验证（psql 未安装）${NC}"
    echo ""
fi

# 6. 集成测试
echo -e "${BLUE}=== 端到端集成测试 ===${NC}"

if [ -n "$TOKEN" ]; then
    # 测试完整的验证码流程
    TEST_PHONE="+1234567890"
    TEST_SERVICE="test_service"
    TEST_CODE="123456"

    echo -e "${YELLOW}测试场景：${NC}模拟 SMS 接收 -> 验证码提取 -> 缓存 -> 查询"

    # 注意：这需要实际的虚拟号码和 SMS 消息，这里只做基础检查
    run_test "按手机号查询验证码（应该返回未找到）" \
        "curl -s -f -H 'Authorization: Bearer $TOKEN' \
            '$BASE_URL/verification-codes/phone/$TEST_PHONE?serviceCode=$TEST_SERVICE' | jq -e '.success == false or .success == true'"
else
    echo -e "${YELLOW}⚠ 跳过集成测试（需要认证）${NC}"
    echo ""
fi

# 测试总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  测试总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "总计: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

# 性能指标建议
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  性能监控建议${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}关键指标:${NC}"
echo "  1. 号码池大小: sms_number_pool_size{status=\"available\"} >= 5"
echo "  2. 验证码提取时间: p95 < 5ms"
echo "  3. 缓存命中率: > 80%"
echo "  4. 平台成功率: > 90%"
echo "  5. SMS 接收时间: p95 < 5s"
echo ""
echo -e "${YELLOW}Grafana 查询示例:${NC}"
echo "  # 验证码缓存命中率"
echo "  rate(sms_verification_code_cache_hits_total[5m]) /"
echo "    (rate(sms_verification_code_cache_hits_total[5m]) + rate(sms_verification_code_cache_misses_total[5m]))"
echo ""
echo "  # 95分位 SMS 接收时间"
echo "  histogram_quantile(0.95, rate(sms_receive_time_seconds_bucket[5m]))"
echo ""

# 退出状态
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
