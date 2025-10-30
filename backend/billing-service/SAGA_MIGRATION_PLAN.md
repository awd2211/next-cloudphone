# Billing Service Saga 迁移计划

**日期**: 2025-10-29
**优先级**: P1 (Important)
**估计工作量**: 4-6 小时

---

## 当前问题

### 现有实现的问题

当前 `PurchasePlanSaga` 使用自定义的内存实现：

```typescript
// /backend/billing-service/src/sagas/purchase-plan.saga.ts:21-22
private readonly pendingSagas = new Map<string, PurchasePlanSagaState>();
private readonly sagaTimeouts = new Map<string, NodeJS.Timeout>();
```

**存在的问题**:

1. **❌ 无持久化**: Saga 状态仅存在于内存中
   - 服务重启后状态丢失
   - 无法恢复未完成的 Saga
   - 长时间运行的 Saga 存在风险

2. **❌ 无崩溃恢复**: 服务崩溃时无法恢复
   - 可能导致订单状态不一致
   - 设备可能已分配但订单未更新
   - 需要人工介入修复

3. **❌ 无法监控**: 缺少统一的 Saga 监控
   - 无法查询所有运行中的 Saga
   - 无法统计 Saga 成功率
   - 难以排查问题

4. **❌ 与其他服务不一致**: Device Service 已使用共享的 SagaOrchestratorService
   - 代码重复
   - 维护成本高
   - 学习成本高

---

## 迁移目标

迁移到共享的 `SagaOrchestratorService` 后可获得：

- ✅ **持久化状态**: 所有 Saga 状态存储在 `saga_state` 表中
- ✅ **崩溃恢复**: 服务重启后自动恢复运行中的 Saga
- ✅ **重试机制**: 失败步骤自动重试（指数退避）
- ✅ **超时检测**: 自动检测和处理超时的 Saga
- ✅ **统一监控**: 通过数据库查询监控所有 Saga
- ✅ **代码一致性**: 与 Device Service 保持一致

---

## 迁移步骤

### Phase 1: 准备工作 (1 小时)

#### 1.1 添加 SagaOrchest ratorService 依赖

```typescript
// /backend/billing-service/src/billing/billing.module.ts
import { SagaOrchestratorModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ... existing imports
    SagaOrchestratorModule, // ✅ 添加此行
  ],
})
export class BillingModule {}
```

#### 1.2 定义 Saga 状态接口

```typescript
// /backend/billing-service/src/sagas/types/purchase-plan-saga.types.ts
export interface PurchasePlanSagaState {
  // 业务数据
  userId: string;
  planId: string;
  amount: number;

  // 步骤执行结果
  orderId?: string;
  deviceId?: string;
  paymentId?: string;

  // 元数据
  startTime?: Date;
  attempts?: Record<string, number>;
}
```

### Phase 2: 重写 Saga 定义 (2 小时)

#### 2.1 创建新的 Saga 文件

