#!/bin/bash

echo "🔍 诊断 WebSocket 连接问题..."
echo ""

# 1. 检查 notification-service 是否在运行
echo "1️⃣ 检查 notification-service 运行状态..."
if pm2 list | grep -q "notification-service"; then
  echo "✅ notification-service 在 PM2 中存在"
  pm2 list | grep notification-service
else
  echo "❌ notification-service 未在 PM2 中运行"
  echo "   请运行: pm2 start ecosystem.config.js --only notification-service"
  exit 1
fi

echo ""

# 2. 检查端口 30006 是否被占用
echo "2️⃣ 检查端口 30006..."
if lsof -i:30006 > /dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":30006"; then
  echo "✅ 端口 30006 被占用（正常）"
  if command -v lsof > /dev/null 2>&1; then
    lsof -i:30006
  else
    ss -tlnp | grep ":30006"
  fi
else
  echo "❌ 端口 30006 未被占用"
  echo "   notification-service 可能没有正确启动"
  echo "   请查看日志: pm2 logs notification-service"
  exit 1
fi

echo ""

# 3. 测试 HTTP 健康检查
echo "3️⃣ 测试 HTTP 健康检查..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:30006/health 2>/dev/null)
if [ "$HTTP_RESPONSE" = "200" ]; then
  echo "✅ HTTP 健康检查通过 (200)"
  curl -s http://localhost:30006/health | jq . 2>/dev/null || curl -s http://localhost:30006/health
else
  echo "❌ HTTP 健康检查失败 (响应码: $HTTP_RESPONSE)"
  echo "   服务可能未正确启动"
  exit 1
fi

echo ""

# 4. 测试 Socket.IO 端点
echo "4️⃣ 测试 Socket.IO 端点..."
SOCKETIO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:30006/socket.io/?EIO=4&transport=polling" 2>/dev/null)
if [ "$SOCKETIO_RESPONSE" = "200" ] || [ "$SOCKETIO_RESPONSE" = "400" ]; then
  echo "✅ Socket.IO 端点可访问 (响应码: $SOCKETIO_RESPONSE)"
else
  echo "❌ Socket.IO 端点不可访问 (响应码: $SOCKETIO_RESPONSE)"
  echo "   WebSocket Gateway 可能未正确注册"
  exit 1
fi

echo ""

# 5. 检查最近的日志错误
echo "5️⃣ 检查最近的错误日志..."
if pm2 logs notification-service --nostream --lines 20 --err 2>/dev/null | grep -i "error" > /dev/null; then
  echo "⚠️  发现错误日志:"
  pm2 logs notification-service --nostream --lines 20 --err 2>/dev/null | grep -i "error" | tail -5
else
  echo "✅ 没有发现明显错误"
fi

echo ""

# 6. 建议
echo "📝 诊断建议:"
echo ""
echo "如果 WebSocket 仍然连接失败，尝试以下步骤:"
echo ""
echo "1. 重启 notification-service:"
echo "   pm2 restart notification-service"
echo ""
echo "2. 查看完整日志:"
echo "   pm2 logs notification-service --lines 100"
echo ""
echo "3. 检查前端连接 URL:"
echo "   确保前端连接的是: http://localhost:30006"
echo ""
echo "4. 在浏览器控制台测试 Socket.IO:"
echo "   const socket = io('http://localhost:30006', { query: { userId: 'test' } });"
echo "   socket.on('connect', () => console.log('Connected:', socket.id));"
echo ""
echo "5. 检查防火墙:"
echo "   sudo ufw status"
echo "   sudo firewall-cmd --list-all"
echo ""

echo "✅ 诊断完成"

