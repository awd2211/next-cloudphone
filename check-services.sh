#!/bin/bash
echo "=== 微服务健康检查 ==="
echo ""

services=(
  "API Gateway|30000|/api/health"
  "User Service|30001|/health"
  "Device Service|30002|/health"
  "App Service|30003|/health"
  "Billing Service|30005|/health"
)

for service in "${services[@]}"; do
  IFS='|' read -r name port path <<< "$service"
  echo -n "$name (Port $port): "
  response=$(curl -s http://localhost:$port$path 2>&1)
  if echo "$response" | grep -q '"status":"ok"\|"status": "ok"'; then
    echo "✅ Running"
  else
    echo "❌ Not Ready"
  fi
done

echo ""
echo "进程统计:"
echo "运行中的服务: $(ps aux | grep 'pnpm run dev' | grep -v grep | wc -l)"
