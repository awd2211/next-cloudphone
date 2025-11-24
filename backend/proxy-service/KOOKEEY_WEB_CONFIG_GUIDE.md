# Kookeey Web 配置完整指南

本指南将帮助你完全通过 Web 管理后台配置 Kookeey 代理供应商，无需手动修改任何配置文件。

## 🎯 功能概览

通过 Web 界面，你可以：

1. ✅ **添加/编辑 Kookeey 配置** - 完全在线配置
2. ✅ **测试连接** - 验证配置是否正确
3. ✅ **查询库存** - 查看可用代理数量
4. ✅ **提取代理** - 获取指定地区的代理IP
5. ✅ **查询余额** - 实时查看账户余额
6. ✅ **订单管理** - 查看订单历史
7. ✅ **使用统计** - 监控代理使用情况
8. ✅ **查看区域** - 了解支持的国家/地区

---

## 📝 步骤 1: 获取 Kookeey 配置信息

在配置之前，你需要从 Kookeey 控制台获取以下信息：

### 1.1 登录 Kookeey 控制台
访问: https://www.kookeey.net/

### 1.2 获取必需信息

**① Developer ID (accessid)**
- 位置: 控制台 → 账户信息 → 开发者ID
- 示例: `12345`
- 用途: 用于 API 认证的用户标识

**② Developer Token (密钥)**
- 位置: 控制台 → 账户信息 → 开发者令牌
- 示例: `your-secret-token-abc123xyz`
- 用途: 用于生成 HMAC-SHA1 签名，确保请求安全性
- ⚠️ **重要**: 这是签名密钥，需要严格保密！

**③ 分组ID (Group ID)**
- 位置: 控制台 → 代理管理 → 分组列表
- 示例: `433` (美国分组), `520` (日本分组)
- 用途: 指定提取代理的地区分组

---

## 🖥️ 步骤 2: 通过 Web 界面添加 Kookeey

### 2.1 访问代理提供商管理页面

```
http://localhost:5173/proxy/providers
```

### 2.2 点击 "添加提供商" 按钮

### 2.3 填写表单

**基础信息：**

| 字段 | 值 | 说明 |
|------|-----|------|
| 提供商名称 | `Kookeey 主账户` | 自定义名称，便于识别 |
| 提供商类型 | `kookeey` | 从下拉框选择 |
| 启用状态 | `开启` | 立即启用 |
| 优先级 | `100` | 数值越大优先级越高 |
| 每GB成本 | `2.50` | USD，根据实际套餐填写 |

**配置 JSON：**

```json
{
  "accessId": "你的开发者ID",
  "token": "你的开发者令牌",
  "apiUrl": "https://kookeey.com"
}
```

**完整示例：**

```json
{
  "accessId": "12345",
  "token": "your-secret-token-abc123xyz",
  "apiUrl": "https://kookeey.com"
}
```

### 2.4 保存并测试

1. 点击 **"保存"** 按钮
2. 在列表中找到刚添加的 Kookeey
3. 点击 **"测试连接"** 图标 (🔌)
4. 等待测试结果：
   - ✅ **成功**: 显示 "测试成功 (延迟: XXXms)"
   - ❌ **失败**: 检查配置是否正确

---

## 📊 步骤 3: 使用 Kookeey 代理服务

### 3.1 查询库存

**API 请求：**
```bash
curl http://localhost:30000/proxy/kookeey/{providerId}/stock/433 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例：**
```json
{
  "groupId": 433,
  "availableStock": 1500,
  "totalStock": 1500
}
```

### 3.2 查询账户余额

**API 请求：**
```bash
curl http://localhost:30000/proxy/kookeey/{providerId}/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例：**
```json
{
  "balance": 100.50,
  "currency": "USD",
  "remainingBandwidthMB": 5000,
  "remainingBandwidthGB": 4.88
}
```

### 3.3 提取代理

**基础提取（默认地区）：**
```bash
curl -X POST http://localhost:30000/proxy/kookeey/{providerId}/extract \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": 433,
    "num": 10
  }'
```

**指定地区和时长：**
```bash
curl -X POST http://localhost:30000/proxy/kookeey/{providerId}/extract \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": 433,
    "num": 5,
    "country": "US",
    "state": "California",
    "city": "Los Angeles",
    "duration": 30
  }'
```

