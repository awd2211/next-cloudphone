# IPIDEA Web 配置完整指南

本指南将帮助你完全通过 Web 管理后台配置 IPIDEA 代理供应商，无需手动修改任何配置文件。

## 🎯 功能概览

通过 Web 界面，你可以：

1. ✅ **添加/编辑 IPIDEA 配置** - 完全在线配置
2. ✅ **测试连接** - 验证配置是否正确
3. ✅ **管理白名单** - 添加/删除服务器IP
4. ✅ **监控流量** - 实时查看剩余流量
5. ✅ **设置预警** - 流量不足自动告警
6. ✅ **管理账户** - 查看所有认证账户
7. ✅ **查看区域** - 了解支持的国家/地区

---

## 📝 步骤 1: 获取 IPIDEA 配置信息

在配置之前，你需要从 IPIDEA 控制台获取以下信息：

### 1.1 登录 IPIDEA 控制台
访问: https://www.ipidea.net/ucenter/

### 1.2 获取必需信息

**① AppKey (API 密钥)**
- 位置: 控制台 → API 管理 → AppKey
- 示例: `abc123def456ghi789`
- 用途: 调用 IPIDEA API 进行流量查询、白名单管理等

**② 代理认证用户名**
- 位置: 控制台 → 代理管理 → 认证账户
- 示例: `user123456`
- 用途: 使用代理时的认证用户名

**③ 代理认证密码**
- 位置: 控制台 → 代理管理 → 认证账户
- 示例: `pass123456`
- 用途: 使用代理时的认证密码

**④ 专属网关地址**
- 位置: 控制台 → 代理管理 → 隧道代理
- 格式: `{hash}.lqz.na.ipidea.online`
- 示例: `e255c08e04856698.lqz.na.ipidea.online`
- 用途: 代理连接的网关地址

**⑤ 端口**
- 新版端口: `2336`
- 旧版端口: `2333`
- 推荐使用: `2336`

---

## 🖥️ 步骤 2: 通过 Web 界面添加 IPIDEA

### 2.1 访问代理提供商管理页面

```
http://localhost:5173/proxy/providers
```

### 2.2 点击 "添加提供商" 按钮

### 2.3 填写表单

**基础信息：**

| 字段 | 值 | 说明 |
|------|-----|------|
| 提供商名称 | `IPIDEA 主账户` | 自定义名称，便于识别 |
| 提供商类型 | `ipidea` | 从下拉框选择 |
| 启用状态 | `开启` | 立即启用 |
| 优先级 | `100` | 数值越大优先级越高 |
| 每GB成本 | `3.00` | USD，根据实际套餐填写 |

**配置 JSON：**

```json
{
  "apiKey": "你的AppKey",
  "username": "你的认证用户名",
  "password": "你的认证密码",
  "gateway": "你的专属网关地址.lqz.na.ipidea.online",
  "port": 2336,
  "apiUrl": "https://api.ipidea.net"
}
```

**完整示例：**

```json
{
  "apiKey": "abc123def456ghi789",
  "username": "user123456",
  "password": "pass123456",
  "gateway": "e255c08e04856698.lqz.na.ipidea.online",
  "port": 2336,
  "apiUrl": "https://api.ipidea.net"
}
```

### 2.4 保存并测试

1. 点击 **"保存"** 按钮
2. 在列表中找到刚添加的 IPIDEA
3. 点击 **"测试连接"** 图标 (🔌)
4. 等待测试结果：
   - ✅ **成功**: 显示 "测试成功 (延迟: XXXms)"
   - ❌ **失败**: 检查配置是否正确

---

## 🔧 步骤 3: 添加服务器 IP 到白名单

IPIDEA 使用 IP 白名单认证，需要将你的服务器 IP 添加到白名单。

### 3.1 获取服务器公网 IP

```bash
curl https://api.ipify.org
```

### 3.2 在 Web 界面添加白名单

1. 在提供商列表中，点击 IPIDEA 的 **"IPIDEA 管理"** 按钮 (⚙️)
2. 进入 IPIDEA 管理页面
3. 点击 **"IP 白名单"** 标签
4. 点击 **"添加 IP"** 按钮
5. 输入服务器公网 IP
6. 点击 **"确定"**

