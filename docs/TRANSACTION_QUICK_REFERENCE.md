# 事务使用快速参考卡片

> **目标受众**: 后端开发工程师
> **使用场景**: 编写业务逻辑时快速决定使用哪种事务模式

---

## 🤔 我需要事务吗？决策流程图

```
开始写一个新方法
    ↓
是否有数据库写操作？
    ├─ 否 → 不需要事务 ✅
    └─ 是 → 继续
        ↓
是否跨服务调用？
    ├─ 是 → 使用 L3 Saga 模式 (见下文)
    └─ 否 → 继续
        ↓
是否有多个数据库操作（包括读-修改-写）？
    ├─ 是 → 使用 L1 @Transactional (见下文)
    └─ 否 → 继续
        ↓
是否需要发布事件？
    ├─ 是 → 使用 L2 @WithOutbox (见下文)
    └─ 否 → 不需要事务 ✅
```

---

## 📚 三层事务模型速查

### L1: 本地事务 - `@Transactional`

**何时使用**:
- ✅ 多表写操作
- ✅ 读-修改-写模式
- ✅ 包含业务逻辑判断的写操作

**示例**:

```typescript
import { Transactional } from '@cloudphone/shared';

@Injectable()
export class UsersService {
  // ✅ 正确：用户创建 + 角色分配
  @Transactional()
  async createUser(dto: CreateUserDto) {
    const user = await this.userRepo.save(user);
    await this.userRoleRepo.save(userRoles); // 同一个事务
    return user;
  }

  // ✅ 正确：读-修改-写
  @Transactional()
  async deductQuota(userId: string, amount: number) {
    const user = await this.userRepo.findOne(userId); // 读
    if (user.quota < amount) throw new Error('Insufficient quota');
    user.quota -= amount; // 修改
    await this.userRepo.save(user); // 写
  }

  // ❌ 错误：不需要事务（单条 INSERT）
  async logActivity(userId: string, action: string) {
    await this.activityRepo.save({ userId, action });
  }
}
```

---

### L2: 事务 + 事件发布 - `@WithOutbox`

**何时使用**:
- ✅ 业务操作 + 需要发布事件
- ✅ 确保事件至少发布一次（At-Least-Once）

**示例**:

```typescript
import { WithOutbox } from '@cloudphone/shared';

@Injectable()
export class DevicesService {
  // ✅ 正确：使用 Outbox 模式
  @WithOutbox()
  async createDevice(dto: CreateDeviceDto) {
    const device = await this.deviceRepo.save(device);

    // 返回 events 数组，自动写入 Outbox 表
    return {
      device,
      events: [
        {
          type: 'device.created',
          payload: { deviceId: device.id, userId: device.userId },
        },
      ],
    };
  }

  // ❌ 错误：直接发布事件（RabbitMQ 挂了就丢失）
  async createDeviceWrong(dto: CreateDeviceDto) {
    const device = await this.deviceRepo.save(device);
    await this.eventBus.publish('device.created', device); // 可能丢失！
  }
}
```

---

### L3: 跨服务事务 - Saga 模式

**何时使用**:
- ✅ 跨服务的业务流程
- ✅ 长事务（执行时间 > 30秒）
- ✅ 需要补偿逻辑的业务

**示例**:

```typescript
import { SagaOrchestratorService, SagaDefinition, SagaType } from '@cloudphone/shared';

@Injectable()
export class PurchasePlanSaga {
  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
  ) {}

  // Step 1: 定义 Saga
  private createSagaDefinition(): SagaDefinition {
    return {
      type: SagaType.PAYMENT_PURCHASE,
      timeoutMs: 300000, // 5分钟
      steps: [
        {
          name: 'CREATE_ORDER',
          execute: this.createOrder.bind(this),
          compensate: this.cancelOrder.bind(this), // 补偿：取消订单
        },
        {
          name: 'ALLOCATE_DEVICE',
          execute: this.allocateDevice.bind(this),
          compensate: this.releaseDevice.bind(this), // 补偿：释放设备
        },
        {
          name: 'PROCESS_PAYMENT',
          execute: this.processPayment.bind(this),
          compensate: this.refundPayment.bind(this), // 补偿：退款
        },
      ],
    };
  }

  // Step 2: 启动 Saga
  async startPurchase(userId: string, planId: string) {
    const initialState = { userId, planId };
    const sagaId = await this.sagaOrchestrator.executeSaga(
      this.createSagaDefinition(),
      initialState
    );
    return sagaId;
  }

  // Step 3: 各步骤实现
  private async createOrder(state) {
    const order = await this.orderRepo.save(newOrder);
    return { orderId: order.id };
  }

  private async cancelOrder(state) {
    await this.orderRepo.update(state.orderId, { status: 'CANCELLED' });
  }

  // ... 其他步骤
}
```

**在 Controller 中使用**:

```typescript
@Controller('billing')
export class BillingController {
  @Post('purchase')
  async purchasePlan(@Body() dto: PurchasePlanDto) {
    const sagaId = await this.purchaseSaga.startPurchase(dto.userId, dto.planId);
    return {
      sagaId,
      message: '订单处理中，请稍候查询结果',
    };
  }

  @Get('purchase/:sagaId/status')
  async getSagaStatus(@Param('sagaId') sagaId: string) {
    return await this.sagaOrchestrator.getSagaState(sagaId);
  }
}
```

---

## 🎯 常见场景速查表

