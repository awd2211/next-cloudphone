# 云手机平台事件驱动架构全面审计报告

**审计日期**: 2025-11-24
**审计范围**: 所有后端微服务的事件发布、消费、类型定义和一致性保证
**审计标准**: 微服务最佳实践 + 项目 CLAUDE.md 规范

---

## 执行摘要

### 总体评估: ⚠️ 良好但需改进 (75/100)

**优势**:
- ✅ 统一的 EventBusService 封装良好
- ✅ 完整的 Outbox 模式实现 (事务一致性保证)
- ✅ 丰富的事件类型定义 (device, user, app, order, notification)
- ✅ 多数服务正确使用 `@RabbitSubscribe` 装饰器
- ✅ DLX (Dead Letter Exchange) 配置较完善

**关键问题**:
- ❌ **Outbox 模式使用不一致** (仅 3/10 服务使用)
- ❌ **事件命名不规范** (部分服务未遵循 `{service}.{entity}.{action}` 规范)
- ⚠️ **消费者幂等性处理缺失** (大部分消费者未实现幂等性检查)
- ⚠️ **事件类型定义分散** (部分服务有本地事件定义)
- ⚠️ **缺少统一的事件文档** (各服务发布/消费的事件不够清晰)

---

## 1. 事件发布架构分析

### 1.1 EventBusService 统一性 ✅ 优秀

**位置**: `backend/shared/src/events/event-bus.service.ts`

**架构评估**: 非常好的抽象设计

```typescript
✅ 统一的发布接口:
  - publish(exchange, routingKey, message, options)
  - publishDeviceEvent(eventType, payload)
  - publishUserEvent(eventType, payload)
  - publishAppEvent(eventType, payload)
  - publishOrderEvent(eventType, payload)
  - publishBillingEvent(eventType, payload)
  - publishSystemError(severity, errorCode, message, ...)

✅ 类型安全: 泛型支持 <T extends SimpleEvent>
✅ 自动重连: 基于 @golevelup/nestjs-rabbitmq
✅ 错误处理: try-catch + logger
✅ 持久化: 默认 persistent: true
```

**建议**: 无重大问题，设计优秀

---

### 1.2 Outbox 模式实现 ⚠️ 使用不一致

**位置**: `backend/shared/src/outbox/event-outbox.service.ts`

**优点**:
```typescript
✅ 完整的 Transactional Outbox 模式实现
✅ 事务内写入 + 后台轮询发布 (每 5 秒)
✅ 失败重试机制 (指数退避)
✅ 自动清理 (7 天前的已发布事件)
✅ 统计监控接口 (pending, published, failed, stale events)
```

**问题**:
```typescript
❌ 使用严重不一致:
   使用 Outbox 模式的服务:
   - ✅ user-service (users.service.ts - 用户创建)
   - ✅ device-service (devices.service.ts - 设备创建/删除/启停)
   - ✅ app-service (apps.service.ts - 应用上传/审核)

   未使用 Outbox 模式的服务:
   - ❌ billing-service (直接发布)
   - ❌ notification-service (不需要，仅消费)
   - ❌ user-service (quotas.service.ts 等其他模块)
   - ❌ device-service (lifecycle.service.ts, failover.service.ts 等)
   - ❌ livechat-service (tickets.service.ts 等)
   - ❌ proxy-service (使用本地 EventBusLocalService)
   - ❌ sms-receive-service (number-management.service.ts)
```

**根本原因分析**:
1. **开发者认知不统一**: 部分模块不知道 Outbox 模式的重要性
2. **性能考虑**: Outbox 模式增加延迟 (5 秒轮询)，部分场景需要实时发布
3. **代码迁移成本**: 老代码改造需要改写事务逻辑

**影响评估**:
- **数据一致性风险**: 如果 RabbitMQ 暂时不可用，直接发布的事件会丢失
- **事件顺序问题**: Outbox 保证顺序，直接发布不保证
- **重复事件**: 事务回滚时，Outbox 不会发布，直接发布可能已发送

---

### 1.3 事件命名规范 ⚠️ 部分违规

**项目规范** (来自 CLAUDE.md):
```
Pattern: {service}.{entity}.{action}
Examples: device.created, app.installed, user.registered, billing.payment_success
```

**合规分析**:

