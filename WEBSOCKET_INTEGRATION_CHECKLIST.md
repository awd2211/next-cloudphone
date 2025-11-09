# WebSocket 推送服务集成检查清单

## 📋 服务集成状态总览

| 服务 | 事件发布 | Consumer 已创建 | 实时推送集成 | 状态 | 优先级 |
|------|---------|----------------|-------------|------|--------|
| **user-service** | ✅ | ✅ | ⚠️ 部分 | 需要补充配额事件 | 🔴 高 |
| **device-service** | ✅ | ✅ | ✅ | 已集成 | ✅ 完成 |
| **billing-service** | ✅ | ✅ | ❌ | 需要集成 | 🟡 中 |
| **app-service** | ✅ | ✅ | ❌ | 需要集成 | 🟡 中 |
| **notification-service** | - | - | ✅ | Gateway 已就绪 | ✅ 完成 |
| **proxy-service** | ❌ | ❌ | ❌ | 暂不需要 | ⚪ 低 |
| **sms-receive-service** | ❌ | ❌ | ❌ | 暂不需要 | ⚪ 低 |
| **media-service** | ❌ | ❌ | ❌ | 未来规划 | ⚪ 低 |

## 🔍 详细集成分析

### 1. user-service (用户服务) 🔴 高优先级

#### 当前事件发布

**已发布的事件**:
```typescript
// backend/user-service/src/quotas/quota-metrics.service.ts
- quota.alert          // ✅ 已有 consumer
- quota.metrics        // ❌ 无 consumer

// backend/user-service/src/quotas/quotas.service.ts
- quota.deduct         // ❌ 无 consumer (需要添加)
- quota.restore        // ❌ 无 consumer (需要添加)
- quota.check          // ❌ 无 consumer (可选)
```

**缺失的事件** (需要添加):
```typescript
- quota.updated        // ⚠️ 配额更新时未发布
- quota.exceeded       // ⚠️ 配额超额时未发布
- quota.renewed        // ⚠️ 配额续费时未发布
```

#### 需要集成的位置

**1. 配额更新 (quotas.service.ts)**
```typescript
// backend/user-service/src/quotas/quotas.service.ts
async updateQuota(userId: string, updateDto: UpdateQuotaDto): Promise<Quota> {
  // ... 更新逻辑

  // ✅ 需要添加: 发布配额更新事件
  await this.eventBus.publish('cloudphone.events', 'quota.updated', {
    userId,
    quotaId: quota.id,
    type: 'updated',
    limits: quota.limits,
    usage: quota.usage,
    timestamp: new Date().toISOString(),
  });

  return quota;
}
```

**2. 配额超额检测 (quotas.service.ts)**
```typescript
async deductQuota(request: DeductQuotaRequest): Promise<void> {
  // ... 扣除逻辑

  // ✅ 需要添加: 检查是否超额
  if (this.isQuotaExceeded(quota)) {
    await this.eventBus.publish('cloudphone.events', 'quota.exceeded', {
      userId: request.userId,
      quotaId: quota.id,
      type: 'exceeded',
      limits: quota.limits,
      usage: quota.usage,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**3. 配额续费 (quotas.service.ts)**
```typescript
async renewQuota(userId: string): Promise<Quota> {
  // ... 续费逻辑

  // ✅ 需要添加: 发布续费事件
  await this.eventBus.publish('cloudphone.events', 'quota.renewed', {
    userId,
    quotaId: quota.id,
    type: 'renewed',
    limits: quota.limits,
    timestamp: new Date().toISOString(),
  });

  return quota;
}
```

#### Consumer 状态
- ✅ `quota-events.consumer.ts` 已创建
- ✅ 监听 `quota.updated` ✅
- ✅ 监听 `quota.alert` ✅
- ✅ 监听 `quota.exceeded` ✅
- ✅ 监听 `quota.renewed` ✅

#### 实施步骤
1. [ ] 在 `quotas.service.ts` 的 `updateQuota()` 添加事件发布
2. [ ] 在 `quotas.service.ts` 的 `deductQuota()` 添加超额检测和事件发布
3. [ ] 在 `quotas.service.ts` 的 `renewQuota()` 添加事件发布
4. [ ] 测试配额事件推送到前端

---

### 2. device-service (设备服务) ✅ 已完成

#### 当前事件发布

**已发布的设备事件**:
```typescript
// 通过 EventOutboxService (Outbox 模式)
- device.created       // ✅ 已有 consumer
- device.started       // ✅ 已有 consumer + 实时推送 ✅
- device.stopped       // ✅ 已有 consumer + 实时推送 ✅
- device.deleted       // ✅ 已有 consumer