| 场景 | 使用方式 | 示例 |
|-----|---------|------|
| 创建用户 + 分配角色 | `@Transactional` | user-service |
| 创建订单 + 扣减库存 | `@Transactional` | billing-service |
| 创建设备 + 发布事件 | `@WithOutbox` | device-service |
| 读取配额 + 扣减 + 保存 | `@Transactional` + `@Lock` | user-service |
| 订单购买（跨服务） | Saga | billing + device + notification |
| 退款流程（跨服务） | Saga | billing + payment + notification |
| 设备迁移（长事务） | Saga | device-service |
| 单条日志记录 | 不需要事务 | activity-log |
| 只读查询 | 不需要事务 | 所有 findOne/findMany |

---

## ⚠️ 常见错误

### ❌ 错误 1: 多表操作没有事务

```typescript
// ❌ 错误
async createUser(dto: CreateUserDto) {
  const user = await this.userRepo.save(user);       // ✅ 成功
  await this.userRoleRepo.save(userRoles);           // ❌ 失败 → 用户无角色
}

// ✅ 正确
@Transactional()
async createUser(dto: CreateUserDto) {
  const user = await this.userRepo.save(user);
  await this.userRoleRepo.save(userRoles);           // 同一个事务
}
```

---

### ❌ 错误 2: 直接发布事件

```typescript
// ❌ 错误
async createDevice(dto: CreateDeviceDto) {
  const device = await this.deviceRepo.save(device);
  await this.eventBus.publish('device.created', device); // RabbitMQ 挂了就丢失
}

// ✅ 正确
@WithOutbox()
async createDevice(dto: CreateDeviceDto) {
  const device = await this.deviceRepo.save(device);
  return {
    device,
    events: [{ type: 'device.created', payload: device }],
  };
}
```

---

### ❌ 错误 3: 跨服务调用没有补偿

```typescript
// ❌ 错误：订单购买流程没有补偿
async purchasePlan(userId, planId) {
  const order = await this.createOrder(userId, planId);      // ✅ 成功
  const device = await this.allocateDevice(userId);          // ✅ 成功
  await this.processPayment(order.id, order.amount);         // ❌ 失败 → 订单和设备已创建！
}

// ✅ 正确：使用 Saga 模式
const saga = {
  steps: [
    { execute: createOrder, compensate: cancelOrder },       // 失败时自动取消订单
    { execute: allocateDevice, compensate: releaseDevice },  // 失败时自动释放设备
    { execute: processPayment, compensate: refundPayment },  // 失败时自动退款
  ],
};
```

---

### ❌ 错误 4: 并发扣减配额没有锁

```typescript
// ❌ 错误：并发扣减可能导致负数
async deductQuota(userId: string, amount: number) {
  const user = await this.userRepo.findOne(userId);
  if (user.quota < amount) throw new Error('Insufficient quota');
  user.quota -= amount;
  await this.userRepo.save(user);
}

// ✅ 正确：使用分布式锁
@Lock('quota:{{userId}}')
@Transactional()
async deductQuota(userId: string, amount: number) {
  const user = await this.userRepo.findOne(userId);
  if (user.quota < amount) throw new Error('Insufficient quota');
  user.quota -= amount;
  await this.userRepo.save(user);
}
```

---

## 🛠️ 工具使用示例

### 1. 本地事务装饰器

```typescript
import { Transactional } from '@cloudphone/shared';

// 基本使用
@Transactional()
async myMethod() { }

// 指定隔离级别
@Transactional({ isolationLevel: 'REPEATABLE READ' })
async myMethod() { }

// 嵌套事务
@Transactional({ propagation: 'REQUIRES_NEW' })
async myMethod() { }
```

---

### 2. 分布式锁装饰器

```typescript
import { Lock } from '@cloudphone/shared';

// 基本使用（锁定用户）
@Lock('user:{{userId}}')
async updateUser(userId: string) { }

// 锁定多个资源
@Lock(['device:{{deviceId}}', 'user:{{userId}}'])
async assignDevice(userId: string, deviceId: string) { }

// 自定义超时时间（默认30秒）
@Lock('order:{{orderId}}', { timeout: 60000 })
async processOrder(orderId: string) { }
```

---

### 3. Outbox 模式

```typescript
import { WithOutbox } from '@cloudphone/shared';

@WithOutbox()
async myMethod() {
  // 业务逻辑
  const entity = await this.repo.save(entity);

  // 返回 events 数组
  return {
    entity,
    events: [
      {
        type: 'entity.created',
        payload: { id: entity.id },
      },
    ],
  };
}
```

---

## 📝 Checklist（开发前检查）

在编写新方法前，问自己以下问题：

- [ ] 这个方法是否有多个数据库写操作？→ 考虑 `@Transactional`
- [ ] 这个方法是否需要发布事件？→ 考虑 `@WithOutbox`
- [ ] 这个方法是否调用其他服务？→ 考虑 Saga 模式
- [ ] 这个方法是否会被并发调用？→ 考虑 `@Lock`
- [ ] 这个方法失败后是否需要回滚？→ 考虑事务或 Saga

---

## 🔗 参考资料

- **详细方案**: [事务治理总体方案](/docs/TRANSACTION_GOVERNANCE_MASTER_PLAN.md)
- **执行摘要**: [事务治理执行摘要](/docs/TRANSACTION_GOVERNANCE_EXECUTIVE_SUMMARY.md)
- **Saga 实现**: [backend/shared/src/saga/](/backend/shared/src/saga/)
- **Outbox 实现**: [backend/shared/src/outbox/](/backend/shared/src/outbox/)
- **分布式锁**: [backend/shared/src/redis/distributed-lock.service.ts](/backend/shared/src/redis/distributed-lock.service.ts)

---

**快速记忆**:

```
单服务内 → @Transactional
需要事件 → @WithOutbox
跨服务 → Saga
高并发 → @Lock
```

**有疑问？** 查看 [详细方案](/docs/TRANSACTION_GOVERNANCE_MASTER_PLAN.md) 或咨询架构组。
