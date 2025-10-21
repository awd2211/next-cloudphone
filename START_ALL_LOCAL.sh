#!/bin/bash
# 一键启动所有本地服务（完整本地开发模式）

set -e

cd /home/eric/next-cloudphone

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}云手机平台 - 完整本地开发模式${NC}"
echo -e "${BLUE}=========================================${NC}"

# 1. 检查并启动基础设施
echo ""
echo -e "${YELLOW}1. 检查基础设施（Docker）...${NC}"
INFRA=$(docker ps | grep -E "postgres|redis|rabbitmq|consul|minio" | wc -l)
if [ $INFRA -lt 5 ]; then
  echo "  启动基础设施..."
  docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio
  sleep 15
fi
echo -e "${GREEN}  ✅ 基础设施运行中 (5个容器)${NC}"

# 2. 创建日志目录
mkdir -p logs

# 3. 启动后端服务
echo ""
echo -e "${YELLOW}2. 启动后端微服务...${NC}"

echo -e "${GREEN}  [1/6] Device Service (30002)${NC}"
cd /home/eric/next-cloudphone/backend/device-service
nohup pnpm run dev > ../../logs/device-service.log 2>&1 &
echo "        PID: $! | 日志: logs/device-service.log"
sleep 3

echo -e "${GREEN}  [2/6] App Service (30003)${NC}"
cd /home/eric/next-cloudphone/backend/app-service
nohup pnpm run dev > ../../logs/app-service.log 2>&1 &
echo "        PID: $! | 日志: logs/app-service.log"
sleep 3

echo -e "${GREEN}  [3/6] Billing Service (30005)${NC}"
cd /home/eric/next-cloudphone/backend/billing-service
nohup pnpm run dev > ../../logs/billing-service.log 2>&1 &
echo "        PID: $! | 日志: logs/billing-service.log"
sleep 3

echo -e "${GREEN}  [4/6] User Service (30001)${NC}"
cd /home/eric/next-cloudphone/backend/user-service
nohup pnpm run dev > ../../logs/user-service.log 2>&1 &
echo "        PID: $! | 日志: logs/user-service.log"
sleep 3

echo -e "${GREEN}  [5/6] Notification Service (30006)${NC}"
cd /home/eric/next-cloudphone/backend/notification-service
nohup pnpm run dev > ../../logs/notification-service.log 2>&1 &
echo "        PID: $! | 日志: logs/notification-service.log"
sleep 3

echo -e "${GREEN}  [6/6] API Gateway (30000)${NC}"
cd /home/eric/next-cloudphone/backend/api-gateway
nohup pnpm run dev > ../../logs/api-gateway.log 2>&1 &
echo "        PID: $! | 日志: logs/api-gateway.log"
sleep 2

# 4. 启动 Python 服务
echo ""
echo -e "${YELLOW}3. 启动 Scheduler Service (Python)...${NC}"
cd /home/eric/next-cloudphone/backend/scheduler-service
if [ ! -d "venv" ]; then
  echo "  创建虚拟环境..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi
nohup python main.py > ../../logs/scheduler-service.log 2>&1 &
echo -e "${GREEN}  ✅ Scheduler Service${NC}"
echo "      PID: $! | 日志: logs/scheduler-service.log"
deactivate
sleep 2

# 5. 启动 Go 服务
echo ""
echo -e "${YELLOW}4. 启动 Media Service (Go)...${NC}"
cd /home/eric/next-cloudphone/backend/media-service
nohup go run main.go > ../../logs/media-service.log 2>&1 &
echo -e "${GREEN}  ✅ Media Service${NC}"
echo "      PID: $! | 日志: logs/media-service.log"
sleep 2

# 6. 启动前端
echo ""
echo -e "${YELLOW}5. 启动前端应用...${NC}"

echo -e "${GREEN}  [1/2] Admin Frontend (5173)${NC}"
cd /home/eric/next-cloudphone/frontend/admin
nohup pnpm run dev > ../../logs/admin-frontend.log 2>&1 &
echo "        PID: $! | 日志: logs/admin-frontend.log"
sleep 3

echo -e "${GREEN}  [2/2] User Frontend (5174)${NC}"
cd /home/eric/next-cloudphone/frontend/user
nohup pnpm run dev > ../../logs/user-frontend.log 2>&1 &
echo "        PID: $! | 日志: logs/user-frontend.log"

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ 所有服务启动完成！${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}等待服务完全启动（约30秒）...${NC}"
sleep 30

echo ""
echo "📊 服务状态检查:"
echo "  基础设施 (Docker):"
docker ps | grep cloudphone | awk '{print "    •", $NF}'

echo ""
echo "  本地服务 (检查端口):"
netstat -tuln | grep -E "30000|30001|30002|30003|30004|30005|30006|30007|5173|5174" | awk '{print "    • 端口", $4}' || lsof -i -P | grep LISTEN | grep -E "30000|30001|30002|30003|30004|30005|30006|30007|5173|5174" | awk '{print "    •", $1, $9}'

echo ""
echo "🌐 访问地址:"
echo "  前端:"
echo "    • Admin Dashboard: http://localhost:5173"
echo "    • User Portal: http://localhost:5174"
echo ""
echo "  后端 API:"
echo "    • API Gateway: http://localhost:30000/api/docs"
echo "    • Device Service: http://localhost:30002/api/docs"
echo "    • App Service: http://localhost:30003/api/docs"
echo "    • Billing Service: http://localhost:30005/docs"
echo ""
echo "  基础设施:"
echo "    • Consul UI: http://localhost:8500"
echo "    • RabbitMQ UI: http://localhost:15672 (admin/admin123)"
echo "    • MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📝 查看日志:"
echo "  tail -f logs/device-service.log"
echo "  tail -f logs/app-service.log"
echo "  tail -f logs/admin-frontend.log"
echo ""
echo "🛑 停止所有服务:"
echo "  ./STOP_ALL_LOCAL.sh"
echo ""





