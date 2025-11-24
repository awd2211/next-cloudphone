# 代理供应商配置参考文档

本文档详细说明每个代理供应商的实际 API 接口和配置参数。

## 1. Bright Data (原 Luminati)

### API 特点
- 超级代理模式：通过单个主机访问，用户名控制所有参数
- 主机：`brd.superproxy.io`
- 端口：`22225`
- 通过用户名控制国家、城市、会话等参数

### 配置示例
```json
{
  "apiKey": "your-bright-data-api-key",
  "username": "brd-customer-XXXXX-zone-residential",
  "password": "your-password",
  "apiUrl": "https://api.brightdata.com",
  "zone": "residential"
}
```

### 配置字段说明
- **apiKey**: Bright Data API 密钥（用于 API 调用）
- **username**: Zone 用户名（格式：`brd-customer-{id}-zone-{zone}`）
- **password**: Zone 密码
- **apiUrl**: API 端点（默认：`https://api.brightdata.com`）
- **zone**: Zone 名称（如：residential, datacenter, mobile）

### 用户名参数格式
Bright Data 通过用户名控制代理行为：
- 基础格式：`brd-customer-{id}-zone-{zone}`
- 添加国家：`-country-us`
- 添加城市：`-city-newyork`
- 添加会话：`-session-{id}`

完整示例：`brd-customer-123456-zone-residential-country-us-city-newyork-session-abc123`

---

## 2. Oxylabs

### API 特点
- 超级代理模式
- 主机：`pr.oxylabs.io`
- 端口：`7777`（HTTP）或 `8001`（HTTPS）
- 通过用户名控制参数

### 配置示例
```json
{
  "apiKey": "your-oxylabs-api-key",
  "username": "customer-USERNAME",
  "password": "your-password",
  "apiUrl": "https://api.oxylabs.io"
}
```

### 配置字段说明
- **apiKey**: Oxylabs API 密钥
- **username**: 客户用户名（格式：`customer-{username}`）
- **password**: 密码
- **apiUrl**: API 端点（默认：`https://api.oxylabs.io`）

### 用户名参数格式
- 基础格式：`customer-{username}`
- 添加国家：`-cc-us`
- 添加城市：`-city-new_york`
- 添加会话：`-sesstime-10` (10分钟会话)

完整示例：`customer-johndoe-cc-us-city-new_york-sesstime-10`

---

## 3. IPRoyal

### API 特点
- 超级代理模式
- 主机：`geo.iproyal.com`
- 端口：`12321`
- 简单的用户名/密码认证

### 配置示例
```json
{
  "apiKey": "your-iproyal-api-key",
  "username": "your-username",
  "password": "your-password",
  "apiUrl": "https://dashboard.iproyal.com/api"
}
```

### 配置字段说明
- **apiKey**: IPRoyal API 密钥
- **username**: 代理用户名
- **password**: 代理密码
- **apiUrl**: API 端点（默认：`https://dashboard.iproyal.com/api`）

### 用户名参数格式
IPRoyal 使用固定用户名，国家/城市选择通过代理端口或 API 配置：
- 用户名格式：`username_{params}`
- 添加国家：`username_country-us`
- 添加状态/省：`username_state-california`
- 添加城市：`username_city-losangeles`

完整示例：`myuser_country-us_city-losangeles`

---

## 4. IPIDEA (家宽代理)

### API 特点
- 隧道代理模式
- 网关地址：用户特定（格式：`{hash}.lqz.na.ipidea.online`）
- 端口：`2336`（新版）或 `2333`（旧版）
- API 端点：`https://www.ipidea.net/api`
- 使用 `appkey` 进行 API 认证

### 配置示例
```json
{
  "apiKey": "your-appkey",
  "username": "your-proxy-username",
  "password": "your-proxy-password",
  "gateway": "e255c08e04856698.lqz.na.ipidea.online",
  "port": 2336
}
```

### 配置字段说明
- **apiKey**: IPIDEA AppKey（用于 API 调用）
- **username**: 代理认证用户名（基础账户名）
- **password**: 代理认证密码
- **gateway**: 用户专属网关地址（在 IPIDEA 控制台获取）
- **port**: 代理端口（新版：2336，旧版：2333）

### 用户名参数格式
IPIDEA 通过用户名控制代理行为：
- 基础格式：`{account}-zone-custom`
- 添加国家：`-region-us`
- 添加州/省：`-st-california`
- 添加城市：`-city-losangeles`
- 添加会话：`-session-{id}`
- 会话时长：`-sessTime-30` (分钟，最长120)
- 指定ISP：`-asn-{asn_number}`

完整示例：`myaccount-zone-custom-region-us-city-losangeles-session-abc123-sessTime-30`

### API 接口
IPIDEA 使用 POST 请求，参数在 body 中：

**获取剩余流量：**
```
POST https://www.ipidea.net/api/open/flow_left
Body: { "appkey": "your-appkey" }
```

