# SMS API 测试指南

**版本**: 1.0
**日期**: 2025-11-02
**状态**: ✅ 生产就绪

---

## 📋 概述

本指南提供了 SMS 集成 API 的完整测试步骤和示例。

### 涉及的服务
- **Device Service** (Port 30002) - 设备管理和 SMS 集成
- **SMS Receive Service** (Port 30008) - 虚拟号码和短信接收
- **API Gateway** (Port 30000) - 统一入口
- **RabbitMQ** (Port 5672) - 事件总线

---

## ✅ 前置条件验证

### 1. 服务健康检查

```bash
# Device Service
curl http://localhost:30002/health | jq .

# SMS Receive Service
curl http://localhost:30008/health | jq .

# API Gateway
curl http://localhost:30000/health | jq .
```

**预期结果**: 所有服务返回 `"status": "ok"` 或 `"status": "degraded"`（开发环境 Docker 不可用是正常的）

---

### 2. RabbitMQ 配置验证

```bash
# 检查 RabbitMQ 可访问性
curl -u admin:admin123 http://localhost:15672/api/overview | jq -r '.rabbitmq_version'

# 检查 SMS 队列
curl -u admin:admin123 http://localhost:15672/api/queues | jq -r '.[].name' | grep sms
```

**预期结果**:
```
device-service.sms.message-received
device-service.sms.number-requested
device-service.sms.number-cancelled
```

---

## 🔐 认证

所有 Device Service 的 SMS API 都需要 JWT 认证。

### 获取 Token

**注意**: User Service 启用了验证码登录，需要以下步骤：

```bash
# 步骤 1: 获取验证码
CAPTCHA_RESPONSE=$(curl -s -X POST http://localhost:30001/auth/captcha)
CAPTCHA_ID=$(echo $CAPTCHA_RESPONSE | jq -r '.data.captchaId')
echo "Captcha ID: $CAPTCHA_ID"
echo "Captcha SVG: $(echo $CAPTCHA_RESPONSE | jq -r '.data.captchaSvg' | head -c 100)..."

# 步骤 2: 查看验证码（在浏览器中打开）
# 将 SVG 保存到文件
echo $CAPTCHA_RESPONSE | jq -r '.data.captchaSvg' > /tmp/captcha.svg
# 在浏览器中查看验证码图片

# 步骤 3: 使用验证码登录
CAPTCHA_CODE="<从图片中看到的验证码>"
TOKEN=$(curl -s -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"admin\",
    \"password\": \"admin123\",
    \"captchaId\": \"$CAPTCHA_ID\",
    \"captchaCode\": \"$CAPTCHA_CODE\"
  }" | jq -r '.data.accessToken')

echo "Token: $TOKEN"
```

### 临时测试 Token（仅开发环境）

如果需要跳过验证码进行测试，可以临时使用固定 token（需要在 user-service 配置中启用测试模式）。

---

## 📡 Device Service SMS API

### 基础 URL
```
http://localhost:30002/devices/:deviceId
```

### API 端点

#### 1. 请求虚拟 SMS 号码

**端点**: `POST /devices/:deviceId/request-sms`

**请求**:
```bash
curl -X POST "http://localhost:30002/devices/test-device-001/request-sms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "country": "RU",
    "service": "telegram",
    "operator": "any"
  }' | jq .
```

**请求参数**:
```typescript
{
  country: string;    // ISO 3166-1 alpha-2 国家代码 (RU, US, CN, IN等)
  service?: string;   // 可选：目标服务 (telegram, whatsapp, discord等)
  operator?: string;  // 可选：运营商 (any, mts, beeline, megafon等)
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "requestId": "req-uuid-12345",
    "deviceId": "test-device-001",
    "phoneNumber": "+79123456789",
    "country": "RU",
    "service": "telegram",
    "status": "active",
    "expiresAt": "2025-11-02T06:30:00Z",
    "requestedAt": "2025-11-02T06:00:00Z"
  }
}
```

**错误响应 (400)**:
```json
{
  "success": false,
  "code": "DEVICE_NOT_AVAILABLE",
  "message": "设备必须处于运行状态才能请求虚拟号码"
}
```

---

#### 2. 查询设备的虚拟号码

**端点**: `GET /devices/:deviceId/sms-number`

**请求**:
```bash
curl -X GET "http://localhost:30002/devices/test-device-001/sms-number" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "requestId": "req-uuid-12345",
    "deviceId": "test-device-001",
    "phoneNumber": "+79123456789",
    "country": "RU",
    "service": "telegram",
    "status": "active",
    "expiresAt": "2025-11-02T06:30:00Z",
    "requestedAt": "2025-11-02T06:00:00Z"
  }
}
```

