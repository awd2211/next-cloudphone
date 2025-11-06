# Phase 4 实施指南：更新事件消费者以支持角色化通知

**日期**: 2025-11-03
**状态**: 🟡 待实施（需要架构决策）
**前置依赖**: Phase 1-3 已完成

---

## 🔍 问题分析

### 当前架构

事件消费者当前使用以下模式：

```typescript
// device-events.consumer.ts - 当前实现
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'device.created',
  queue: 'notification-service.device.created',
})
async handleDeviceCreated(event: DeviceCreatedEvent) {
  // 1. 渲染模板
  const rendered = await this.templatesService.render('device.created', {
    deviceName: event.deviceName,
    // ...
  });

  // 2. 创建通知
  await this.notificationsService.createAndSend({
    userId: event.userId,  // ❌ 只有 userId，没有角色信息
    title: rendered.title,
    message: rendered.body,
    // ...
  });
}
```

**问题**：
- ❌ 事件数据中没有用户角色信息（`userRole`）
- ❌ 无法直接使用 `createRoleBasedNotification()` 方法
- ❌ 需要从 user-service 获取用户角色

---

## 🎯 解决方案

### 方案 1：在事件中包含角色信息（推荐）

**优点**：
- ✅ 性能最优（无需额外查询）
- ✅ 减少服务间依赖
- ✅ 事件数据完整，便于审计

**缺点**：
- ❌ 需要修改所有发送事件的服务
- ❌ 事件数据略微增大

**实施步骤**：

#### 1. 更新 shared 事件定义

```typescript
// @cloudphone/shared/src/events/schemas/device.events.ts

export interface DeviceCreatedEvent extends BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  userRole: string;           // ✅ 新增：用户角色
  userEmail?: string;          // ✅ 新增：用户邮箱（可选）
  tenantId?: string;
  providerType: DeviceProviderType;
  // ... 其他字段
}

export interface DeviceStartedEvent extends BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  userRole: string;           // ✅ 新增
  userEmail?: string;          // ✅ 新增
  // ... 其他字段
}

// 为所有事件类型添加 userRole 和 userEmail
```

#### 2. 更新 device-service 事件发布

```typescript
// backend/device-service/src/devices/devices.service.ts

async createDevice(dto: CreateDeviceDto, userId: string) {
  // ... 创建设备逻辑

  // 📝 获取用户信息（包括角色）
  const user = await this.userServiceClient.getUserWithRoles(userId);

  // 发布事件时包含角色信息
  await this.eventBus.publishDeviceEvent('created', {
    deviceId: device.id,
    deviceName: device.name,
    userId: user.id,
    userRole: user.primaryRole || user.roles[0]?.name || 'user',  // ✅ 新增
    userEmail: user.email,                                          // ✅ 新增
    tenantId: device.tenantId,
    providerType: device.providerType,
    // ...
  });
}
```

#### 3. 更新 notification-service 事件消费者

```typescript
// backend/notification-service/src/rabbitmq/consumers/device-events.consumer.ts

async handleDeviceCreated(event: DeviceCreatedEvent) {
  this.logger.log(`收到设备创建事件: ${event.deviceName} (用户角色: ${event.userRole})`);

  try {
    // ✅ 直接使用事件中的角色信息
    await this.notificationsService.createRoleBasedNotification(
      event.userId,
      event.userRole,  // ✅ 从事件获取角色
      NotificationType.DEVICE_UPDATE,
      {
        deviceName: event.deviceName,
        deviceId: event.deviceId,
        deviceUrl: `${process.env.FRONTEND_URL}/devices/${event.deviceId}`,
        createdAt: event.createdAt,
        providerType: event.providerType,
        providerDisplayName: this.getProviderDisplayName(event.providerType),
      },
      {
        userEmail: event.userEmail,  // ✅ 从事件获取邮箱
      }
    );

    // ✅ 通知相关管理员（如果需要）
    if (event.tenantId) {
      await this.notifyTenantAdmins(event);
    }
    await this.notifySuperAdmins(event);

  } catch (error) {
    this.logger.error(`处理设备创建事件失败: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * 通知租户管理员
 */
private async notifyTenantAdmins(event: DeviceCreatedEvent) {
  // 获取租户管理员列表
  const tenantAdmins = await this.userServiceClient.getTenantAdmins(event.tenantId);

  await this.notificationsService.createBulkRoleBasedNotifications(
    tenantAdmins.map(admin => ({
      userId: admin.id,
      role: admin.primaryRole,
      email: admin.email,
    })),
    NotificationType.DEVICE_UPDATE,
    (userId, role) => ({
      deviceName: event.deviceName,
      deviceId: event.deviceId,
      userId: event.userId,  // 创建设备的用户
      tenantId: event.tenantId,
      tenantDeviceCount: tenantAdmins[0].metadata?.deviceCount || 0,
      // tenant_admin 专属数据
    })
  );
}

/**
 * 通知超级管理员
 */
