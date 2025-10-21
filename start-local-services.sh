#!/bin/bash
# 本地开发模式 - 启动所有微服务

set -e

echo "========================================="
echo "云手机平台 - 本地开发模式"
echo "========================================="

cd /home/eric/next-cloudphone

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查基础设施
echo ""
echo "1. 检查基础设施（Docker）..."
INFRA_RUNNING=$(docker ps | grep -E "postgres|redis|rabbitmq|consul|minio" | wc -l)

if [ $INFRA_RUNNING -lt 5 ]; then
  echo -e "${YELLOW}⚠️  基础设施未完全运行，正在启动...${NC}"
  docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio
  echo "等待基础设施就绪（15秒）..."
  sleep 15
fi

echo -e "${GREEN}✅ 基础设施运行中${NC}"

# 创建日志目录
mkdir -p logs

echo ""
echo "2. 启动微服务..."
echo -e "${YELLOW}注意: 请在多个 Terminal 中查看日志${NC}"
echo ""

# Device Service
echo -e "${GREEN}启动 Device Service (端口 30002)...${NC}"
cd /home/eric/next-cloudphone/backend/device-service
nohup pnpm run dev > ../../logs/device-service-local.log 2>&1 &
DEVICE_PID=$!
echo "  PID: $DEVICE_PID"
echo "  日志: tail -f logs/device-service-local.log"

sleep 2

# App Service
echo -e "${GREEN}启动 App Service (端口 30003)...${NC}"
cd /home/eric/next-cloudphone/backend/app-service
nohup pnpm run dev > ../../logs/app-service-local.log 2>&1 &
APP_PID=$!
echo "  PID: $APP_PID"
echo "  日志: tail -f logs/app-service-local.log"

sleep 2

# Billing Service
echo -e "${GREEN}启动 Billing Service (端口 30005)...${NC}"
cd /home/eric/next-cloudphone/backend/billing-service
nohup pnpm run dev > ../../logs/billing-service-local.log 2>&1 &
BILLING_PID=$!
echo "  PID: $BILLING_PID"
echo "  日志: tail -f logs/billing-service-local.log"

sleep 2

# API Gateway
echo -e "${GREEN}启动 API Gateway (端口 30000)...${NC}"
cd /home/eric/next-cloudphone/backend/api-gateway
nohup pnpm run dev > ../../logs/api-gateway-local.log 2>&1 &
GATEWAY_PID=$!
echo "  PID: $GATEWAY_PID"
echo "  日志: tail -f logs/api-gateway-local.log"

echo ""
echo "========================================="
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo "========================================="
echo ""
echo "服务 PID:"
echo "  Device Service: $DEVICE_PID"
echo "  App Service: $APP_PID"
echo "  Billing Service: $BILLING_PID"
echo "  API Gateway: $GATEWAY_PID"
echo ""
echo "查看日志:"
echo "  tail -f logs/device-service-local.log"
echo "  tail -f logs/app-service-local.log"
echo "  tail -f logs/billing-service-local.log"
echo "  tail -f logs/api-gateway-local.log"
echo ""
echo "访问地址:"
echo "  • API Gateway: http://localhost:30000/api/docs"
echo "  • Device Service: http://localhost:30002/api/docs"
echo "  • App Service: http://localhost:30003/api/docs"
echo "  • Billing Service: http://localhost:30005/docs"
echo "  • Consul UI: http://localhost:8500"
echo "  • RabbitMQ UI: http://localhost:15672 (admin/admin123)"
echo ""
echo "停止服务:"
echo "  ./stop-local-services.sh"
echo "  或 kill $DEVICE_PID $APP_PID $BILLING_PID $GATEWAY_PID"
echo ""





