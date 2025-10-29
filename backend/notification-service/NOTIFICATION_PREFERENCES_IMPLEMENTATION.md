# 用户通知偏好功能实现 ✅

## 概述

已完成用户通知偏好设置功能，允许用户自定义接收哪些类型的通知，以及通过哪些渠道接收。

### 支持的通知渠道
- 🌐 **WebSocket** - 网页实时通知（站内信）
- 📧 **Email** - 邮件通知
- 📱 **SMS** - 短信通知

## 已实现的文件

### 1. 数据模型

#### `src/entities/notification-preference.entity.ts`
通知偏好实体，包含：
- `NotificationChannel` 枚举 - 三种通知渠道
- `NotificationType` 枚举 - 28种通知类型
- `NotificationPreference` 实体 - 用户偏好设置

**通知类型分类：**
- 设备相关：9种（创建、启动、停止、故障、过期等）
- 应用相关：5种（安装、卸载、审核等）
- 计费相关：6种（余额、支付、账单、套餐等）
- 用户相关：4种（注册、登录、密码、资料等）
- 系统相关：4种（维护、公告、更新、安全）

### 2. 默认配置

#### `src/notifications/default-preferences.ts`
定义每种通知类型的默认设置：
- 优先级分类（CRITICAL/HIGH/MEDIUM/LOW）
- 默认启用/禁用
- 默认渠道组合

**优先级示例：**
```typescript
// 关键通知 - 全渠道
device.error: [WebSocket, Email, SMS]

// 高优先级 - WebSocket + Email
device.expiring_soon: [WebSocket, Email]

// 中优先级 - WebSocket + Email
app.install_failed: [WebSocket, Email]

// 低优先级 - 仅 WebSocket
device.started: [WebSocket]
```

### 3. 服务层

#### `src/notifications/preferences.service.ts`
核心业务逻辑服务：

**主要方法：**
```typescript
// 获取用户所有偏好（自动创建默认）
getUserPreferences(userId: string): Promise<NotificationPreference[]>

// 获取特定类型偏好
getUserPreference(userId, type): Promise<NotificationPreference>

// 更新单个偏好
updateUserPreference(userId, type, updates): Promise<NotificationPreference>

// 批量更新
batchUpdatePreferences(userId, preferences): Promise<NotificationPreference[]>

// 重置为默认
resetToDefault(userId: string): Promise<NotificationPreference[]>

// 检查是否应该发送（核心过滤逻辑）
shouldReceiveNotification(userId, type, channel): Promise<boolean>
```

**高级特性：**
- ✅ 自动创建默认偏好
- ✅ 静默时间段支持（quietHours）
- ✅ 关键通知即使在静默时间也发送
- ✅ 统计信息收集

### 4. API 端点

#### `src/notifications/preferences.controller.ts`

**REST API 端点：**

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/notifications/preferences` | 获取所有偏好 |
| GET | `/notifications/preferences/:type` | 获取特定类型偏好 |
| PUT | `/notifications/preferences/:type` | 更新特定类型偏好 |
| POST | `/notifications/preferences/batch` | 批量更新偏好 |
| POST | `/notifications/preferences/reset` | 重置为默认设置 |
| GET | `/notifications/preferences/meta/types` | 获取所有可用类型 |
| GET | `/notifications/preferences/meta/stats` | 获取统计信息 |
| POST | `/notifications/preferences/check` | 检查是否应该接收 |
| GET | `/notifications/preferences/channel/:channel` | 获取渠道启用的类型 |

### 5. 数据库迁移

#### `migrations/20251029000000_create_notification_preferences.sql`

**创建的数据库对象：**
- ✅ `notification_channel` 枚举类型
- ✅ `notification_type` 枚举类型（28个值）
- ✅ `notification_preferences` 表
- ✅ 3个索引（user_id, type, user_id+type unique）
- ✅ `updated_at` 自动更新触发器

---

## 使用指南

### 1. 执行数据库迁移

```bash
# 进入 notification-service 目录
cd /home/eric/next-cloudphone/backend/notification-service

# 执行迁移
docker compose -f ../../docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone < migrations/20251029000000_create_notification_preferences.sql
```

### 2. 注册模块到 app.module.ts

在 `src/app.module.ts` 中添加：

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationPreferencesService } from './notifications/preferences.service';
import { NotificationPreferencesController } from './notifications/preferences.controller';

@Module({
  imports: [
    // ... 其他imports
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationPreference,  // ← 新增
    ]),
  ],
  controllers: [
    NotificationsController,
    TemplatesController,
    NotificationPreferencesController,  // ← 新增
  ],
  providers: [
    NotificationsService,
    TemplateService,
    NotificationPreferencesService,  // ← 新增
  ],
})
export class AppModule {}
```