#### ✅ 完全合规的服务:
```typescript
device-service:
  ✅ device.created, device.started, device.stopped, device.deleted
  ✅ device.error, device.connection_lost, device.token_refreshed

user-service:
  ✅ user.created, user.updated, user.deleted, user.status.changed
  ✅ user.registered, user.payment_method_added

app-service:
  ✅ app.install.requested, app.install.completed, app.install.failed
  ✅ app.uninstall.requested, app.uploaded

billing-service:
  ✅ billing.payment_success, billing.payment_failed
```

#### ⚠️ 部分违规:
```typescript
device-service (scheduler 模块):
  ⚠️ scheduler.queue.joined (应为 device.queue.joined)
  ⚠️ scheduler.reservation.created (应为 device.reservation.created)
  ⚠️ scheduler.allocation.released (应为 device.allocation.released)
  原因: scheduler 是内部模块，不是顶级服务名

user-service (quotas 模块):
  ⚠️ quota.exceeded, quota.updated, quota.deleted (应为 user.quota.*)
  原因: quota 是 user-service 的子模块

proxy-service:
  ⚠️ proxy.created, proxy.updated (应为 proxy.config.created?)
  分析: 这个可能是正确的，因为 proxy 本身是实体
```

**建议**:
1. **统一规范**: `scheduler.*` 改为 `device.scheduler.*`
2. **统一规范**: `quota.*` 改为 `user.quota.*`
3. **文档补充**: 明确哪些情况可以使用子模块作为前缀

---

### 1.4 事件 Payload 类型安全 ✅ 良好

**优点**:
```typescript
✅ 完整的事件类型定义 (backend/shared/src/events/schemas/*.events.ts):
   - device.events.ts: 17 个事件类 (DeviceCreatedEvent, DeviceStartedEvent, ...)
   - user.events.ts: 4 个事件类 (UserCreatedEvent, UserUpdatedEvent, ...)
   - app.events.ts: 6 个事件类 (AppInstallRequestedEvent, ...)
   - order.events.ts: 4 个事件类 (OrderCreatedEvent, ...)
   - notification.events.ts: 系统通知事件

✅ 所有事件包含必需字段:
   - timestamp (ISO 8601 格式)
   - userId, userRole, userEmail (角色化通知支持)
   - providerType, deviceType (设备事件)

✅ 文档完善: 每个事件类都有详细的 JSDoc 注释
```

**问题**:
```typescript
⚠️ 部分服务有本地事件定义 (重复定义):
   - billing-service/src/events/device-events.handler.ts
     定义了本地的 DeviceUpdatedEvent, DeviceStartedEvent
     应该导入 @cloudphone/shared 的类型

   - livechat-service: 事件类型使用 any (缺乏类型安全)
     @RabbitSubscribe(...) async handleDeviceEvent(event: any)
```

**建议**:
1. **删除重复定义**: 所有事件类型必须从 `@cloudphone/shared` 导入
2. **强制类型检查**: 消费者方法签名必须使用具体事件类型，禁止 `any`

---

## 2. 事件消费架构分析

### 2.1 消费者配置 ✅ 良好

**统计**:
- 总消费者文件: 20 个
- 总 `@RabbitSubscribe` 装饰器: 80 个
- DLX 配置: 48 个队列配置了死信交换机

**服务分布**:
```typescript
notification-service: 10+ 消费者 (最多)
  ✅ device-events.consumer.ts (7 个事件)
  ✅ user-events.consumer.ts
  ✅ app-events.consumer.ts
  ✅ billing-events.consumer.ts
  ✅ dlx.consumer.ts (专门处理失败消息)

device-service: 5 个消费者
  ✅ devices.consumer.ts
  ✅ sms-events.consumer.ts
  ✅ scheduler/consumers/device-events.consumer.ts
  ✅ scheduler/consumers/user-events.consumer.ts
  ✅ scheduler/consumers/billing-events.consumer.ts

billing-service: 3 个消费者
  ✅ metering.consumer.ts (device.started, device.stopped)
  ✅ device-events.handler.ts (device.updated, device.deleted)
  ✅ saga.consumer.ts (device.allocate.*)

app-service: 1 个消费者
  ✅ apps.consumer.ts

livechat-service: 2 个消费者
  ✅ livechat-events.consumer.ts (device.*, user.*)
  ✅ ticket-events.consumer.ts
```

---

### 2.2 幂等性处理 ❌ 严重缺失

**问题**: 几乎所有消费者都没有幂等性检查

