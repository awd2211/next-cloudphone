#!/bin/bash
# 停止所有本地服务

GREEN='\033[0;32m'
NC='\033[0m'

echo "停止所有本地服务..."
echo ""

# 停止 Node.js 服务
echo "1. 停止 NestJS 微服务..."
pkill -f "nest start" && echo -e "${GREEN}  ✅ NestJS 服务已停止${NC}" || echo "  (没有运行中的 NestJS 服务)"

# 停止 pnpm dev
pkill -f "pnpm run dev" && echo -e "${GREEN}  ✅ pnpm dev 进程已停止${NC}" || echo "  (没有运行中的 pnpm 进程)"

# 停止 vite
pkill -f "vite" && echo -e "${GREEN}  ✅ Vite 前端已停止${NC}" || echo "  (没有运行中的 Vite 进程)"

echo ""
echo "2. 停止 Python 服务..."
pkill -f "scheduler-service" && echo -e "${GREEN}  ✅ Scheduler Service 已停止${NC}" || echo "  (没有运行中的 Scheduler)"
pkill -f "python main.py" && echo -e "${GREEN}  ✅ Python 进程已停止${NC}" || echo "  (没有运行中的 Python)"

echo ""
echo "3. 停止 Go 服务..."
pkill -f "media-service" && echo -e "${GREEN}  ✅ Media Service 已停止${NC}" || echo "  (没有运行中的 Media Service)"
pkill -f "go run main.go" && echo -e "${GREEN}  ✅ Go 进程已停止${NC}" || echo "  (没有运行中的 Go)"

echo ""
echo -e "${GREEN}✅ 所有本地服务已停止${NC}"
echo ""
echo "基础设施（Docker）仍在运行:"
docker ps | grep cloudphone | awk '{print "  •", $NF}'
echo ""
echo "如需停止基础设施:"
echo "  docker compose -f docker-compose.dev.yml stop"
echo ""





