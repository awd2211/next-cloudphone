#!/bin/bash

# AlertManager 通知渠道验证脚本
# 直接向 AlertManager 发送测试告警来验证通知流程

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ALERTMANAGER_URL="http://localhost:9093"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   AlertManager 通知渠道验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 AlertManager 状态
echo -e "${YELLOW}[1/5] 检查 AlertManager 状态...${NC}"
if curl -sf ${ALERTMANAGER_URL}/-/healthy > /dev/null; then
    echo -e "${GREEN}✅ AlertManager 运行正常${NC}"
else
    echo -e "${RED}❌ AlertManager 未运行！${NC}"
    exit 1
fi

# 显示接收器配置
echo ""
echo -e "${YELLOW}[2/5] 显示接收器配置...${NC}"
echo "已配置的接收器:"
curl -sf ${ALERTMANAGER_URL}/api/v2/receivers | jq -r '.[].name' | while read receiver; do
    echo "  - ${receiver}"
done

# 创建测试告警
echo ""
echo -e "${YELLOW}[3/5] 创建测试告警...${NC}"

TEST_ALERT=$(cat <<'EOF'
[
  {
    "labels": {
      "alertname": "TestAlert",
      "service": "test-service",
      "severity": "critical",
      "category": "test"
    },
    "annotations": {
      "summary": "这是一个测试告警",
      "description": "用于验证 AlertManager 通知渠道配置是否正确"
    },
    "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "endsAt": "$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)",
    "generatorURL": "http://prometheus:9090/graph"
  }
]
EOF
)

# 替换时间戳
TEST_ALERT=$(echo "$TEST_ALERT" | sed "s/\$(date -u +%Y-%m-%dT%H:%M:%S.000Z)/$(date -u +%Y-%m-%dT%H:%M:%S.000Z)/g")
TEST_ALERT=$(echo "$TEST_ALERT" | sed "s/\$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)/$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)/g")

# 发送告警到 AlertManager
echo "$TEST_ALERT" | curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d @- \
  ${ALERTMANAGER_URL}/api/v2/alerts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 测试告警已发送到 AlertManager${NC}"
else
    echo -e "${RED}❌ 发送告警失败${NC}"
    exit 1
fi

# 验证告警已接收
echo ""
echo -e "${YELLOW}[4/5] 验证告警已接收...${NC}"
sleep 3

ALERT_COUNT=$(curl -sf ${ALERTMANAGER_URL}/api/v2/alerts | \
              jq '[.[] | select(.labels.alertname=="TestAlert")] | length')

if [ "$ALERT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ AlertManager 已接收到测试告警 (${ALERT_COUNT} 个)${NC}"
else
    echo -e "${RED}❌ AlertManager 未接收到告警${NC}"
    exit 1
fi

# 显示告警详情
echo ""
echo "告警详情:"
curl -sf ${ALERTMANAGER_URL}/api/v2/alerts | \
     jq '.[] | select(.labels.alertname=="TestAlert") | {
       alertname: .labels.alertname,
       service: .labels.service,
       severity: .labels.severity,
       state: .status.state,
       receivers: .receivers
     }'

# 等待通知发送
echo ""
echo -e "${YELLOW}[5/5] 等待通知发送...${NC}"
echo "请在 30 秒内检查以下通知渠道:"
echo ""
echo -e "${BLUE}📧 Email:${NC}"
echo "   检查邮箱是否收到测试告警邮件"
echo ""
echo -e "${BLUE}📱 Lark (飞书):${NC}"
echo "   检查飞书群是否收到测试告警消息"
echo "   应包含: 🚨 严重告警 - 这是一个测试告警"
echo ""
echo -e "${BLUE}📱 Telegram:${NC}"
echo "   检查 Telegram 群/私聊是否收到测试告警消息"
echo "   应包含: 🚨 严重告警 + 交互按钮"
echo ""

echo "等待 30 秒..."
for i in {30..1}; do
    echo -ne "\r剩余时间: ${i} 秒   "
    sleep 1
done
echo ""

# 发送解决通知
echo ""
echo -e "${YELLOW}发送告警解决通知...${NC}"

RESOLVE_ALERT=$(cat <<'EOF'
[
  {
    "labels": {
      "alertname": "TestAlert",
      "service": "test-service",
      "severity": "critical",
      "category": "test"
    },
    "annotations": {
      "summary": "测试告警已解决",
      "description": "这是一个测试告警解决通知"
    },
    "startsAt": "$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%S.000Z)",
    "endsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "generatorURL": "http://prometheus:9090/graph"
  }
]
EOF
)

# 替换时间戳
RESOLVE_ALERT=$(echo "$RESOLVE_ALERT" | sed "s/\$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%S.000Z)/$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%S.000Z)/g")
RESOLVE_ALERT=$(echo "$RESOLVE_ALERT" | sed "s/\$(date -u +%Y-%m-%dT%H:%M:%S.000Z)/$(date -u +%Y-%m-%dT%H:%M:%S.000Z)/g")

echo "$RESOLVE_ALERT" | curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d @- \
  ${ALERTMANAGER_URL}/api/v2/alerts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 解决通知已发送${NC}"
else
    echo -e "${RED}❌ 发送解决通知失败${NC}"
fi

echo ""
echo "等待 30 秒查看解决通知..."
for i in {30..1}; do
    echo -ne "\r剩余时间: ${i} 秒   "
    sleep 1
done
echo ""

# 总结
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   验证总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ 核心功能验证完成！${NC}"
echo ""
echo "验证清单:"
echo "  [✓] AlertManager 运行正常"
echo "  [✓] 测试告警成功发送"
echo "  [✓] 告警解决通知已发送"
echo "  [ ] Email 通知接收（需手动验证）"
echo "  [ ] Lark 通知接收（需手动验证）"
echo "  [ ] Telegram 通知接收（需手动验证）"
echo "  [ ] 解决通知接收（需手动验证）"
echo ""
echo "查看 AlertManager:"
echo "  Web UI: http://localhost:9093"
echo "  API: http://localhost:9093/api/v2/alerts"
echo ""
echo -e "${YELLOW}注意：${NC}"
echo "  - Lark 通知需要配置 Webhook URL"
echo "  - Telegram 通知需要配置 Bot Token 和 Chat ID"
echo "  - Email 通知需要配置 SMTP 服务器"
echo ""