**响应示例：**
```json
{
  "proxies": [
    {
      "id": "kookeey-433-1234567890-0",
      "host": "proxy.kookeey.com",
      "port": 8000,
      "username": "user123456",
      "password": "pass123456",
      "protocol": "http",
      "country": "US",
      "city": "Los Angeles",
      "expiresAt": "2025-01-24T15:30:00Z",
      "createdAt": "2025-01-24T15:00:00Z"
    }
  ],
  "total": 1
}
```

### 3.4 使用代理

**Node.js (axios):**

```javascript
const axios = require('axios');

const proxy = {
  host: 'proxy.kookeey.com',
  port: 8000,
  auth: {
    username: 'user123456',
    password: 'pass123456'
  }
};

axios.get('https://api.ipify.org?format=json', { proxy })
  .then(response => {
    console.log('My proxy IP:', response.data.ip);
  });
```

**cURL:**

```bash
curl -x http://user123456:pass123456@proxy.kookeey.com:8000 \
  https://api.ipify.org
```

**Python (requests):**

```python
import requests

proxies = {
    'http': 'http://user123456:pass123456@proxy.kookeey.com:8000',
    'https': 'http://user123456:pass123456@proxy.kookeey.com:8000'
}

response = requests.get('https://api.ipify.org?format=json', proxies=proxies)
print('My proxy IP:', response.json()['ip'])
```

---

## 🔧 步骤 4: 监控和管理

### 4.1 查看订单列表