**示例问题代码**:
```typescript
// billing-service/src/metering/metering.consumer.ts
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'device.started',
  queue: 'billing-service.device-started',
})
async handleDeviceStarted(event: DeviceStartedEvent) {
  // ❌ 没有检查是否已经处理过此事件
  await this.meteringService.startUsageTracking({
    deviceId: event.deviceId,
    userId: event.userId,
    tenantId: event.tenantId,
  });
}
```

**后果**:
- RabbitMQ 重新投递时会重复处理
- 数据库可能插入重复记录
- 计费可能重复扣费

**最佳实践**:
```typescript
// 推荐方案 1: 使用唯一 ID + 数据库约束
@RabbitSubscribe(...)
async handleDeviceStarted(event: DeviceStartedEvent) {
  try {
    // 插入记录，利用 UNIQUE 约束防止重复
    await this.usageRepository.insert({
      eventId: event.eventId, // ⚠️ 需要在事件中添加 eventId
      deviceId: event.deviceId,
      startTime: event.startedAt,
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      this.logger.warn(`Event ${event.eventId} already processed`);
      return; // 幂等: 不抛出错误，确认消息
    }
    throw error;
  }
}

// 推荐方案 2: 使用 Redis 记录已处理事件
@RabbitSubscribe(...)
async handleDeviceStarted(event: DeviceStartedEvent) {
  const cacheKey = `event:processed:${event.eventId}`;
  const exists = await this.redis.get(cacheKey);

  if (exists) {
    this.logger.warn(`Event ${event.eventId} already processed`);
    return;
  }

  // 处理事件
  await this.meteringService.startUsageTracking(...);

  // 标记已处理 (24 小时过期)
  await this.redis.setex(cacheKey, 86400, '1');
}
```

**影响的消费者** (需要改造):
- ✅ notification-service: 可以重复发送通知，影响较小
- ❌ billing-service/metering.consumer.ts: **必须修复** (重复扣费)
- ❌ device-service/devices.consumer.ts: **必须修复** (重复操作设备)
- ⚠️ app-service/apps.consumer.ts: 需要检查 (重复安装应用)

---

### 2.3 错误处理 ⚠️ 基本合格

**优点**:
```typescript
✅ 大部分消费者有 try-catch 块
✅ 使用 this.logger.error() 记录错误
✅ 多数队列配置了 DLX (48/80)
✅ notification-service 有专门的 dlx.consumer.ts
```

**问题**:
```typescript
⚠️ 错误后的处理策略不明确:
   - 部分消费者捕获错误后不抛出 (消息被确认，永久丢失)
   - 部分消费者抛出错误 (消息进入 DLX，但没有自动重试)

❌ DLX 消费者功能不完整:
   // notification-service/src/rabbitmq/consumers/dlx.consumer.ts
   @RabbitSubscribe({ queue: 'cloudphone.notifications.dlx' })
   async handleFailedMessage(message: any) {
     this.logger.error('Failed message received in DLX', message);
     // ❌ 仅记录日志，没有重试逻辑
     // ❌ 没有告警机制 (如发送给管理员)
   }
```

**建议**:
1. **统一错误处理策略**:
   - 瞬时错误 (网络超时): 重新抛出 → RabbitMQ 自动重试
   - 业务错误 (数据不存在): 记录日志 + 确认消息
   - 致命错误 (代码 bug): 发送到 DLX + 告警

2. **增强 DLX 处理**:
   ```typescript
   async handleFailedMessage(message: any, amqpMsg: ConsumeMessage) {
     const retryCount = amqpMsg.properties.headers['x-retry-count'] || 0;

     if (retryCount < 3) {
       // 重新发布到原队列 (延迟重试)
       await this.amqpConnection.publish(
         'cloudphone.events',
         amqpMsg.fields.routingKey,
         message,
         { headers: { 'x-retry-count': retryCount + 1 } }
       );
     } else {
       // 超过重试次数，发送告警
       await this.alertService.sendToAdmin('事件处理失败', message);
     }
   }
   ```

---

## 3. 事件一致性保证

### 3.1 Outbox 模式使用情况

**已使用 Outbox 模式** (事务一致性保证):

#### ✅ user-service
```typescript
// backend/user-service/src/users/users.service.ts:130
async create(createUserDto: CreateUserDto): Promise<User> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    savedUser = await queryRunner.manager.save(User, user);

    // ✅ 在同一事务中写入 Outbox
    await this.eventOutboxService.writeEvent(
      queryRunner,
      'user',
      savedUser.id,
      'user.created',
      { userId: savedUser.id, username: savedUser.username, ... }
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  }
}
```

