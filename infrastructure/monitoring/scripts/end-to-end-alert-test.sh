#!/bin/bash

# =============================================================================
# 端到端告警流程测试
# 功能：完整测试从 Prometheus 到通知渠道的整个告警链路
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
PROMETHEUS_URL="http://localhost:9090"
ALERTMANAGER_URL="http://localhost:9093"
TEST_SERVICE="user-service"
WAIT_TIME=120  # 等待告警触发的时间（秒）

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}端到端告警流程测试${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# 函数：打印步骤
print_step() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}步骤 $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 函数：打印成功
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印警告
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 函数：打印信息
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 函数：等待提示
wait_with_countdown() {
    local seconds=$1
    local message=$2

    echo -e "${YELLOW}⏳ ${message}${NC}"
    for ((i=seconds; i>0; i--)); do
        printf "${YELLOW}   剩余时间: %d 秒\r${NC}" $i
        sleep 1
    done
    echo ""
}

# =============================================================================
# 步骤 1: 检查基础服务状态
# =============================================================================
print_step "1: 检查基础服务状态"

# 检查 Prometheus
print_info "检查 Prometheus (${PROMETHEUS_URL})..."
if curl -s "${PROMETHEUS_URL}/-/healthy" | grep -q "Prometheus Server is Healthy"; then
    print_success "Prometheus 运行正常"
else
    print_error "Prometheus 未运行或无法访问"
    print_info "请启动 Prometheus: cd ../prometheus && docker compose up -d prometheus"
    exit 1
fi

# 检查 AlertManager
print_info "检查 AlertManager (${ALERTMANAGER_URL})..."
if curl -s "${ALERTMANAGER_URL}/-/healthy" | grep -q "OK"; then
    print_success "AlertManager 运行正常"
else
    print_error "AlertManager 未运行或无法访问"
    print_info "请启动 AlertManager: cd ../prometheus && docker compose up -d alertmanager"
    exit 1
fi

# 检查通知适配器
print_info "检查 Lark Webhook Adapter..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5001/health" | grep -q "200"; then
    print_success "Lark Webhook Adapter 运行正常"
    LARK_RUNNING=true
else
    print_warning "Lark Webhook Adapter 未运行（可选）"
    LARK_RUNNING=false
fi

print_info "检查 Telegram Bot Adapter..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5002/health" | grep -q "200"; then
    print_success "Telegram Bot Adapter 运行正常"
    TELEGRAM_RUNNING=true
else
    print_warning "Telegram Bot Adapter 未运行（可选）"
    TELEGRAM_RUNNING=false
fi

echo ""

# =============================================================================
# 步骤 2: 检查当前告警状态
# =============================================================================
print_step "2: 检查当前告警状态（测试前基线）"

print_info "查询 Prometheus 告警..."
ALERTS_BEFORE=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" | jq -r '.data.alerts | length')
print_info "当前活跃告警数量: ${ALERTS_BEFORE}"

print_info "查询 AlertManager 告警..."
AM_ALERTS_BEFORE=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | jq -r 'length')
print_info "AlertManager 当前告警数量: ${AM_ALERTS_BEFORE}"

echo ""

# =============================================================================
# 步骤 3: 检查测试服务状态
# =============================================================================
print_step "3: 检查测试服务 (${TEST_SERVICE})"

print_info "查询 ${TEST_SERVICE} 在 PM2 中的状态..."
if pm2 describe "${TEST_SERVICE}" > /dev/null 2>&1; then
    SERVICE_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"${TEST_SERVICE}\") | .pm2_env.status")
    print_info "服务当前状态: ${SERVICE_STATUS}"

    if [ "$SERVICE_STATUS" = "stopped" ]; then
        print_warning "服务已经是停止状态，将先启动它"
        pm2 start "${TEST_SERVICE}"
        sleep 5
    fi
else
    print_error "服务 ${TEST_SERVICE} 不存在于 PM2 中"
    print_info "可用的服务列表:"
    pm2 list
    exit 1
fi

echo ""

# =============================================================================
# 步骤 4: 触发告警（停止服务）
# =============================================================================
print_step "4: 触发告警 - 停止服务"

print_warning "即将停止 ${TEST_SERVICE} 以触发告警..."
print_info "执行命令: pm2 stop ${TEST_SERVICE}"
pm2 stop "${TEST_SERVICE}"

print_success "服务已停止"
print_info "告警规则配置: 服务下线超过 1 分钟将触发 Critical 告警"

echo ""

# =============================================================================
# 步骤 5: 等待告警触发
# =============================================================================
print_step "5: 等待告警触发"

wait_with_countdown $WAIT_TIME "等待 Prometheus 检测服务下线并触发告警..."

echo ""

# =============================================================================
# 步骤 6: 验证告警生成
# =============================================================================
print_step "6: 验证告警生成"

# 查询 Prometheus 告警
print_info "查询 Prometheus 新增告警..."
ALERTS_AFTER=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" | jq -r '.data.alerts | length')
print_info "当前活跃告警数量: ${ALERTS_AFTER} (之前: ${ALERTS_BEFORE})"

# 查询特定的 ServiceDown 告警
SERVICE_DOWN_ALERT=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" | \
    jq -r ".data.alerts[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\")")

if [ -n "$SERVICE_DOWN_ALERT" ]; then
    print_success "✓ Prometheus 已检测到 ServiceDown 告警"
    echo ""
    echo "$SERVICE_DOWN_ALERT" | jq '.'
else
    print_error "Prometheus 未检测到 ServiceDown 告警"
    print_warning "可能需要更多时间，告警规则配置为 1 分钟"
fi

echo ""

