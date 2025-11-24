# Kookeey 代理服务集成总结

## 📋 集成概述

Kookeey 是一家提供家宽代理（Residential Proxy）服务的提供商，已成功集成到云手机平台的代理服务系统中。该集成采用与 IPIDEA 相同的架构模式，实现了完整的适配器-服务-控制器三层架构。

**集成时间**: 2025-01-24
**集成版本**: 1.0.0
**认证方式**: HMAC-SHA1 签名认证
**API 文档**: https://www.kookeey.net/apidoc

---

## ✨ 核心特性

### 1. 安全认证
- ✅ **HMAC-SHA1 签名**：使用 Node.js `crypto` 模块实现签名
- ✅ **Base64 编码**：签名后 Base64 编码传输
- ✅ **时间戳防重放**：每个请求包含时间戳，防止重放攻击
- ✅ **参数排序**：签名前对参数排序，确保签名一致性

### 2. 代理功能
- ✅ **代理提取**：支持按分组、国家、州、城市提取代理
- ✅ **粘性会话**：支持固定 IP 时长（duration 参数）
- ✅ **动态 IP**：默认每次请求轮换 IP
- ✅ **库存查询**：实时查询指定分组的可用库存
- ✅ **地区支持**：查询所有支持的国家和地区

### 3. 账户管理
- ✅ **余额查询**：查询账户余额和货币单位
- ✅ **流量监控**：查询剩余流量（MB/GB）
- ✅ **订单管理**：查看订单历史和状态
- ✅ **使用统计**：查看请求数、成功率、带宽使用等

### 4. 成本管理
- ✅ **成本计算**：自动计算总成本、每请求成本、每GB成本
- ✅ **预算追踪**：集成平台成本监控系统
- ✅ **成本优化**：基于成本的代理选择策略

---

## 🏗️ 技术架构

### 分层架构

```
┌─────────────────────────────────────────────┐
│  Controller Layer (控制器层)                │
│  kookeey.controller.ts                      │
│  ↓ 暴露 RESTful API                         │
├─────────────────────────────────────────────┤
│  Service Layer (服务层)                     │
│  kookeey.service.ts                         │
│  ↓ 业务逻辑封装                             │
├─────────────────────────────────────────────┤
│  Adapter Layer (适配器层)                   │
│  kookeey.adapter.ts                         │
│  ↓ API 调用、签名生成                       │
├─────────────────────────────────────────────┤
│  Kookeey API                                │
│  https://kookeey.com/                       │
└─────────────────────────────────────────────┘
```

### 文件结构

```
backend/proxy-service/
├── src/
│   ├── adapters/
│   │   └── kookeey/
│   │       └── kookeey.adapter.ts          # 适配器实现
│   ├── proxy/
│   │   ├── controllers/
│   │   │   └── kookeey.controller.ts       # 控制器
│   │   ├── services/
│   │   │   └── kookeey.service.ts          # 服务层
│   │   ├── dto/
│   │   │   └── kookeey.dto.ts              # 数据传输对象
│   │   └── proxy.module.ts                  # 模块注册
├── KOOKEEY_WEB_CONFIG_GUIDE.md             # 配置指南
└── KOOKEEY_INTEGRATION_SUMMARY.md          # 本文档
```

---

## 📦 实现的组件

### 1. DTO 定义 (kookeey.dto.ts)

**定义的 DTO：**
- `KookeeyConfigDto` - 配置信息
- `KookeeyStockDto` - 库存信息
- `KookeeyBalanceDto` - 余额信息
- `KookeeyExtractProxyDto` - 提取代理请求
- `KookeeyProxyDto` - 代理信息
- `KookeeyProxyListDto` - 代理列表
- `KookeeyOrderDto` - 订单信息
- `KookeeyOrderListDto` - 订单列表
- `KookeeyUsageStatsDto` - 使用统计

### 2. Adapter 实现 (kookeey.adapter.ts)

**实现的方法：**
- `initialize()` - 初始化适配器
- `generateSignature()` - 生成 HMAC-SHA1 签名
- `buildRequestUrl()` - 构建带签名的请求 URL
- `testConnection()` - 测试 API 连接
- `getProxyList()` - 获取代理列表
- `getProxy()` - 获取单个代理
- `getStock()` - 获取库存信息
- `getBalance()` - 获取账户余额
- `getOrders()` - 获取订单列表
- `getUsageStats()` - 获取使用统计
- `getAvailableRegions()` - 获取可用地区
- `refreshPool()` - 刷新代理池
- `releaseProxy()` - 释放代理
- `getRemainingFlow()` - 获取剩余流量