#### ✅ device-service
```typescript
// backend/device-service/src/devices/devices.service.ts
// 设备创建、删除、启动、停止都使用 Outbox 模式

await this.eventOutboxService.writeEvent(
  queryRunner,
  'device',
  deviceId,
  'device.created',
  payload
);
```

#### ✅ app-service
```typescript
// backend/app-service/src/apps/apps.service.ts
// 应用上传、审核操作使用 Outbox 模式

await this.eventOutboxService.writeEvent(
  queryRunner,
  'app',
  appId,
  'app.uploaded',
  payload
);
```

---

**未使用 Outbox 模式** (直接发布，存在一致性风险):

#### ❌ user-service (部分模块)
```typescript
// backend/user-service/src/quotas/quotas.service.ts:470
async checkQuota(userId: string, ...): Promise<boolean> {
  // ❌ 直接发布事件，不在事务中
  await this.eventBus.publish('cloudphone.events', 'quota.exceeded', {
    userId, resourceType, current, limit
  });
}

// 问题: 如果发布失败，数据库已更新，但通知未发送
```

#### ❌ device-service (lifecycle 模块)
```typescript
// backend/device-service/src/lifecycle/lifecycle.service.ts:159
async cleanupIdleDevices(): Promise<void> {
  await this.devicesService.remove(device.id);

  // ❌ 删除后直接发布，不在删除事务中
  await this.eventBus.publish('cloudphone.events', 'device.cleaned', {
    deviceId: device.id
  });
}

// 问题: 删除操作在 remove() 内部事务中，事件发布在外部
```

#### ❌ billing-service (全部)
```typescript
// backend/billing-service/src/payments/payments.service.ts
// ❌ 所有支付、余额变更事件都是直接发布
await this.eventBus.publishBillingEvent('payment_success', payload);

// 问题: 支付成功但事件发布失败，其他服务不知道
```

#### ❌ sms-receive-service
```typescript
// backend/sms-receive-service/src/services/number-management.service.ts
// ❌ 号码购买、释放事件直接发布
await this.eventBus.publish('cloudphone.events', 'sms.number.acquired', ...);
```

---

### 3.2 问题影响分析

| 服务模块 | 风险等级 | 影响 | 建议优先级 |
|---------|---------|------|-----------|
| billing-service (payments) | 🔴 **高** | 支付成功但通知未发送，用户余额显示不一致 | **P0 - 立即修复** |
| device-service (lifecycle) | 🟠 **中** | 设备清理但通知未发送，用户界面不更新 | **P1 - 本周修复** |
| user-service (quotas) | 🟠 **中** | 配额超限但告警未发送，管理员不知情 | **P1 - 本周修复** |
| sms-receive-service | 🟡 **低** | 号码购买失败但未通知，用户重复购买 | **P2 - 下周修复** |

---

## 4. 事件文档完整性

### 4.1 现状评估 ⚠️ 文档不足

**优点**:
- ✅ 事件类型定义完整 (backend/shared/src/events/schemas/)
- ✅ CLAUDE.md 有事件命名规范
- ✅ README 提到了事件驱动架构

**问题**:
```
❌ 缺少统一的事件清单文档:
   - 每个服务发布哪些事件?
   - 每个服务消费哪些事件?
   - 事件的依赖关系是什么?
   - 新开发者如何快速了解事件流程?

❌ 缺少事件流程图:
   - 例如: device.created 事件触发哪些下游操作?
   - 例如: 订单支付成功后的完整事件链路?

❌ 缺少事件版本管理:
   - 事件格式变更如何兼容老版本?
   - 没有事件版本号字段
```

---

### 4.2 建议补充的文档