### 3. 集成到通知发送逻辑

修改 `src/notifications/notifications.service.ts`：

```typescript
import { NotificationPreferencesService } from './preferences.service';
import { NotificationChannel } from '../entities/notification-preference.entity';

@Injectable()
export class NotificationsService {
  constructor(
    // ... 其他依赖
    private readonly preferencesService: NotificationPreferencesService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    payload: any,
  ): Promise<void> {
    // 获取用户偏好
    const preference = await this.preferencesService.getUserPreference(userId, type);

    // 检查是否启用
    if (!preference.enabled) {
      this.logger.log(`Notification ${type} disabled for user ${userId}`);
      return;
    }

    // 检查静默时间
    if (this.isInQuietHours(preference.customSettings)) {
      // 关键通知除外
      const criticalTypes = [
        NotificationType.DEVICE_ERROR,
        NotificationType.BILLING_LOW_BALANCE,
        NotificationType.SYSTEM_SECURITY_ALERT,
      ];
      if (!criticalTypes.includes(type)) {
        this.logger.log(`User ${userId} in quiet hours, skipping ${type}`);
        return;
      }
    }

    // 根据启用的渠道发送
    const channels = preference.enabledChannels;
    const promises: Promise<any>[] = [];

    // WebSocket 通知
    if (channels.includes(NotificationChannel.WEBSOCKET)) {
      promises.push(this.sendWebSocketNotification(userId, payload));
    }

    // 邮件通知
    if (channels.includes(NotificationChannel.EMAIL)) {
      const user = await this.getUserInfo(userId);  // 从 user-service 获取
      promises.push(this.emailService.send({
        to: user.email,
        subject: payload.title,
        template: payload.template,
        context: payload.data,
      }));
    }

    // 短信通知
    if (channels.includes(NotificationChannel.SMS)) {
      const user = await this.getUserInfo(userId);
      promises.push(this.smsService.send({
        to: user.phoneNumber,
        message: payload.message,
      }));
    }

    // 并行发送所有渠道
    await Promise.allSettled(promises);
  }
}
```

---

## API 使用示例

### 1. 获取用户所有偏好

```bash
GET /notifications/preferences?userId=user-123

Response:
{
  "userId": "user-123",
  "preferences": [
    {
      "notificationType": "device.error",
      "enabled": true,
      "enabledChannels": ["websocket", "email", "sms"],
      "customSettings": null,
      "updatedAt": "2025-10-29T10:00:00Z"
    },
    {
      "notificationType": "device.started",
      "enabled": true,
      "enabledChannels": ["websocket"],
      "customSettings": null,
      "updatedAt": "2025-10-29T10:00:00Z"
    }
    // ... 其他26个通知类型
  ]
}
```

### 2. 更新特定偏好

```bash
PUT /notifications/preferences/device.error?userId=user-123
Content-Type: application/json

{
  "enabled": true,
  "enabledChannels": ["websocket", "email"],  // 关闭 SMS
  "customSettings": {
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Shanghai"
    }
  }
}

Response:
{
  "success": true,
  "message": "Notification preference updated successfully",
  "preference": {
    "notificationType": "device.error",
    "enabled": true,
    "enabledChannels": ["websocket", "email"],
    "customSettings": { ... },
    "updatedAt": "2025-10-29T10:30:00Z"
  }
}
```

### 3. 批量更新偏好

```bash
POST /notifications/preferences/batch?userId=user-123
Content-Type: application/json

{
  "preferences": [
    {
      "notificationType": "device.error",
      "enabled": true,
      "enabledChannels": ["websocket", "email"]
    },
    {
      "notificationType": "device.started",
      "enabled": false
    },
    {
      "notificationType": "billing.low_balance",
      "enabled": true,
      "enabledChannels": ["websocket", "email", "sms"]
    }
  ]
}

Response:
{
  "success": true,
  "message": "3 preferences updated successfully",
  "updatedCount": 3
}
```

### 4. 重置为默认设置

```bash
POST /notifications/preferences/reset?userId=user-123

Response:
{
  "success": true,
  "message": "Preferences reset to default successfully",
  "totalPreferences": 28
}
```

### 5. 获取统计信息

```bash
GET /notifications/preferences/meta/stats?userId=user-123

Response:
{
  "userId": "user-123",
  "stats": {
    "total": 28,
    "enabled": 26,
    "disabled": 2,
    "byChannel": {
      "websocket": 28,
      "email": 18,
      "sms": 4
    }
  }
}
```