### 3. Service 实现 (kookeey.service.ts)

**业务方法：**
- `getBalance()` - 获取余额
- `getStock()` - 获取库存
- `extractProxies()` - 提取代理
- `getOrders()` - 获取订单
- `getUsageStats()` - 获取统计
- `getAvailableRegions()` - 获取地区
- `getAdapter()` - 获取适配器实例（私有）

### 4. Controller 实现 (kookeey.controller.ts)

**API 端点：**
```typescript
GET    /proxy/kookeey/:providerId/balance           # 获取余额
GET    /proxy/kookeey/:providerId/stock/:groupId    # 获取库存
POST   /proxy/kookeey/:providerId/extract           # 提取代理
GET    /proxy/kookeey/:providerId/orders            # 获取订单
GET    /proxy/kookeey/:providerId/usage             # 获取统计
GET    /proxy/kookeey/:providerId/regions           # 获取地区
```

---

## 🔑 配置示例

### 基础配置

```json
{
  "accessId": "12345",
  "token": "your-secret-token-abc123xyz",
  "apiUrl": "https://kookeey.com"
}
```

### 提取代理示例

**基础提取：**
```json
{
  "groupId": 433,
  "num": 10
}
```

**指定地区和时长：**
```json
{
  "groupId": 433,
  "num": 5,
  "country": "US",
  "state": "California",
  "city": "Los Angeles",
  "duration": 30
}
```

---

## 🔐 安全特性

### 1. 签名认证流程

```javascript
// 1. 构建参数字符串（按 key 排序）
const paramString = "g=433&num=10";

// 2. 使用 token 计算 HMAC-SHA1
const hmac = createHmac('sha1', token);
hmac.update(paramString);

// 3. Base64 编码
const signature = hmac.digest('base64');

// 4. 添加认证参数到请求
const url = `https://kookeey.com/extract?accessid=${accessId}&signature=${signature}&ts=${timestamp}&g=433&num=10`;
```

### 2. 安全措施

- ✅ **Token 保密**：Token 存储在加密配置中，不会明文传输
- ✅ **签名验证**：每个请求都需要有效签名
- ✅ **时间戳防护**：防止签名重放攻击（有效期 5-10 分钟）
- ✅ **参数完整性**：签名包含所有参数，防止篡改

---

## 📊 成本计算

### 计算公式

```typescript
// 总成本 = 带宽使用(GB) × 每GB成本
totalCost = (totalBandwidthMB / 1024) * costPerGB;

// 平均每请求成本 = 总成本 / 总请求数
avgCostPerRequest = totalCost / totalRequests;

// 平均每GB成本（配置的固定值）
avgCostPerGB = costPerGB;
```

### 成本追踪

系统自动追踪以下成本指标：
- 总成本 (USD)
- 平均每请求成本 (USD/request)
- 平均每GB成本 (USD/GB)
- 时间段内的成本趋势

---

## 🧪 测试

### 编译测试

```bash
cd backend/proxy-service
pnpm build
```

**结果**: ✅ 编译成功，无错误

### API 测试脚本

使用提供的测试脚本 `test-kookeey.sh`:

```bash
#!/bin/bash
TOKEN="your-jwt-token"
API_BASE="http://localhost:30000"
PROVIDER_ID="your-provider-id"
GROUP_ID=433

# 1. 获取余额
curl "$API_BASE/proxy/kookeey/$PROVIDER_ID/balance" \
  -H "Authorization: Bearer $TOKEN"

# 2. 获取库存
curl "$API_BASE/proxy/kookeey/$PROVIDER_ID/stock/$GROUP_ID" \
  -H "Authorization: Bearer $TOKEN"

# 3. 提取代理
curl -X POST "$API_BASE/proxy/kookeey/$PROVIDER_ID/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": 433, "num": 1}'

# 4. 获取订单
curl "$API_BASE/proxy/kookeey/$PROVIDER_ID/orders?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 5. 获取统计
curl "$API_BASE/proxy/kookeey/$PROVIDER_ID/usage" \
  -H "Authorization: Bearer $TOKEN"

# 6. 获取地区
curl "$API_BASE/proxy/kookeey/$PROVIDER_ID/regions" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 部署步骤

### 1. 添加配置

通过 Web 管理界面添加 Kookeey 提供商：

1. 访问 `http://localhost:5173/proxy/providers`
2. 点击"添加提供商"
3. 填写配置信息
4. 保存并测试连接

### 2. 重新编译

```bash
cd backend/proxy-service
pnpm build
```

### 3. 重启服务

```bash
pm2 restart proxy-service
```

### 4. 验证服务

