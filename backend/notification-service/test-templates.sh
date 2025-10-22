#!/bin/bash

# 模板系统快速测试脚本
# 用途：验证模板 API 功能

echo "🧪 测试通知服务模板系统"
echo "=================================="

BASE_URL="http://localhost:30006"

echo ""
echo "1️⃣  测试健康检查..."
curl -s "$BASE_URL/health" | jq '.'

echo ""
echo "2️⃣  创建测试模板..."
curl -X POST "$BASE_URL/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test.welcome",
    "name": "测试欢迎通知",
    "type": "marketing",
    "title": "欢迎 {{username}}！",
    "body": "您好 {{username}}，感谢注册于 {{formatDate registeredAt}}。",
    "emailTemplate": "<h1>欢迎 {{username}}</h1><p>注册时间：{{formatDate registeredAt}}</p>",
    "smsTemplate": "【测试】欢迎{{username}}！",
    "channels": ["email", "sms", "inApp"],
    "language": "zh-CN",
    "defaultData": {
      "username": "测试用户",
      "registeredAt": "2025-01-22T00:00:00Z"
    }
  }' | jq '.'

echo ""
echo "3️⃣  查询模板列表..."
curl -s "$BASE_URL/templates?page=1&limit=5" | jq '.'

echo ""
echo "4️⃣  根据 code 查找模板..."
curl -s "$BASE_URL/templates/by-code/test.welcome?language=zh-CN" | jq '.'

echo ""
echo "5️⃣  渲染模板..."
curl -X POST "$BASE_URL/templates/render" \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "test.welcome",
    "language": "zh-CN",
    "data": {
      "username": "张三",
      "registeredAt": "2025-01-22T10:30:00Z"
    }
  }' | jq '.'

echo ""
echo "6️⃣  验证模板语法..."
curl -X POST "$BASE_URL/templates/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Hello {{name}}, balance: {{formatCurrency amount}}"
  }' | jq '.'

echo ""
echo "=================================="
echo "✅ 测试完成！"