**获取认证账户列表：**
```
POST https://www.ipidea.net/api/open/proxy_account_list
Body: { "appkey": "your-appkey", "page": 1, "limit": 100 }
```

**添加白名单IP：**
```
POST https://www.ipidea.net/api/open/white_add
Body: { "appkey": "your-appkey", "ip": "1.2.3.4" }
```

---

## 5. SmartProxy

### API 特点
- 超级代理模式
- 主机：`gate.smartproxy.com`
- 端口：`7000` (HTTP) 或 `10000` (HTTPS)
- 通过用户名控制参数

### 配置示例
```json
{
  "apiKey": "your-smartproxy-api-key",
  "username": "sp-USERNAME",
  "password": "your-password",
  "apiUrl": "https://api.smartproxy.com"
}
```

### 配置字段说明
- **apiKey**: SmartProxy API 密钥
- **username**: 用户名（格式：`sp-{username}`）
- **password**: 密码
- **apiUrl**: API 端点（默认：`https://api.smartproxy.com`）

### 用户名参数格式
- 基础格式：`sp-{username}`
- 添加国家：`-country-us`
- 添加城市：`-city-newyork`
- 添加会话：`-session-{id}`

---

## 配置通用字段

所有供应商配置都应包含以下通用字段（在 DTO 层面）：

```typescript
{
  name: string;              // 供应商名称（显示用）
  type: ProxyProviderType;   // 供应商类型
  enabled: boolean;          // 是否启用
  priority: number;          // 优先级（值越大越优先）
  costPerGB: number;         // 每GB成本（USD）
  config: {
    // 供应商特定配置（见上面各供应商详细说明）
    apiKey?: string;
    username?: string;
    password?: string;
    apiUrl?: string;
    zone?: string;
    gateway?: string;
    port?: number;
    [key: string]: any;
  };
}
```

## 前端配置示例

前端配置表单应根据选择的供应商类型动态显示不同的字段和示例。

### 建议的前端实现

```typescript
const configExamples = {
  brightdata: {
    label: 'Bright Data',
    example: `{
  "apiKey": "your-api-key",
  "username": "brd-customer-XXXXX-zone-residential",
  "password": "your-password",
  "apiUrl": "https://api.brightdata.com",
  "zone": "residential"
}`,
    fields: ['apiKey', 'username', 'password', 'apiUrl', 'zone'],
  },
  oxylabs: {
    label: 'Oxylabs',
    example: `{
  "apiKey": "your-api-key",
  "username": "customer-USERNAME",
  "password": "your-password",
  "apiUrl": "https://api.oxylabs.io"
}`,
    fields: ['apiKey', 'username', 'password', 'apiUrl'],
  },
  iproyal: {
    label: 'IPRoyal',
    example: `{
  "apiKey": "your-api-key",
  "username": "your-username",
  "password": "your-password",
  "apiUrl": "https://dashboard.iproyal.com/api"
}`,
    fields: ['apiKey', 'username', 'password', 'apiUrl'],
  },
  ipidea: {
    label: 'IPIDEA (家宽代理)',
    example: `{
  "apiKey": "your-appkey",
  "username": "your-proxy-username",
  "password": "your-proxy-password",
  "gateway": "e255c08e04856698.lqz.na.ipidea.online",
  "port": 2336
}`,
    fields: ['apiKey', 'username', 'password', 'gateway', 'port'],
    notes: [
      'apiKey 是 IPIDEA 的 AppKey（用于 API 调用）',
      'username/password 是代理认证账户',
      'gateway 是您的专属网关地址（在控制台获取）',
      'port 通常为 2336（新版）或 2333（旧版）',
    ],
  },
  smartproxy: {
    label: 'SmartProxy',
    example: `{
  "apiKey": "your-api-key",
  "username": "sp-USERNAME",
  "password": "your-password",
  "apiUrl": "https://api.smartproxy.com"
}`,
    fields: ['apiKey', 'username', 'password', 'apiUrl'],
  },
};
```

## 注意事项

1. **API 密钥安全**: 所有配置都应加密存储在数据库中
2. **字段验证**: 前端应根据供应商类型验证必填字段
3. **向后兼容**: 后端应同时支持新旧配置格式
4. **文档链接**: 前端应提供指向各供应商官方文档的链接
5. **测试连接**: 配置保存前应测试连接是否成功

## 官方文档链接

- **Bright Data**: https://docs.brightdata.com/
- **Oxylabs**: https://developers.oxylabs.io/
- **IPRoyal**: https://iproyal.com/documentation/
- **IPIDEA**: https://www.ipidea.net/ucenter/ipidea-api.html
- **SmartProxy**: https://smartproxy.com/documentation

## 更新历史

- 2025-11-24: 初始版本，包含 5 个主流代理供应商配置说明
- 2025-11-24: 修复 IPIDEA gateway/port 字段读取逻辑