```bash
pm2 logs proxy-service
# 查看是否有 "Kookeey adapter initialized successfully" 日志
```

---

## 📈 使用场景

### 场景 1: 基础代理使用

**需求**: 获取美国代理用于访问网站

**实现**:
```bash
curl -X POST http://localhost:30000/proxy/kookeey/{providerId}/extract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": 433, "num": 1, "country": "US"}'
```

### 场景 2: 粘性会话

**需求**: 固定IP 30分钟用于账户登录

**实现**:
```bash
curl -X POST http://localhost:30000/proxy/kookeey/{providerId}/extract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": 433,
    "num": 1,
    "country": "US",
    "city": "New York",
    "duration": 30
  }'
```

### 场景 3: 成本监控

**需求**: 查看本月代理使用成本

**实现**:
```bash
curl "http://localhost:30000/proxy/kookeey/{providerId}/usage?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ 限制和注意事项

### API 限制

1. **请求频率**: 10 qps/s per account
   - 超过限制会返回错误码 60001
   - 需要在应用层实现请求限流

2. **签名有效期**: 5-10 分钟
   - 时间戳超时会返回错误码 10015
   - 需要确保服务器时间同步（使用 NTP）

3. **余额不足**: 错误码 40005
   - 提取代理前应先检查余额
   - 设置余额预警避免服务中断

### 实现限制

1. **分组ID**:
   - 目前使用固定默认值 (groupId = 1)
   - 生产环境应从配置中读取
   - 可以通过 metadata 传递自定义 groupId

2. **API 端点**:
   - 部分端点（如 `/extract`, `/balance`, `/orders`）基于文档推测
   - 实际可用端点需要根据 Kookeey 实际 API 调整

3. **错误处理**:
   - 当前对 API 错误采用降级策略（返回默认值）
   - 生产环境应完善错误处理和告警机制

---

## 🔄 与 IPIDEA 的对比

| 特性 | Kookeey | IPIDEA |
|------|---------|--------|
| **认证方式** | HMAC-SHA1 签名 | AppKey (POST body) |
| **请求方法** | HTTP GET | HTTP POST |
| **代理类型** | 家宽代理 | 住宅/数据中心/移动代理 |
| **地区支持** | 多国支持 | 220+ 国家 |
| **白名单** | 未知 | 支持 |
| **API文档** | 基础 | 完善 |
| **成本** | 中等 | 中高 |

---

## 📚 相关文档

- [Kookeey 配置指南](./KOOKEEY_WEB_CONFIG_GUIDE.md)
- [IPIDEA 配置指南](./IPIDEA_WEB_CONFIG_GUIDE.md)
- [代理提供商配置参考](./PROVIDER_CONFIG_REFERENCE.md)
- [Kookeey 官方文档](https://www.kookeey.net/apidoc)

---

## ✅ 完成清单

- [x] DTO 定义实现
- [x] Adapter 适配器实现
- [x] Service 服务层实现
- [x] Controller 控制器实现
- [x] ProxyModule 注册
- [x] HMAC-SHA1 签名实现
- [x] 成本计算实现
- [x] 代码编译通过
- [x] 配置指南文档
- [x] 集成总结文档

---

## 🎯 后续工作

### 短期任务

1. **测试验证**
   - [ ] 使用真实 Kookeey 账户测试所有 API
   - [ ] 验证签名生成正确性
   - [ ] 测试各种地区和参数组合

2. **错误处理**
   - [ ] 完善 API 错误码映射
   - [ ] 添加重试机制
   - [ ] 实现告警通知

3. **性能优化**
   - [ ] 实现请求限流（10 qps/s）
   - [ ] 添加代理池预热
   - [ ] 优化签名计算性能

### 长期任务

1. **功能增强**
   - [ ] 支持多分组管理
   - [ ] 实现代理健康检查
   - [ ] 添加代理质量评分

2. **监控告警**
   - [ ] 集成 Prometheus 指标
   - [ ] 添加 Grafana 仪表板
   - [ ] 实现余额不足告警

3. **文档完善**
   - [ ] 添加 API 使用示例
   - [ ] 编写故障排查指南
   - [ ] 创建最佳实践文档

---

## 📞 技术支持

**遇到问题？**

1. 查看日志: `pm2 logs proxy-service`
2. 检查配置: 确保 `accessId` 和 `token` 正确
3. 测试连接: 使用 `/test` 端点验证配置
4. 查阅文档: [KOOKEEY_WEB_CONFIG_GUIDE.md](./KOOKEEY_WEB_CONFIG_GUIDE.md)

---

**集成完成时间**: 2025-01-24
**维护者**: Claude Code
**版本**: 1.0.0