### 6. 获取所有可用通知类型

```bash
GET /notifications/preferences/meta/types

Response:
{
  "total": 28,
  "types": [
    {
      "type": "device.error",
      "description": "设备故障（关键）",
      "priority": "critical",
      "defaultChannels": ["websocket", "email", "sms"]
    },
    {
      "type": "device.started",
      "description": "设备启动",
      "priority": "low",
      "defaultChannels": ["websocket"]
    }
    // ... 其他类型
  ]
}
```

---

## 前端集成示例

### React 组件示例

```typescript
// NotificationSettings.tsx
import React, { useEffect, useState } from 'react';
import { Switch, Checkbox } from 'antd';

interface Preference {
  notificationType: string;
  enabled: boolean;
  enabledChannels: string[];
  description: string;
}

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<Preference[]>([]);

  useEffect(() => {
    // 获取偏好
    fetch('/notifications/preferences?userId=current-user')
      .then(res => res.json())
      .then(data => setPreferences(data.preferences));
  }, []);

  const handleToggle = async (type: string, enabled: boolean) => {
    await fetch(`/notifications/preferences/${type}?userId=current-user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    // 更新本地状态
    setPreferences(prev => prev.map(p =>
      p.notificationType === type ? { ...p, enabled } : p
    ));
  };

  const handleChannelChange = async (type: string, channels: string[]) => {
    await fetch(`/notifications/preferences/${type}?userId=current-user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabledChannels: channels }),
    });
    setPreferences(prev => prev.map(p =>
      p.notificationType === type ? { ...p, enabledChannels: channels } : p
    ));
  };

  return (
    <div>
      <h2>通知设置</h2>
      {preferences.map(pref => (
        <div key={pref.notificationType} style={{ marginBottom: 16 }}>
          <div>
            <Switch
              checked={pref.enabled}
              onChange={(checked) => handleToggle(pref.notificationType, checked)}
            />
            <span style={{ marginLeft: 8 }}>{pref.description}</span>
          </div>
          {pref.enabled && (
            <div style={{ marginLeft: 40 }}>
              <Checkbox
                checked={pref.enabledChannels.includes('websocket')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...pref.enabledChannels, 'websocket']
                    : pref.enabledChannels.filter(c => c !== 'websocket');
                  handleChannelChange(pref.notificationType, channels);
                }}
              >
                网页通知
              </Checkbox>
              <Checkbox
                checked={pref.enabledChannels.includes('email')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...pref.enabledChannels, 'email']
                    : pref.enabledChannels.filter(c => c !== 'email');
                  handleChannelChange(pref.notificationType, channels);
                }}
              >
                邮件通知
              </Checkbox>
              <Checkbox
                checked={pref.enabledChannels.includes('sms')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...pref.enabledChannels, 'sms']
                    : pref.enabledChannels.filter(c => c !== 'sms');
                  handleChannelChange(pref.notificationType, channels);
                }}
              >
                短信通知
              </Checkbox>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 测试清单

### 单元测试
- [ ] PreferencesService.getUserPreferences - 自动创建默认
- [ ] PreferencesService.updateUserPreference - 更新生效
- [ ] PreferencesService.shouldReceiveNotification - 过滤逻辑
- [ ] 静默时间段检查
- [ ] 关键通知忽略静默时间

### 集成测试
- [ ] 创建用户时自动生成默认偏好
- [ ] 更新偏好后发送通知受影响
- [ ] 批量更新所有偏好
- [ ] 重置为默认设置

### E2E 测试
- [ ] 前端修改偏好 → 后端保存 → 通知行为改变
- [ ] 关闭邮件渠道 → 只收到 WebSocket 通知
- [ ] 关闭所有渠道 → 不收到任何通知

---

## 总结

### ✅ 已完成
1. 数据模型（Entity + 枚举）
2. 默认配置（28种通知类型）
3. 服务层（完整业务逻辑）
4. API 端点（9个 REST接口）
5. 数据库迁移文件
6. 完整文档

### 🎯 核心特性
- 28种通知类型覆盖所有业务场景
- 3种通知渠道（WebSocket/Email/SMS）
- 4级优先级（Critical/High/Medium/Low）
- 静默时间段支持
- 关键通知永不静默
- 自动创建默认偏好
- 批量操作支持

### 📊 数据结构
- 1个实体表
- 2个枚举类型
- 3个索引
- 1个触发器

### 🔌 下一步
1. 执行数据库迁移
2. 注册模块到 app.module.ts
3. 集成到通知发送逻辑
4. 前端实现设置页面
5. 编写测试用例

**预计完成时间**: 1-2小时（集成 + 测试）
