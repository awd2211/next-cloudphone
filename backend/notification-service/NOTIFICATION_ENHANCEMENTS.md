# Notification Service 增强功能实现

## 已完成功能

### 1. SMS 真实提供商集成 ✅

**新增中国本土 SMS 提供商:**

#### 阿里云短信 (Aliyun SMS)
- 文件: `src/sms/providers/aliyun.provider.ts`
- 支持验证码和通知短信
- TC3-HMAC-SHA256 签名算法
- 自动故障转移
- 批量发送支持

**环境变量配置:**
```env
# 阿里云短信配置
ALIYUN_SMS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_SMS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_SMS_SIGN_NAME=云手机平台
ALIYUN_SMS_TEMPLATE_CODE_OTP=SMS_123456  # 验证码模板
ALIYUN_SMS_TEMPLATE_CODE_NOTIFICATION=SMS_789012  # 通知模板
ALIYUN_SMS_ENDPOINT=dysmsapi.aliyuncs.com
```

#### 腾讯云短信 (Tencent Cloud SMS)
- 文件: `src/sms/providers/tencent.provider.ts`
- 支持验证码和通知短信
- TC3-HMAC-SHA256 签名算法
- 批量发送支持(一次最多200个)
- 多地域支持

**环境变量配置:**
```env
# 腾讯云短信配置
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=your_app_id
TENCENT_SMS_SIGN_NAME=云手机平台
TENCENT_SMS_TEMPLATE_ID_OTP=123456  # 验证码模板
TENCENT_SMS_TEMPLATE_ID_NOTIFICATION=789012  # 通知模板
TENCENT_SMS_REGION=ap-guangzhou
```

**使用示例:**
```typescript
// 配置主提供商和备用提供商
SMS_PRIMARY_PROVIDER=aliyun
SMS_FALLBACK_PROVIDERS=tencent,twilio

// 发送验证码
await smsService.sendOtp('+8613800138000', '123456');

// 发送通知
await smsService.sendNotification('+8613800138000', '您的设备已启动');
```

---

### 2. 邮件 Mailgun 提供商集成 ✅

**新增邮件提供商:**

#### Mailgun Provider
- 文件: `src/email/providers/mailgun.provider.ts`
- 高送达率(99%+)
- 支持多收件人、抄送、密送
- 附件支持
- 详细的统计和追踪
- 邮箱验证 API

**环境变量配置:**
```env
# Mailgun 配置 (海外邮件服务)
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM=CloudPhone <noreply@mg.yourdomain.com>
MAILGUN_REGION=us  # us 或 eu
```

#### SMTP Provider (保留)
- 文件: `src/email/providers/smtp.provider.ts`
- 支持标准 SMTP 协议
- 兼容 Gmail、Outlook 等
- 支持自建邮件服务器

**使用示例:**
```typescript
// 配置主提供商
EMAIL_PRIMARY_PROVIDER=mailgun
EMAIL_FALLBACK_PROVIDERS=smtp

// 发送邮件
await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome to CloudPhone!</h1>',
});
```

---

## 待实现功能

### 3. Push 通知服务 (移动端推送)

#### 设计方案

**支持的 Push 服务商:**

1. **极光推送 (JPush)** - 中国市场主流
   - 覆盖 Android + iOS
   - 高到达率
   - 丰富的推送类型

2. **个推 (GeTui)** - 备选方案
   - 智能推送
   - 消息补发机制

3. **Firebase Cloud Messaging (FCM)** - 海外市场
   - Google 官方
   - 免费
   - 全球覆盖

**数据模型设计:**

```typescript
// src/push/push.interface.ts
export interface PushOptions {
  deviceTokens: string[];  // 设备推送令牌
  title: string;
  body: string;
  data?: Record<string, any>;  // 自定义数据
  badge?: number;  // iOS 角标
  sound?: string;  // 提示音
  imageUrl?: string;  // 图片URL
  clickAction?: string;  // 点击动作
  priority?: 'high' | 'normal';
  ttl?: number;  // 生存时间(秒)
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  failedTokens?: string[];
  error?: string;
}

export interface PushProvider {
  readonly name: string;
  send(options: PushOptions): Promise<PushResult>;
  validateToken(token: string): boolean;
}
```

**实现文件结构:**
```
src/push/
├── push.interface.ts          # Push 接口定义
├── push.service.ts            # Push 服务主类
├── push.module.ts             # Push 模块
├── push.controller.ts         # Push API 控制器
├── providers/
│   ├── jpush.provider.ts      # 极光推送
│   ├── getui.provider.ts      # 个推
│   └── fcm.provider.ts        # Firebase FCM
└── entities/
    └── device-token.entity.ts # 设备令牌实体
```

**环境变量配置:**
```env
# 极光推送配置
JPUSH_APP_KEY=your_app_key
JPUSH_MASTER_SECRET=your_master_secret

# 个推配置
GETUI_APP_ID=your_app_id
GETUI_APP_KEY=your_app_key
GETUI_MASTER_SECRET=your_master_secret

# Firebase FCM 配置
FCM_PROJECT_ID=your_project_id
FCM_PRIVATE_KEY=your_private_key
FCM_CLIENT_EMAIL=your_client_email

# Push 主提供商
PUSH_PRIMARY_PROVIDER=jpush
PUSH_FALLBACK_PROVIDERS=getui,fcm
```

