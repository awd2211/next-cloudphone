#!/bin/bash

##############################################################################
# AlertManager 测试脚本
# 用途: 验证 AlertManager 配置和告警通知是否正常工作
##############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AlertManager 配置
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# 检查 AlertManager 是否运行
check_alertmanager() {
    print_header "1. 检查 AlertManager 服务状态"

    if curl -s "${ALERTMANAGER_URL}/-/healthy" > /dev/null 2>&1; then
        print_success "AlertManager 服务运行正常: ${ALERTMANAGER_URL}"
    else
        print_error "AlertManager 服务无法访问: ${ALERTMANAGER_URL}"
        echo "请确保 AlertManager 正在运行："
        echo "  cd infrastructure/monitoring && docker-compose -f docker-compose.monitoring.yml up -d alertmanager"
        exit 1
    fi
}

# 获取 AlertManager 版本和配置信息
check_version_and_config() {
    print_header "2. 获取 AlertManager 版本和配置信息"

    response=$(curl -s "${ALERTMANAGER_URL}/api/v1/status")

    version=$(echo "$response" | jq -r '.data.versionInfo.version')
    uptime=$(echo "$response" | jq -r '.data.uptime')
    cluster_status=$(echo "$response" | jq -r '.data.clusterStatus.status')

    print_success "版本: ${version}"
    print_info "运行时间: ${uptime}"
    print_info "集群状态: ${cluster_status}"

    echo ""
    print_info "配置的接收器 (Receivers):"
    echo "$response" | jq -r '.data.configJSON.receivers[] | "  - \(.name)"'

    echo ""
    print_info "路由规则数量:"
    routes_count=$(echo "$response" | jq '.data.configJSON.route.routes | length')
    echo "  - 子路由: ${routes_count}"

    echo ""
    print_info "抑制规则数量:"
    inhibit_count=$(echo "$response" | jq '.data.configJSON.inhibit_rules | length')
    echo "  - 抑制规则: ${inhibit_count}"
}

# 查看当前告警状态
check_active_alerts() {
    print_header "3. 查看当前 AlertManager 中的告警"

    response=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts")

    total_alerts=$(echo "$response" | jq '. | length')

    if [ "$total_alerts" -eq 0 ]; then
        print_success "当前没有活跃告警"
        return
    fi

    print_warning "当前有 ${total_alerts} 个活跃告警"

    echo ""
    print_info "告警列表:"
    echo "$response" | jq -r '.[] |
        "  🔔 \(.labels.alertname) [\(.labels.severity // "none")]" +
        "\n     服务: \(.labels.service // "N/A")" +
        "\n     状态: \(.status.state)" +
        "\n     开始时间: \(.startsAt)" +
        "\n"'

    # 按严重程度统计
    echo ""
    print_info "按严重程度统计:"
    critical_count=$(echo "$response" | jq '[.[] | select(.labels.severity == "critical")] | length')
    warning_count=$(echo "$response" | jq '[.[] | select(.labels.severity == "warning")] | length')
    echo "  🔴 Critical: ${critical_count}"
    echo "  🟡 Warning: ${warning_count}"

    # 按服务统计
    echo ""
    print_info "按服务统计:"
    echo "$response" | jq -r '[.[] | .labels.service // "unknown"] | group_by(.) | .[] | "  - \(.[0]): \(length) 个告警"'
}

# 检查告警分组
check_alert_groups() {
    print_header "4. 查看告警分组"

    response=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts/groups")

    groups_count=$(echo "$response" | jq '. | length')
    print_info "告警分组数量: ${groups_count}"

    if [ "$groups_count" -eq 0 ]; then
        print_success "没有分组的告警"
        return
    fi

    echo ""
    echo "$response" | jq -r '.[] |
        "分组: \(.labels | to_entries | map("\(.key)=\(.value)") | join(", "))" +
        "\n  告警数量: \(.alerts | length)" +
        "\n  接收器: \(.receiver.name)" +
        "\n"'
}

# 检查 Prometheus 与 AlertManager 的连接
check_prometheus_connection() {
    print_header "5. 检查 Prometheus 与 AlertManager 的连接"

    if ! curl -s "${PROMETHEUS_URL}/-/healthy" > /dev/null 2>&1; then
        print_warning "Prometheus 服务无法访问: ${PROMETHEUS_URL}"
        return
    fi

    response=$(curl -s "${PROMETHEUS_URL}/api/v1/alertmanagers")

    status=$(echo "$response" | jq -r '.status')
    if [ "$status" != "success" ]; then
        print_error "无法获取 Prometheus AlertManager 配置"
        return
    fi

    active_count=$(echo "$response" | jq '.data.activeAlertmanagers | length')
    dropped_count=$(echo "$response" | jq '.data.droppedAlertmanagers | length')

    if [ "$active_count" -gt 0 ]; then
        print_success "Prometheus 成功连接到 ${active_count} 个 AlertManager"
        echo ""
        print_info "活跃的 AlertManager:"
        echo "$response" | jq -r '.data.activeAlertmanagers[] | "  - \(.url)"'
    else
        print_error "Prometheus 没有连接到任何 AlertManager"
    fi

    if [ "$dropped_count" -gt 0 ]; then
        print_warning "有 ${dropped_count} 个 AlertManager 被丢弃（无法连接）"
    fi
}

