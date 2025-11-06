#!/bin/bash

##############################################################################
# Prometheus 告警规则测试脚本
# 用途: 验证 Prometheus 告警规则是否正常加载和工作
##############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prometheus 配置
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

# 检查 Prometheus 是否运行
check_prometheus() {
    print_header "1. 检查 Prometheus 服务状态"

    if curl -s "${PROMETHEUS_URL}/-/healthy" > /dev/null 2>&1; then
        print_success "Prometheus 服务运行正常: ${PROMETHEUS_URL}"
    else
        print_error "Prometheus 服务无法访问: ${PROMETHEUS_URL}"
        echo "请确保 Prometheus 正在运行："
        echo "  cd infrastructure/monitoring && docker-compose up -d prometheus"
        exit 1
    fi
}

# 检查告警规则是否加载
check_alert_rules() {
    print_header "2. 检查告警规则加载状态"

    response=$(curl -s "${PROMETHEUS_URL}/api/v1/rules")

    # 检查响应是否成功
    status=$(echo "$response" | jq -r '.status')
    if [ "$status" != "success" ]; then
        print_error "无法获取告警规则"
        echo "$response" | jq '.'
        exit 1
    fi

    # 统计告警规则组和规则数量
    groups=$(echo "$response" | jq '.data.groups | length')
    total_rules=$(echo "$response" | jq '[.data.groups[].rules | length] | add')

    print_success "告警规则组数量: ${groups}"
    print_success "告警规则总数: ${total_rules}"

    # 列出所有告警规则组
    echo ""
    print_info "告警规则组列表:"
    echo "$response" | jq -r '.data.groups[] | "  - \(.name) (\(.rules | length) 条规则)"'
}

# 查看当前活跃的告警
check_active_alerts() {
    print_header "3. 查看当前活跃的告警"

    response=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts")

    status=$(echo "$response" | jq -r '.status')
    if [ "$status" != "success" ]; then
        print_error "无法获取告警状态"
        exit 1
    fi

    # 统计各状态的告警数量
    firing=$(echo "$response" | jq '[.data.alerts[] | select(.state == "firing")] | length')
    pending=$(echo "$response" | jq '[.data.alerts[] | select(.state == "pending")] | length')
    inactive=$(echo "$response" | jq '[.data.alerts[] | select(.state == "inactive")] | length')

    echo ""
    print_info "告警状态统计:"
    echo "  🔥 Firing (触发中): ${firing}"
    echo "  ⏳ Pending (待触发): ${pending}"
    echo "  ✓ Inactive (未触发): ${inactive}"

    # 如果有触发中的告警，显示详情
    if [ "$firing" -gt 0 ]; then
        echo ""
        print_warning "当前触发的告警:"
        echo "$response" | jq -r '.data.alerts[] | select(.state == "firing") |
            "  - \(.labels.alertname) [\(.labels.severity)]"'

        echo ""
        print_info "告警详细信息:"
        echo "$response" | jq -c '.data.alerts[] | select(.state == "firing") |
            {
                alert: .labels.alertname,
                severity: .labels.severity,
                service: .labels.service,
                summary: .annotations.summary,
                value: .value
            }' | while read -r alert; do
            echo "  ---"
            echo "$alert" | jq '.'
        done
    else
        print_success "当前没有触发的告警"
    fi

    # 如果有 pending 状态的告警
    if [ "$pending" -gt 0 ]; then
        echo ""
        print_info "即将触发的告警 (Pending):"
        echo "$response" | jq -r '.data.alerts[] | select(.state == "pending") |
            "  - \(.labels.alertname) [\(.labels.severity)]"'
    fi
}

# 检查特定告警规则的状态
check_specific_rule() {
    local rule_name=$1
    print_header "4. 检查特定告警规则: ${rule_name}"

    response=$(curl -s "${PROMETHEUS_URL}/api/v1/rules")

    # 查找指定的告警规则
    rule=$(echo "$response" | jq -r --arg name "$rule_name" '
        .data.groups[].rules[] |
        select(.name == $name and .type == "alerting")
    ')

    if [ -z "$rule" ] || [ "$rule" == "null" ]; then
        print_error "未找到告警规则: ${rule_name}"
        return 1
    fi

    print_success "找到告警规则: ${rule_name}"
    echo ""

    # 显示规则详情
    echo "$rule" | jq '{
        name: .name,
        state: .state,
        health: .health,
        duration: .duration,
        query: .query
    }'

    # 显示规则的评估结果
    alerts=$(echo "$rule" | jq '.alerts')
    if [ "$alerts" != "null" ] && [ "$alerts" != "[]" ]; then
        echo ""
        print_info "该规则的告警实例:"
        echo "$alerts" | jq '.[] | {
            state: .state,
            labels: .labels,
            value: .value
        }'
    else
        print_info "该规则当前没有触发的告警实例"
    fi
}

