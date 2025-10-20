# 用户系统增强功能文档

## 概述

本文档详细介绍了云手机平台用户系统的 5 大增强功能模块，共计 **50+ REST API 接口**，涵盖配额管理、计费系统、工单系统、审计日志和 API 密钥管理。

## 目录

1. [用户配额管理](#1-用户配额管理)
2. [计费系统增强](#2-计费系统增强)
3. [工单系统](#3-工单系统)
4. [审计日志系统](#4-审计日志系统)
5. [API 密钥管理](#5-api-密钥管理)
6. [部署指南](#6-部署指南)

---

## 1. 用户配额管理

### 功能描述

用户配额管理系统提供细粒度的资源配额控制，支持设备数量、CPU、内存、存储、带宽和使用时长的限制。

### 核心实体

**Quota Entity** (`backend/user-service/src/entities/quota.entity.ts`)

```typescript
interface QuotaLimits {
  maxDevices: number;                  // 最大云手机数量
  maxConcurrentDevices: number;        // 最大并发数量
  maxCpuCoresPerDevice: number;        // 每台设备最大 CPU
  maxMemoryMBPerDevice: number;        // 每台设备最大内存
  maxStorageGBPerDevice: number;       // 每台设备最大存储
  totalCpuCores: number;               // 总 CPU 配额
  totalMemoryGB: number;               // 总内存配额
  totalStorageGB: number;              // 总存储配额
  maxBandwidthMbps: number;            // 最大带宽
  monthlyTrafficGB: number;            // 月流量限制
  maxUsageHoursPerDay: number;         // 每日最大使用时长
  maxUsageHoursPerMonth: number;       // 每月最大使用时长
}
```

### REST API 接口 (9 个)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/quotas` | 创建用户配额 | admin |
| GET | `/quotas/user/:userId` | 获取用户配额 | user/admin |
| POST | `/quotas/check` | 检查配额是否充足 | user/admin |
| POST | `/quotas/deduct` | 扣减配额 | system |
| POST | `/quotas/restore` | 恢复配额 | system |
| PUT | `/quotas/:id` | 更新配额 | admin |
| GET | `/quotas/usage-stats/:userId` | 获取使用统计 | user/admin |
| POST | `/quotas/check/batch` | 批量检查配额 | system |
| GET | `/quotas/alerts` | 获取配额告警列表 | admin |

### 使用示例

#### 创建配额

```bash
curl -X POST http://localhost:30001/quotas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "planId": "pro-plan",
    "planName": "专业版",
    "limits": {
      "maxDevices": 10,
      "maxConcurrentDevices": 5,
      "totalCpuCores": 20,
      "totalMemoryGB": 64,
      "totalStorageGB": 500,
      "monthlyTrafficGB": 1000
    }
  }'
```

#### 检查配额

```bash
curl -X POST http://localhost:30001/quotas/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "quotaType": "device",
    "requestedAmount": 1,
    "deviceConfig": {
      "cpuCores": 2,
      "memoryGB": 4,
      "storageGB": 20
    }
  }'
```

### 自动化功能

- **月度重置**: 每月 1 号凌晨自动重置月度配额（流量、使用时长）
- **日度重置**: 每天凌晨自动重置每日使用时长
- **过期检查**: 每小时自动检查并标记过期配额

---

## 2. 计费系统增强

### 功能描述

完整的计费系统，包括余额管理、账单生成和灵活的计费规则配置。

### 2.1 余额管理 (Balance Module)

**核心功能**:
- 余额充值、消费、冻结、解冻
- 交易记录跟踪
- 自动充值支持
- 余额预警

**REST API 接口 (8 个)**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/balance` | 创建余额账户 |
| GET | `/balance/user/:userId` | 获取用户余额 |
| POST | `/balance/recharge` | 余额充值 |
| POST | `/balance/consume` | 余额消费 |
| POST | `/balance/freeze` | 冻结余额 |
| POST | `/balance/unfreeze` | 解冻余额 |
| POST | `/balance/adjust` | 余额调整（管理员） |
| GET | `/balance/transactions/:userId` | 获取交易记录 |
| GET | `/balance/statistics/:userId` | 获取余额统计 |

**使用示例**:

```bash
# 充值
curl -X POST http://localhost:30005/balance/recharge \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-uuid",
    "amount": 1000,
    "orderId": "order-123",
    "paymentId": "pay-456",
    "description": "支付宝充值"
  }'

# 消费
curl -X POST http://localhost:30005/balance/consume \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-uuid",
    "amount": 50.5,
    "deviceId": "device-uuid",
    "description": "设备使用费"
  }'
```

### 2.2 账单管理 (Invoices Module)

**核心功能**:
- 月度账单自动生成
- 账单状态管理
- 账单支付跟踪
- 逾期检测

**REST API 接口 (6 个)**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/invoices` | 创建账单 |
| GET | `/invoices/:id` | 获取账单详情 |
| GET | `/invoices/user/:userId` | 获取用户账单列表 |
| PUT | `/invoices/:id/publish` | 发布账单 |
| POST | `/invoices/:id/pay` | 支付账单 |
| PUT | `/invoices/:id/cancel` | 取消账单 |
| GET | `/invoices/statistics/:userId` | 获取账单统计 |

**账单结构**:

```typescript
interface InvoiceItem {
  id: string;
  description: string;      // 项目描述
  quantity: number;         // 数量
  unitPrice: number;        // 单价
  amount: number;           // 小计
}

interface Invoice {
  invoiceNumber: string;    // INV-202410-000001
  userId: string;
  items: InvoiceItem[];
  subtotal: number;         // 小计
  tax: number;              // 税费
  discount: number;         // 折扣
  total: number;            // 总计
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  status: InvoiceStatus;
}
```

### 2.3 计费规则 (Billing Rules Module)

**核心功能**:
- 5 种计费模型（固定价格、按量计费、阶梯定价、批量折扣、时段定价）
- 灵活的价格计算
- 规则优先级管理

**REST API 接口 (6 个)**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/billing-rules` | 创建计费规则 |
| GET | `/billing-rules` | 获取计费规则列表 |
| GET | `/billing-rules/:id` | 获取计费规则详情 |
| PUT | `/billing-rules/:id` | 更新计费规则 |
| DELETE | `/billing-rules/:id` | 删除计费规则 |
| POST | `/billing-rules/calculate` | 计算价格 |

**计费模型示例**:

```javascript
// 1. 固定价格
{
  ruleType: 'fixed',
  resourceType: 'device',
  fixedPrice: 100.00  // 每月 100 元
}

// 2. 按量计费
{
  ruleType: 'pay_per_use',
  resourceType: 'cpu',
  unitPrice: 0.50,    // 每核心每小时 0.50 元
  billingUnit: 'hour'
}

// 3. 阶梯定价
{
  ruleType: 'tiered',
  resourceType: 'storage',
  tiers: [
    { from: 0, to: 100, price: 0.10 },    // 0-100GB: 0.10元/GB
    { from: 101, to: 500, price: 0.08 },  // 101-500GB: 0.08元/GB
    { from: 501, to: -1, price: 0.05 }    // 500GB+: 0.05元/GB
  ]
}

// 4. 批量折扣
{
  ruleType: 'volume',
  resourceType: 'device',
  tiers: [
    { from: 1, to: 5, price: 100 },       // 1-5台: 100元/台
    { from: 6, to: 20, price: 90 },       // 6-20台: 90元/台
    { from: 21, to: -1, price: 80 }       // 20台+: 80元/台
  ]
}

// 5. 时段定价
{
  ruleType: 'time_based',
  resourceType: 'bandwidth',
  timeBasedPricing: [
    { startHour: 0, endHour: 8, price: 0.05 },   // 00:00-08:00: 低峰
    { startHour: 8, endHour: 18, price: 0.10 },  // 08:00-18:00: 高峰
    { startHour: 18, endHour: 24, price: 0.08 }  // 18:00-24:00: 平峰
  ]
}
```

---

## 3. 工单系统

### 功能描述

完整的客户支持工单系统，支持工单创建、分配、回复、状态跟踪和评分。

### 核心实体

**Ticket Entity**:
- 工单编号 (TKT-20241020-000001)
- 分类 (技术/计费/账户/功能请求/其他)
- 优先级 (低/中/高/紧急)
- 状态 (打开/处理中/待处理/已解决/已关闭)
- 回复计数和响应时间跟踪

### REST API 接口 (9 个)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/tickets` | 创建工单 | user |
| GET | `/tickets/:id` | 获取工单详情 | user/admin |
| GET | `/tickets/user/:userId` | 获取用户工单列表 | user/admin |
| GET | `/tickets` | 获取所有工单 | admin |
| PUT | `/tickets/:id` | 更新工单 | admin |
| POST | `/tickets/:id/replies` | 添加回复 | user/admin |
| GET | `/tickets/:id/replies` | 获取工单回复 | user/admin |
| POST | `/tickets/:id/rate` | 工单评分 | user |
| GET | `/tickets/statistics/overview` | 获取工单统计 | admin |

### 使用示例

#### 创建工单

```bash
curl -X POST http://localhost:30001/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-uuid",
    "subject": "无法启动设备",
    "description": "设备 ID device-123 启动时出现错误...",
    "category": "technical",
    "priority": "high",
    "attachments": [
      {
        "filename": "error.png",
        "url": "https://cdn.example.com/error.png",
        "size": 45632,
        "mimeType": "image/png"
      }
    ]
  }'
```

#### 添加回复

```bash
curl -X POST http://localhost:30001/tickets/ticket-uuid/replies \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "support-uuid",
    "content": "我们已经收到您的问题，正在处理中...",
    "type": "staff"
  }'
```

### 工单统计指标

- 总工单数
- 按状态分布 (打开/处理中/已解决/已关闭)
- 平均响应时间
- 平均解决时间
- 按分类统计
- 按优先级统计

---

## 4. 审计日志系统

### 功能描述

自动记录所有敏感操作的审计日志系统，支持日志查询、搜索和统计分析。

### 核心功能

- **自动审计拦截器**: 自动记录敏感操作
- **操作分类**: 30+ 种操作类型
- **日志级别**: INFO、WARNING、ERROR、CRITICAL
- **操作前后值对比**: 记录变更内容
- **请求追踪**: IP、User-Agent、请求 ID

### 审计操作类型

```typescript
enum AuditAction {
  // 用户操作
  USER_LOGIN, USER_LOGOUT, USER_REGISTER, USER_UPDATE, USER_DELETE,
  PASSWORD_CHANGE, PASSWORD_RESET,

  // 配额操作
  QUOTA_CREATE, QUOTA_UPDATE, QUOTA_DEDUCT, QUOTA_RESTORE,

  // 余额操作
  BALANCE_RECHARGE, BALANCE_CONSUME, BALANCE_ADJUST,
  BALANCE_FREEZE, BALANCE_UNFREEZE,

  // 设备操作
  DEVICE_CREATE, DEVICE_START, DEVICE_STOP, DEVICE_DELETE,

  // 权限操作
  ROLE_ASSIGN, ROLE_REVOKE, PERMISSION_GRANT, PERMISSION_REVOKE,

  // API 操作
  API_KEY_CREATE, API_KEY_REVOKE,

  // 系统操作
  CONFIG_UPDATE, SYSTEM_MAINTENANCE
}
```

### REST API 接口 (4 个)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/audit-logs/user/:userId` | 获取用户审计日志 |
| GET | `/audit-logs/resource/:type/:id` | 获取资源的审计日志 |
| GET | `/audit-logs/search` | 搜索审计日志（管理员） |
| GET | `/audit-logs/statistics` | 获取统计信息（管理员） |

### 使用示例

#### 查询用户审计日志

```bash
curl -X GET "http://localhost:30001/audit-logs/user/user-uuid?action=USER_LOGIN&startDate=2024-10-01&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

#### 搜索失败的操作

```bash
curl -X GET "http://localhost:30001/audit-logs/search?success=false&level=error&limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 审计拦截器集成

审计拦截器会自动记录以下操作：
- 用户登录/登出/注册
- 密码修改/重置
- 配额操作 (创建/更新/扣减/恢复)
- 余额操作 (充值/消费/冻结/解冻)
- API 密钥操作 (创建/撤销)

---

## 5. API 密钥管理

### 功能描述

为用户提供 API 密钥认证方式，支持细粒度的权限控制和使用统计。

### 核心功能

- **密钥生成**: 随机生成 256 位密钥
- **安全存储**: SHA-256 哈希存储
- **权限范围**: 支持通配符权限 (如 `devices:*`)
- **使用统计**: 记录使用次数、最后使用时间和 IP
- **过期管理**: 支持密钥过期时间设置
- **密钥前缀**: 便于识别 (cp_live_xxxxxxx)

### REST API 接口 (8 个)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api-keys` | 创建 API 密钥 |
| GET | `/api-keys/user/:userId` | 获取用户密钥列表 |
| GET | `/api-keys/:id` | 获取密钥详情 |
| PUT | `/api-keys/:id` | 更新密钥 |
| POST | `/api-keys/:id/revoke` | 撤销密钥 |
| DELETE | `/api-keys/:id` | 删除密钥 |
| GET | `/api-keys/statistics/:userId` | 获取统计信息 |
| GET | `/api-keys/test/auth` | 测试密钥认证 |

### 使用示例

#### 创建 API 密钥

```bash
curl -X POST http://localhost:30001/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-uuid",
    "name": "生产环境 API 密钥",
    "scopes": [
      "devices:read",
      "devices:write",
      "quotas:read"
    ],
    "expiresAt": "2025-12-31T23:59:59Z",
    "description": "用于生产环境的自动化脚本"
  }'
```

**响应** (密钥仅返回一次):

```json
{
  "apiKey": {
    "id": "key-uuid",
    "userId": "user-uuid",
    "name": "生产环境 API 密钥",
    "prefix": "cp_live_abc1234",
    "status": "active",
    "scopes": ["devices:read", "devices:write", "quotas:read"],
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2024-10-20T12:00:00.000Z"
  },
  "secret": "cp_live_abc1234xyz...完整密钥..."
}
```

#### 使用 API 密钥调用接口

```bash
# 方式 1: X-API-Key 头
curl -X GET http://localhost:30001/devices \
  -H "X-API-Key: cp_live_abc1234xyz..."

# 方式 2: Authorization Bearer
curl -X GET http://localhost:30001/devices \
  -H "Authorization: Bearer cp_live_abc1234xyz..."
```

### API 权限范围示例

```typescript
// 权限范围定义
const scopes = [
  '*',                    // 所有权限
  'devices:*',            // 所有设备相关权限
  'devices:read',         // 只读设备
  'devices:write',        // 写入设备
  'quotas:read',          // 读取配额
  'balance:read',         // 读取余额
  'tickets:write',        // 创建工单
];
```

### API Key Auth Guard 使用

```typescript
// 在控制器中使用
@Controller('devices')
export class DevicesController {
  @Get()
  @UseGuards(ApiKeyAuthGuard)
  @ApiScopes('devices:read')  // 需要 devices:read 权限
  async listDevices() {
    // ...
  }

  @Post()
  @UseGuards(ApiKeyAuthGuard)
  @ApiScopes('devices:write')  // 需要 devices:write 权限
  async createDevice() {
    // ...
  }
}
```

---

## 6. 部署指南

### 6.1 数据库迁移

新增的表：

**user-service**:
- `quotas` - 用户配额
- `tickets` - 工单
- `ticket_replies` - 工单回复
- `audit_logs` - 审计日志
- `api_keys` - API 密钥

**billing-service**:
- `user_balances` - 用户余额
- `balance_transactions` - 余额交易记录
- `invoices` - 账单
- `billing_rules` - 计费规则

### 6.2 环境变量

确保以下环境变量已配置：

```bash
# User Service
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone
NODE_ENV=development

# Billing Service (同上)
```

### 6.3 启动服务

```bash
# 1. 安装依赖
cd backend/user-service && npm install
cd backend/billing-service && npm install

# 2. 启动服务
npm run start:dev

# 3. 验证健康检查
curl http://localhost:30001/health
curl http://localhost:30005/health
```

### 6.4 Docker 部署

所有模块已集成到现有的 Docker Compose 配置中：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

---

## 7. 总结

### 实现统计

| 模块 | API 数量 | 文件数 | 代码行数 |
|------|----------|--------|----------|
| 用户配额管理 | 9 | 4 | ~1,200 |
| 计费系统增强 | 20 | 12 | ~2,800 |
| 工单系统 | 9 | 5 | ~1,400 |
| 审计日志系统 | 4 | 4 | ~800 |
| API 密钥管理 | 8 | 5 | ~1,000 |
| **总计** | **50** | **30** | **~7,200** |

### 核心特性

✅ **配额管理**: 细粒度资源配额控制，自动重置，告警通知
✅ **计费系统**: 余额管理、账单生成、5种计费模型
✅ **工单系统**: 完整的客户支持流程，响应时间跟踪
✅ **审计日志**: 自动审计拦截器，30+ 操作类型
✅ **API 密钥**: 安全认证，权限范围，使用统计

### 安全特性

- 密码字段自动脱敏
- API 密钥哈希存储
- 审计日志记录所有敏感操作
- JWT + API Key 双认证方式
- 基于角色的访问控制 (RBAC)

### 性能优化

- 数据库索引优化
- 事务一致性保证
- 定时任务异步处理
- 密钥验证缓存
- 分页查询支持

---

## 8. 后续扩展

### 建议功能

1. **通知系统**: WebSocket 实时通知，邮件/短信提醒
2. **数据导出**: 配额、账单、审计日志导出为 Excel/CSV
3. **仪表板**: 可视化统计图表 (Grafana 集成)
4. **费用预测**: 基于历史数据的费用预测
5. **自动化运维**: 自动扩容、自动备份、自动告警

---

## 9. 联系方式

如有问题或建议，请联系：
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@cloudphone.com
- 文档: http://docs.cloudphone.com

---

*文档版本: v1.0*
*最后更新: 2024-10-20*
*生成工具: Claude Code*