# 查询 AlertManager 告警
print_info "查询 AlertManager 接收的告警..."
AM_ALERTS_AFTER=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | jq -r 'length')
print_info "AlertManager 当前告警数量: ${AM_ALERTS_AFTER} (之前: ${AM_ALERTS_BEFORE})"

# 查询 AlertManager 中的 ServiceDown 告警
AM_SERVICE_DOWN=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | \
    jq -r ".[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\")")

if [ -n "$AM_SERVICE_DOWN" ]; then
    print_success "✓ AlertManager 已接收到 ServiceDown 告警"
    echo ""
    echo "$AM_SERVICE_DOWN" | jq '.'

    # 检查告警状态
    ALERT_STATE=$(echo "$AM_SERVICE_DOWN" | jq -r '.status.state')
    print_info "告警状态: ${ALERT_STATE}"
else
    print_error "AlertManager 未接收到 ServiceDown 告警"
fi

echo ""

# =============================================================================
# 步骤 7: 检查通知发送
# =============================================================================
print_step "7: 检查通知发送状态"

if [ "$LARK_RUNNING" = true ]; then
    print_info "Lark Webhook Adapter 日志（最近 20 行）:"
    docker logs alertmanager-lark-webhook --tail 20 2>&1 | grep -E "(POST|lark-webhook|发送|成功|失败)" || echo "  无相关日志"
    echo ""
fi

if [ "$TELEGRAM_RUNNING" = true ]; then
    print_info "Telegram Bot Adapter 日志（最近 20 行）:"
    docker logs alertmanager-telegram-bot --tail 20 2>&1 | grep -E "(POST|telegram-webhook|发送|成功|失败)" || echo "  无相关日志"
    echo ""
fi

print_info "AlertManager 日志（最近 20 行）:"
docker logs alertmanager --tail 20 2>&1 | grep -E "(Notify|webhook|firing|resolved)" || echo "  无相关日志"

echo ""

# =============================================================================
# 步骤 8: 恢复服务（触发 Resolved 通知）
# =============================================================================
print_step "8: 恢复服务 - 触发 Resolved 通知"

print_info "询问用户是否恢复服务..."
echo ""
echo -e "${YELLOW}是否立即恢复 ${TEST_SERVICE} 服务？${NC}"
echo "  • 恢复后将触发 'resolved' 告警通知"
echo "  • 如果想保持告警状态以便查看通知，可以稍后手动恢复"
echo ""
read -p "是否恢复服务？(y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "恢复服务: pm2 start ${TEST_SERVICE}"
    pm2 start "${TEST_SERVICE}"
    print_success "服务已恢复"

    print_info "等待 Prometheus 检测服务恢复..."
    wait_with_countdown 90 "等待 resolved 通知..."

    # 再次检查告警状态
    print_info "检查告警是否已解决..."
    SERVICE_DOWN_RESOLVED=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" | \
        jq -r ".data.alerts[] | select(.labels.alertname==\"ServiceDown\" and .labels.service==\"${TEST_SERVICE}\" and .state==\"firing\")")

    if [ -z "$SERVICE_DOWN_RESOLVED" ]; then
        print_success "✓ 告警已解决"
    else
        print_warning "告警仍在触发状态，可能需要更多时间"
    fi
else
    print_info "跳过服务恢复"
    print_warning "请记得稍后手动恢复服务: pm2 start ${TEST_SERVICE}"
fi

echo ""

# =============================================================================
# 步骤 9: 测试总结
# =============================================================================
print_step "9: 测试总结"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}测试结果总结${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_info "服务状态:"
echo "  ✓ Prometheus:              运行正常"
echo "  ✓ AlertManager:            运行正常"
echo "  • Lark Adapter:            $([ "$LARK_RUNNING" = true ] && echo -e "${GREEN}运行中${NC}" || echo -e "${YELLOW}未运行${NC}")"
echo "  • Telegram Adapter:        $([ "$TELEGRAM_RUNNING" = true ] && echo -e "${GREEN}运行中${NC}" || echo -e "${YELLOW}未运行${NC}")"
echo ""

print_info "告警生成:"
if [ -n "$SERVICE_DOWN_ALERT" ]; then
    echo -e "  ${GREEN}✓ Prometheus 成功生成告警${NC}"
else
    echo -e "  ${RED}✗ Prometheus 未生成告警${NC}"
fi

if [ -n "$AM_SERVICE_DOWN" ]; then
    echo -e "  ${GREEN}✓ AlertManager 成功接收告警${NC}"
else
    echo -e "  ${RED}✗ AlertManager 未接收告警${NC}"
fi
echo ""

print_info "通知渠道测试:"
echo "  • 请检查以下渠道是否收到告警通知:"
echo "    - 📧 Email (配置的邮箱地址)"
if [ "$LARK_RUNNING" = true ]; then
    echo "    - 📱 Lark/飞书 (配置的群组)"
fi
if [ "$TELEGRAM_RUNNING" = true ]; then
    echo "    - 📲 Telegram (配置的群组/频道)"
fi
echo ""

print_info "手动验证步骤:"
echo "  1. 访问 Prometheus 告警页面:"
echo "     ${PROMETHEUS_URL}/alerts"
echo ""
echo "  2. 访问 AlertManager 页面:"
echo "     ${ALERTMANAGER_URL}"
echo ""
echo "  3. 检查各通知渠道是否收到消息"
echo ""
echo "  4. 验证告警消息格式是否正确"
echo ""
echo "  5. 如果服务仍停止，请恢复:"
echo "     pm2 start ${TEST_SERVICE}"
echo ""

print_success "端到端测试完成！"
echo ""
