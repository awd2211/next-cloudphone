#!/bin/bash

# =============================================================================
# 监控系统部署状态检查
# 功能：快速检查监控系统各组件的部署和运行状态
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 统计
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}           监控系统部署状态检查          ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 函数
check_passed() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_failed() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((CHECKS_WARNING++))
}

section_header() {
    echo ""
    echo -e "${CYAN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
    echo -e "${CYAN}┃  $1${NC}"
    echo -e "${CYAN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
    echo ""
}

# =============================================================================
# 1. 基础服务检查
# =============================================================================
section_header "1. 基础监控服务"

# Prometheus
if curl -s http://localhost:9090/-/healthy | grep -q "Healthy"; then
    check_passed "Prometheus 运行正常 (http://localhost:9090)"
else
    check_failed "Prometheus 未运行或无法访问"
fi

# AlertManager
if curl -s http://localhost:9093/-/healthy | grep -q "OK"; then
    check_passed "AlertManager 运行正常 (http://localhost:9093)"
else
    check_failed "AlertManager 未运行或无法访问"
fi

# Grafana
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    check_passed "Grafana 运行正常 (http://localhost:3000)"
else
    check_failed "Grafana 未运行或无法访问"
fi

# =============================================================================
# 2. 通知适配器检查
# =============================================================================
section_header "2. 通知适配器服务"

# Lark Adapter
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health | grep -q "200"; then
    check_passed "Lark Webhook Adapter 运行正常 (http://localhost:5001)"
    LARK_RUNNING=true
else
    check_warning "Lark Webhook Adapter 未运行 (可选，需要配置后启动)"
    LARK_RUNNING=false
fi

# Telegram Adapter
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/health | grep -q "200"; then
    check_passed "Telegram Bot Adapter 运行正常 (http://localhost:5002)"
    TELEGRAM_RUNNING=true
else
    check_warning "Telegram Bot Adapter 未运行 (可选，需要配置后启动)"
    TELEGRAM_RUNNING=false
fi

# =============================================================================
# 3. Prometheus 配置检查
# =============================================================================
section_header "3. Prometheus 配置"