```typescript
// /backend/billing-service/src/sagas/purchase-plan-v2.saga.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  EventBusService,
} from '@cloudphone/shared';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';
import { PurchasePlanSagaState } from './types/purchase-plan-saga.types';

@Injectable()
export class PurchasePlanSagaV2 {
  private readonly logger = new Logger(PurchasePlanSagaV2.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 启动订单购买 Saga
   */
  async startPurchase(
    userId: string,
    planId: string,
    amount: number,
  ): Promise<string> {
    const initialState: PurchasePlanSagaState = {
      userId,
      planId,
      amount,
      startTime: new Date(),
      attempts: {},
    };

    const sagaDefinition = this.createSagaDefinition();
    const sagaId = await this.sagaOrchestrator.executeSaga(
      sagaDefinition,
      initialState,
    );

    this.logger.log(`Purchase Saga started: ${sagaId} for user ${userId}`);
    return sagaId;
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<PurchasePlanSagaState> {
    return {
      type: SagaType.PAYMENT_PURCHASE, // ✅ 需要添加到 SagaType enum
      timeoutMs: 5 * 60 * 1000, // 5 分钟
      maxRetries: 3,
      steps: [
        {
          name: 'VALIDATE_PLAN',
          execute: this.validatePlan.bind(this),
          compensate: async () => {}, // 无需补偿
        },
        {
          name: 'CREATE_ORDER',
          execute: this.createOrder.bind(this),
          compensate: this.cancelOrder.bind(this),
        },
        {
          name: 'ALLOCATE_DEVICE',
          execute: this.allocateDevice.bind(this),
          compensate: this.releaseDevice.bind(this),
        },
        {
          name: 'PROCESS_PAYMENT',
          execute: this.processPayment.bind(this),
          compensate: this.refundPayment.bind(this),
        },
        {
          name: 'ACTIVATE_ORDER',
          execute: this.activateOrder.bind(this),
          compensate: async () => {}, // 订单已激活，无法补偿
        },
      ],
    };
  }

  // ==================== Step 1: Validate Plan ====================
  private async validatePlan(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`Validating plan ${state.planId}`);

    const plan = await this.planRepository.findOne({
      where: { id: state.planId, isActive: true },
    });

    if (!plan) {
      throw new Error(`Plan ${state.planId} not found or inactive`);
    }

    if (plan.price !== state.amount) {
      throw new Error(
        `Price mismatch: expected ${plan.price}, got ${state.amount}`,
      );
    }

    return {}; // 无需更新状态
  }

  // ==================== Step 2: Create Order ====================
  private async createOrder(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`Creating order for user ${state.userId}`);

    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const order = this.orderRepository.create({
      userId: state.userId,
      planId: state.planId,
      orderNumber,
      amount: state.amount,
      finalAmount: state.amount,
      status: OrderStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟
    });

    const savedOrder = await this.orderRepository.save(order);

    return { orderId: savedOrder.id };
  }

  private async cancelOrder(
    state: PurchasePlanSagaState,
  ): Promise<void> {
    if (!state.orderId) return;

    this.logger.log(`Cancelling order ${state.orderId}`);

    await this.orderRepository.update(state.orderId, {
      status: OrderStatus.CANCELLED,
      cancelReason: 'Saga compensation',
      cancelledAt: new Date(),
    });

    // 发送事件
    await this.eventBus.publishBillingEvent('order.cancelled', {
      orderId: state.orderId,
      userId: state.userId,
      reason: 'Saga compensation',
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Step 3: Allocate Device ====================
  private async allocateDevice(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`Allocating device for order ${state.orderId}`);

    // 发送设备分配请求事件
    await this.eventBus.publishDeviceEvent('allocate.requested', {
      orderId: state.orderId,
      userId: state.userId,
      planId: state.planId,
      timestamp: new Date().toISOString(),
    });

    // 等待设备分配结果 (通过轮询或事件回调)
    // 这里简化为同步调用
    const deviceId = await this.waitForDeviceAllocation(state.orderId);

    if (!deviceId) {
      throw new Error('Device allocation failed');
    }

    // 更新订单
    await this.orderRepository.update(state.orderId, {
      deviceId,
    });

    return { deviceId };
  }

  private async releaseDevice(
    state: PurchasePlanSagaState,
  ): Promise<void> {
    if (!state.deviceId) return;

    this.logger.log(`Releasing device ${state.deviceId}`);

    await this.eventBus.publishDeviceEvent('release', {
      deviceId: state.deviceId,
      userId: state.userId,
      reason: 'Saga compensation',
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Step 4: Process Payment ====================
  private async processPayment(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`Processing payment for order ${state.orderId}`);

    // 调用支付服务（这里简化为直接标记为已支付）
    // 实际应该调用 PayPal/Stripe/Alipay 等支付网关

    const paymentId = `PAY${Date.now()}`;

    await this.orderRepository.update(state.orderId, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    });

    return { paymentId };
  }

  private async refundPayment(
    state: PurchasePlanSagaState,
  ): Promise<void> {
    if (!state.paymentId) return;

    this.logger.log(`Refunding payment ${state.paymentId}`);

    // 调用退款接口
    // await this.paymentService.refund(state.paymentId, state.amount);

    // 更新订单状态
    await this.orderRepository.update(state.orderId, {
      status: OrderStatus.REFUNDED,
      refundedAt: new Date(),
    });
  }

  // ==================== Step 5: Activate Order ====================
  private async activateOrder(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`Activating order ${state.orderId}`);

    await this.orderRepository.update(state.orderId, {
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
    });

    // 发送成功事件
    await this.eventBus.publishBillingEvent('order.completed', {
      orderId: state.orderId,
      userId: state.userId,
      deviceId: state.deviceId,
      amount: state.amount,
      timestamp: new Date().toISOString(),
    });

    // 发送通知
    await this.eventBus.publish('cloudphone.events', 'notification.send', {
      userId: state.userId,
      type: 'order_completed',
      title: '订单已完成',
      message: `您的订单已成功完成，设备已激活`,
      priority: 'normal',
      timestamp: new Date().toISOString(),
    });

    return {};
  }

  // ==================== Helper Methods ====================
  private async waitForDeviceAllocation(orderId: string): Promise<string | null> {
    // 实现异步等待设备分配结果的逻辑
    // 可以使用 RabbitMQ 回调或轮询数据库
    // 这里简化为返回模拟设备 ID
    return `device-${Date.now()}`;
  }
}
```

