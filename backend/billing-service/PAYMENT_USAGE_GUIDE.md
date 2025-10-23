# 海外支付功能使用指南

本文档介绍如何使用新集成的 Stripe、PayPal 和 Paddle 支付功能。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [Stripe 使用指南](#stripe-使用指南)
3. [PayPal 使用指南](#paypal-使用指南)
4. [Paddle 使用指南](#paddle-使用指南)
5. [多货币支持](#多货币支持)
6. [订阅计费](#订阅计费)
7. [Webhook 配置](#webhook-配置)
8. [测试](#测试)

---

## 快速开始

### 1. 环境配置

复制 `.env.example` 到 `.env` 并填写配置：

```bash
# Stripe
STRIPE_MODE=test
STRIPE_TEST_PUBLIC_KEY=pk_test_xxx
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal
PAYPAL_MODE=sandbox
PAYPAL_SANDBOX_CLIENT_ID=xxx
PAYPAL_SANDBOX_SECRET=xxx

# Paddle
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=xxx
```

### 2. 数据库迁移

```bash
# 执行迁移
psql -U postgres -d cloudphone < migrations/20250123_add_international_payment_support.sql
```

### 3. 启动服务

```bash
pnpm dev
```

---

## Stripe 使用指南

### 一次性支付

#### 方式 1: 托管页面（推荐）

**后端创建支付：**
```typescript
POST /api/billing/payments
{
  "orderId": "order-uuid",
  "method": "stripe",
  "amount": 99.99,
  "currency": "USD",
  "paymentMode": "hosted"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "paymentUrl": "https://checkout.stripe.com/c/pay/xxx",
    "status": "processing"
  }
}
```

**前端处理：**
```typescript
// 跳转到 Stripe Checkout
window.location.href = response.data.paymentUrl;

// 用户支付后会自动跳转回 successUrl
// 默认: http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}
```

#### 方式 2: 自定义 UI（更好的用户体验）

**后端创建支付：**
```typescript
POST /api/billing/payments
{
  "orderId": "order-uuid",
  "method": "stripe",
  "amount": 99.99,
  "currency": "USD",
  "paymentMode": "custom"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "clientSecret": "pi_xxx_secret_xxx",
    "status": "processing"
  }
}
```

**前端使用 Stripe Elements：**
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// 1. 加载 Stripe
const stripePromise = loadStripe('pk_test_xxx');

// 2. 创建支付表单
function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: 'http://localhost:5173/payment/success',
      },
    });

    if (error) {
      console.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  );
}

// 3. 在父组件中使用
function PaymentPage({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}
```

### 订阅计费

**创建订阅（托管模式）：**
```typescript
POST /api/billing/subscriptions
{
  "provider": "stripe",
  "priceId": "price_xxx",  // Stripe Dashboard 中创建的 Price ID
  "customerEmail": "user@example.com",
  "interval": "month",
  "trialPeriodDays": 7,
  "currency": "USD",
  "mode": "hosted"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_xxx",
    "hostedPageUrl": "https://checkout.stripe.com/c/pay/cs_xxx",
    "status": "incomplete"
  }
}
```

### 退款

```typescript
POST /api/billing/payments/:paymentId/refund
{
  "amount": 50.00,  // 部分退款
  "reason": "Customer request"
}
```

---

## PayPal 使用指南

### 一次性支付

**创建 PayPal 订单：**
```typescript
POST /api/billing/payments
{
  "orderId": "order-uuid",
  "method": "paypal",
  "amount": 99.99,
  "currency": "USD"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "paymentUrl": "https://www.sandbox.paypal.com/checkoutnow?token=xxx",
    "transactionId": "PAYPAL-ORDER-ID"
  }
}
```

**前端集成（可选使用 PayPal JS SDK）：**
```html
<!-- 1. 加载 PayPal SDK -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD"></script>

<!-- 2. 创建按钮容器 -->
<div id="paypal-button-container"></div>

<!-- 3. 渲染按钮 -->
<script>
  paypal.Buttons({
    createOrder: async () => {
      // 调用后端创建订单
      const response = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order-uuid',
          method: 'paypal',
          amount: 99.99,
          currency: 'USD'
        })
      });
      const data = await response.json();
      return data.data.transactionId;
    },
    onApprove: async (data) => {
      // 支付完成，捕获订单
      console.log('Payment approved:', data);
    }
  }).render('#paypal-button-container');