# Targets
TARGETS_UP=$(curl -s http://localhost:9090/api/v1/targets 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for t in data['data']['activeTargets'] if t['health']=='up'))" 2>/dev/null || echo "0")
TARGETS_TOTAL=$(curl -s http://localhost:9090/api/v1/targets 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data['data']['activeTargets']))" 2>/dev/null || echo "0")

if [ "$TARGETS_UP" -gt 0 ]; then
    check_passed "抓取目标: ${TARGETS_UP}/${TARGETS_TOTAL} 个目标在线"
else
    check_warning "抓取目标: ${TARGETS_UP}/${TARGETS_TOTAL} 个目标在线"
fi

# Alert Rules
RULES_COUNT=$(curl -s http://localhost:9090/api/v1/rules 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(len(g['rules']) for g in data['data']['groups']))" 2>/dev/null || echo "0")

if [ "$RULES_COUNT" -gt 0 ]; then
    check_passed "告警规则: 已加载 ${RULES_COUNT} 个规则"
else
    check_failed "告警规则: 未加载任何规则"
fi

# =============================================================================
# 4. 当前告警状态
# =============================================================================
section_header "4. 当前告警状态"

ALERTS_FIRING=$(curl -s http://localhost:9090/api/v1/alerts 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for a in data['data']['alerts'] if a['state']=='firing'))" 2>/dev/null || echo "0")
ALERTS_PENDING=$(curl -s http://localhost:9090/api/v1/alerts 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for a in data['data']['alerts'] if a['state']=='pending'))" 2>/dev/null || echo "0")

if [ "$ALERTS_FIRING" -eq 0 ]; then
    check_passed "当前触发告警: ${ALERTS_FIRING} 个 (系统正常)"
else
    check_warning "当前触发告警: ${ALERTS_FIRING} 个 (有告警需要处理)"
fi

if [ "$ALERTS_PENDING" -gt 0 ]; then
    echo -e "   ${YELLOW}→${NC} Pending 告警: ${ALERTS_PENDING} 个"
fi

# 显示前 5 个触发的告警
if [ "$ALERTS_FIRING" -gt 0 ]; then
    echo ""
    echo -e "   ${YELLOW}当前触发的告警（前 5 个）:${NC}"
    curl -s http://localhost:9090/api/v1/alerts 2>/dev/null | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
firing = [a for a in data['data']['alerts'] if a['state']=='firing'][:5]
for i, a in enumerate(firing, 1):
    service = a['labels'].get('service', 'N/A')
    alertname = a['labels']['alertname']
    instance = a['labels'].get('instance', 'N/A')
    print(f'   {i}. {alertname} - {service} ({instance})')
" 2>/dev/null || echo "   无法获取告警详情"
fi

# =============================================================================
# 5. AlertManager 配置检查
# =============================================================================
section_header "5. AlertManager 配置"

# Receivers
RECEIVERS=$(curl -s http://localhost:9093/api/v2/status 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(', '.join([r['name'] for r in data['config']['receivers']]))" 2>/dev/null || echo "")

if [ -n "$RECEIVERS" ]; then
    check_passed "接收器配置: $RECEIVERS"
else
    check_failed "接收器配置: 无法获取接收器列表"
fi

# Routes
ROUTES=$(curl -s http://localhost:9093/api/v2/status 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data['config']['route'].get('routes', [])))" 2>/dev/null || echo "0")

if [ "$ROUTES" -gt 0 ]; then
    check_passed "路由规则: 配置了 ${ROUTES} 个子路由"
else
    check_warning "路由规则: 只有默认路由"
fi

# Inhibit Rules
INHIBIT=$(curl -s http://localhost:9093/api/v2/status 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data['config'].get('inhibit_rules', [])))" 2>/dev/null || echo "0")

if [ "$INHIBIT" -gt 0 ]; then
    check_passed "抑制规则: 配置了 ${INHIBIT} 个抑制规则"
else
    check_warning "抑制规则: 未配置抑制规则"
fi

# =============================================================================
# 6. 业务服务检查
# =============================================================================
section_header "6. 业务服务状态 (PM2)"

if command -v pm2 &> /dev/null; then
    SERVICES_ONLINE=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for s in data if s['pm2_env']['status']=='online'))" 2>/dev/null || echo "0")
    SERVICES_TOTAL=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")

    if [ "$SERVICES_ONLINE" -eq "$SERVICES_TOTAL" ] && [ "$SERVICES_TOTAL" -gt 0 ]; then
        check_passed "业务服务: ${SERVICES_ONLINE}/${SERVICES_TOTAL} 个服务在线"
    elif [ "$SERVICES_ONLINE" -gt 0 ]; then
        check_warning "业务服务: ${SERVICES_ONLINE}/${SERVICES_TOTAL} 个服务在线"
    else
        check_warning "业务服务: ${SERVICES_ONLINE}/${SERVICES_TOTAL} 个服务在线 (所有服务已停止)"
    fi
else
    check_warning "PM2 未安装或无法访问"
fi

# =============================================================================
# 7. Grafana 仪表盘检查
# =============================================================================
section_header "7. Grafana 仪表盘"

# 检查数据源
DATASOURCES=$(curl -s -u admin:admin http://localhost:3000/api/datasources 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")

if [ "$DATASOURCES" -gt 0 ]; then
    check_passed "Grafana 数据源: 配置了 ${DATASOURCES} 个数据源"
else
    check_warning "Grafana 数据源: 未配置数据源"
fi

# =============================================================================
# 总结
# =============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}           检查总结          ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "  ${GREEN}✓${NC} 通过: ${CHECKS_PASSED} 项"
echo -e "  ${YELLOW}⚠${NC} 警告: ${CHECKS_WARNING} 项"
echo -e "  ${RED}✗${NC} 失败: ${CHECKS_FAILED} 项"
echo ""

# 部署建议
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}下一步操作建议${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$LARK_RUNNING" = false ]; then
    echo -e "${YELLOW}1. 配置并启动 Lark Webhook Adapter:${NC}"
    echo "   cd infrastructure/monitoring/alertmanager-lark-webhook"
    echo "   cp .env.example .env"
    echo "   # 编辑 .env 文件，填入 LARK_WEBHOOK_URL"
    echo "   docker compose up -d"
    echo ""
fi

if [ "$TELEGRAM_RUNNING" = false ]; then
    echo -e "${YELLOW}2. 配置并启动 Telegram Bot Adapter:${NC}"
    echo "   cd infrastructure/monitoring/alertmanager-telegram-bot"
    echo "   cp .env.example .env"
    echo "   # 编辑 .env 文件，填入 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID"
    echo "   docker compose up -d"
    echo ""
fi

if [ "$SERVICES_ONLINE" -lt "$SERVICES_TOTAL" ]; then
    echo -e "${YELLOW}3. 启动业务服务以清除告警:${NC}"
    echo "   pm2 start ecosystem.config.js"
    echo "   # 或启动特定服务: pm2 start user-service"
    echo ""
fi

echo -e "${BLUE}4. 运行端到端测试:${NC}"
echo "   cd infrastructure/monitoring/scripts"
echo "   ./end-to-end-alert-test.sh"
echo ""

echo -e "${BLUE}5. 访问 Web UI:${NC}"
echo "   • Prometheus:    http://localhost:9090"
echo "   • AlertManager:  http://localhost:9093"
echo "   • Grafana:       http://localhost:3000 (admin/admin)"
echo ""

echo -e "${BLUE}6. 查看完整部署指南:${NC}"
echo "   cat docs/MONITORING_DEPLOYMENT_VERIFICATION_GUIDE.md"
echo ""

# 返回状态码
if [ "$CHECKS_FAILED" -gt 0 ]; then
    exit 1
else
    exit 0
fi