**API 端点设计:**
```typescript
POST /push/send                 # 发送推送通知
POST /push/send-batch           # 批量发送
POST /push/register-token       # 注册设备令牌
DELETE /push/unregister-token   # 注销设备令牌
GET /push/stats                 # 获取推送统计
GET /push/health                # 健康检查
```

---

### 4. 用户通知偏好设置

#### 设计方案

**数据模型:**

```typescript
// src/entities/notification-preference.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum NotificationChannel {
  WEBSOCKET = 'websocket',  // 实时 WebSocket 通知
  EMAIL = 'email',          // 邮件通知
  SMS = 'sms',              // 短信通知
  PUSH = 'push',            // 移动推送通知
}

export enum NotificationType {
  // 设备相关
  DEVICE_CREATED = 'device.created',
  DEVICE_STARTED = 'device.started',
  DEVICE_STOPPED = 'device.stopped',
  DEVICE_ERROR = 'device.error',
  DEVICE_EXPIRING = 'device.expiring',

  // 应用相关
  APP_INSTALLED = 'app.installed',
  APP_INSTALL_FAILED = 'app.install_failed',

  // 计费相关
  BILLING_LOW_BALANCE = 'billing.low_balance',
  BILLING_PAYMENT_SUCCESS = 'billing.payment_success',
  BILLING_INVOICE_GENERATED = 'billing.invoice_generated',

  // 系统相关
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;  // 用户ID

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  notificationType: NotificationType;  // 通知类型

  @Column({
    type: 'simple-array',
    default: '',
  })
  enabledChannels: NotificationChannel[];  // 启用的通知渠道

  @Column({ default: true })
  enabled: boolean;  // 是否启用该类型通知

  @Column({ type: 'jsonb', nullable: true })
  customSettings: Record<string, any>;  // 自定义设置(如静默时间段)

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

**默认偏好设置:**

```typescript
// src/notifications/default-preferences.ts
export const DEFAULT_PREFERENCES = {
  // 设备相关 - 重要，默认全渠道通知
  [NotificationType.DEVICE_ERROR]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.DEVICE_EXPIRING]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
    ],
  },

  // 应用相关 - 中等重要
  [NotificationType.APP_INSTALL_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  },

  // 计费相关 - 非常重要
  [NotificationType.BILLING_LOW_BALANCE]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ],
  },

  // 系统公告 - 仅站内通知
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
  },
};
```

**API 端点设计:**

```typescript
// src/notifications/preferences.controller.ts

GET    /notifications/preferences                    # 获取当前用户所有偏好
GET    /notifications/preferences/:type              # 获取特定类型偏好
PUT    /notifications/preferences/:type              # 更新特定类型偏好
POST   /notifications/preferences/batch              # 批量更新偏好
POST   /notifications/preferences/reset              # 重置为默认设置
GET    /notifications/preferences/available-types    # 获取所有可用的通知类型
```

**请求/响应示例:**

```typescript
// 获取所有偏好
GET /notifications/preferences
Response:
{
  "preferences": [
    {
      "notificationType": "device.error",
      "enabled": true,
      "enabledChannels": ["websocket", "email", "sms", "push"],
      "customSettings": {
        "quietHours": {
          "enabled": false,
          "start": "22:00",
          "end": "08:00"
        }
      }
    },
    // ...
  ]
}

// 更新特定偏好
PUT /notifications/preferences/device.error
Request:
{
  "enabled": true,
  "enabledChannels": ["websocket", "email"],  // 关闭 SMS 和 Push
  "customSettings": {
    "quietHours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00"
    }
  }
}

// 批量更新
POST /notifications/preferences/batch
Request:
{
  "preferences": [
    {
      "notificationType": "device.error",
      "enabled": true,
      "enabledChannels": ["websocket"]
    },
    {
      "notificationType": "billing.low_balance",
      "enabled": true,
      "enabledChannels": ["websocket", "email", "sms"]
    }
  ]
}
```

**集成到通知发送逻辑:**

```typescript
// src/notifications/notifications.service.ts

async sendNotification(
  userId: string,
  type: NotificationType,
  payload: any,
): Promise<void> {
  // 1. 获取用户偏好
  const preference = await this.preferencesService.getUserPreference(
    userId,
    type,
  );

  // 2. 检查是否启用
  if (!preference.enabled) {
    this.logger.log(`Notification ${type} disabled for user ${userId}`);
    return;
  }

  // 3. 检查静默时间
  if (this.isInQuietHours(preference.customSettings)) {
    this.logger.log(`User ${userId} is in quiet hours, skipping non-urgent notification`);
    return;
  }

  // 4. 根据启用的渠道发送
  const channels = preference.enabledChannels;

  const promises: Promise<any>[] = [];

  if (channels.includes(NotificationChannel.WEBSOCKET)) {
    promises.push(this.sendWebSocketNotification(userId, payload));
  }

  if (channels.includes(NotificationChannel.EMAIL)) {
    promises.push(this.emailService.send({
      to: user.email,
      subject: payload.title,
      template: payload.template,
      context: payload.data,
    }));
  }

  if (channels.includes(NotificationChannel.SMS)) {
    promises.push(this.smsService.send({
      to: user.phoneNumber,
      message: payload.message,
    }));
  }

  if (channels.includes(NotificationChannel.PUSH)) {
    promises.push(this.pushService.send({
      deviceTokens: await this.getDeviceTokens(userId),
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }));
  }

  // 5. 并行发送所有渠道
  await Promise.allSettled(promises);
}

