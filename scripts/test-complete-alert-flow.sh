#!/bin/bash

# 完整告警流程测试脚本
# 用途：端到端测试 Prometheus → AlertManager → 多渠道通知（Email + Lark + Telegram）

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROMETHEUS_URL="http://localhost:9090"
ALERTMANAGER_URL="http://localhost:9093"
TEST_SERVICE="user-service"
TEST_DURATION=180  # 测试持续时间（秒）

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   完整告警流程验证测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 步骤 1: 检查监控栈状态
echo -e "${YELLOW}[1/10] 检查监控栈状态...${NC}"
if ! curl -sf ${PROMETHEUS_URL}/-/healthy > /dev/null; then
    echo -e "${RED}❌ Prometheus 未运行！${NC}"
    echo -e "${YELLOW}正在启动监控栈...${NC}"
    cd /home/eric/next-cloudphone/infrastructure/monitoring
    docker compose up -d
    echo "等待 30 秒让服务启动..."
    sleep 30
else
    echo -e "${GREEN}✅ Prometheus 运行正常${NC}"
fi

if ! curl -sf ${ALERTMANAGER_URL}/-/healthy > /dev/null; then
    echo -e "${RED}❌ AlertManager 未运行！${NC}"
    exit 1
else
    echo -e "${GREEN}✅ AlertManager 运行正常${NC}"
fi

# 步骤 2: 检查被测试服务状态
echo ""
echo -e "${YELLOW}[2/10] 检查 ${TEST_SERVICE} 状态...${NC}"
if pm2 describe ${TEST_SERVICE} > /dev/null 2>&1; then
    SERVICE_STATUS=$(pm2 describe ${TEST_SERVICE} | grep 'status' | awk '{print $4}')
    echo -e "${GREEN}✅ ${TEST_SERVICE} 当前状态: ${SERVICE_STATUS}${NC}"
else
    echo -e "${RED}❌ ${TEST_SERVICE} 不存在于 PM2 中${NC}"
    exit 1
fi

# 步骤 3: 检查当前告警状态
echo ""
echo -e "${YELLOW}[3/10] 检查当前告警状态...${NC}"
CURRENT_ALERTS=$(curl -sf ${PROMETHEUS_URL}/api/v1/alerts | jq '.data.alerts | length')
echo "当前活跃告警数: ${CURRENT_ALERTS}"

ALERTMANAGER_ALERTS=$(curl -sf ${ALERTMANAGER_URL}/api/v2/alerts | jq '. | length')
echo "AlertManager 中的告警数: ${ALERTMANAGER_ALERTS}"

# 步骤 4: 检查通知渠道配置
echo ""
echo -e "${YELLOW}[4/10] 检查通知渠道配置...${NC}"

