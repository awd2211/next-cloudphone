# SMS 短信服务集成指南

**项目**: Cloud Phone Platform - Notification Service
**完成日期**: 2025-10-28
**版本**: v1.0

---

## 📋 概述

本文档介绍如何使用集成的海外短信服务，支持三大主流国际短信服务商：

1. **Twilio** - 全球最流行的云通信平台
2. **AWS SNS** - Amazon Simple Notification Service
3. **MessageBird** - 欧洲领先的通信平台

### 核心特性

✅ **多提供商支持** - 支持 3 大海外主流服务商
✅ **自动故障转移** - 主提供商失败自动切换到备用
✅ **统一 API** - 一套代码支持所有提供商
✅ **OTP 验证码管理** - 完整的验证码生命周期管理（生成、验证、过期、重试）
✅ **批量发送** - 支持批量发送短信
✅ **发送统计** - 实时统计发送成功/失败
✅ **号码验证** - 自动验证国际号码格式
✅ **速率限制** - 内置速率限制和重发冷却
✅ **业务集成** - 开箱即用的注册验证、登录2FA、支付通知、设备告警

### 📚 相关文档

- **[业务流程集成示例](./BUSINESS_INTEGRATION_EXAMPLES.md)** - 完整的业务流程集成示例（注册验证、支付通知、设备告警）
- **[OTP 测试脚本](./test-otp.sh)** - 自动化测试 OTP 功能

---

## 🚀 快速开始

### 1. 选择短信服务商

| 服务商 | 推荐场景 | 价格 | 覆盖 |
|--------|---------|------|------|
| **Twilio** | 全球通用，要求高送达率 | $$$ | 200+ 国家 |
| **AWS SNS** | 使用 AWS 生态，预算有限 | $$ | 全球 |
| **MessageBird** | 主要用户在欧洲/亚洲 | $$ | 全球（欧亚优） |

### 2. 注册账号并获取密钥

#### Twilio