</script>
```

### 订阅计费

**创建 PayPal 订阅：**
```typescript
POST /api/billing/subscriptions
{
  "provider": "paypal",
  "priceId": "P-xxx",  // PayPal Billing Plan ID
  "customerEmail": "user@example.com",
  "currency": "USD"
}
```

---

## Paddle 使用指南

Paddle 主要用于 SaaS 订阅业务，自动处理税务和发票。

### 一次性支付

**创建交易：**
```typescript
POST /api/billing/payments
{
  "orderId": "order-uuid",
  "method": "paddle",
  "amount": 99.99,
  "currency": "USD",
  "description": "Cloud Phone Premium Plan"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "paymentUrl": "https://buy.paddle.com/checkout/txn_xxx",
    "transactionId": "txn_xxx"
  }
}
```

### 订阅计费

**创建订阅：**
```typescript
POST /api/billing/subscriptions
{
  "provider": "paddle",
  "priceId": "pri_xxx",  // Paddle Price ID
  "customerEmail": "user@example.com",
  "interval": "month",
  "currency": "USD"
}
```

---

## 多货币支持

### 支持的货币

系统支持以下 12 种货币：
- USD - 美元
- EUR - 欧元
- GBP - 英镑
- JPY - 日元
- CNY - 人民币
- AUD - 澳元
- CAD - 加元
- CHF - 瑞士法郎
- HKD - 港币
- SGD - 新加坡元
- INR - 印度卢比
- KRW - 韩元

### 货币转换

**API 调用：**
```typescript
GET /api/billing/currency/convert?amount=100&from=USD&to=EUR

// 响应
{
  "success": true,
  "data": {
    "amount": 85.00,
    "from": "USD",
    "to": "EUR",
    "rate": 0.85
  }
}
```

**后端使用：**
```typescript
import { CurrencyService } from '../currency/currency.service';

// 注入服务
constructor(private currencyService: CurrencyService) {}

// 转换货币
const eurAmount = await this.currencyService.convert(100, 'USD', 'EUR');
// => 85.00

// 格式化显示
const formatted = this.currencyService.format(99.99, 'USD');
// => "$99.99"

const formattedJPY = this.currencyService.format(1000, 'JPY');
// => "¥1,000" (日元无小数位)
```

---

## 订阅计费

### 创建订阅

```typescript
POST /api/billing/subscriptions
{
  "provider": "stripe",  // stripe | paypal | paddle
  "priceId": "price_xxx",
  "customerEmail": "user@example.com",
  "interval": "month",  // day | week | month | year
  "intervalCount": 1,
  "trialPeriodDays": 7,
  "currency": "USD",
  "mode": "hosted"
}
```

### 查询订阅

```typescript
GET /api/billing/subscriptions/:subscriptionId

// 响应
{
  "success": true,
  "data": {
    "id": "sub-uuid",
    "status": "active",
    "provider": "stripe",
    "currentPeriodStart": "2025-01-01T00:00:00Z",
    "currentPeriodEnd": "2025-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "price": 29.99,
    "currency": "USD",
    "interval": "month"
  }
}
```

### 取消订阅

```typescript
// 立即取消
POST /api/billing/subscriptions/:subscriptionId/cancel
{
  "immediately": true
}

// 周期结束时取消
POST /api/billing/subscriptions/:subscriptionId/cancel
{
  "immediately": false
}
```

---

## Webhook 配置

### Stripe Webhook

1. **在 Stripe Dashboard 配置：**
   - URL: `https://your-domain.com/api/billing/payments/notify/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

2. **获取 Webhook Secret：**
   ```
   复制 Stripe Dashboard 中的 Webhook Signing Secret
   设置到 .env: STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

3. **本地测试（使用 Stripe CLI）：**
   ```bash
   # 安装 Stripe CLI
   brew install stripe/stripe-cli/stripe

   # 登录
   stripe login

   # 转发 webhook 到本地
   stripe listen --forward-to localhost:30005/payments/notify/stripe

   # 触发测试事件
   stripe trigger payment_intent.succeeded
   ```

### PayPal Webhook

1. **在 PayPal Developer Dashboard 配置：**
   - URL: `https://your-domain.com/api/billing/payments/notify/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`