**API 请求：**
```bash
curl "http://localhost:30000/proxy/kookeey/{providerId}/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例：**
```json
{
  "orders": [
    {
      "orderId": "ORD123456",
      "groupId": 433,
      "packageName": "US Premium Plan",
      "quantity": 100,
      "amount": 250.00,
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z",
      "expiresAt": "2025-02-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### 4.2 查看使用统计

**API 请求：**
```bash
curl "http://localhost:30000/proxy/kookeey/{providerId}/usage?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例：**
```json
{
  "totalRequests": 5000,
  "successfulRequests": 4800,
  "failedRequests": 200,
  "successRate": 96.00,
  "totalBandwidthMB": 1250,
  "totalBandwidthGB": 1.22,
  "averageLatency": 250,
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-31T23:59:59Z"
}
```

### 4.3 查看支持区域

**API 请求：**
```bash
curl http://localhost:30000/proxy/kookeey/{providerId}/regions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例：**
```json
[
  {
    "country": "US",
    "countryName": "United States",
    "cities": ["New York", "Los Angeles", "Chicago"],
    "availableProxies": 5000,
    "costPerGB": 2.50
  },
  {
    "country": "JP",
    "countryName": "Japan",
    "cities": ["Tokyo", "Osaka"],
    "availableProxies": 2000,
    "costPerGB": 3.00
  }
]
```

---

## 🎨 高级用法

### 提取参数说明

提取代理时，可以使用以下参数精确控制：

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `groupId` | number | 分组ID（必需） | `433` |
| `num` | number | 提取数量 | `10` |
| `format` | string | 返回格式 | `json` |
| `country` | string | 国家代码 | `US`, `JP`, `UK` |
| `state` | string | 州/省 | `California`, `New York` |
| `city` | string | 城市 | `Los Angeles`, `Tokyo` |
| `duration` | number | IP时效（分钟） | `30`, `60`, `120` |

### 粘性会话示例

**固定IP 30分钟：**
```json
{
  "groupId": 433,
  "num": 1,
  "country": "US",
  "city": "New York",
  "duration": 30
}
```

**固定IP 1小时：**
```json
{
  "groupId": 433,
  "num": 1,
  "country": "JP",
  "city": "Tokyo",
  "duration": 60
}
```

---

## 📡 API 端点参考

### Kookeey 专用 API

```bash
# 获取账户余额
GET /proxy/kookeey/:providerId/balance

# 获取库存信息
GET /proxy/kookeey/:providerId/stock/:groupId

# 提取代理
POST /proxy/kookeey/:providerId/extract

# 获取订单列表
GET /proxy/kookeey/:providerId/orders

# 获取使用统计
GET /proxy/kookeey/:providerId/usage

# 获取支持区域
GET /proxy/kookeey/:providerId/regions
```

---

## 🐛 常见问题

### Q1: 测试连接失败

**可能原因：**
1. Developer ID 不正确
2. Developer Token 错误
3. API 端点错误
4. 网络连接问题

**解决方法：**
1. 检查配置 JSON 中的 `accessId` 和 `token`
2. 在 Kookeey 控制台验证信息
3. 确认 `apiUrl` 为 `https://kookeey.com`
4. 检查服务器网络连接

### Q2: 提取代理失败

**可能原因：**
- 分组ID不存在
- 库存不足
- 余额不足
- 请求频率过高（超过 10 qps/s）

**解决方法：**
1. 验证 `groupId` 是否正确
2. 先查询库存: `/stock/:groupId`
3. 先查询余额: `/balance`
4. 降低请求频率，添加延迟

### Q3: 签名验证失败

**可能原因：**
- Token 错误
- 时间戳超时（签名有效期通常为 5-10 分钟）
- 参数顺序错误

**解决方法：**
1. 确认 `token` 配置正确
2. 检查服务器时间是否同步（使用 NTP）
3. Adapter 会自动处理签名，无需手动干预

### Q4: 代理连接失败

**可能原因：**
1. 代理地址错误
2. 用户名/密码错误
3. IP时效已过期

**解决方法：**
1. 验证代理信息是否正确
2. 检查 `expiresAt` 时间，确保未过期
3. 重新提取新的代理

---

## ✅ 检查清单

配置完成后，确保以下项目都已完成：

- [ ] Kookeey 已在 Web 界面添加
- [ ] 配置 JSON 包含 `accessId` 和 `token`
- [ ] 测试连接成功
- [ ] 可以成功查询库存
- [ ] 可以成功查询余额
- [ ] 可以成功提取代理
- [ ] 代理可以正常使用

---

## 🚀 快速测试脚本

保存为 `test-kookeey.sh`:

```bash
#!/bin/bash

# 配置
TOKEN="your-jwt-token"
API_BASE="http://localhost:30000"
PROVIDER_ID="your-provider-id"
GROUP_ID=433

echo "=== Testing Kookeey Configuration ==="

# 1. 获取余额信息
echo "1. Getting balance..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/balance" \
  -H "Authorization: Bearer $TOKEN" | jq

# 2. 获取库存
echo "2. Getting stock..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/stock/$GROUP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. 提取代理
echo "3. Extracting proxy..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"groupId\": $GROUP_ID, \"num\": 1}" | jq

# 4. 获取订单
echo "4. Getting orders..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/orders?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. 获取使用统计
echo "5. Getting usage stats..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/usage" \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. 获取支持区域
echo "6. Getting regions..."
curl -s "$API_BASE/proxy/kookeey/$PROVIDER_ID/regions" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "=== Test Complete ==="
```

运行:
```bash
chmod +x test-kookeey.sh
./test-kookeey.sh
```

---

## 📚 相关文档

- [Kookeey 官方文档](https://www.kookeey.net/apidoc)
- [代理提供商配置参考](./PROVIDER_CONFIG_REFERENCE.md)
- [Kookeey Adapter 实现](./src/adapters/kookeey/kookeey.adapter.ts)
- [IPIDEA 集成指南](./IPIDEA_WEB_CONFIG_GUIDE.md)

---

## 💡 提示

1. **保存配置备份**：在 Web 界面配置完成后，建议导出配置 JSON 保存
2. **定期检查余额**：在 Kookeey 管理页面监控余额和流量使用情况
3. **使用粘性会话**：需要固定 IP 时，使用 `duration` 参数指定时长
4. **成本优化**：根据实际需求选择合适的国家和时长，避免浪费
5. **请求限流**：注意 Kookeey 的请求频率限制（10 qps/s），避免被限流
6. **签名安全**：Developer Token 是签名密钥，务必保密，不要泄露

---

## 🔐 安全建议

1. **Token 保护**：
   - 不要在代码或日志中明文显示 Token
   - 使用环境变量或加密配置存储
   - 定期更换 Token（如果支持）

2. **请求验证**：
   - Adapter 已实现 HMAC-SHA1 签名，确保请求安全
   - 时间戳防止重放攻击
   - 签名有效期通常为 5-10 分钟

3. **访问控制**：
   - 使用 JWT 认证保护 API 端点
   - 限制 API 访问权限
   - 记录审计日志

---

**如有问题，请查看日志：**
```bash
pm2 logs proxy-service
```