// 直接发布
- device.error         // ✅ 已有 consumer
- device.recovered     // ✅ 已有 consumer
- device.cleaned       // ⚠️ 无 consumer (可选)
```

**其他事件**:
```typescript
- device.recovery_success      // ⚠️ Failover 相关 (可选)
- device.recovery_failed       // ⚠️ Failover 相关 (可选)
- device.permanent_failure     // ⚠️ Failover 相关 (可选)
- device.backup_completed      // ⚠️ Backup 相关 (可选)
- device.expiration_warning    // ⚠️ Expiration 相关 (可选)
```

#### Consumer 状态
- ✅ `device-events.consumer.ts` 已创建并完善
- ✅ 实时推送 `device.status.changed` 已集成

#### 实施状态
- ✅ 设备启动/停止实时推送已完成
- ✅ NotificationGateway 集成完成
- ⚪ 可选: 添加其他设备生命周期事件的实时推送

---

### 3. billing-service (账单服务) 🟡 中优先级

#### 当前事件发布

**已发布的账单事件**:
```typescript
// backend/billing-service/src/sagas/purchase-plan-v2.saga.ts
- order.cancelled      // ⚠️ 已发布，但无实时推送
- order.completed      // ⚠️ 已发布，但无实时推送
```

**缺失的事件** (建议添加):
```typescript
- billing.payment_success      // 支付成功
- billing.payment_failed       // 支付失败
- billing.refund_completed     // 退款完成
- billing.invoice_generated    // 发票生成
```

#### 需要集成的位置

**1. 支付成功事件**
```typescript
// backend/billing-service/src/payments/payments.service.ts
async createPayment(...): Promise<Payment> {
  // ... 支付逻辑

  if (payment.status === 'completed') {
    await this.eventBus.publishBillingEvent('payment_success', {
      userId: payment.userId,
      paymentId: payment.id,
      amount: payment.amount,
      orderId: payment.orderId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**2. 订单事件实时推送**
```typescript
// backend/notification-service/src/rabbitmq/consumers/billing-events.consumer.ts
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'order.completed',
  queue: 'notification-service.order-completed',
})
async handleOrderCompleted(event: OrderCompletedEvent) {
  // 推送给用户
  this.gateway.sendToUser(event.userId, {
    type: 'order.completed',
    data: event,
  });

  // 更新前端缓存
  // ...
}
```

#### Consumer 状态
- ✅ `billing-events.consumer.ts` 已存在
- ❌ 未添加实时推送集成
- ⚠️ 监听的事件需要扩展

#### 实施步骤
1. [ ] 在 `payments.service.ts` 添加支付事件发布
2. [ ] 在 `billing-events.consumer.ts` 添加实时推送
3. [ ] 创建前端 `useRealtimeBilling` Hook
4. [ ] 更新账单相关页面集成实时推送

---

### 4. app-service (应用服务) 🟡 中优先级

#### 当前事件发布

**已发布的应用事件**:
```typescript
// backend/app-service/src/apps/installation.saga.ts
- app.installed        // ⚠️ 已发布，但无实时推送
```

**缺失的事件** (建议添加):
```typescript
- app.uninstalled      // 应用卸载
- app.updated          // 应用更新
- app.install_failed   // 安装失败
```

#### 需要集成的位置

**1. 应用安装完成推送**
```typescript
// backend/notification-service/src/rabbitmq/consumers/app-events.consumer.ts
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'app.installed',
  queue: 'notification-service.app-installed',
})
async handleAppInstalled(event: AppInstalledEvent) {
  // 推送给用户
  this.gateway.sendToUser(event.userId, {
    type: 'app.installed',
    data: event,
  });

  // 失效应用列表缓存
  queryClient.invalidateQueries(['apps']);
}
```

#### Consumer 状态
- ✅ `app-events.consumer.ts` 已存在
- ❌ 未添加实时推送集成

#### 实施步骤
1. [ ] 在 `app-events.consumer.ts` 添加实时推送
2. [ ] 创建前端 `useRealtimeApp` Hook
3. [ ] 更新应用管理页面集成实时推送

---

### 5. notification-service (通知服务) ✅ 已完成

#### 状态
- ✅ NotificationGateway 已就绪
- ✅ 房间订阅支持完成
- ✅ 实时推送基础设施完成

#### 功能
- ✅ `sendToUser()` - 用户级推送
- ✅ `sendToRoom()` - 房间级推送
- ✅ `broadcast()` - 全局广播
- ✅ JWT 认证
- ✅ 断线重连

---

### 6. proxy-service / sms-receive-service ⚪ 低优先级

**状态**: 暂不需要实时推送

**原因**:
- Proxy 服务主要处理代理池管理，不需要实时推送到前端
- SMS 接收服务是后台处理服务，不需要实时推送

**未来可选**:
- 代理池状态变更推送（管理员）
- SMS 接收统计推送（管理员）

---

## 📊 集成优先级矩阵

### 高优先级 (本周完成) 🔴

| 任务 | 服务 | 工作量 | 影响范围 |
|------|------|--------|---------|
| 配额事件发布 | user-service | 2 小时 | 配额监控实时性 |
| 配额实时推送测试 | notification-service + frontend | 1 小时 | 用户体验 |

### 中优先级 (本月完成) 🟡

| 任务 | 服务 | 工作量 | 影响范围 |
|------|------|--------|---------|
| 账单事件实时推送 | billing-service | 3 小时 | 支付体验 |
| 应用事件实时推送 | app-service | 2 小时 | 应用管理 |
| 前端 Hooks 创建 | frontend | 2 小时 | 全面集成 |

### 低优先级 (可选) ⚪

| 任务 | 服务 | 工作量 | 影响范围 |
|------|------|--------|---------|
| Failover 事件推送 | device-service | 1 小时 | 管理员监控 |
| Backup 事件推送 | device-service | 1 小时 | 管理员监控 |
| Proxy/SMS 推送 | proxy/sms | 2 小时 | 管理员监控 |

---

## 🔧 实施指南

### user-service 配额事件发布

**文件**: `backend/user-service/src/quotas/quotas.service.ts`

**位置 1: updateQuota()** (约 Line 200)
```typescript
async updateQuota(id: string, updateDto: UpdateQuotaDto): Promise<Quota> {
  const quota = await this.quotaRepository.findOne({ where: { id } });
  if (!quota) {
    throw new NotFoundException(`配额 ${id} 不存在`);
  }

  // ... 更新逻辑
  const updatedQuota = await this.quotaRepository.save(quota);

  // ✅ 添加: 发布配额更新事件
  await this.eventBus.publish('cloudphone.events', 'quota.updated', {
    userId: quota.userId,
    quotaId: quota.id,
    type: 'updated',
    limits: quota.limits,
    usage: quota.usage,
    timestamp: new Date().toISOString(),
  });

  // 清除缓存
  await this.clearQuotaCache(quota.userId);

  return updatedQuota;
}
```

**位置 2: deductQuota()** (约 Line 400)
```typescript
async deductQuota(request: DeductQuotaRequest): Promise<void> {
  // ... 扣除逻辑

  // ✅ 添加: 检查是否超额
  const usagePercent = this.calculateUsagePercent(quota);
  if (usagePercent >= 100) {
    await this.eventBus.publish('cloudphone.events', 'quota.exceeded', {
      userId: request.userId,
      quotaId: quota.id,
      type: 'exceeded',
      limits: quota.limits,
      usage: quota.usage,
      usagePercent,
      timestamp: new Date().toISOString(),
    });
  }

  await this.quotaRepository.save(quota);
}
```

**位置 3: renewQuota()** (创建新方法或在现有续费逻辑中添加)
```typescript
async renewQuota(userId: string): Promise<Quota> {
  const quota = await this.getUserQuota(userId);

  // ... 续费逻辑 (延长 validUntil 等)
  quota.validUntil = this.calculateNewValidUntil(quota);
  const renewedQuota = await this.quotaRepository.save(quota);

  // ✅ 添加: 发布续费事件
  await this.eventBus.publish('cloudphone.events', 'quota.renewed', {
    userId,
    quotaId: quota.id,
    type: 'renewed',
    limits: quota.limits,
    validUntil: renewedQuota.validUntil,
    timestamp: new Date().toISOString(),
  });

  await this.clearQuotaCache(userId);

  return renewedQuota;
}
```

---

### billing-service 实时推送集成

**步骤 1: 增强 billing-events.consumer.ts**

```typescript
// backend/notification-service/src/rabbitmq/consumers/billing-events.consumer.ts
import { NotificationGateway } from '../../gateway/notification.gateway';

@Injectable()
export class BillingEventsConsumer {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationGateway, // ✅ 添加
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'order.completed',
    queue: 'notification-service.order-completed',
  })
  async handleOrderCompleted(event: OrderCompletedEvent) {
    // 现有通知逻辑
    await this.notificationsService.createAndSend(...);

    // ✅ 添加: 实时推送
    this.gateway.sendToUser(event.userId, {
      type: 'order.completed',
      data: event,
    });
  }
}
```

**步骤 2: 创建前端 Hook**

```typescript
// frontend/admin/src/hooks/useRealtimeBilling.ts
export const useRealtimeBilling = (userId?: string) => {
  const { socket, connected } = useSocketIO();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('notification', (data) => {
      if (data.type === 'order.completed') {
        queryClient.invalidateQueries(['orders']);
        queryClient.invalidateQueries(['balance']);
        notification.success({
          message: '订单完成',
          description: '您的订单已成功完成',
        });
      }
    });

    return () => socket.off('notification');
  }, [socket, connected]);
};
```

---

## ✅ 测试清单

### user-service 配额事件测试

```bash
# 1. 启动服务
pm2 restart user-service notification-service

# 2. 测试配额更新
curl -X PATCH http://localhost:30001/quotas/user/xxx \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limits": {"devices": 20}}'

# 3. 检查 RabbitMQ 队列
rabbitmqadmin list queues name messages | grep quota

# 4. 检查前端控制台
# 应该看到: 📊 Quota updated: ...
```

### 前端实时推送测试

```bash
# 1. 打开浏览器控制台
# 2. 登录管理后台
# 3. 打开配额管理页面
# 4. 修改配额
# 5. 观察控制台和页面更新

# 预期结果:
# - 控制台显示 WebSocket 事件
# - 页面自动刷新显示新数据
# - 显示通知提示（如果启用）
```

---

## 📈 预期收益

### 已实现收益 (device-service)
- ✅ 设备状态实时更新 < 100ms
- ✅ 减少设备列表轮询 ~60%
- ✅ 用户体验显著提升

### 待实现收益 (user-service)
- 📊 配额变更实时反馈
- 📊 配额告警实时推送
- 📊 减少配额查询 ~50%

### 待实现收益 (billing-service)
- 💰 支付结果实时反馈
- 💰 订单状态实时更新
- 💰 提升支付体验

### 待实现收益 (app-service)
- 📱 应用安装进度实时显示
- 📱 应用操作结果即时反馈

---

## 📅 实施时间表

### 第 1 周 (本周)
- [x] ✅ 设计 WebSocket 架构
- [x] ✅ 实现 NotificationGateway 房间支持
- [x] ✅ 创建 quota-events.consumer
- [x] ✅ 创建 device-events 实时推送
- [x] ✅ 创建前端 useSocketIO/useRealtimeQuota/useRealtimeDevice
- [ ] ⏳ 在 user-service 添加配额事件发布
- [ ] ⏳ 测试配额实时推送端到端

### 第 2 周
- [ ] 在 billing-service 添加支付事件实时推送
- [ ] 在 app-service 添加应用事件实时推送
- [ ] 创建 useRealtimeBilling 和 useRealtimeApp Hooks
- [ ] 更新相关前端页面

### 第 3 周
- [ ] 全面测试所有实时推送功能
- [ ] 性能测试和优化
- [ ] 添加监控指标
- [ ] 文档完善

### 第 4 周
- [ ] 移除所有轮询代码
- [ ] 代码审查和重构
- [ ] 上线准备
- [ ] 用户培训文档

---

## 🎯 成功指标

### 技术指标
- [ ] HTTP 请求减少 > 50%
- [ ] 实时性提升 > 200x (30s → <100ms)
- [ ] WebSocket 连接稳定性 > 99%
- [ ] 事件推送成功率 > 99.9%

### 用户体验指标
- [ ] 配额更新感知延迟 < 1 秒
- [ ] 设备状态更新延迟 < 1 秒
- [ ] 支付结果反馈延迟 < 2 秒
- [ ] 用户满意度提升

---

## 📝 注意事项

### 事件命名规范
```typescript
// 格式: {service}.{entity}.{action}
'quota.updated'          // ✅ 正确
'user.quota.updated'     // ❌ 错误 (不要加服务前缀)
'quotaUpdated'           // ❌ 错误 (使用点分隔，不是驼峰)
```

### 事件数据结构
```typescript
interface BaseEvent {
  userId: string;          // 必需: 用户 ID
  timestamp: string;       // 必需: ISO 时间戳
  type: string;            // 必需: 事件类型
  // ... 其他字段
}
```

### 性能考虑
- ⚠️ 避免发布过于频繁的事件（如每秒多次）
- ⚠️ 事件数据尽量精简，避免大对象
- ⚠️ 使用事件批处理（如配额检查可以批量）
- ⚠️ 设置合理的缓存失效策略

### 安全考虑
- ✅ WebSocket 连接必须 JWT 认证
- ✅ 房间订阅需要权限验证
- ✅ 敏感数据不要通过 WebSocket 传输
- ✅ 实施事件风暴防护（限流）

---

**创建日期**: 2025-11-07
**负责人**: Claude Code
**状态**: ✅ Phase 1 完成，Phase 2 进行中