2. **获取 Webhook ID：**
   ```
   复制 PayPal Dashboard 中的 Webhook ID
   设置到 .env: PAYPAL_WEBHOOK_ID=xxx
   ```

### Paddle Webhook

1. **在 Paddle Dashboard 配置：**
   - URL: `https://your-domain.com/api/billing/payments/notify/paddle`
   - Events: `transaction.completed`, `transaction.refunded`, `subscription.created`, `subscription.updated`, `subscription.canceled`

2. **获取 Webhook Secret：**
   ```
   设置到 .env: PADDLE_WEBHOOK_SECRET=xxx
   ```

---

## 测试

### Stripe 测试卡号

```
成功支付:
4242 4242 4242 4242  (Visa)
5555 5555 5555 4444  (Mastercard)

失败支付:
4000 0000 0000 0002  (卡片被拒绝)

需要 3D 验证:
4000 0025 0000 3155

有效期: 任意未来日期 (如 12/34)
CVV: 任意 3 位数字 (如 123)
```

### PayPal Sandbox 账户

1. 访问 https://developer.paypal.com/dashboard/accounts
2. 创建 Personal 和 Business 测试账户
3. 使用测试账户登录进行支付测试

### Paddle Sandbox

1. Paddle 自动提供 sandbox 环境
2. 使用测试卡号: `4242 4242 4242 4242`

### 货币服务测试

```bash
# 测试汇率转换
curl http://localhost:30005/currency/convert?amount=100&from=USD&to=EUR

# 测试货币格式化
curl http://localhost:30005/currency/format?amount=99.99&currency=USD

# 获取支持的货币列表
curl http://localhost:30005/currency/supported
```

---

## API 参考

### 创建支付
```
POST /api/billing/payments
Content-Type: application/json

{
  "orderId": "string",
  "method": "stripe" | "paypal" | "paddle",
  "amount": number,
  "currency": "USD",
  "paymentMode": "hosted" | "custom"
}
```

### 查询支付
```
GET /api/billing/payments/:paymentId
```

### 退款
```
POST /api/billing/payments/:paymentId/refund

{
  "amount": number,
  "reason": "string"
}
```

### 创建订阅
```
POST /api/billing/subscriptions

{
  "provider": "stripe" | "paypal" | "paddle",
  "priceId": "string",
  "customerEmail": "string",
  "interval": "month",
  "trialPeriodDays": 7,
  "currency": "USD"
}
```

### 取消订阅
```
POST /api/billing/subscriptions/:subscriptionId/cancel

{
  "immediately": boolean
}
```

---

## 常见问题

### 1. 支付失败怎么办？

检查：
- 环境变量是否正确配置
- API 密钥是否有效（test/live 模式匹配）
- Webhook Secret 是否正确
- 网络是否可以访问支付平台 API

### 2. Webhook 没有收到通知？

- 检查 URL 是否公网可访问（本地测试使用 ngrok 或 Stripe CLI）
- 验证 Webhook Secret 是否正确
- 查看支付平台 Dashboard 中的 Webhook 日志

### 3. 货币转换不准确？

- 汇率每小时更新一次，可能有延迟
- 可以配置 `EXCHANGE_RATE_API_KEY` 使用付费 API
- 生产环境建议使用固定汇率或直接以目标货币定价

### 4. 如何切换到生产模式？

```bash
# Stripe
STRIPE_MODE=live
STRIPE_LIVE_PUBLIC_KEY=pk_live_xxx
STRIPE_LIVE_SECRET_KEY=sk_live_xxx

# PayPal
PAYPAL_MODE=production
PAYPAL_LIVE_CLIENT_ID=xxx
PAYPAL_LIVE_SECRET=xxx

# Paddle
PADDLE_ENVIRONMENT=production
```

---

## 相关链接

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer](https://developer.paypal.com)
- [Paddle Documentation](https://developer.paddle.com)
- [项目进度文档](../PAYMENT_INTEGRATION_PROGRESS.md)
