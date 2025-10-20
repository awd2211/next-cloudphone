# 支付集成文档 - 云手机平台

## 📋 目录

- [功能概览](#功能概览)
- [支付架构](#支付架构)
- [支持的支付方式](#支持的支付方式)
- [核心功能](#核心功能)
- [API 接口](#api-接口)
- [数据模型](#数据模型)
- [配置指南](#配置指南)
- [使用示例](#使用示例)
- [回调处理](#回调处理)
- [错误处理](#错误处理)
- [测试指南](#测试指南)

---

## 功能概览

云手机平台支付系统提供完整的支付解决方案，支持微信支付、支付宝等主流支付方式。

### ✨ 核心特性

- ✅ **多支付方式**: 微信支付、支付宝、余额支付
- ✅ **扫码支付**: Native 支付（二维码）
- ✅ **自动退款**: 支持全额/部分退款
- ✅ **订单管理**: 订单创建、查询、取消
- ✅ **超时处理**: 自动取消超时未支付订单
- ✅ **回调验签**: 安全的支付回调处理
- ✅ **状态同步**: 主动查询支付状态
- ✅ **Mock 模式**: 开发环境支持 Mock 支付

---

## 支付架构

### 系统架构图

```
┌─────────────────┐
│   用户前端      │
└────────┬────────┘
         │ 1. 创建支付订单
         ▼
┌─────────────────────────────────────────┐
│          API Gateway (30000)            │
└─────────────────┬───────────────────────┘
                  │ 2. 转发请求
                  ▼
┌──────────────────────────────────────────┐
│     Billing Service (30005)              │
│  ┌────────────────────────────────────┐  │
│  │   PaymentsService                  │  │
│  │   ├─ createPayment()               │  │
│  │   ├─ queryPayment()                │  │
│  │   ├─ refundPayment()               │  │
│  │   └─ handleNotification()          │  │
│  └──────────┬─────────────────────────┘  │
│             │                             │
│  ┌──────────┴─────────────────────────┐  │
│  │   Payment Providers                │  │
│  │   ├─ WeChatPayProvider             │  │
│  │   └─ AlipayProvider                │  │
│  └──────────┬─────────────────────────┘  │
└─────────────┼─────────────────────────────┘
              │ 3. 调用第三方API
              ▼
      ┌───────────────────┐
      │   微信支付/支付宝  │
      └───────────────────┘
              │ 4. 支付回调
              ▼
      ┌───────────────────┐
      │  Webhook Handler   │
      └───────────────────┘
```

### 支付流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant API as API Gateway
    participant Billing as Billing Service
    participant Payment as Payment Provider
    participant ThirdParty as 第三方支付

    User->>Frontend: 1. 选择套餐并支付
    Frontend->>API: 2. POST /api/billing/orders
    API->>Billing: 3. 创建订单
    Billing-->>API: 4. 返回订单信息

    Frontend->>API: 5. POST /api/billing/payments
    API->>Billing: 6. 创建支付
    Billing->>Payment: 7. 调用支付提供者
    Payment->>ThirdParty: 8. 统一下单
    ThirdParty-->>Payment: 9. 返回支付URL
    Payment-->>Billing: 10. 返回支付信息
    Billing-->>API: 11. 返回支付详情
    API-->>Frontend: 12. 返回二维码URL
    Frontend-->>User: 13. 展示支付二维码

    User->>ThirdParty: 14. 扫码支付
    ThirdParty-->>Billing: 15. 支付回调
    Billing->>Billing: 16. 验证签名
    Billing->>Billing: 17. 更新订单状态
    Billing-->>ThirdParty: 18. 返回成功响应

    Frontend->>API: 19. 轮询查询支付状态
    API->>Billing: 20. 查询支付
    Billing-->>Frontend: 21. 返回支付成功
```

---

## 支持的支付方式

### 1. 微信支付 (WeChat Pay)

- **支付方式**: Native 扫码支付
- **支持场景**: PC 端、移动端
- **API 版本**: V3
- **官方文档**: https://pay.weixin.qq.com/

**特性**:
- ✅ 二维码支付
- ✅ 自动退款
- ✅ 订单查询
- ✅ 关闭订单
- ✅ RSA 签名验证

### 2. 支付宝 (Alipay)

- **支付方式**: 扫码支付、手机网站支付
- **支持场景**: PC 端、移动端
- **API 版本**: OpenAPI
- **官方文档**: https://opendocs.alipay.com/

**特性**:
- ✅ 预下单（二维码）
- ✅ WAP 支付
- ✅ 退款功能
- ✅ 订单查询
- ✅ RSA2 签名验证

### 3. 余额支付

- **支付方式**: 账户余额扣款
- **支持场景**: 所有场景
- **特性**:
  - ✅ 即时到账
  - ✅ 无需第三方
  - ✅ 自动扣款

---

## 核心功能

### 支付实体 (Payment Entity)

文件: `backend/billing-service/src/payments/entities/payment.entity.ts`

```typescript
export enum PaymentMethod {
  WECHAT = 'wechat',    // 微信支付
  ALIPAY = 'alipay',    // 支付宝
  BALANCE = 'balance',  // 余额支付
}

export enum PaymentStatus {
  PENDING = 'pending',        // 待支付
  PROCESSING = 'processing',  // 支付中
  SUCCESS = 'success',        // 支付成功
  FAILED = 'failed',          // 支付失败
  REFUNDING = 'refunding',    // 退款中
  REFUNDED = 'refunded',      // 已退款
  CANCELLED = 'cancelled',    // 已取消
}
```

**关键字段**:
- `paymentNo`: 支付单号（唯一标识）
- `transactionId`: 第三方交易号
- `paymentUrl`: 支付 URL/二维码
- `expiresAt`: 支付过期时间（15分钟）
- `rawResponse`: 第三方原始响应

### 订单实体 (Order Entity)

文件: `backend/billing-service/src/billing/entities/order.entity.ts`

```typescript
export enum OrderStatus {
  PENDING = 'pending',      // 待支付
  PAID = 'paid',            // 已支付
  CANCELLED = 'cancelled',  // 已取消
  REFUNDED = 'refunded',    // 已退款
  FAILED = 'failed',        // 失败
}
```

**关键字段**:
- `orderNumber`: 订单号
- `expiresAt`: 订单过期时间（30分钟）
- `cancelReason`: 取消原因
- `refundReason`: 退款原因

---

## API 接口

### 基础 URL

```
开发环境: http://localhost:30005
生产环境: https://your-domain.com/api/billing
```

### 1. 创建支付订单

**接口**: `POST /payments`

**请求头**:
```json
{
  "Authorization": "Bearer <access_token>",
  "user-id": "uuid-user-id"
}
```

**请求体**:
```json
{
  "orderId": "uuid-order-id",
  "method": "wechat",
  "amount": 99.9
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-payment-id",
    "paymentNo": "PAY202501201234567890",
    "method": "wechat",
    "amount": 99.9,
    "status": "processing",
    "paymentUrl": "weixin://wxpay/bizpayurl?pr=...",
    "expiresAt": "2025-01-20T12:15:00.000Z"
  },
  "message": "支付订单创建成功"
}
```

### 2. 查询支付状态

**接口**: `POST /payments/query`

**请求体**:
```json
{
  "paymentNo": "PAY202501201234567890"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-payment-id",
    "status": "success",
    "paidAt": "2025-01-20T12:05:00.000Z",
    "transactionId": "4200001234567890"
  },
  "message": "查询支付状态成功"
}
```

### 3. 申请退款

**接口**: `POST /payments/:id/refund`

**请求体**:
```json
{
  "amount": 99.9,
  "reason": "用户申请退款"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-payment-id",
    "status": "refunded",
    "refundAmount": 99.9,
    "refundedAt": "2025-01-20T12:10:00.000Z"
  },
  "message": "退款申请成功"
}
```

### 4. 取消订单

**接口**: `POST /billing/orders/:orderId/cancel`

**请求体**:
```json
{
  "reason": "用户主动取消"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-order-id",
    "status": "cancelled",
    "cancelReason": "用户主动取消",
    "cancelledAt": "2025-01-20T12:00:00.000Z"
  },
  "message": "订单已取消"
}
```

### 5. 微信支付回调

**接口**: `POST /payments/notify/wechat`

**说明**: 该接口由微信支付平台调用，无需手动调用。

### 6. 支付宝回调

**接口**: `POST /payments/notify/alipay`

**说明**: 该接口由支付宝平台调用，无需手动调用。

---

## 数据模型

### 支付记录表 (payments)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_id | UUID | 订单ID |
| user_id | UUID | 用户ID |
| amount | DECIMAL(10,2) | 支付金额 |
| method | ENUM | 支付方式 |
| status | ENUM | 支付状态 |
| payment_no | VARCHAR | 支付单号（唯一） |
| transaction_id | VARCHAR | 第三方交易号 |
| payment_url | VARCHAR | 支付URL |
| raw_response | JSONB | 第三方原始响应 |
| failure_reason | TEXT | 失败原因 |
| refund_amount | DECIMAL(10,2) | 退款金额 |
| refund_reason | TEXT | 退款原因 |
| paid_at | TIMESTAMP | 支付时间 |
| refunded_at | TIMESTAMP | 退款时间 |
| expires_at | TIMESTAMP | 过期时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## 配置指南

### 环境变量配置

文件: `.env`

```bash
# 微信支付配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_SERIAL_NO=ABC123DEF456
WECHAT_API_V3_KEY=your-32-character-api-v3-key
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
WECHAT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----

# 支付宝配置
ALIPAY_APP_ID=2021001234567890
ALIPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

### Mock 模式

如果未配置支付密钥，系统自动启用 Mock 模式：

- ✅ 模拟支付下单（返回 mock 二维码）
- ✅ 模拟支付查询（返回未支付状态）
- ✅ 模拟退款（返回成功）
- ✅ 跳过签名验证

**适用场景**: 开发、测试环境

---

## 使用示例

### 完整支付流程示例

```typescript
// 1. 创建订单
const orderResponse = await fetch('http://localhost:30005/billing/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
  },
  body: JSON.stringify({
    userId: 'user-uuid',
    planId: 'plan-uuid',
    amount: 99.9,
  }),
});
const order = await orderResponse.json();

// 2. 创建支付
const paymentResponse = await fetch('http://localhost:30005/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
    'user-id': 'user-uuid',
  },
  body: JSON.stringify({
    orderId: order.id,
    method: 'wechat',
    amount: 99.9,
  }),
});
const payment = await paymentResponse.json();

// 3. 展示二维码
console.log('支付二维码:', payment.data.paymentUrl);
// 使用 QRCode 库生成二维码图片

// 4. 轮询查询支付状态
const checkPaymentStatus = setInterval(async () => {
  const queryResponse = await fetch('http://localhost:30005/payments/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <token>',
    },
    body: JSON.stringify({
      paymentNo: payment.data.paymentNo,
    }),
  });
  const result = await queryResponse.json();

  if (result.data.status === 'success') {
    clearInterval(checkPaymentStatus);
    console.log('支付成功！');
    // 跳转到成功页面
  } else if (result.data.status === 'cancelled' || result.data.status === 'failed') {
    clearInterval(checkPaymentStatus);
    console.log('支付失败或已取消');
  }
}, 3000); // 每3秒查询一次

// 5. 取消订单（可选）
setTimeout(async () => {
  const cancelResponse = await fetch(`http://localhost:30005/billing/orders/${order.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <token>',
    },
    body: JSON.stringify({
      reason: '用户主动取消',
    }),
  });
  clearInterval(checkPaymentStatus);
}, 60000); // 60秒后自动取消
```

---

## 回调处理

### 微信支付回调

**接口**: `POST /payments/notify/wechat`

**请求头**:
```
Wechatpay-Timestamp: 1234567890
Wechatpay-Nonce: abc123
Wechatpay-Signature: BASE64_SIGNATURE
Wechatpay-Serial: SERIAL_NO
```

**请求体**:
```json
{
  "id": "notification-id",
  "create_time": "2025-01-20T12:00:00+08:00",
  "event_type": "TRANSACTION.SUCCESS",
  "resource": {
    "out_trade_no": "PAY202501201234567890",
    "transaction_id": "4200001234567890",
    "trade_state": "SUCCESS"
  }
}
```

**处理流程**:
1. 验证签名
2. 解析回调数据
3. 更新支付状态
4. 更新订单状态
5. 返回成功响应

### 支付宝回调

**接口**: `POST /payments/notify/alipay`

**请求体** (Form Data):
```
out_trade_no=PAY202501201234567890
trade_no=2025012012345678901234567890
trade_status=TRADE_SUCCESS
total_amount=99.90
sign=BASE64_SIGNATURE
```

**处理流程**:
1. 验证签名
2. 解析回调参数
3. 更新支付状态
4. 更新订单状态
5. 返回 "success"

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 5001 | 订单不存在 | 检查订单ID是否正确 |
| 5002 | 支付失败 | 查看 failure_reason |
| 5003 | 余额不足 | 充值或选择其他支付方式 |
| 5005 | 配额超限 | 升级套餐 |
| 400 | 支付金额与订单金额不一致 | 检查金额是否正确 |
| 400 | 订单状态不允许支付 | 检查订单状态 |
| 400 | 签名验证失败 | 检查配置的密钥 |

### 错误响应示例

```json
{
  "success": false,
  "errorCode": 5001,
  "message": "订单不存在: uuid-order-id",
  "statusCode": 404,
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

---

## 测试指南

### Mock 模式测试

**步骤**:
1. 不配置支付密钥（或配置为空）
2. 启动服务
3. 调用支付接口
4. 系统返回 mock 数据

**示例**:
```bash
# 不设置支付配置
unset WECHAT_APP_ID
unset ALIPAY_APP_ID

# 启动服务
cd backend/billing-service
pnpm run dev

# 创建支付
curl -X POST http://localhost:30005/payments \
  -H "Content-Type: application/json" \
  -H "user-id: test-user-id" \
  -d '{
    "orderId": "test-order-id",
    "method": "wechat",
    "amount": 99.9
  }'

# 返回 mock 支付URL
# paymentUrl: "weixin://wxpay/bizpayurl?pr=mock_PAY..."
```

### 定时任务测试

**测试超时订单取消**:
```bash
# 1. 创建支付订单（15分钟过期）
# 2. 等待超过15分钟
# 3. 定时任务自动运行（每5分钟）
# 4. 检查支付状态 -> cancelled
```

**测试订单超时取消**:
```bash
# 1. 创建订单（30分钟过期）
# 2. 等待超过30分钟
# 3. 定时任务自动运行（每5分钟）
# 4. 检查订单状态 -> cancelled
```

---

## 文件清单

### 新增文件

```
backend/billing-service/src/payments/
├── entities/
│   └── payment.entity.ts          # 支付实体定义
├── dto/
│   └── create-payment.dto.ts      # DTO 定义
├── providers/
│   ├── wechat-pay.provider.ts     # 微信支付提供者（400+ 行）
│   └── alipay.provider.ts         # 支付宝提供者（280+ 行）
├── payments.service.ts            # 支付服务（380+ 行）
├── payments.controller.ts         # 支付控制器（120+ 行）
└── payments.module.ts             # 支付模块

backend/billing-service/src/billing/
└── entities/
    └── order.entity.ts            # 订单实体（更新）
```

### 更新文件

- `backend/billing-service/src/app.module.ts` - 导入 PaymentsModule
- `backend/billing-service/src/billing/billing.service.ts` - 添加订单管理功能
- `backend/billing-service/src/billing/billing.controller.ts` - 添加取消订单接口
- `.env.example` - 添加支付配置
- `backend/billing-service/.env.example` - 更新支付配置

---

## 统计数据

- **新增文件**: 8 个
- **更新文件**: 5 个
- **代码行数**: 约 1,800+ 行
- **API 端点**: 6 个
- **支付方式**: 3 种
- **定时任务**: 2 个

---

## 下一步

### 优先级 1 - 必需功能
- [ ] 单元测试（支付服务、订单服务）
- [ ] 集成测试（支付流程、回调处理）
- [ ] 支付日志增强（记录所有支付操作）

### 优先级 2 - 增强功能
- [ ] 支付通知（邮件、短信）
- [ ] 账单生成（PDF）
- [ ] 发票管理
- [ ] 分账功能（多商户）

### 优先级 3 - 优化
- [ ] 支付性能优化（并发处理）
- [ ] 缓存支付状态（Redis）
- [ ] 支付监控（Prometheus）
- [ ] 支付数据分析

---

## 技术支持

如有问题，请查阅：
- [微信支付官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [支付宝开放平台](https://opendocs.alipay.com/)
- [项目 GitHub Issues](https://github.com/your-repo/issues)

---

**文档版本**: v1.0.0
**最后更新**: 2025-01-20
**作者**: Claude Code
