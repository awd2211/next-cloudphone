#!/bin/bash
# LiveChat Service API 测试脚本
# 用法: ./test-api.sh [TOKEN]

# 不使用 set -e，允许部分测试失败后继续

BASE_URL="http://localhost:30010"
GATEWAY_URL="http://localhost:30000"
TOKEN="${1:-}"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  LiveChat Service API 测试"
echo "  所有路由使用 /livechat/* 前缀"
echo "=========================================="
echo ""

# 测试函数
test_endpoint() {
  local method=$1
  local url=$2
  local name=$3
  local data=$4

  echo -n "测试 $name... "

  if [ -z "$data" ]; then
    if [ -z "$TOKEN" ]; then
      response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
    else
      response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
    fi
  else
    if [ -z "$TOKEN" ]; then
      response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    else
      response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data")
    fi
  fi

  if [ "$response" = "200" ] || [ "$response" = "201" ]; then
    echo -e "${GREEN}✓ $response${NC}"
    return 0
  elif [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠ $response (需要认证)${NC}"
    return 0
  else
    echo -e "${RED}✗ $response${NC}"
    return 1
  fi
}

# ========================================
# 1. 健康检查 (无需认证)
# ========================================
echo "【1. 健康检查】"
test_endpoint "GET" "$BASE_URL/health" "/health"
test_endpoint "GET" "$BASE_URL/health/live" "/health/live"
test_endpoint "GET" "$BASE_URL/health/ready" "/health/ready"
echo ""

# ========================================
# 2. WebSocket (Socket.IO)
# ========================================
echo "【2. WebSocket 端点】"
echo -n "测试 Socket.IO... "
ws_response=$(curl -s "$BASE_URL/socket.io/?EIO=4&transport=polling" | head -c 10)
if [[ "$ws_response" == "0{"* ]]; then
  echo -e "${GREEN}✓ 连接正常${NC}"
else
  echo -e "${RED}✗ 连接失败${NC}"
fi
echo ""

# ========================================
# 3. Chat 模块 (/livechat/chat)
# ========================================
echo "【3. Chat 模块 (/livechat/chat)】"
test_endpoint "GET" "$BASE_URL/livechat/chat/stats/waiting" "/livechat/chat/stats/waiting"
test_endpoint "GET" "$BASE_URL/livechat/chat/stats/active" "/livechat/chat/stats/active"
test_endpoint "GET" "$BASE_URL/livechat/chat/conversations" "/livechat/chat/conversations"
test_endpoint "GET" "$BASE_URL/livechat/chat/agent/conversations" "/livechat/chat/agent/conversations"
echo ""

# ========================================
# 4. Agents 模块 (/livechat/agents)
# ========================================
echo "【4. Agents 模块 (/livechat/agents)】"
test_endpoint "GET" "$BASE_URL/livechat/agents" "/livechat/agents"
test_endpoint "GET" "$BASE_URL/livechat/agents/available" "/livechat/agents/available"
test_endpoint "GET" "$BASE_URL/livechat/agents/groups/list" "/livechat/agents/groups/list"
test_endpoint "GET" "$BASE_URL/livechat/agents/canned-responses/list" "/livechat/agents/canned-responses/list"
echo ""

# ========================================
# 5. Queues 模块 (/livechat/queues)
# ========================================
echo "【5. Queues 模块 (/livechat/queues)】"
test_endpoint "GET" "$BASE_URL/livechat/queues/configs" "/livechat/queues/configs"
test_endpoint "GET" "$BASE_URL/livechat/queues/stats" "/livechat/queues/stats"
echo ""

# ========================================
# 6. AI 模块 (/livechat/ai)
# ========================================
echo "【6. AI 模块 (/livechat/ai)】"
test_endpoint "POST" "$BASE_URL/livechat/ai/classify" "/livechat/ai/classify" '{"message":"我的手机无法启动"}'
test_endpoint "POST" "$BASE_URL/livechat/ai/suggest" "/livechat/ai/suggest" '{"conversationId":"test","context":"用户询问价格"}'
echo ""

# ========================================
# 7. Analytics 模块 (/livechat/analytics)
# ========================================
echo "【7. Analytics 模块 (/livechat/analytics)】"
test_endpoint "GET" "$BASE_URL/livechat/analytics/overview" "/livechat/analytics/overview"
test_endpoint "GET" "$BASE_URL/livechat/analytics/trends?days=7" "/livechat/analytics/trends"
test_endpoint "GET" "$BASE_URL/livechat/analytics/agents" "/livechat/analytics/agents"
test_endpoint "GET" "$BASE_URL/livechat/analytics/ratings" "/livechat/analytics/ratings"
test_endpoint "GET" "$BASE_URL/livechat/analytics/peak-hours" "/livechat/analytics/peak-hours"
echo ""

# ========================================
# 8. Quality 模块 (/livechat/quality)
# ========================================
echo "【8. Quality 模块 (/livechat/quality)】"
test_endpoint "GET" "$BASE_URL/livechat/quality/sensitive-words" "/livechat/quality/sensitive-words"
test_endpoint "GET" "$BASE_URL/livechat/quality/reviews" "/livechat/quality/reviews"
test_endpoint "GET" "$BASE_URL/livechat/quality/ratings" "/livechat/quality/ratings"
test_endpoint "POST" "$BASE_URL/livechat/quality/check" "/livechat/quality/check" '{"content":"这是测试内容"}'
echo ""

# ========================================
# 9. Archives 模块 (/livechat/archives)
# ========================================
echo "【9. Archives 模块 (/livechat/archives)】"
test_endpoint "GET" "$BASE_URL/livechat/archives/stats" "/livechat/archives/stats"
test_endpoint "GET" "$BASE_URL/livechat/archives/search" "/livechat/archives/search"
echo ""

# ========================================
# 10. Device Assist 模块 (/livechat/device-assist)
# ========================================
echo "【10. Device Assist 模块 (/livechat/device-assist)】"
test_endpoint "GET" "$BASE_URL/livechat/device-assist/devices" "/livechat/device-assist/devices"
echo ""

# ========================================
# 11. Tickets 模块 (/livechat/tickets)
# ========================================
echo "【11. Tickets 模块 (/livechat/tickets)】"
test_endpoint "GET" "$BASE_URL/livechat/tickets" "/livechat/tickets"
echo ""

# ========================================
# 通过 API Gateway 测试
# ========================================
echo "【12. API Gateway 路由测试】"
test_endpoint "GET" "$GATEWAY_URL/circuit-breaker/stats" "熔断器状态 (公开)"

if [ -n "$TOKEN" ]; then
  test_endpoint "GET" "$GATEWAY_URL/livechat/chat/stats/waiting" "Gateway -> /livechat/chat/stats/waiting"
  test_endpoint "GET" "$GATEWAY_URL/livechat/agents" "Gateway -> /livechat/agents"
  test_endpoint "GET" "$GATEWAY_URL/livechat/queues/configs" "Gateway -> /livechat/queues/configs"
  test_endpoint "GET" "$GATEWAY_URL/livechat/analytics/overview" "Gateway -> /livechat/analytics/overview"
  test_endpoint "GET" "$GATEWAY_URL/livechat/quality/sensitive-words" "Gateway -> /livechat/quality/sensitive-words"
else
  echo -e "${YELLOW}⚠ 跳过需要认证的 Gateway 测试 (未提供 TOKEN)${NC}"
fi
echo ""

echo "=========================================="
echo "  测试完成!"
echo "=========================================="
echo ""
echo "提示: 使用 TOKEN 参数测试需要认证的端点:"
echo "  ./test-api.sh YOUR_JWT_TOKEN"
echo ""
echo "API 文档: $BASE_URL/docs"