#### 文档 1: EVENT_CATALOG.md (事件目录)
```markdown
# 事件目录

## Device Service 发布的事件

| 事件名称 | 路由键 | 负载类型 | 触发时机 | 消费者 |
|---------|-------|---------|---------|--------|
| 设备创建成功 | device.created | DeviceCreatedEvent | 设备创建成功后 | notification-service, billing-service |
| 设备启动 | device.started | DeviceStartedEvent | 设备启动成功后 | billing-service (开始计费) |
| 设备停止 | device.stopped | DeviceStoppedEvent | 设备停止成功后 | billing-service (结算费用) |
| ... | ... | ... | ... | ... |

## User Service 发布的事件

| 事件名称 | 路由键 | 负载类型 | 触发时机 | 消费者 |
|---------|-------|---------|---------|--------|
| 用户注册 | user.registered | UserCreatedEvent | 用户注册成功后 | notification-service |
| ... | ... | ... | ... | ... |

## Notification Service 消费的事件

| 路由键 | 处理器 | 作用 | 通知渠道 |
|-------|-------|------|---------|
| device.created | DeviceEventsConsumer | 发送设备创建通知 | WebSocket + Email |
| device.error | DeviceEventsConsumer | 发送设备故障告警 | WebSocket + Email |
| ... | ... | ... | ... |
```

#### 文档 2: EVENT_FLOWS.md (事件流程图)
```markdown
# 关键业务流程的事件链路

## 1. 设备创建流程

device-service → RabbitMQ → [通知] notification-service
                          ↓
                      [计费] billing-service
                          ↓
                      [配额] user-service

详细步骤:
1. 用户调用 POST /devices
2. device-service 创建设备
3. device-service 发布 device.created 事件 (Outbox 模式)
4. notification-service 消费事件 → 发送 WebSocket + Email 通知
5. billing-service 消费事件 → 开始计费
6. user-service 消费事件 → 更新配额使用量

## 2. 订单支付流程 (Saga 模式)

billing-service → device.allocate.requested → device-service
                                              ↓
                          device.allocate.success/failed
                                              ↓
billing-service ← [完成订单或补偿] ←──────────┘
```

#### 文档 3: EVENT_VERSIONING.md (事件版本管理)
```markdown
# 事件版本管理策略

## 1. 事件版本号

所有事件应包含 `version` 字段:

```typescript
export interface BaseEvent {
  version: number; // 事件版本号
  timestamp: string;
  // ...
}

export class DeviceCreatedEvent implements BaseEvent {
  version: 1; // V1
  deviceId: string;
  // ...
}
```

## 2. 向后兼容原则

- 只能新增字段，不能删除字段
- 新增字段必须是可选的 (?)
- 消费者必须容忍未知字段

## 3. 破坏性变更

如果必须删除字段:
1. 创建新的事件类型 (如 DeviceCreatedEventV2)
2. 同时发布新旧两个事件 (过渡期)
3. 所有消费者升级后，停止发布旧事件
```

---

## 5. 具体改进建议

### 5.1 高优先级 (P0 - 本周完成)

#### 问题 1: billing-service 缺少事务一致性保证

**文件**:
- `backend/billing-service/src/payments/payments.service.ts`
- `backend/billing-service/src/balance/balance.service.ts`

**改进方案**:
```typescript
// 修改前 (直接发布)
async createPayment(dto: CreatePaymentDto): Promise<Payment> {
  const payment = await this.paymentRepository.save(newPayment);

  // ❌ 风险: 如果发布失败，支付记录已保存
  await this.eventBus.publishBillingEvent('payment_success', {
    paymentId: payment.id,
    amount: payment.amount,
  });

  return payment;
}

// 修改后 (Outbox 模式)
async createPayment(dto: CreatePaymentDto): Promise<Payment> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    const payment = await queryRunner.manager.save(Payment, newPayment);

    // ✅ 在同一事务中写入 Outbox
    await this.eventOutboxService.writeEvent(
      queryRunner,
      'payment',
      payment.id,
      'billing.payment_success',
      {
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        timestamp: new Date().toISOString(),
      }
    );

    await queryRunner.commitTransaction();
    return payment;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  }
}
```

**影响范围**: 约 5 个方法需要修改
**预计工作量**: 4 小时

---

#### 问题 2: 消费者缺少幂等性检查

**文件**:
- `backend/billing-service/src/metering/metering.consumer.ts`
- `backend/device-service/src/devices/devices.consumer.ts`

**改进方案**:

