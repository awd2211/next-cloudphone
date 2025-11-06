#!/bin/bash

# Webhook 通知服务测试脚本
# 用途: 测试 Telegram Bot 和 Lark Webhook 通知功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
TELEGRAM_PORT=5002
LARK_PORT=5001
ALERTMANAGER_PORT=9093

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Webhook 通知服务测试脚本${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# 函数: 检查服务状态
check_service() {
    local service_name=$1
    local port=$2
    local url="http://localhost:${port}/health"

    echo -e "${YELLOW}检查 ${service_name}...${NC}"

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name} 运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} 无法访问 (${url})${NC}"
        return 1
    fi
}

# 函数: 发送测试告警
send_test_alert() {
    local service_name=$1
    local port=$2
    local endpoint=$3

    echo -e "${YELLOW}发送测试告警到 ${service_name}...${NC}"

    response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:${port}${endpoint}" \
      -H "Content-Type: application/json" \
      -d '{
        "receiver": "test",
        "status": "firing",
        "alerts": [{
          "status": "firing",
          "labels": {
            "alertname": "WebhookTestAlert",
            "severity": "warning",
            "service": "webhook-test",
            "cluster": "cloudphone-dev"
          },
          "annotations": {
            "summary": "Webhook 通知测试",
            "description": "这是一个测试告警，验证 Webhook 通知功能是否正常工作"
          },
          "startsAt": "'$(date -Iseconds)'",
          "endsAt": "0001-01-01T00:00:00Z",
          "generatorURL": "http://prometheus:9090/graph?g0.expr=up"
        }],
        "groupLabels": {
          "alertname": "WebhookTestAlert"
        },
        "commonLabels": {
          "alertname": "WebhookTestAlert",
          "severity": "warning"
        },
        "commonAnnotations": {
          "summary": "Webhook 通知测试"
        },
        "externalURL": "http://alertmanager:9093",
        "version": "4",
        "groupKey": "{}:{alertname=\"WebhookTestAlert\"}"
      }')

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ 测试告警发送成功 (HTTP $http_code)${NC}"
        echo -e "${BLUE}   响应: ${body}${NC}"
        return 0
    else
        echo -e "${RED}❌ 测试告警发送失败 (HTTP $http_code)${NC}"
        echo -e "${RED}   响应: ${body}${NC}"
        return 1
    fi
}

# 函数: 测试简单消息
send_simple_test() {
    local service_name=$1
    local port=$2

    echo -e "${YELLOW}发送简单测试消息到 ${service_name}...${NC}"

    response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:${port}/test")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ 简单测试发送成功 (HTTP $http_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ 简单测试发送失败 (HTTP $http_code)${NC}"
        echo -e "${RED}   响应: ${body}${NC}"
        return 1
    fi
}

# 主测试流程
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第 1 步: 检查服务健康状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

telegram_healthy=0
lark_healthy=0
alertmanager_healthy=0

check_service "Telegram Bot" "$TELEGRAM_PORT" && telegram_healthy=1
check_service "Lark Webhook" "$LARK_PORT" && lark_healthy=1
check_service "AlertManager" "$ALERTMANAGER_PORT" && alertmanager_healthy=1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第 2 步: 发送简单测试消息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $telegram_healthy -eq 1 ]; then
    send_simple_test "Telegram Bot" "$TELEGRAM_PORT"
else
    echo -e "${YELLOW}⚠️  跳过 Telegram 测试 (服务不可用)${NC}"
fi

echo ""

if [ $lark_healthy -eq 1 ]; then
    send_simple_test "Lark Webhook" "$LARK_PORT"
else
    echo -e "${YELLOW}⚠️  跳过 Lark 测试 (服务不可用)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第 3 步: 发送 AlertManager 格式的测试告警"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $telegram_healthy -eq 1 ]; then
    send_test_alert "Telegram Bot" "$TELEGRAM_PORT" "/telegram-webhook"
else
    echo -e "${YELLOW}⚠️  跳过 Telegram 告警测试 (服务不可用)${NC}"
fi

echo ""

if [ $lark_healthy -eq 1 ]; then
    send_test_alert "Lark Webhook" "$LARK_PORT" "/lark-webhook"
else
    echo -e "${YELLOW}⚠️  跳过 Lark 告警测试 (服务不可用)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第 4 步: 端到端测试 (通过 AlertManager)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $alertmanager_healthy -eq 1 ]; then
    echo -e "${YELLOW}发送告警到 AlertManager...${NC}"

    response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:${ALERTMANAGER_PORT}/api/v1/alerts" \
      -H "Content-Type: application/json" \
      -d '[{
        "labels": {
          "alertname": "E2EWebhookTest",
          "severity": "critical",
          "service": "webhook-test",
          "team": "ops"
        },
        "annotations": {
          "summary": "端到端 Webhook 测试",
          "description": "测试从 AlertManager 到 Telegram/Lark 的完整告警链路"
        },
        "startsAt": "'$(date -Iseconds)'"
      }]')

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ 告警已发送到 AlertManager (HTTP $http_code)${NC}"
        echo -e "${BLUE}   请等待 30 秒，然后检查 Telegram 和飞书群组${NC}"
        echo -e "${BLUE}   根据 AlertManager 的 group_wait 配置，告警可能需要一些时间才能送达${NC}"
    else
        echo -e "${RED}❌ 发送到 AlertManager 失败 (HTTP $http_code)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  跳过端到端测试 (AlertManager 不可用)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 统计结果
passed=0
failed=0

[ $telegram_healthy -eq 1 ] && ((passed++)) || ((failed++))
[ $lark_healthy -eq 1 ] && ((passed++)) || ((failed++))
[ $alertmanager_healthy -eq 1 ] && ((passed++)) || ((failed++))

echo -e "服务健康检查:"
echo -e "  ${GREEN}✅ 通过: $passed 个服务${NC}"
[ $failed -gt 0 ] && echo -e "  ${RED}❌ 失败: $failed 个服务${NC}"

echo ""
echo -e "${BLUE}📝 后续步骤:${NC}"
echo "  1. 检查 Telegram 群组是否收到测试消息"
echo "  2. 检查飞书群组是否收到测试消息"
echo "  3. 如果未收到消息，查看服务日志:"
echo "     docker logs alertmanager-telegram-bot --tail 50"
echo "     docker logs alertmanager-lark-webhook --tail 50"
echo "  4. 验证 AlertManager 路由配置:"
echo "     curl http://localhost:9093/api/v1/status"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   测试完成!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