### Phase 3: 更新 SagaType Enum (30分钟)

```typescript
// /backend/shared/src/saga/saga-orchestrator.service.ts
export enum SagaType {
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PAYMENT_PURCHASE = 'PAYMENT_PURCHASE', // ✅ 添加此行
  DEVICE_CREATION = 'DEVICE_CREATION',
  APP_UPLOAD = 'APP_UPLOAD',
}
```

### Phase 4: 集成测试 (1 小时)

#### 4.1 创建测试文件

```typescript
// /backend/billing-service/src/sagas/purchase-plan-v2.saga.spec.ts
import { Test } from '@nestjs/testing';
import { PurchasePlanSagaV2 } from './purchase-plan-v2.saga';
import { SagaOrchestratorService, SagaStatus } from '@cloudphone/shared';

describe('PurchasePlanSagaV2', () => {
  let saga: PurchasePlanSagaV2;
  let sagaOrchestrator: SagaOrchestratorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PurchasePlanSagaV2,
        // Mock providers
      ],
    }).compile();

    saga = module.get(PurchasePlanSagaV2);
    sagaOrchestrator = module.get(SagaOrchestratorService);
  });

  it('should complete purchase successfully', async () => {
    const sagaId = await saga.startPurchase('user-123', 'plan-456', 100);

    // 等待 Saga 完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const state = await sagaOrchestrator.getSagaState(sagaId);
    expect(state.status).toBe(SagaStatus.COMPLETED);
  });

  it('should compensate on device allocation failure', async () => {
    // Mock device allocation failure
    // ...

    const sagaId = await saga.startPurchase('user-123', 'plan-456', 100);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const state = await sagaOrchestrator.getSagaState(sagaId);
    expect(state.status).toBe(SagaStatus.COMPENSATED);
  });
});
```

### Phase 5: 切换和清理 (30分钟)

#### 5.1 更新控制器使用新 Saga

```typescript
// /backend/billing-service/src/billing/billing.controller.ts
- import { PurchasePlanSaga } from '../sagas/purchase-plan.saga';
+ import { PurchasePlanSagaV2 } from '../sagas/purchase-plan-v2.saga';

@Controller('orders')
export class BillingController {
  constructor(
-   private readonly purchaseSaga: PurchasePlanSaga,
+   private readonly purchaseSaga: PurchasePlanSagaV2,
  ) {}

  @Post('purchase')
  async purchasePlan(@Body() dto: PurchasePlanDto) {
    const sagaId = await this.purchaseSaga.startPurchase(
      dto.userId,
      dto.planId,
      dto.amount,
    );

    return {
      sagaId,
      message: 'Purchase initiated, check status with saga ID',
    };
  }

  @Get('saga/:sagaId/status')
  async getSagaStatus(@Param('sagaId') sagaId: string) {
    const state = await this.sagaOrchestrator.getSagaState(sagaId);
    return {
      sagaId,
      status: state.status,
      currentStep: state.currentStep,
      error: state.errorMessage,
    };
  }
}
```