---

## 📊 步骤 4: 监控和管理

### 4.1 查看流量统计

在 IPIDEA 管理页面，你可以看到：

- **剩余流量**: 实时显示剩余 GB 数
- **使用进度条**: 直观显示使用情况
- **预警状态**: 低于阈值时红色显示

### 4.2 设置流量预警

1. 点击 **"设置预警"** 按钮
2. 输入预警阈值（单位：MB）
   - 例如: `1000` (剩余1GB时预警)
3. 点击 **"确定"**

当流量低于阈值时，IPIDEA 会发送通知。

### 4.3 查看认证账户

点击 **"认证账户"** 标签，可以看到：

- 账户名和密码（已脱敏）
- 流量限制和使用情况
- 每个账户的剩余流量
- 账户状态

### 4.4 查看支持区域

点击 **"支持区域"** 标签，查看 IPIDEA 支持的所有国家/地区。

---

## 🔐 步骤 5: 使用代理

### 5.1 通过 API 获取代理

**基础代理（动态 IP）：**

```bash
curl http://localhost:30000/proxy/acquire \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ipidea",
    "country": "us"
  }'
```

**粘性会话（固定 IP 30 分钟）：**

```bash
curl http://localhost:30000/proxy/acquire \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ipidea",
    "country": "us",
    "city": "newyork",
    "session": "sticky",
    "sessionDuration": 30
  }'
```

### 5.2 响应示例

```json
{
  "id": "ipidea-tunnel-1-1234567890",
  "host": "e255c08e04856698.lqz.na.ipidea.online",
  "port": 2336,
  "username": "user123456-zone-custom-region-us-city-newyork-session-abc123-sessTime-30",
  "password": "pass123456",
  "protocol": "http",
  "provider": "ipidea",
  "location": {
    "country": "us",
    "city": "newyork"
  }
}
```

### 5.3 使用代理

**Node.js (axios):**

```javascript
const axios = require('axios');

const proxy = {
  host: 'e255c08e04856698.lqz.na.ipidea.online',
  port: 2336,
  auth: {
    username: 'user123456-zone-custom-region-us-city-newyork',
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
curl -x http://user123456-zone-custom:pass123456@e255c08e04856698.lqz.na.ipidea.online:2336 \
  https://api.ipify.org
```

---

## 🎨 高级用法

### 用户名参数说明

IPIDEA 通过用户名字符串控制代理行为：

```
{account}-zone-custom[-region-{country}][-st-{state}][-city-{city}][-session-{id}][-sessTime-{minutes}][-asn-{asn}]
```

**参数说明：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `zone-custom` | 必需，代理池标识 | `-zone-custom` |
| `region-{country}` | 国家代码 | `-region-us`, `-region-jp` |
| `st-{state}` | 州/省 | `-st-california`, `-st-newyork` |
| `city-{city}` | 城市 | `-city-losangeles`, `-city-newyork` |
| `session-{id}` | 会话ID（固定出口IP） | `-session-abc123` |
| `sessTime-{minutes}` | IP时效（1-120分钟） | `-sessTime-30`, `-sessTime-120` |
| `asn-{asn}` | ISP运营商编号 | `-asn-2516` |

**示例：**

```
# 基础动态代理
user123456-zone-custom

# 美国纽约固定30分钟
user123456-zone-custom-region-us-city-newyork-session-abc123-sessTime-30

# 日本东京指定ISP
user123456-zone-custom-region-jp-city-tokyo-asn-2516

# 美国加州洛杉矶固定1小时
user123456-zone-custom-region-us-st-california-city-losangeles-session-xyz789-sessTime-60
```

---

## 📡 API 端点参考

### 提供商管理

```bash
# 获取所有提供商
GET /proxy/providers

# 创建提供商
POST /proxy/providers

# 更新提供商
PUT /proxy/providers/:id

# 删除提供商
DELETE /proxy/providers/:id

# 测试连接
POST /proxy/providers/:id/test

# 切换启用状态
PUT /proxy/providers/:id/toggle
```