1. 访问 [Twilio 官网](https://www.twilio.com/try-twilio)
2. 注册账号（免费试用 $15.50 额度）
3. 获取以下信息：
   - Account SID
   - Auth Token
   - Phone Number（需购买或使用试用号码）

#### AWS SNS

1. 访问 [AWS Console](https://console.aws.amazon.com/)
2. 创建 IAM 用户并授予 SNS 权限
3. 获取以下信息：
   - Access Key ID
   - Secret Access Key
   - 选择 Region（如 us-east-1）

#### MessageBird

1. 访问 [MessageBird](https://www.messagebird.com/signup)
2. 注册账号（免费试用 €10 额度）
3. 在 Dashboard 获取：
   - API Key

### 3. 配置环境变量

复制 `.env.sms.example` 为 `.env` 并填写配置：

```bash
# 主要提供商
SMS_PRIMARY_PROVIDER=twilio

# 备用提供商（逗号分隔）
SMS_FALLBACK_PROVIDERS=aws-sns,messagebird

# Twilio 配置
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# AWS SNS 配置
AWS_SNS_ENABLED=true
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# MessageBird 配置
MESSAGEBIRD_ENABLED=true
MESSAGEBIRD_API_KEY=your_api_key_here
MESSAGEBIRD_ORIGINATOR=CloudPhone
```

### 4. 启动服务

```bash
cd backend/notification-service
pnpm install
pnpm start:dev
```

### 5. 测试发送

```bash
# 发送验证码
curl -X POST http://localhost:30006/sms/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "code": "123456",
    "expiryMinutes": 5
  }'

# 发送普通短信
curl -X POST http://localhost:30006/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello from CloudPhone!"
  }'
```

---

## 📡 API 文档

### 端点列表

#### 基础 SMS API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/sms/send` | 发送单条短信 |
| POST | `/sms/send-otp` | 发送验证码（旧版，保留兼容性） |
| POST | `/sms/send-batch` | 批量发送短信 |
| GET | `/sms/stats` | 获取发送统计 |
| GET | `/sms/health` | 健康检查 |
| GET | `/sms/validate` | 验证手机号 |

#### OTP 验证码 API (新版，推荐使用)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/sms/otp/send` | 发送 OTP 验证码 |
| POST | `/sms/otp/verify` | 验证 OTP 验证码 |
| GET | `/sms/otp/active` | 检查是否有活跃的验证码 |
| GET | `/sms/otp/retries` | 获取剩余重试次数 |
| GET | `/sms/otp/stats` | 获取 OTP 统计信息 |
| POST | `/sms/otp/clear` | 清除验证码（测试用） |

### POST /sms/send

发送单条短信

**请求体**:
```json
{
  "phoneNumber": "+1234567890",  // 必填，国际格式
  "message": "Your message here", // 必填
  "from": "+0987654321"           // 可选，发送方号码
}
```

**响应**:
```json
{
  "success": true,
  "messageId": "SM1234567890abcdef",
  "error": null
}
```

### POST /sms/send-otp

发送验证码短信

**请求体**:
```json
{
  "phoneNumber": "+1234567890",
  "code": "123456",
  "expiryMinutes": 5  // 可选，默认 5 分钟
}
```

**响应**:
```json
{
  "success": true,
  "messageId": "SM1234567890abcdef",
  "error": null
}
```

**自动生成的短信内容**:
```
Your verification code is: 123456. It will expire in 5 minutes. Do not share this code with anyone.
```

### POST /sms/send-batch

批量发送短信

**请求体**:
```json
{
  "phoneNumbers": ["+1234567890", "+0987654321", "+1111111111"],
  "message": "Bulk message content"
}
```

**响应**:
```json
{
  "total": 3,
  "success": 3,
  "failed": 0,
  "results": [
    { "success": true, "messageId": "SM111..." },
    { "success": true, "messageId": "SM222..." },
    { "success": true, "messageId": "SM333..." }
  ]
}
```

### GET /sms/stats

获取所有提供商的发送统计

**响应**:
```json
{
  "twilio": {
    "sent": 150,
    "failed": 2,
    "pending": 0
  },
  "aws-sns": {
    "sent": 50,
    "failed": 0,
    "pending": 1
  },
  "messagebird": {
    "sent": 20,
    "failed": 1,
    "pending": 0
  }
}
```

### GET /sms/health

健康检查

**响应**:
```json
{
  "healthy": true,
  "providers": {
    "twilio": true,
    "aws-sns": true,
    "messagebird": true
  }
}
```

### GET /sms/validate?phoneNumber=+1234567890

验证手机号格式

**响应**:
```json
{
  "phoneNumber": "+1234567890",
  "isValid": true,
  "format": "Valid international format"
}
```

---

## 🔐 OTP 验证码 API 详细文档

### POST /sms/otp/send

发送 OTP 验证码（自动生成 6 位数字验证码）

**请求体**:
```json
{
  "phoneNumber": "+1234567890",
  "type": "registration",  // registration | login | password_reset | phone_verify | payment | device_op
  "customMessage": "Optional custom message"  // 可选，自定义短信内容
}
```

**响应**:
```json
{
  "success": true,
  "error": null
}
```

**错误响应示例**:
```json
{
  "success": false,
  "error": "Too many requests. Maximum 5 OTP requests per hour."
}
```

**OTP 类型说明**:

| 类型 | 过期时间 | 速率限制 | 重发冷却 | 最大重试 |
|------|---------|---------|---------|---------|
| `registration` | 10 分钟 | 5/小时 | 60 秒 | 3 次 |
| `login` | 5 分钟 | 10/小时 | 60 秒 | 3 次 |
| `password_reset` | 15 分钟 | 3/小时 | 120 秒 | 3 次 |
| `phone_verify` | 10 分钟 | 5/小时 | 60 秒 | 3 次 |
| `payment` | 5 分钟 | 10/小时 | 60 秒 | 3 次 |
| `device_op` | 10 分钟 | 5/小时 | 60 秒 | 3 次 |

### POST /sms/otp/verify

验证 OTP 验证码

**请求体**:
```json
{
  "phoneNumber": "+1234567890",
  "code": "123456",
  "type": "registration"
}
```

**成功响应**:
```json
{
  "valid": true
}
```

**失败响应**:
```json
{
  "valid": false,
  "error": "Invalid verification code. 2 attempts remaining."
}
```

### GET /sms/otp/active

检查是否有活跃的验证码

**参数**:
- `phoneNumber`: 手机号 (必填)
- `type`: OTP 类型 (必填)

**示例**: `GET /sms/otp/active?phoneNumber=+1234567890&type=registration`

**响应**:
```json
{
  "phoneNumber": "+1234567890",
  "type": "registration",
  "hasActive": true,
  "remainingSeconds": 587
}
```

### GET /sms/otp/retries

获取剩余重试次数

**参数**:
- `phoneNumber`: 手机号 (必填)
- `type`: OTP 类型 (必填)

**响应**:
```json
{
  "phoneNumber": "+1234567890",
  "type": "registration",
  "remainingRetries": 3
}
```

### GET /sms/otp/stats

获取 OTP 统计信息

**响应**:
```json
{
  "totalActive": 42,
  "byType": {
    "registration": 15,
    "login": 20,
    "password_reset": 5,
    "phone_verify": 1,
    "payment": 1,
    "device_op": 0
  }
}
```

### POST /sms/otp/clear

清除验证码（仅供测试或管理使用）

⚠️ **生产环境应该添加认证保护**

**请求体**:
```json
{
  "phoneNumber": "+1234567890",
  "type": "registration"
}
```

**响应**:
```json
{
  "success": true,
  "message": "OTP cleared successfully"
}
```

---

## 💻 代码示例

### 在 NestJS 服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from './sms/sms.service';

@Injectable()
export class UserService {
  constructor(private smsService: SmsService) {}

  // 用户注册时发送验证码
  async sendRegistrationOtp(phoneNumber: string): Promise<void> {
    const code = this.generateOtp(); // 生成 6 位验证码

    const result = await this.smsService.sendOtp(phoneNumber, code, 5);

    if (!result.success) {
      throw new Error(`Failed to send OTP: ${result.error}`);
    }

    // 将验证码存储到 Redis（5 分钟过期）
    await this.redis.setex(`otp:${phoneNumber}`, 300, code);
  }

  // 支付成功通知
  async notifyPaymentSuccess(userId: string, amount: number): Promise<void> {
    const user = await this.findOne(userId);

    await this.smsService.sendPaymentSuccess(
      user.phoneNumber,
      amount,
      'USD',
    );
  }

  // 设备异常告警
  async alertDeviceIssue(userId: string, deviceId: string, issue: string): Promise<void> {
    const user = await this.findOne(userId);

    await this.smsService.sendDeviceAlert(
      user.phoneNumber,
      deviceId,
      issue,
    );
  }
}
```

### 直接使用提供商

```typescript
import { TwilioSmsProvider } from './sms/providers/twilio.provider';

@Injectable()
export class CustomService {
  constructor(private twilioProvider: TwilioSmsProvider) {}

  async sendCustomSms() {
    // 使用 Twilio 特定功能
    const result = await this.twilioProvider.send({
      to: '+1234567890',
      message: 'Custom message',
    });

    // 检查消息状态
    if (result.messageId) {
      const status = await this.twilioProvider.getMessageStatus(result.messageId);
      console.log('Message status:', status);
    }

    // 检查账户余额
    const balance = await this.twilioProvider.getBalance();
    console.log('Twilio balance:', balance);
  }
}
```

---

## 🔧 高级配置

### 自定义故障转移策略

```typescript
// sms.service.ts
private async sendWithRetry(options: SmsOptions, maxAttempts = 3): Promise<SmsResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await this.send(options);

    if (result.success) {
      return result;
    }

    lastError = result.error;
    this.logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${lastError}`);

    // 等待后重试
    if (attempt < maxAttempts) {
      await this.delay(1000 * attempt); // 指数退避
    }
  }

  return {
    success: false,
    error: `Failed after ${maxAttempts} attempts. Last error: ${lastError}`,
  };
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 自定义短信模板

```typescript
@Injectable()
export class SmsTemplateService {
  constructor(private smsService: SmsService) {}

  async sendWelcome(phoneNumber: string, username: string): Promise<SmsResult> {
    const message = `Welcome to CloudPhone, ${username}! Your account has been created successfully.`;
    return this.smsService.send({ to: phoneNumber, message });
  }

  async sendPasswordReset(phoneNumber: string, resetLink: string): Promise<SmsResult> {
    const message = `Reset your CloudPhone password: ${resetLink}. This link expires in 1 hour.`;
    return this.smsService.send({ to: phoneNumber, message });
  }

  async sendDeviceExpiry(phoneNumber: string, deviceId: string, days: number): Promise<SmsResult> {
    return this.smsService.sendDeviceExpiration(phoneNumber, deviceId, days);
  }
}
```

### 监控和告警

```typescript
@Injectable()
export class SmsMonitoringService {
  constructor(private smsService: SmsService) {}

  @Cron('0 * * * *') // 每小时
  async checkProviderHealth(): Promise<void> {
    const health = await this.smsService.healthCheck();

    if (!health.healthy) {
      // 发送告警到运维团队
      this.logger.error('SMS service unhealthy:', health.providers);
      // 可以通过邮件、Slack 等渠道通知
    }
  }

  @Cron('0 0 * * *') // 每天
  async generateDailyReport(): Promise<void> {
    const stats = await this.smsService.getAllStats();

    const report = {
      date: new Date().toISOString().split('T')[0],
      providers: stats,
      total: Object.values(stats).reduce((sum, s) => sum + s.sent, 0),
    };

    this.logger.log('Daily SMS report:', report);
    // 保存到数据库或发送报告
  }
}
```

---

## 📊 价格对比

### 各国短信价格示例（每条）

| 国家 | Twilio | AWS SNS | MessageBird |
|------|--------|---------|-------------|
| 美国 | $0.0075 | $0.00645 | €0.008 (~$0.009) |
| 英国 | $0.0140 | $0.0090 | €0.011 (~$0.012) |
| 中国 | $0.0500 | $0.0462 | €0.045 (~$0.050) |
| 印度 | $0.0115 | $0.0108 | €0.012 (~$0.013) |
| 德国 | $0.0850 | $0.0620 | €0.065 (~$0.072) |
| 新加坡 | $0.0460 | $0.0353 | €0.038 (~$0.042) |

### 月度成本估算

假设每月发送 10,000 条短信（80% 美国，20% 其他国家）:

**Twilio**:
- 美国: 8,000 × $0.0075 = $60
- 其他: 2,000 × $0.03 = $60
- **总计**: ~$120/月

**AWS SNS**:
- 美国: 8,000 × $0.00645 = $51.60
- 其他: 2,000 × $0.03 = $60
- **总计**: ~$111.60/月

**MessageBird**:
- 美国: 8,000 × €0.008 = €64 (~$70)
- 其他: 2,000 × €0.03 = €60 (~$66)
- **总计**: ~$136/月

### 免费额度

| 服务商 | 免费额度 |
|--------|---------|
| Twilio | 注册赠送 $15.50 |
| AWS SNS | 前 100 条免费（每月） |
| MessageBird | 注册赠送 €10 |

---

## 🛡️ 安全最佳实践

### 1. 限流保护

```typescript
@Injectable()
export class SmsRateLimitService {
  constructor(
    private smsService: SmsService,
    private redis: Redis,
  ) {}

  async sendWithRateLimit(phoneNumber: string, message: string): Promise<SmsResult> {
    // 每个号码每小时最多 5 条短信
    const key = `sms:ratelimit:${phoneNumber}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 小时
    }

    if (count > 5) {
      return {
        success: false,
        error: 'Rate limit exceeded. Maximum 5 SMS per hour.',
      };
    }

    return this.smsService.send({ to: phoneNumber, message });
  }
}
```

### 2. 验证码安全

```typescript
@Injectable()
export class OtpService {
  constructor(
    private smsService: SmsService,
    private redis: Redis,
  ) {}

  async sendOtp(phoneNumber: string): Promise<void> {
    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 发送短信
    const result = await this.smsService.sendOtp(phoneNumber, code, 5);

    if (!result.success) {
      throw new Error('Failed to send OTP');
    }

    // 存储验证码（5 分钟过期）
    await this.redis.setex(`otp:${phoneNumber}`, 300, code);

    // 限制重试次数
    await this.redis.setex(`otp:retry:${phoneNumber}`, 300, '3');
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    // 检查重试次数
    const retries = parseInt(await this.redis.get(`otp:retry:${phoneNumber}`) || '0');
    if (retries <= 0) {
      throw new Error('Maximum verification attempts exceeded');
    }

    // 获取存储的验证码
    const storedCode = await this.redis.get(`otp:${phoneNumber}`);

    if (!storedCode) {
      return false; // 验证码已过期
    }

    if (storedCode !== code) {
      // 减少重试次数
      await this.redis.decr(`otp:retry:${phoneNumber}`);
      return false;
    }

    // 验证成功，删除验证码
    await this.redis.del(`otp:${phoneNumber}`);
    await this.redis.del(`otp:retry:${phoneNumber}`);

    return true;
  }
}
```

### 3. 号码验证

```typescript
// 验证号码格式
if (!this.smsService.validatePhoneNumber(phoneNumber)) {
  throw new BadRequestException('Invalid phone number format. Use international format: +[country code][number]');
}

// 验证号码所属国家
function getCountryCode(phoneNumber: string): string | null {
  // +1 = 北美
  if (phoneNumber.startsWith('+1')) return 'US';
  // +44 = 英国
  if (phoneNumber.startsWith('+44')) return 'GB';
  // +86 = 中国
  if (phoneNumber.startsWith('+86')) return 'CN';
  // ... 更多国家
  return null;
}
```

---

## 🐛 故障排除

### 常见问题

#### 1. "Provider not enabled" 错误

**原因**: 环境变量未正确配置

**解决方案**:
```bash
# 检查环境变量
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN

# 确保 .env 文件被正确加载
cat .env | grep TWILIO
```

#### 2. "Invalid phone number format" 错误

**原因**: 号码格式不正确

**解决方案**:
```typescript
// ❌ 错误格式
"1234567890"         // 缺少国家代码
"001234567890"       // 使用了国际冠码 00
"(123) 456-7890"     // 包含格式字符

// ✅ 正确格式
"+1234567890"        // 国际格式
"+861234567890"      // 中国号码
"+44123456789"       // 英国号码
```

#### 3. Twilio 认证失败

**错误**:
```
Error: [HTTP 401] Unable to create record: Authenticate
```

**解决方案**:
- 验证 Account SID 和 Auth Token 是否正确
- 检查 Twilio 账户是否激活
- 确认试用账户是否已验证目标号码

#### 4. AWS SNS 权限不足

**错误**:
```
AccessDeniedException: User is not authorized to perform: SNS:Publish
```

**解决方案**:
```json
// 为 IAM 用户添加 SNS 权限
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetSMSAttributes",
        "sns:SetSMSAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 5. MessageBird 余额不足

**错误**:
```
Error: Insufficient balance
```

**解决方案**:
- 登录 MessageBird Dashboard
- 充值账户
- 或联系客服获取免费试用额度

### 调试模式

启用详细日志:

```bash
# .env
LOG_LEVEL=debug
NODE_ENV=development
```

查看完整响应:

```typescript
const result = await this.smsService.send(options);
console.log('Full response:', result.rawResponse);
```

---

## 📚 参考资料

### 官方文档

- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [AWS SNS SMS](https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-phone-number-as-subscriber.html)
- [MessageBird SMS API](https://developers.messagebird.com/api/sms-messaging/)

### 定价页面

- [Twilio Pricing](https://www.twilio.com/sms/pricing)
- [AWS SNS Pricing](https://aws.amazon.com/sns/pricing/)
- [MessageBird Pricing](https://www.messagebird.com/pricing)

### 注册链接

- [Twilio 注册](https://www.twilio.com/try-twilio)
- [AWS 注册](https://aws.amazon.com/)
- [MessageBird 注册](https://www.messagebird.com/signup)

---

## ✅ 总结

SMS 短信服务已完全集成，具备以下能力:

✅ **3 大海外服务商** - Twilio, AWS SNS, MessageBird
✅ **自动故障转移** - 主提供商失败自动切换
✅ **统一 API** - 简单易用的发送接口
✅ **验证码专用** - OTP 短信优化
✅ **批量发送** - 高效的批量发送
✅ **实时统计** - 发送成功/失败监控
✅ **号码验证** - 自动格式验证

### 下一步

1. 选择合适的服务商并注册
2. 配置环境变量
3. 测试发送功能
4. 集成到业务流程中
5. 监控发送统计和成本

**建议**: 初期可使用免费额度测试所有三个提供商，然后根据实际使用情况选择性价比最高的作为主提供商。

---

_文档更新时间: 2025-10-28_
