#!/bin/bash

# 测试热重载功能

set -e

echo "🧪 测试热重载功能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查 user-service 是否在运行
echo "1️⃣  检查 user-service 是否运行..."
if ! docker ps --format '{{.Names}}' | grep -q "cloudphone-user-service"; then
  echo "❌ user-service 未运行"
  echo "   启动命令: docker compose -f docker-compose.dev.yml up -d user-service"
  exit 1
fi
echo "✅ user-service 正在运行"
echo ""

# 2. 检查代码是否挂载
echo "2️⃣  检查代码挂载..."
if docker exec cloudphone-user-service test -f /app/src/main.ts; then
  echo "✅ 代码已正确挂载到容器"
else
  echo "❌ 代码挂载失败"
  exit 1
fi
echo ""

# 3. 检查是否使用 watch 模式
echo "3️⃣  检查是否启用热重载..."
if docker exec cloudphone-user-service ps aux | grep -q "nest.*watch"; then
  echo "✅ NestJS watch 模式已启用"
else
  echo "⚠️  警告：未检测到 watch 模式"
  echo "   检查 docker-compose.dev.yml 中的 command 配置"
fi
echo ""

# 4. 创建测试文件
echo "4️⃣  测试文件修改检测..."
TEST_FILE="backend/user-service/src/test-hot-reload.txt"
echo "test-$(date +%s)" > $TEST_FILE

sleep 2

if docker exec cloudphone-user-service test -f /app/src/test-hot-reload.txt; then
  echo "✅ 文件变化已同步到容器"
  rm $TEST_FILE
else
  echo "❌ 文件同步失败"
  exit 1
fi
echo ""

# 5. 查看最近的日志
echo "5️⃣  查看服务日志（最近10行）..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs cloudphone-user-service --tail 10
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ 热重载功能测试完成！"
echo ""
echo "📝 使用方法："
echo "1. 修改代码: backend/user-service/src/users/users.service.ts"
echo "2. 保存文件"
echo "3. 查看日志: docker logs -f cloudphone-user-service"
echo "4. 应该看到自动重新编译的日志"
echo ""
echo "💡 如果没有自动重载，尝试："
echo "   docker compose -f docker-compose.dev.yml restart user-service"
echo ""