# 测试业务告警规则的 PromQL 查询
test_business_alert_queries() {
    print_header "5. 测试关键业务告警规则的查询"

    local queries=(
        "支付失败率:sum(rate(cloudphone_payment_failures_total[5m]))/sum(rate(cloudphone_payment_attempts_total[5m]))"
        "登录失败率:sum(rate(cloudphone_user_login_failures_total[5m]))/sum(rate(cloudphone_user_login_attempts_total[5m]))"
        "设备创建失败率:sum(rate(cloudphone_device_creation_failures_total[5m]))/sum(rate(cloudphone_device_creation_attempts_total[5m]))"
        "活跃设备数:cloudphone_devices_active"
        "在线用户数:cloudphone_users_online"
        "总营收:cloudphone_total_revenue"
    )

    for item in "${queries[@]}"; do
        IFS=':' read -r name query <<< "$item"
        echo ""
        print_info "查询: ${name}"
        echo "  PromQL: ${query}"

        # URL 编码查询
        encoded_query=$(echo -n "$query" | jq -sRr @uri)
        response=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${encoded_query}")

        status=$(echo "$response" | jq -r '.status')
        if [ "$status" == "success" ]; then
            result=$(echo "$response" | jq -r '.data.result')
            if [ "$result" != "[]" ] && [ "$result" != "null" ]; then
                value=$(echo "$result" | jq -r '.[0].value[1]')
                print_success "  当前值: ${value}"
            else
                print_warning "  没有数据 (指标可能尚未产生)"
            fi
        else
            print_error "  查询失败"
        fi
    done
}

# 显示告警规则配置文件状态
check_alert_config() {
    print_header "6. 检查告警规则配置文件"

    local rules_file="infrastructure/monitoring/prometheus/alert.rules.yml"

    if [ -f "$rules_file" ]; then
        print_success "告警规则文件存在: ${rules_file}"

        # 统计规则数量
        rule_count=$(grep -c "^  - alert:" "$rules_file" || true)
        print_info "配置文件中的告警规则数: ${rule_count}"

        # 列出所有告警名称
        echo ""
        print_info "配置的告警列表:"
        grep "^  - alert:" "$rules_file" | sed 's/  - alert: /  - /' | sort
    else
        print_error "告警规则文件不存在: ${rules_file}"
    fi
}

# 模拟测试建议
show_test_suggestions() {
    print_header "7. 告警测试建议"

    echo ""
    print_info "要测试告警是否能正常触发，可以尝试以下操作："
    echo ""

    echo "【测试 ServiceDown 告警】"
    echo "  1. 停止一个服务:"
    echo "     pm2 stop user-service"
    echo "  2. 等待 1-2 分钟，告警应该触发"
    echo "  3. 查看告警状态:"
    echo "     ./scripts/test-prometheus-alerts.sh"
    echo "  4. 恢复服务:"
    echo "     pm2 start user-service"
    echo ""

    echo "【测试 HighHTTPErrorRate 告警】"
    echo "  1. 模拟大量 500 错误（需要专门的测试脚本）"
    echo "  2. 或者查看自然产生的错误是否触发告警"
    echo ""

    echo "【测试业务告警】"
    echo "  1. 查看 Grafana 业务指标面板观察当前指标值"
    echo "  2. 如果某些指标接近阈值，可以观察告警是否触发"
    echo "  3. 访问 Prometheus UI 查看告警详情:"
    echo "     http://localhost:9090/alerts"
    echo ""

    echo "【查看 Prometheus UI】"
    echo "  浏览器访问: ${PROMETHEUS_URL}"
    echo "  - Alerts 页面: ${PROMETHEUS_URL}/alerts"
    echo "  - Rules 页面: ${PROMETHEUS_URL}/rules"
    echo "  - Graph 页面: ${PROMETHEUS_URL}/graph"
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  Prometheus 告警规则测试工具"
    echo "======================================"
    echo ""

    # 检查依赖
    if ! command -v jq &> /dev/null; then
        print_error "需要安装 jq 工具"
        echo "安装命令: sudo apt-get install jq  或  sudo yum install jq"
        exit 1
    fi

    # 执行所有检查
    check_prometheus
    check_alert_rules
    check_active_alerts

    # 检查几个关键告警规则
    echo ""
    check_specific_rule "ServiceDown"
    check_specific_rule "HighPaymentFailureRate"
    check_specific_rule "HighLoginFailureRate"

    # 测试业务查询
    test_business_alert_queries

    # 检查配置文件
    check_alert_config

    # 显示测试建议
    show_test_suggestions

    echo ""
    print_success "告警规则检查完成！"
    echo ""
}

# 运行主函数
main "$@"