**设备无虚拟号码 (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

#### 3. 查询 SMS 消息历史

**端点**: `GET /devices/:deviceId/sms-messages`

**请求**:
```bash
curl -X GET "http://localhost:30002/devices/test-device-001/sms-messages" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**成功响应 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "messageId": "msg-uuid-67890",
      "verificationCode": "123456",
      "phoneNumber": "+79123456789",
      "service": "telegram",
      "receivedAt": "2025-11-02T06:05:00Z",
      "pushedAt": "2025-11-02T06:05:01Z"
    },
    {
      "messageId": "msg-uuid-67891",
      "verificationCode": "654321",
      "phoneNumber": "+79123456789",
      "service": "whatsapp",
      "receivedAt": "2025-11-02T06:10:00Z",
      "pushedAt": "2025-11-02T06:10:01Z"
    }
  ]
}
```

---

#### 4. 取消虚拟号码

**端点**: `DELETE /devices/:deviceId/sms-number`

**请求**:
```bash
curl -X DELETE "http://localhost:30002/devices/test-device-001/sms-number" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "已完成验证"
  }' | jq .
```

**请求参数**:
```typescript
{
  reason?: string;  // 可选：取消原因
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "message": "虚拟号码已取消"
}
```

---

## 🔄 SMS Receive Service 直接 API（无需认证）

这些接口可以直接测试，不需要 JWT token。

### 1. 健康检查

```bash
curl http://localhost:30008/health | jq .
```

### 2. 详细健康检查

```bash
curl http://localhost:30008/health/detailed | jq .
```

**响应示例**:
```json
{
  "database": {
    "healthy": true,
    "lastCheck": "2025-11-02T06:00:00Z",
    "error": null
  },
  "redis": {
    "healthy": true,
    "lastCheck": "2025-11-02T06:00:00Z",
    "error": null
  },
  "rabbitmq": {
    "healthy": false,
    "lastCheck": "2025-11-02T06:00:00Z",
    "error": "AmqpConnection not available"
  },
  "overall": "degraded"
}
```

### 3. 获取可用服务提供商

```bash
curl http://localhost:30008/sms-numbers/providers | jq .
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "sms-activate",
        "displayName": "SMS-Activate.io",
        "status": "available",
        "supportedCountries": ["RU", "US", "CN", "IN"],
        "supportedServices": ["telegram", "whatsapp", "discord"]
      },
      {
        "name": "5sim",
        "displayName": "5sim.net",
        "status": "available",
        "supportedCountries": ["RU", "US", "UK"],
        "supportedServices": ["telegram", "whatsapp"]
      }
    ]
  }
}
```

---

## 🎯 完整测试流程

### 场景: Telegram 注册验证

```bash
#!/bin/bash

# 1. 获取 Token（假设已经获取）
TOKEN="your-jwt-token-here"
DEVICE_ID="test-device-001"

# 2. 为设备请求俄罗斯虚拟号码（用于 Telegram）
echo "=== 步骤 1: 请求虚拟号码 ==="
RESPONSE=$(curl -s -X POST "http://localhost:30002/devices/$DEVICE_ID/request-sms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "country": "RU",
    "service": "telegram"
  }')

echo $RESPONSE | jq .

PHONE_NUMBER=$(echo $RESPONSE | jq -r '.data.phoneNumber')
REQUEST_ID=$(echo $RESPONSE | jq -r '.data.requestId')

echo "获得虚拟号码: $PHONE_NUMBER"
echo "请求 ID: $REQUEST_ID"
echo ""

# 3. 在 Telegram 中使用这个号码注册
echo "=== 步骤 2: 在 Telegram 中注册 ==="
echo "请在 Telegram 应用中输入号码: $PHONE_NUMBER"
echo "等待接收验证码..."
echo ""

# 4. 轮询查询 SMS 消息（等待验证码）
echo "=== 步骤 3: 查询验证码 ==="
for i in {1..10}; do
  echo "尝试 $i/10..."
  MESSAGES=$(curl -s -X GET "http://localhost:30002/devices/$DEVICE_ID/sms-messages" \
    -H "Authorization: Bearer $TOKEN" | jq '.data')

  if [ "$(echo $MESSAGES | jq length)" -gt 0 ]; then
    echo "收到验证码！"
    echo $MESSAGES | jq .

    CODE=$(echo $MESSAGES | jq -r '.[0].verificationCode')
    echo ""
    echo "验证码: $CODE"
    break
  fi

  sleep 5
done
echo ""

# 5. 在 Telegram 中输入验证码
echo "=== 步骤 4: 在 Telegram 中输入验证码 ==="
echo "验证码: $CODE"
echo ""

# 6. 取消虚拟号码
echo "=== 步骤 5: 取消虚拟号码 ==="
curl -s -X DELETE "http://localhost:30002/devices/$DEVICE_ID/sms-number" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "Telegram 注册完成"
  }' | jq .

echo ""
echo "✓ 测试完成！"
```

---

## 🔍 RabbitMQ 事件监控

监控 SMS 事件流：

```bash
# 1. 查看队列状态
curl -u admin:admin123 http://localhost:15672/api/queues | \
  jq '.[] | select(.name | contains("sms")) | {name, messages, consumers}'

# 2. 查看最近的消息（需要启用 RabbitMQ 的 tracing）
# 在 RabbitMQ Management UI 中启用: http://localhost:15672/#/traces

# 3. 监控 Device Service 日志
pm2 logs device-service --lines 50 | grep -i "sms"

# 4. 监控 SMS Receive Service 日志
pm2 logs sms-receive-service --lines 50
```

---

## 📊 预期事件流

当收到短信验证码时，会触发以下事件流：

```
1. SMS Receive Service 接收到短信
   ↓
2. 发布 RabbitMQ 事件: sms.message.received
   {
     "messageId": "msg-uuid",
     "deviceId": "test-device-001",
     "phoneNumber": "+79123456789",
     "verificationCode": "123456",
     "service": "telegram",
     "receivedAt": "2025-11-02T06:05:00Z",
     "userId": "user-uuid"
   }
   ↓
3. Device Service 的 SmsEventsConsumer 接收事件
   ↓
4. 检查设备状态（必须是 RUNNING）
   ↓
5. 通过 ADB broadcast 推送到设备
   adb -s <device-serial> shell am broadcast \
     -a com.cloudphone.SMS_RECEIVED \
     --es code "123456" \
     --es phone "+79123456789" \
     --es service "telegram" \
     --el timestamp 1730534700000
   ↓
6. 更新设备 metadata
   device.metadata.lastSmsReceived = {
     messageId, phoneNumber, verificationCode,
     service, receivedAt, pushedAt
   }
```

---

## 🐛 故障排查

### 问题 1: 请求虚拟号码失败

**错误**: `"SMS_RECEIVE_SERVICE_URL is not configured"`

**解决方案**:
```bash
# 检查环境变量
cd /home/eric/next-cloudphone/backend/device-service
grep SMS_RECEIVE_SERVICE_URL .env

# 如果没有，添加：
echo "SMS_RECEIVE_SERVICE_URL=http://localhost:30008" >> .env

# 重启 Device Service
pm2 restart device-service
```

---

### 问题 2: 收不到短信事件

**可能原因**:
1. RabbitMQ 队列未创建
2. SmsEventsConsumer 未启动
3. SMS Receive Service 未发布事件

**检查步骤**:
```bash
# 1. 检查队列
curl -u admin:admin123 http://localhost:15672/api/queues | \
  jq '.[] | select(.name == "device-service.sms.message-received")'

# 2. 检查 Device Service 日志
pm2 logs device-service --lines 100 | grep "SmsEventsConsumer"

# 3. 检查 SMS Receive Service 是否发布事件
pm2 logs sms-receive-service --lines 100 | grep "sms.message.received"
```

---

### 问题 3: ADB broadcast 失败

**错误**: Device Service 日志显示 `"ADB operation failed"`

**可能原因**:
1. 设备未运行
2. ADB 连接断开
3. Android 设备无相应的 BroadcastReceiver

**解决方案**:
```bash
# 检查设备状态
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:30002/devices/test-device-001 | \
  jq '.data.status'

# 手动测试 ADB 连接
adb devices

# 手动测试 broadcast
adb -s <device-serial> shell am broadcast \
  -a com.cloudphone.SMS_RECEIVED \
  --es code "test123" \
  --es phone "+79123456789"
```

---

## ✅ 测试清单

- [ ] Device Service 健康检查通过
- [ ] SMS Receive Service 健康检查通过
- [ ] RabbitMQ 所有 SMS 队列已创建
- [ ] 成功请求虚拟号码
- [ ] 虚拟号码状态查询正常
- [ ] SMS 消息历史查询正常（即使为空）
- [ ] 成功取消虚拟号码
- [ ] RabbitMQ 事件正常流转
- [ ] Device Service 日志显示事件被消费
- [ ] ADB broadcast 命令执行成功（如有设备）

---

## 📝 注意事项

1. **生产环境**: 需要配置真实的 SMS 服务提供商 API keys
2. **Android APK**: 需要部署 `cloudphone-sms-helper.apk` 到设备接收 broadcast
3. **速率限制**: SMS 服务提供商通常有速率限制，注意控制请求频率
4. **成本**: 每个虚拟号码和短信都会产生费用
5. **安全**: 生产环境必须启用 HTTPS 和强认证

---

## 📚 相关文档

- [SMS_DEVICE_INTEGRATION_COMPLETE.md](./SMS_DEVICE_INTEGRATION_COMPLETE.md) - 完整集成文档
- [SMS_INTEGRATION_SESSION_COMPLETE.md](./SMS_INTEGRATION_SESSION_COMPLETE.md) - 本次会话报告
- [Device Service API 文档](../backend/device-service/README.md)
- [SMS Receive Service 文档](../backend/sms-receive-service/README.md)

---

**文档版本**: 1.0
**最后更新**: 2025-11-02
**维护者**: Development Team