# 测试告警静默功能
test_silence() {
    print_header "6. 测试告警静默 (Silence) 功能"

    print_info "查询现有的静默规则..."
    silences=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences")
    silence_count=$(echo "$silences" | jq '. | length')

    print_info "当前静默规则数量: ${silence_count}"

    if [ "$silence_count" -gt 0 ]; then
        echo ""
        print_info "现有静默规则:"
        echo "$silences" | jq -r '.[] |
            "  ID: \(.id)" +
            "\n  状态: \(.status.state)" +
            "\n  创建者: \(.createdBy)" +
            "\n  注释: \(.comment)" +
            "\n  开始时间: \(.startsAt)" +
            "\n  结束时间: \(.endsAt)" +
            "\n"'
    fi

    echo ""
    print_info "创建测试静默规则的示例命令:"
    cat << 'EOF'

  # 静默特定告警 (5 分钟)
  curl -X POST "${ALERTMANAGER_URL}/api/v2/silences" \
    -H "Content-Type: application/json" \
    -d '{
      "matchers": [
        {
          "name": "alertname",
          "value": "ServiceDown",
          "isRegex": false
        }
      ],
      "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
      "endsAt": "'$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'",
      "createdBy": "admin",
      "comment": "Testing silence feature"
    }'
EOF
}

# 测试发送测试告警
send_test_alert() {
    print_header "7. 发送测试告警到 AlertManager"

    print_info "发送测试告警..."

    response=$(curl -s -X POST "${ALERTMANAGER_URL}/api/v2/alerts" \
        -H "Content-Type: application/json" \
        -d '[
            {
                "labels": {
                    "alertname": "TestAlert",
                    "severity": "warning",
                    "service": "test-service",
                    "environment": "development"
                },
                "annotations": {
                    "summary": "这是一个测试告警",
                    "description": "用于验证 AlertManager 告警接收和路由功能"
                },
                "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
                "endsAt": "'$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'"
            }
        ]')

    if [ $? -eq 0 ]; then
        print_success "测试告警发送成功"
        echo ""
        print_info "等待 5 秒后查询..."
        sleep 5

        # 查询刚才发送的告警
        alerts=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts?filter=alertname=TestAlert")
        if echo "$alerts" | jq -e '. | length > 0' > /dev/null 2>&1; then
            print_success "测试告警已被 AlertManager 接收"
            echo "$alerts" | jq '.[] | {alertname: .labels.alertname, state: .status.state, receiver: .receivers[0]}'
        else
            print_warning "未在 AlertManager 中找到测试告警"
        fi
    else
        print_error "测试告警发送失败"
    fi
}

# 检查告警路由逻辑
check_routing() {
    print_header "8. 验证告警路由逻辑"

    print_info "当前路由配置:"
    config=$(curl -s "${ALERTMANAGER_URL}/api/v1/status")

    echo "$config" | jq -r '.data.configYAML' | grep -A 50 "route:" | head -30

    echo ""
    print_info "路由逻辑说明:"
    echo "  1. 所有告警首先发送到 'default' 接收器"
    echo "  2. severity=critical 的告警路由到 'critical' 接收器（continue: true，继续匹配）"
    echo "  3. severity=warning 的告警路由到 'warning' 接收器"
    echo "  4. 分组维度: alertname, cluster, service"
    echo "  5. 重复通知间隔: 12小时"
}

# 显示使用建议
show_usage_tips() {
    print_header "9. AlertManager 使用建议"

    echo ""
    print_info "访问 AlertManager UI:"
    echo "  浏览器打开: ${ALERTMANAGER_URL}"
    echo ""

    print_info "常用操作:"
    echo "  1. 查看所有告警: ${ALERTMANAGER_URL}/#/alerts"
    echo "  2. 创建静默规则: ${ALERTMANAGER_URL}/#/silences"
    echo "  3. 查看告警状态: ${ALERTMANAGER_URL}/#/status"
    echo ""

    print_info "API 端点:"
    echo "  - 健康检查: GET ${ALERTMANAGER_URL}/-/healthy"
    echo "  - 所有告警: GET ${ALERTMANAGER_URL}/api/v2/alerts"
    echo "  - 告警分组: GET ${ALERTMANAGER_URL}/api/v2/alerts/groups"
    echo "  - 静默列表: GET ${ALERTMANAGER_URL}/api/v2/silences"
    echo "  - 发送告警: POST ${ALERTMANAGER_URL}/api/v2/alerts"
    echo ""

    print_info "重新加载配置:"
    echo "  curl -X POST ${ALERTMANAGER_URL}/-/reload"
    echo "  或重启容器: docker restart cloudphone-alertmanager"
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  AlertManager 配置测试工具"
    echo "======================================"
    echo ""

    # 检查依赖
    if ! command -v jq &> /dev/null; then
        print_error "需要安装 jq 工具"
        echo "安装命令: sudo apt-get install jq  或  sudo yum install jq"
        exit 1
    fi

    # 执行所有检查
    check_alertmanager
    check_version_and_config
    check_active_alerts
    check_alert_groups
    check_prometheus_connection
    test_silence
    send_test_alert
    check_routing
    show_usage_tips

    echo ""
    print_success "AlertManager 检查完成！"
    echo ""
}

# 运行主函数
main "$@"