private async notifySuperAdmins(event: DeviceCreatedEvent) {
  // 获取超级管理员列表
  const superAdmins = await this.userServiceClient.getSuperAdmins();

  await this.notificationsService.createBulkRoleBasedNotifications(
    superAdmins.map(admin => ({
      userId: admin.id,
      role: 'super_admin',
      email: admin.email,
    })),
    NotificationType.DEVICE_UPDATE,
    async (userId, role) => {
      // 获取系统统计数据
      const systemStats = await this.deviceServiceClient.getSystemStats();

      return {
        deviceName: event.deviceName,
        deviceId: event.deviceId,
        userId: event.userId,
        tenantId: event.tenantId,
        // super_admin 专属数据
        systemTotalDevices: systemStats.totalDevices,
        todayNewDevices: systemStats.todayNewDevices,
        providerType: event.providerType,
      };
    }
  );
}
```

---

### 方案 2：从 user-service 查询角色（备选）

**优点**：
- ✅ 无需修改事件结构
- ✅ 角色信息始终最新

**缺点**：
- ❌ 每个通知都需要查询用户角色（性能影响）
- ❌ 增加服务间依赖
- ❌ 需要处理查询失败的情况

**实施步骤**：

#### 1. 添加 user-service 客户端

```typescript
// backend/notification-service/src/clients/user-service.client.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpClientService } from '@cloudphone/shared';

export interface UserWithRoles {
  id: string;
  username: string;
  email: string;
  primaryRole: string;
  roles: Array<{ name: string }>;
}