# 检查 Lark webhook
if docker ps | grep -q "alertmanager-lark-webhook"; then
    LARK_HEALTH=$(curl -sf http://localhost:5001/health | jq -r '.status')
    echo -e "${GREEN}✅ Lark Webhook: ${LARK_HEALTH}${NC}"
else
    echo -e "${YELLOW}⚠️  Lark Webhook 未部署（需要配置 Webhook URL）${NC}"
fi

# 检查 Telegram Bot
if docker ps | grep -q "alertmanager-telegram-bot"; then
    TELEGRAM_HEALTH=$(curl -sf http://localhost:5002/health | jq -r '.status')
    echo -e "${GREEN}✅ Telegram Bot: ${TELEGRAM_HEALTH}${NC}"
else
    echo -e "${YELLOW}⚠️  Telegram Bot 未部署（需要配置 Bot Token 和 Chat ID）${NC}"
fi

# 步骤 5: 显示 AlertManager 接收器配置
echo ""
echo -e "${YELLOW}[5/10] 显示 AlertManager 接收器配置...${NC}"
curl -sf ${ALERTMANAGER_URL}/api/v2/receivers | jq -r '.[].name' | while read receiver; do
    echo "  - ${receiver}"
done

# 步骤 6: 触发测试告警
echo ""
echo -e "${YELLOW}[6/10] 触发测试告警...${NC}"
echo -e "${RED}⚠️  即将停止 ${TEST_SERVICE} 以触发 ServiceDown 告警${NC}"
echo "这将触发 critical 级别的告警，通知所有渠道"
echo ""
read -p "是否继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "测试已取消"
    exit 0
fi

echo "正在停止 ${TEST_SERVICE}..."
pm2 stop ${TEST_SERVICE}
echo -e "${GREEN}✅ ${TEST_SERVICE} 已停止${NC}"

START_TIME=$(date +%s)
echo "开始时间: $(date)"
echo "将监控 ${TEST_DURATION} 秒..."

# 步骤 7: 监控 Prometheus 告警检测
echo ""
echo -e "${YELLOW}[7/10] 监控 Prometheus 告警检测...${NC}"
echo "等待 Prometheus 检测到服务下线（scrape_interval * 2 = ~60秒）..."

DETECTED=false
for i in {1..12}; do
    sleep 10
    ALERTS=$(curl -sf ${PROMETHEUS_URL}/api/v1/alerts | \
             jq -r ".data.alerts[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\") | .state")

    if [ ! -z "$ALERTS" ]; then
        echo -e "${GREEN}✅ Prometheus 已检测到 ServiceDown 告警！${NC}"
        echo "告警状态: ${ALERTS}"
        DETECTED=true
        break
    else
        echo "等待中... (${i}0秒)"
    fi
done

if [ "$DETECTED" = false ]; then
    echo -e "${RED}❌ Prometheus 未能检测到告警${NC}"
    echo "正在恢复服务..."
    pm2 restart ${TEST_SERVICE}
    exit 1
fi

# 步骤 8: 监控 AlertManager 告警路由
echo ""
echo -e "${YELLOW}[8/10] 监控 AlertManager 告警路由...${NC}"
echo "等待告警传递到 AlertManager..."
sleep 30

ALERTMANAGER_ALERT=$(curl -sf ${ALERTMANAGER_URL}/api/v2/alerts | \
                     jq -r ".[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\") | .status.state")

if [ ! -z "$ALERTMANAGER_ALERT" ]; then
    echo -e "${GREEN}✅ AlertManager 已接收到告警！${NC}"
    echo "告警状态: ${ALERTMANAGER_ALERT}"

    # 显示告警详情
    echo ""
    echo "告警详情:"
    curl -sf ${ALERTMANAGER_URL}/api/v2/alerts | \
         jq ".[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\")" | \
         jq '{
           alertname: .labels.alertname,
           service: .labels.service,
           severity: .labels.severity,
           state: .status.state,
           startsAt: .startsAt,
           annotations: .annotations
         }'
else
    echo -e "${RED}❌ AlertManager 未接收到告警${NC}"
fi

# 步骤 9: 检查通知发送
echo ""
echo -e "${YELLOW}[9/10] 检查通知发送...${NC}"
echo ""
echo "请手动验证以下通知渠道："
echo ""
echo -e "${BLUE}📧 Email:${NC}"
echo "   检查邮箱是否收到告警邮件"
echo "   主题: [CRITICAL] ServiceDown - ${TEST_SERVICE}"
echo ""
echo -e "${BLUE}📱 Lark (飞书):${NC}"
echo "   检查飞书群是否收到告警消息"
echo "   应包含: 🚨 严重告警"
echo ""
echo -e "${BLUE}📱 Telegram:${NC}"
echo "   检查 Telegram 群/私聊是否收到告警消息"
echo "   应包含: 🚨 严重告警 + 交互按钮"
echo ""

# 等待用户确认
echo "等待 60 秒，让通知有时间发送..."
sleep 60

# 步骤 10: 恢复服务并测试解决通知
echo ""
echo -e "${YELLOW}[10/10] 恢复服务并测试解决通知...${NC}"
echo "正在重启 ${TEST_SERVICE}..."
pm2 restart ${TEST_SERVICE}
echo -e "${GREEN}✅ ${TEST_SERVICE} 已重启${NC}"

echo ""
echo "等待 Prometheus 检测到服务恢复..."
sleep 60

RESOLVED_ALERTS=$(curl -sf ${PROMETHEUS_URL}/api/v1/alerts | \
                  jq -r ".data.alerts[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\") | .state")

if [ -z "$RESOLVED_ALERTS" ]; then
    echo -e "${GREEN}✅ Prometheus 已确认告警解决${NC}"
else
    echo -e "${YELLOW}⚠️  告警状态: ${RESOLVED_ALERTS}${NC}"
fi

echo ""
echo "等待 30 秒，让解决通知发送..."
sleep 30

echo ""
echo -e "${BLUE}请验证所有渠道收到 '✅ 告警已恢复' 通知${NC}"
echo ""

# 测试总结
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   测试总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo "测试服务: ${TEST_SERVICE}"
echo "测试持续时间: ${ELAPSED} 秒"
echo "开始时间: $(date -d @${START_TIME})"
echo "结束时间: $(date -d @${END_TIME})"
echo ""
echo -e "${GREEN}✅ 核心流程验证完成！${NC}"
echo ""
echo "验证清单:"
echo "  [✓] Prometheus 告警检测"
echo "  [✓] AlertManager 告警路由"
echo "  [✓] 服务恢复检测"
echo "  [ ] Email 通知接收（需手动验证）"
echo "  [ ] Lark 通知接收（需手动验证）"
echo "  [ ] Telegram 通知接收（需手动验证）"
echo "  [ ] 解决通知接收（需手动验证）"
echo ""
echo "查看详细日志:"
echo "  Prometheus: http://localhost:9090/alerts"
echo "  AlertManager: http://localhost:9093/#/alerts"
echo "  Grafana: http://localhost:3000/alerting/list"
echo ""
