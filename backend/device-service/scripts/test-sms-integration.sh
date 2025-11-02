#!/bin/bash

# ========================================
# SMS 集成端到端测试脚本
# ========================================
#
# 测试 Device Service 与 SMS Receive Service 的集成
#
# 前置条件:
# - Device Service 运行在 localhost:30002
# - SMS Receive Service 运行在 localhost:30008
# - API Gateway 运行在 localhost:30000
# - RabbitMQ 运行在 localhost:5672
# ========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

# 测试函数
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_status="$4"
    local data="$5"

    log_info "Testing: $name"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data" 2>&1)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_status" ]; then
        log_success "$name (HTTP $http_code)"
        echo "Response: $body" | head -c 200
        echo ""
    else
        log_error "$name (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
    fi

    echo ""
}

# ========================================
# 开始测试
# ========================================

echo ""
echo "=========================================="
echo "  SMS 集成端到端测试"
echo "=========================================="
echo ""

# ========================================
# 1. 健康检查
# ========================================

log_info "=== 步骤 1: 服务健康检查 ==="
echo ""

test_endpoint \
    "Device Service 健康检查" \
    "GET" \
    "http://localhost:30002/health" \
    "200"

test_endpoint \
    "SMS Receive Service 健康检查" \
    "GET" \
    "http://localhost:30008/health" \
    "200"

test_endpoint \
    "API Gateway 健康检查" \
    "GET" \
    "http://localhost:30000/health" \
    "200"

# ========================================
# 2. 获取或创建测试设备
# ========================================

log_info "=== 步骤 2: 准备测试设备 ==="
echo ""

# 注意: 这需要认证 token，这里先跳过实际创建设备
# 在实际测试中需要先登录获取 token

log_warning "设备创建需要认证 token，跳过此步骤"
log_warning "假设测试设备 ID: test-device-001"
echo ""

TEST_DEVICE_ID="test-device-001"

# ========================================
# 3. 测试 SMS Receive Service 直接接口
# ========================================

log_info "=== 步骤 3: 测试 SMS Receive Service 接口 ==="
echo ""

# 3.1 测试获取可用服务提供商
log_info "Testing: 获取可用服务提供商"
response=$(curl -s http://localhost:30008/sms-numbers/providers 2>&1)
echo "Response: $response"
echo ""

# 3.2 测试健康检查详情
test_endpoint \
    "SMS Service 详细健康检查" \
    "GET" \
    "http://localhost:30008/health/detailed" \
    "200"

# ========================================
# 4. 测试 Device Service SMS API (通过 API Gateway)
# ========================================

log_info "=== 步骤 4: 测试 Device Service SMS 接口 ==="
echo ""

# 注意: 这些接口需要认证
log_warning "以下接口需要 JWT Token，需要先通过 user-service 登录"
echo ""

# 显示测试命令示例
cat << 'EOF'
# ========================================
# 手动测试命令示例
# ========================================

# 1. 获取 Token (需要先启动 user-service)
TOKEN=$(curl -s -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"

# 2. 请求虚拟 SMS 号码
curl -X POST "http://localhost:30002/devices/test-device-001/request-sms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "country": "RU",
    "service": "telegram"
  }' | jq .

# 3. 查询设备的虚拟号码
curl -X GET "http://localhost:30002/devices/test-device-001/sms-number" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. 查询 SMS 消息历史
curl -X GET "http://localhost:30002/devices/test-device-001/sms-messages" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. 取消虚拟号码
curl -X DELETE "http://localhost:30002/devices/test-device-001/sms-number" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "测试完成"
  }' | jq .

EOF

# ========================================
# 5. 测试 RabbitMQ 连接
# ========================================

log_info "=== 步骤 5: 验证 RabbitMQ 配置 ==="
echo ""

# 检查 RabbitMQ 是否运行
if curl -s -u admin:admin123 http://localhost:15672/api/overview > /dev/null 2>&1; then
    log_success "RabbitMQ Management API 可访问"

    # 检查 exchanges
    log_info "检查 cloudphone.events exchange..."
    if curl -s -u admin:admin123 http://localhost:15672/api/exchanges/%2F/cloudphone.events | jq -r '.name' | grep -q "cloudphone.events"; then
        log_success "cloudphone.events exchange 存在"
    else
        log_warning "cloudphone.events exchange 不存在（首次消息发布时会自动创建）"
    fi

    # 检查 queues
    log_info "检查 device-service SMS 队列..."
    queues=$(curl -s -u admin:admin123 http://localhost:15672/api/queues | jq -r '.[].name' | grep "device-service.sms" || echo "")
    if [ -n "$queues" ]; then
        log_success "找到 SMS 相关队列:"
        echo "$queues" | while read -r queue; do
            echo "  - $queue"
        done
    else
        log_warning "未找到 SMS 队列（首次订阅时会自动创建）"
    fi
else
    log_error "RabbitMQ Management API 不可访问"
fi

echo ""

# ========================================
# 6. 测试数据库连接
# ========================================

log_info "=== 步骤 6: 验证数据库配置 ==="
echo ""

log_info "检查 SMS Receive Service 数据库表..."
# 这需要数据库访问权限，这里只是示例
log_warning "需要数据库访问权限，跳过此检查"

echo ""

# ========================================
# 测试总结
# ========================================

echo "=========================================="
echo "  测试总结"
echo "=========================================="
echo ""
echo "总测试数: $TESTS_TOTAL"
echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
echo -e "${RED}失败: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