**方案 A: 数据库约束 (推荐 - 简单可靠)**
```typescript
// Step 1: 添加事件处理记录表
@Entity('event_processing_log')
export class EventProcessingLog {
  @PrimaryColumn()
  eventId: string; // 事件唯一 ID

  @Column()
  eventType: string;

  @Column()
  consumedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

// Step 2: 修改消费者
@RabbitSubscribe(...)
async handleDeviceStarted(event: DeviceStartedEvent) {
  try {
    // ✅ 尝试插入处理记录
    await this.eventLogRepository.insert({
      eventId: event.eventId, // ⚠️ 需要在事件中添加 eventId 字段
      eventType: 'device.started',
      consumedAt: new Date(),
    });

    // 处理业务逻辑
    await this.meteringService.startUsageTracking(...);
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      this.logger.warn(`Event ${event.eventId} already processed, skipping`);
      return; // ✅ 幂等: 已处理过，直接返回
    }
    throw error; // ❌ 其他错误: 重新抛出，RabbitMQ 会重试
  }
}
```

**前置条件**: 所有事件必须包含 `eventId` 字段 (UUID)

**修改 EventBusService**:
```typescript
// backend/shared/src/events/event-bus.service.ts
async publishDeviceEvent<T>(eventType: string, payload: T): Promise<void> {
  await this.publish('cloudphone.events', `device.${eventType}`, {
    eventId: uuidv4(), // ✅ 自动生成事件 ID
    type: `device.${eventType}`,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}
```

**影响范围**: 约 10 个消费者需要修改
**预计工作量**: 8 小时

---

### 5.2 中优先级 (P1 - 本周完成)

#### 问题 3: 事件命名不规范

**文件**:
- `backend/device-service/src/scheduler/queue.service.ts`
- `backend/device-service/src/scheduler/allocation.service.ts`
- `backend/user-service/src/quotas/quotas.service.ts`

**改进方案**:

**修改前**:
```typescript
// device-service/src/scheduler/queue.service.ts:96
await this.eventBus.publish('cloudphone.events', 'scheduler.queue.joined', {
  userId, queueId, position, estimatedWaitTime
});
```

**修改后**:
```typescript
// ✅ 使用服务名 + 子模块 + 动作
await this.eventBus.publish('cloudphone.events', 'device.scheduler.queue_joined', {
  userId, queueId, position, estimatedWaitTime
});

// 或者更简洁 (如果 scheduler 是独立服务)
await this.eventBus.publish('cloudphone.events', 'scheduler.queue_joined', {
  userId, queueId, position, estimatedWaitTime
});
```

**需要统一的事件名**:
```
device-service:
  ❌ scheduler.queue.joined         → ✅ device.scheduler.queue_joined
  ❌ scheduler.reservation.created  → ✅ device.scheduler.reservation_created
  ❌ scheduler.allocation.released  → ✅ device.scheduler.allocation_released

user-service:
  ❌ quota.exceeded    → ✅ user.quota.exceeded
  ❌ quota.updated     → ✅ user.quota.updated
  ❌ quota.deleted     → ✅ user.quota.deleted
```

**影响范围**: 约 15 个事件发布点需要修改
**预计工作量**: 2 小时

---

#### 问题 4: 缺少统一的事件 ID

**文件**: `backend/shared/src/events/event-bus.service.ts`

**改进方案**:
```typescript
// Step 1: 定义 BaseEvent 接口
export interface BaseEvent {
  eventId: string;      // ✅ 唯一事件 ID (UUID)
  type: string;         // 事件类型 (如 device.created)
  version: number;      // ✅ 事件版本号
  timestamp: string;    // ISO 8601 时间戳
  correlationId?: string; // ✅ 关联 ID (用于追踪业务流程)
  causationId?: string;   // ✅ 因果 ID (触发此事件的上游事件 ID)
}

// Step 2: 修改 EventBusService
async publishDeviceEvent<T>(eventType: string, payload: T): Promise<void> {
  const event: BaseEvent & T = {
    eventId: uuidv4(),              // ✅ 自动生成
    type: `device.${eventType}`,
    version: 1,                     // ✅ 默认版本 1
    timestamp: new Date().toISOString(),
    correlationId: this.getCorrelationId(), // ✅ 从上下文获取
    ...payload,
  };

  await this.publish('cloudphone.events', `device.${eventType}`, event);
}

// Step 3: 使用 AsyncLocalStorage 传递 correlationId
private getCorrelationId(): string | undefined {
  return this.asyncContext?.getStore()?.correlationId;
}
```

**影响范围**: 所有事件发布和消费
**预计工作量**: 6 小时

---

### 5.3 低优先级 (P2 - 下周完成)

#### 问题 5: 缺少事件文档