### IPIDEA 专用 API

```bash
# 获取剩余流量
GET /proxy/ipidea/:providerId/flow/remaining

# 获取流量使用记录
GET /proxy/ipidea/:providerId/flow/usage

# 设置流量预警
POST /proxy/ipidea/:providerId/flow/warning

# 获取白名单
GET /proxy/ipidea/:providerId/whitelist

# 添加白名单
POST /proxy/ipidea/:providerId/whitelist

# 删除白名单
DELETE /proxy/ipidea/:providerId/whitelist/:ip

# 获取账户列表
GET /proxy/ipidea/:providerId/accounts

# 获取支持区域
GET /proxy/ipidea/:providerId/regions
```

---

## 🐛 常见问题

### Q1: 测试连接失败

**可能原因：**
1. AppKey 不正确
2. 网关地址错误
3. 服务器 IP 未加入白名单
4. 端口错误（尝试 2336 或 2333）

**解决方法：**
1. 检查配置 JSON 中的所有字段
2. 在 IPIDEA 控制台验证信息
3. 添加服务器 IP 到白名单
4. 尝试更换端口

### Q2: 获取流量信息失败

**可能原因：**
- AppKey 权限不足
- API 端点错误

**解决方法：**
- 确认 `apiUrl` 为 `https://api.ipidea.net`
- 检查 AppKey 是否有 API 调用权限

### Q3: 代理连接失败

**可能原因：**
1. 用户名/密码错误
2. 网关地址错误
3. IP 未在白名单中

**解决方法：**
1. 验证认证用户名和密码
2. 确认网关地址格式正确
3. 在 Web 界面添加 IP 到白名单

### Q4: 流量消耗很快

**建议：**
1. 设置流量预警（如剩余 1GB 时预警）
2. 使用粘性会话减少 IP 轮换
3. 监控使用情况，及时充值

---

## ✅ 检查清单

配置完成后，确保以下项目都已完成：

- [ ] IPIDEA 已在 Web 界面添加
- [ ] 配置 JSON 包含所有必需字段
- [ ] 测试连接成功
- [ ] 服务器 IP 已添加到白名单
- [ ] 流量预警已设置
- [ ] 可以成功获取代理
- [ ] 代理可以正常使用

---

## 🚀 快速测试脚本

保存为 `test-ipidea.sh`:

```bash
#!/bin/bash

# 配置
TOKEN="your-jwt-token"
API_BASE="http://localhost:30000"
PROVIDER_ID="your-provider-id"

echo "=== Testing IPIDEA Configuration ==="

# 1. 获取流量信息
echo "1. Getting flow stats..."
curl -s "$API_BASE/proxy/ipidea/$PROVIDER_ID/flow/remaining" \
  -H "Authorization: Bearer $TOKEN" | jq

# 2. 获取白名单
echo "2. Getting whitelist..."
curl -s "$API_BASE/proxy/ipidea/$PROVIDER_ID/whitelist" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. 获取代理
echo "3. Acquiring proxy..."
curl -s "$API_BASE/proxy/acquire" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "ipidea", "country": "us"}' | jq

echo "=== Test Complete ==="
```

运行:
```bash
chmod +x test-ipidea.sh
./test-ipidea.sh
```

---

## 📚 相关文档

- [IPIDEA 官方文档](https://help.ipidea.net/)
- [代理提供商配置参考](./PROVIDER_CONFIG_REFERENCE.md)
- [IPIDEA Adapter 实现](./src/adapters/ipidea/ipidea.adapter.ts)

---

## 💡 提示

1. **保存配置备份**：在 Web 界面配置完成后，建议导出配置 JSON 保存
2. **定期检查流量**：在 IPIDEA 管理页面监控流量使用情况
3. **使用粘性会话**：需要固定 IP 时，使用 `session` 和 `sessTime` 参数
4. **成本优化**：根据实际需求选择合适的国家和时长，避免浪费

---

**如有问题，请查看日志：**
```bash
pm2 logs proxy-service
```