#### 5.2 删除旧文件

```bash
# 备份旧文件
mv /backend/billing-service/src/sagas/purchase-plan.saga.ts \
   /backend/billing-service/src/sagas/purchase-plan.saga.ts.backup

# 重命名新文件
mv /backend/billing-service/src/sagas/purchase-plan-v2.saga.ts \
   /backend/billing-service/src/sagas/purchase-plan.saga.ts
```

---

## 迁移后的优势

### 1. 持久化和恢复

```sql
-- 查询所有运行中的 Saga
SELECT * FROM saga_state WHERE status = 'RUNNING';

-- 查询失败的 Saga
SELECT * FROM saga_state
WHERE status = 'FAILED'
  AND created_at > NOW() - INTERVAL '1 day';

-- 查询超时的 Saga
SELECT * FROM saga_state
WHERE status = 'TIMEOUT'
  AND timeout_at < NOW();
```

### 2. 崩溃恢复

服务重启时，SagaOrchestratorService 会自动：
- 加载所有 `RUNNING` 状态的 Saga
- 从上次中断的步骤继续执行
- 对超时的 Saga 执行补偿

### 3. 监控和告警

```typescript
// 添加 Saga 监控端点
@Get('admin/sagas/metrics')
async getSagaMetrics() {
  const total = await this.sagaRepository.count();
  const running = await this.sagaRepository.count({
    where: { status: SagaStatus.RUNNING },
  });
  const failed = await this.sagaRepository.count({
    where: { status: SagaStatus.FAILED },
  });
  const successRate = ((total - failed) / total) * 100;

  return {
    total,
    running,
    failed,
    successRate: `${successRate.toFixed(2)}%`,
  };
}
```

---

## 验证清单

迁移完成后，验证以下功能：

- [ ] 成功购买流程：订单创建 → 设备分配 → 支付 → 激活
- [ ] 失败补偿：任一步骤失败时正确回滚
- [ ] 服务重启：重启后 Saga 继续执行
- [ ] 超时处理：超时 Saga 自动补偿
- [ ] 监控查询：可通过 SQL 查询 Saga 状态
- [ ] 并发处理：多个 Saga 同时执行无冲突

---

## 回滚计划

如果迁移出现问题，立即回滚：

```bash
# 1. 恢复旧文件
mv /backend/billing-service/src/sagas/purchase-plan.saga.ts.backup \
   /backend/billing-service/src/sagas/purchase-plan.saga.ts

# 2. 恢复控制器导入
git checkout backend/billing-service/src/billing/billing.controller.ts

# 3. 重启服务
pm2 restart billing-service
```

---

## 时间估算

| 阶段 | 时间 | 累计 |
|------|------|------|
| Phase 1: 准备 | 1h | 1h |
| Phase 2: 重写 | 2h | 3h |
| Phase 3: 更新 Enum | 0.5h | 3.5h |
| Phase 4: 测试 | 1h | 4.5h |
| Phase 5: 切换 | 0.5h | 5h |
| **总计** | **5h** | - |

---

## 下一步

1. **审查此迁移计划** - 确认步骤和代码示例
2. **安排开发时间** - 预留 5-6 小时不间断时间
3. **执行迁移** - 按步骤逐个完成
4. **测试验证** - 完整测试所有场景
5. **监控观察** - 上线后观察 1-2 天

---

**创建日期**: 2025-10-29
**负责人**: Backend Team
**状态**: 📝 待审批