/**
 * 检查是否在静默时间段
 */
private isInQuietHours(customSettings: any): boolean {
  if (!customSettings?.quietHours?.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const { start, end } = customSettings.quietHours;

  // 简化处理，实际需要处理跨日情况
  return currentTime >= start && currentTime <= end;
}
```

---

## 实现优先级

### 高优先级 ✅
1. ✅ SMS 真实提供商集成 (阿里云、腾讯云) - **已完成**
2. ✅ Mailgun 邮件提供商集成 - **已完成**

### 中优先级 (建议接下来实现)
3. 🔲 用户通知偏好设置 - **核心功能,影响用户体验**
   - 预计工作量: 1-2天
   - 依赖: 需要数据库迁移

4. 🔲 Push 通知服务 (极光推送) - **移动端必需**
   - 预计工作量: 2-3天
   - 依赖: 需要极光推送账号

### 低优先级
5. 🔲 更多 Push 提供商 (个推、FCM) - **可选增强**
   - 预计工作量: 1天/提供商

---

## 数据库迁移

### 用户通知偏好表

```sql
-- 创建通知偏好表
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  enabled_channels TEXT[] DEFAULT '{}',
  custom_settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_type ON notification_preferences(notification_type);
CREATE UNIQUE INDEX idx_notification_preferences_user_type ON notification_preferences(user_id, notification_type);

-- 注释
COMMENT ON TABLE notification_preferences IS '用户通知偏好设置';
COMMENT ON COLUMN notification_preferences.user_id IS '用户ID';
COMMENT ON COLUMN notification_preferences.notification_type IS '通知类型';
COMMENT ON COLUMN notification_preferences.enabled_channels IS '启用的通知渠道: websocket, email, sms, push';
COMMENT ON COLUMN notification_preferences.custom_settings IS '自定义设置 (如静默时间段)';
```

### 设备推送令牌表

```sql
-- 创建设备令牌表
CREATE TABLE device_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  device_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,  -- ios, android
  provider VARCHAR(50) NOT NULL,   -- jpush, getui, fcm
  device_model VARCHAR(100),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_device_push_tokens_user_id ON device_push_tokens(user_id);
CREATE INDEX idx_device_push_tokens_token ON device_push_tokens(device_token);
CREATE INDEX idx_device_push_tokens_active ON device_push_tokens(is_active) WHERE is_active = TRUE;

-- 注释
COMMENT ON TABLE device_push_tokens IS '设备推送令牌';
COMMENT ON COLUMN device_push_tokens.device_token IS 'Push 服务提供商分配的设备令牌';
COMMENT ON COLUMN device_push_tokens.platform IS '设备平台: ios 或 android';
COMMENT ON COLUMN device_push_tokens.provider IS 'Push 提供商: jpush, getui, fcm';
```

---

## 依赖包安装

```bash
cd backend/notification-service

# SMS 依赖 (已包含在项目中)
# axios - HTTP 客户端

# 邮件依赖
pnpm add form-data  # Mailgun 需要

# Push 通知依赖 (待实现时安装)
pnpm add jpush-sdk   # 极光推送
pnpm add getui-rest-sdk  # 个推
pnpm add firebase-admin  # Firebase FCM
```

---

## 测试清单

### SMS 测试
- [ ] 阿里云短信发送验证码
- [ ] 腾讯云短信发送通知
- [ ] 故障转移机制 (主提供商失败切换备用)
- [ ] 批量发送

### 邮件测试
- [ ] Mailgun 发送单封邮件
- [ ] Mailgun 发送带附件邮件
- [ ] SMTP 发送邮件
- [ ] 故障转移机制

### Push 测试 (待实现)
- [ ] 注册设备令牌
- [ ] 发送 Push 到 iOS
- [ ] 发送 Push 到 Android
- [ ] 批量推送

### 通知偏好测试 (待实现)
- [ ] 创建默认偏好
- [ ] 更新偏好设置
- [ ] 偏好过滤生效
- [ ] 静默时间段生效

---

## 总结

本次增强已完成:
1. ✅ **SMS 真实提供商** - 阿里云、腾讯云集成完成
2. ✅ **Mailgun 邮件提供商** - 海外邮件服务集成完成

下一步建议:
1. 实现用户通知偏好设置 (核心功能)
2. 实现移动端 Push 通知 (极光推送)
3. 编写完整的集成测试

所有实现都遵循:
- ✅ 统一的提供商接口
- ✅ 自动故障转移
- ✅ 详细的日志记录
- ✅ 统计信息收集
- ✅ 健康检查支持
