#!/bin/bash

# 启动所有微服务并注册到 Consul
# 使用独立数据库配置

PROJECT_ROOT="/home/eric/next-cloudphone"
cd $PROJECT_ROOT

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== 启动所有微服务 ===${NC}"
echo ""

# 启动 user-service
echo -e "${BLUE}启动 user-service...${NC}"
cd $PROJECT_ROOT/backend/user-service
nohup pnpm run dev >> $PROJECT_ROOT/logs/user-service.log 2>&1 &
echo -e "${GREEN}✅ PID: $!${NC}"
sleep 3

# 启动 device-service
echo -e "${BLUE}启动 device-service...${NC}"
cd $PROJECT_ROOT/backend/device-service
nohup pnpm run dev >> $PROJECT_ROOT/logs/device-service.log 2>&1 &
echo -e "${GREEN}✅ PID: $!${NC}"
sleep 3

# 启动 app-service
echo -e "${BLUE}启动 app-service...${NC}"
cd $PROJECT_ROOT/backend/app-service
nohup pnpm run dev >> $PROJECT_ROOT/logs/app-service.log 2>&1 &
echo -e "${GREEN}✅ PID: $!${NC}"
sleep 3

# 启动 billing-service
echo -e "${BLUE}启动 billing-service...${NC}"
cd $PROJECT_ROOT/backend/billing-service
nohup pnpm run dev >> $PROJECT_ROOT/logs/billing-service.log 2>&1 &
echo -e "${GREEN}✅ PID: $!${NC}"
sleep 3

# 启动 notification-service
echo -e "${BLUE}启动 notification-service...${NC}"
cd $PROJECT_ROOT/backend/notification-service
nohup pnpm run dev >> $PROJECT_ROOT/logs/notification-service.log 2>&1 &
echo -e "${GREEN}✅ PID: $!${NC}"
sleep 3

cd $PROJECT_ROOT

echo ""
echo -e "${GREEN}所有服务已启动！等待注册到 Consul...${NC}"
echo ""
echo "等待 30 秒让服务完全启动..."
sleep 30

echo ""
echo -e "${BLUE}=== 检查 Consul 注册状态 ===${NC}"
curl -s http://localhost:8500/v1/catalog/services | jq .

echo ""
echo "运行检查脚本查看详细状态："
echo "  ./scripts/check-consul-integration.sh"
echo ""