@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpClient: HttpClientService) {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
  }

  /**
   * 获取用户及其角色信息
   */
  async getUserWithRoles(userId: string): Promise<UserWithRoles> {
    try {
      const response = await this.httpClient.get<UserWithRoles>(
        `${this.baseUrl}/users/${userId}?includeRoles=true`
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId} from user-service:`, error);

      // 回退到默认角色
      return {
        id: userId,
        username: 'unknown',
        email: '',
        primaryRole: 'user',  // 默认角色
        roles: [{ name: 'user' }],
      };
    }
  }

  /**
   * 批量获取用户角色
   */
  async getUsersWithRoles(userIds: string[]): Promise<Map<string, string>> {
    try {
      const response = await this.httpClient.post<Array<{ id: string; primaryRole: string }>>(
        `${this.baseUrl}/users/batch-roles`,
        { userIds }
      );

      return new Map(response.data.map(u => [u.id, u.primaryRole]));
    } catch (error) {
      this.logger.error('Failed to batch get user roles:', error);

      // 回退到默认角色
      return new Map(userIds.map(id => [id, 'user']));
    }
  }
}
```

#### 2. 在消费者中注入并使用

```typescript
// backend/notification-service/src/rabbitmq/consumers/device-events.consumer.ts

constructor(
  private readonly notificationsService: NotificationsService,
  private readonly emailService: EmailService,
  private readonly templatesService: TemplatesService,
  private readonly userServiceClient: UserServiceClient,  // ✅ 新增
) {}

async handleDeviceCreated(event: DeviceCreatedEvent) {
  try {
    // ✅ 查询用户角色
    const user = await this.userServiceClient.getUserWithRoles(event.userId);

    // ✅ 使用查询到的角色
    await this.notificationsService.createRoleBasedNotification(
      event.userId,
      user.primaryRole,  // ✅ 查询得到的角色
      NotificationType.DEVICE_UPDATE,
      {
        deviceName: event.deviceName,
        // ...
      },
      {
        userEmail: user.email,  // ✅ 查询得到的邮箱
      }
    );
  } catch (error) {
    this.logger.error(`处理设备创建事件失败: ${error.message}`, error.stack);
    throw error;
  }
}
```

---

## 📋 需要更新的事件消费者

### 1. device-events.consumer.ts

**事件处理器**：
- [x] `handleDeviceCreated` - 设备创建
- [x] `handleDeviceCreationFailed` - 设备创建失败
- [x] `handleDeviceStarted` - 设备启动
- [x] `handleDeviceStopped` - 设备停止
- [x] `handleDeviceError` - 设备故障
- [x] `handleDeviceConnectionLost` - 设备连接丢失
- [x] `handleDeviceDeleted` - 设备删除

**更新模式**：
```typescript
// Before
await this.notificationsService.createAndSend({
  userId: event.userId,
  type: NotificationCategory.DEVICE,
  title: rendered.title,
  message: rendered.body,
  data: { ... }
});

// After (方案1)
await this.notificationsService.createRoleBasedNotification(
  event.userId,
  event.userRole,  // 从事件获取
  NotificationType.DEVICE_UPDATE,
  { deviceName, deviceId, ... },
  { userEmail: event.userEmail }
);

// After (方案2)
const user = await this.userServiceClient.getUserWithRoles(event.userId);
await this.notificationsService.createRoleBasedNotification(
  event.userId,
  user.primaryRole,  // 从查询获取
  NotificationType.DEVICE_UPDATE,
  { deviceName, deviceId, ... },
  { userEmail: user.email }
);
```

### 2. user-events.consumer.ts

**事件处理器**：
- [ ] `handleUserRegistered` - 用户注册
- [ ] `handleUserLoginFailed` - 登录失败
- [ ] `handlePasswordReset` - 密码重置
- [ ] `handlePasswordChanged` - 密码修改

**特殊情况**：
- 用户注册时，新用户角色通常是固定的（`user`）
- 可以在事件中直接包含角色信息

### 3. billing-events.consumer.ts

**事件处理器**：
- [ ] `handlePaymentSuccess` - 支付成功
- [ ] `handlePaymentFailed` - 支付失败
- [ ] `handleInvoiceGenerated` - 账单生成
- [ ] `handleBalanceLow` - 余额不足

### 4. app-events.consumer.ts

**事件处理器**：
- [ ] `handleAppInstalled` - 应用安装
- [ ] `handleAppInstallFailed` - 应用安装失败
- [ ] `handleAppUninstalled` - 应用卸载
- [ ] `handleAppApproved` - 应用审核通过

---

## 🛠️ 实施步骤

### 阶段 1：基础设施准备（2 天）

1. **决策选择方案**
   - [ ] 评估两种方案的优缺点
   - [ ] 与团队讨论并达成共识
   - [ ] 确定实施方案

2. **如果选择方案1**：
   - [ ] 更新 @cloudphone/shared 事件定义
   - [ ] 更新 device-service 事件发布逻辑
   - [ ] 更新其他服务的事件发布逻辑

3. **如果选择方案2**：
   - [ ] 创建 UserServiceClient
   - [ ] 添加缓存优化（减少重复查询）
   - [ ] 编写单元测试

### 阶段 2：更新设备事件消费者（1 天）

1. **更新 device-events.consumer.ts**：
   - [ ] 更新构造函数（如需添加 UserServiceClient）
   - [ ] 更新 7 个事件处理器
   - [ ] 添加管理员通知逻辑
   - [ ] 编写单元测试

### 阶段 3：更新其他事件消费者（2 天）

1. **更新 user-events.consumer.ts**
2. **更新 billing-events.consumer.ts**
3. **更新 app-events.consumer.ts**

### 阶段 4：测试和验证（1 天）

1. **单元测试**：
   - [ ] 测试角色匹配逻辑
   - [ ] 测试回退机制
   - [ ] 测试错误处理

2. **集成测试**：
   - [ ] 端到端测试（事件 → 通知 → 接收）
   - [ ] 不同角色接收不同内容验证
   - [ ] 性能测试

---

## 🔧 配置更新

### environment variables

```bash
# .env - notification-service

# User Service (如果使用方案2)
USER_SERVICE_URL=http://user-service:30001

# Device Service (用于获取统计数据)
DEVICE_SERVICE_URL=http://device-service:30002

# Frontend URL (用于生成设备链接)
FRONTEND_URL=https://cloudphone.example.com
```

---

## 📊 性能影响分析

### 方案1（事件包含角色）

- **事件大小增加**: ~50 bytes (userRole + userEmail)
- **额外查询**: 0
- **延迟增加**: 0 ms
- **性能评级**: ⭐⭐⭐⭐⭐

### 方案2（查询用户服务）

- **事件大小增加**: 0
- **额外查询**: 1 次 HTTP 请求/通知
- **延迟增加**: ~10-50ms (取决于网络)
- **性能评级**: ⭐⭐⭐ (可通过缓存优化到 ⭐⭐⭐⭐)

---

## 🎯 推荐决策

**推荐方案 1（在事件中包含角色信息）**

**理由**：
1. ✅ **性能最优**: 无额外查询延迟
2. ✅ **架构简洁**: 减少服务间依赖
3. ✅ **数据完整性**: 事件包含完整上下文
4. ✅ **易于调试**: 事件日志包含所有信息
5. ✅ **成本合理**: 事件大小增加 < 1%

**实施优先级**：
1. 🔴 **高优先级**: device-events.consumer.ts (使用最频繁)
2. 🟡 **中优先级**: user-events.consumer.ts, billing-events.consumer.ts
3. 🟢 **低优先级**: app-events.consumer.ts

---

## ✅ 验收标准

### 功能验收

- [ ] 不同角色用户收到不同内容的通知
- [ ] 管理员可以收到系统级通知（如设备创建）
- [ ] 通知内容准确反映角色权限（super_admin 看到系统统计，user 看不到）
- [ ] 所有通知渠道正常工作（WebSocket, Email, SMS）

### 性能验收

- [ ] 单个通知创建延迟 < 100ms
- [ ] 批量通知（100 用户）处理时间 < 5s
- [ ] 事件消费者无消息积压

### 质量验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 无内存泄漏
- [ ] 日志完整清晰

---

**下一步**: 团队讨论并决定采用哪个方案，然后开始实施。

