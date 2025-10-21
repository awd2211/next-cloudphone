#!/bin/bash
# 异步架构测试脚本

set -e

API_GATEWAY="http://localhost:30000/api"
DEVICE_SERVICE="http://localhost:30002"
APP_SERVICE="http://localhost:30003"
BILLING_SERVICE="http://localhost:30005"

echo "========================================="
echo "云手机平台 - 异步架构测试"
echo "========================================="

echo ""
echo "1. 检查基础设施服务..."

# 检查 RabbitMQ
echo -n "  RabbitMQ Management API: "
if curl -s -u admin:admin123 http://localhost:15672/api/overview >/dev/null; then
  echo "✅ 可访问"
else
  echo "❌ 不可访问"
fi

# 检查 Consul
echo -n "  Consul API: "
if curl -s http://localhost:8500/v1/status/leader >/dev/null; then
  echo "✅ 可访问"
else
  echo "❌ 不可访问"
fi

echo ""
echo "2. 检查服务注册状态..."
SERVICES=$(curl -s http://localhost:8500/v1/agent/services)
echo "  已注册服务:"
echo "$SERVICES" | python3 -m json.tool | grep '"Service":' | sort

echo ""
echo "3. 检查微服务健康状态..."
for service in "Device Service:30002" "App Service:30003" "Billing Service:30005"; do
  name=$(echo $service | cut -d: -f1)
  port=$(echo $service | cut -d: -f2)
  echo -n "  $name: "
  
  if curl -sf http://localhost:$port/health >/dev/null; then
    echo "✅ Healthy"
  else
    echo "❌ Unhealthy"
  fi
done

echo ""
echo "4. 检查 RabbitMQ 队列..."
QUEUES=$(curl -s -u admin:admin123 http://localhost:15672/api/queues/%2Fcloudphone 2>/dev/null | python3 -m json.tool 2>/dev/null)

if [ -z "$QUEUES" ] || [ "$QUEUES" = "[]" ]; then
  echo "  ⚠️  暂无队列（服务可能未启动）"
else
  echo "  已创建的队列:"
  echo "$QUEUES" | grep '"name":' | sed 's/.*"\(.*\)".*/    - \1/'
fi

echo ""
echo "5. 检查 Exchange..."
EXCHANGES=$(curl -s -u admin:admin123 http://localhost:15672/api/exchanges/%2Fcloudphone 2>/dev/null | python3 -m json.tool 2>/dev/null)
echo "  已创建的 Exchange:"
echo "$EXCHANGES" | grep '"name":' | grep -v '""' | sed 's/.*"\(.*\)".*/    - \1/'

echo ""
echo "========================================="
echo "✅ 基础设施检查完成"
echo "========================================="

echo ""
echo "下一步:"
echo "1. 重启微服务让它们注册到 Consul"
echo "2. 观察 RabbitMQ 队列创建"
echo "3. 测试异步应用安装流程"
echo ""
echo "访问地址:"
echo "  - Consul UI: http://localhost:8500"
echo "  - RabbitMQ UI: http://localhost:15672 (admin/admin123)"
echo ""

