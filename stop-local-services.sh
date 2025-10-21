#!/bin/bash
# 停止本地运行的微服务

echo "停止本地微服务..."

# 查找并停止所有 nest start 进程
pkill -f "nest start --watch" && echo "✅ NestJS 服务已停止"

# 查找并停止所有 pnpm run dev 进程
pkill -f "pnpm run dev" && echo "✅ pnpm dev 进程已停止"

# 查找并停止 nodemon
pkill -f "nodemon" && echo "✅ nodemon 进程已停止"

echo ""
echo "✅ 所有本地服务已停止"
echo ""
echo "基础设施（Docker）仍在运行:"
echo "  如需停止: docker compose -f docker-compose.dev.yml stop"