**改进方案**: 创建以下文档
1. `backend/EVENT_CATALOG.md` - 事件目录
2. `backend/EVENT_FLOWS.md` - 事件流程图
3. `backend/EVENT_VERSIONING.md` - 事件版本管理

**预计工作量**: 4 小时

---

#### 问题 6: DLX 消费者功能不完整

**文件**: `backend/notification-service/src/rabbitmq/consumers/dlx.consumer.ts`

**改进方案**:
```typescript
@Injectable()
export class DlxConsumer {
  @RabbitSubscribe({ queue: 'cloudphone.notifications.dlx' })
  async handleFailedMessage(message: any, amqpMsg: ConsumeMessage) {
    const retryCount = amqpMsg.properties.headers['x-retry-count'] || 0;
    const routingKey = amqpMsg.fields.routingKey;

    this.logger.error(
      `Failed message in DLX: ${routingKey}, retry count: ${retryCount}`,
      message
    );

    // ✅ 自动重试 (最多 3 次)
    if (retryCount < 3) {
      this.logger.log(`Retrying message: ${routingKey} (attempt ${retryCount + 1})`);

      await this.amqpConnection.publish(
        'cloudphone.events',
        routingKey,
        message,
        {
          headers: { 'x-retry-count': retryCount + 1 },
          expiration: Math.pow(2, retryCount) * 60000, // ✅ 指数退避: 1min, 2min, 4min
        }
      );
      return;
    }

    // ✅ 超过重试次数，发送告警
    await this.alertService.sendToAdmin({
      title: '事件处理永久失败',
      severity: 'high',
      details: {
        routingKey,
        message,
        retryCount,
      },
    });

    // ✅ 持久化到失败事件表 (供人工介入)
    await this.failedEventRepository.save({
      routingKey,
      payload: message,
      failedAt: new Date(),
      retryCount,
    });
  }
}
```

**预计工作量**: 3 小时

---

## 6. 风险评估与优先级

| 问题 | 风险等级 | 影响范围 | 修复优先级 | 预计工作量 |
|-----|---------|---------|-----------|-----------|
| billing-service 缺少 Outbox 模式 | 🔴 高 | 支付一致性 | **P0** | 4 小时 |
| 消费者缺少幂等性检查 | 🔴 高 | 重复扣费、重复操作 | **P0** | 8 小时 |
| 事件命名不规范 | 🟠 中 | 代码可维护性 | **P1** | 2 小时 |
| 缺少统一事件 ID | 🟠 中 | 幂等性、追踪 | **P1** | 6 小时 |
| device-service lifecycle 缺少 Outbox | 🟡 低 | 通知一致性 | **P1** | 3 小时 |
| 缺少事件文档 | 🟡 低 | 新人上手 | **P2** | 4 小时 |
| DLX 功能不完整 | 🟡 低 | 失败恢复 | **P2** | 3 小时 |

**总工作量**: 约 30 小时 (4 个工作日)

---

## 7. 总结与行动计划

### 7.1 核心问题

1. **事务一致性**: billing-service 必须使用 Outbox 模式
2. **幂等性**: 所有消费者必须实现幂等性检查
3. **规范性**: 事件命名需要统一规范
4. **可追踪性**: 缺少 eventId 和 correlationId

### 7.2 行动计划

**第 1 周**:
- [ ] 修复 billing-service 的 Outbox 模式 (4h)
- [ ] 在所有事件中添加 eventId 字段 (6h)
- [ ] 为关键消费者添加幂等性检查 (8h)
- [ ] 统一事件命名规范 (2h)

**第 2 周**:
- [ ] 完成所有消费者的幂等性改造 (8h)
- [ ] 修复 device-service lifecycle 的 Outbox 模式 (3h)
- [ ] 增强 DLX 消费者功能 (3h)
- [ ] 编写事件文档 (4h)

**第 3 周**:
- [ ] 添加事件版本号支持 (4h)
- [ ] 添加 correlationId 追踪 (4h)
- [ ] 代码审查和测试 (8h)

### 7.3 长期改进

1. **事件溯源**: 考虑在关键业务域 (订单、支付) 实现完整的 Event Sourcing
2. **事件回放**: 支持事件回放功能 (用于数据修复)
3. **事件监控**: 增加事件流量监控和告警 (Prometheus + Grafana)
4. **事件审计**: 记录所有事件发布和消费历史

---

**报告完成时间**: 2025-11-24
**下次审计时间**: 修复完成后 (预计 2025-12-15)
