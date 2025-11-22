# 云手机平台事务治理总体方案

> **版本**: v1.0
> **日期**: 2025-01-04
> **状态**: 架构设计
> **作者**: Architecture Team

---

## 📋 执行摘要

### 核心发现

经过全面审计，我们发现云手机平台存在**严重的数据一致性风险**：

- **事务覆盖率**: 仅 21.2%（24/113 服务文件有事务保护）
- **零覆盖服务**: 3个服务完全没有事务保护（notification, sms-receive, proxy）
- **高风险场景**: 涉及金钱的订单创建、支付处理缺少事务保护
- **分布式事务**: 虽然有完善的 Saga 框架，但使用率不足 10%

### 好消息

**平台已经具备完善的分布式事务基础设施**：

✅ **Saga 编排器** - `@cloudphone/shared/saga/SagaOrchestratorService`
✅ **Outbox 模式** - `@cloudphone/shared/outbox/EventOutboxService`
✅ **Event Sourcing** - user-service 完整实现
✅ **分布式锁** - Redis 实现的 `@Lock()` 装饰器

**问题不是缺少工具，而是使用率低！**

---

## 🎯 总体目标

### 短期目标（1-2个月）

1. **P0 风险消除** - 修复 billing-service 和 user-service 的关键事务问题
2. **统一框架推广** - 在 @cloudphone/shared 中提供统一的事务装饰器
3. **自动化检测** - 建立 ESLint 规则自动检测缺失事务的代码

### 中期目标（2-4个月）

1. **全面事务覆盖** - 事务覆盖率提升到 90% 以上
2. **Saga 模式推广** - 所有跨服务业务流程使用 Saga 编排
3. **监控体系建立** - Grafana 仪表盘监控事务成功率、Saga 状态

### 长期目标（4-6个月）

1. **事件驱动架构升级** - 全面采用 Outbox 模式确保事件发布可靠性
2. **最终一致性保障** - 建立完善的补偿机制和对账流程
3. **测试体系完善** - 混沌工程测试分布式事务的健壮性

---

## 🏗️ 三层事务架构模型

我们的微服务架构需要三种不同层次的事务保障机制：

```
┌─────────────────────────────────────────────────────────────┐
│                    L3: 跨服务分布式事务                      │
│                                                               │
│   工具: Saga 编排器 + Outbox 模式                            │
│   场景: 订单购买（billing + device + notification）          │
│   模式: 最终一致性 + 补偿逻辑                                │
│                                                               │
│   示例: 用户购买套餐                                         │
│   ├─ Step 1: 创建订单 (billing-service)                     │
│   ├─ Step 2: 分配设备 (device-service)                      │
│   ├─ Step 3: 扣减余额 (billing-service)                     │
│   ├─ Step 4: 发送通知 (notification-service)                │
│   └─ 任何步骤失败 → 自动回滚已执行的步骤                    │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┼─────────────────────────────────┐
│                    L2: 单服务跨数据库事务                     │
│                              │                                 │
│   工具: TypeORM 两阶段提交 / Outbox 模式                      │
│   场景: 同时写入主表和事件表                                 │
│   模式: 强一致性（同一服务内）                               │
│                              │                                 │
│   示例: 创建用户 + 写入事件 (user-service)                   │
│   ├─ 写业务数据到 users 表                                   │
│   ├─ 写事件到 event_outbox 表                                │
│   └─ 同一个事务，要么都成功，要么都失败                     │
└───────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┼─────────────────────────────────┐
│                    L1: 单数据库本地事务                       │
│                              │                                 │
│   工具: TypeORM @Transaction 装饰器 / queryRunner             │
│   场景: 单服务内多表写操作                                   │
│   模式: ACID 强一致性                                         │
│                              │                                 │
│   示例: 创建用户 + 分配角色 (user-service)                   │
│   ├─ INSERT INTO users (...)                                  │
│   ├─ INSERT INTO user_roles (...)                             │
│   └─ 同一个事务，保证原子性                                  │
└───────────────────────────────────────────────────────────────┘
```

### 事务选择决策树

```
是否跨服务调用？
├─ 是 → 使用 L3 Saga 模式
│       └─ 定义步骤 + 补偿逻辑
│
└─ 否 → 是否跨数据库？
        ├─ 是 → 使用 L2 Outbox 模式
        │       └─ 业务数据 + 事件在同一事务中
        │
        └─ 否 → 是否多表操作？
                ├─ 是 → 使用 L1 @Transaction
                │       └─ 单个事务包装所有操作
                │
                └─ 否 → 无需事务（单条 INSERT/UPDATE）
```

---

## 📦 现有基础设施评估

### ✅ 已有能力

#### 1. Saga 编排器 (`@cloudphone/shared/saga/`)

**位置**: `backend/shared/src/saga/saga-orchestrator.service.ts`

**核心功能**:
- ✅ 持久化 Saga 状态到 `saga_state` 表
- ✅ 自动重试机制（指数退避）
- ✅ 超时检测和恢复
- ✅ 补偿逻辑自动执行（反向回滚）
- ✅ 崩溃恢复能力

**使用示例**:
```typescript
// 已实现的 Saga 案例: billing-service 订单购买
const purchaseSaga: SagaDefinition = {
  type: SagaType.PAYMENT_PURCHASE,
  timeoutMs: 300000, // 5分钟
  steps: [
    {
      name: 'VALIDATE_PLAN',
      execute: async (state) => { /* 验证套餐 */ },
      compensate: async () => {}, // 无需补偿
    },
    {
      name: 'CREATE_ORDER',
      execute: async (state) => { /* 创建订单 */ },
      compensate: async (state) => { /* 取消订单 */ },
    },
    {
      name: 'PROCESS_PAYMENT',
      execute: async (state) => { /* 处理支付 */ },
      compensate: async (state) => { /* 退款 */ },
    },
  ],
};

const sagaId = await sagaOrchestrator.executeSaga(purchaseSaga, initialState);
```

**已定义的 Saga 类型**:
- ✅ `PAYMENT_PURCHASE` - 订单购买（billing-service）
- ✅ `DEVICE_CREATION` - 设备创建（device-service）
- ✅ `APP_UPLOAD` - 应用上传（app-service）
- ✅ `USER_REGISTRATION` - 用户注册（user-service）
- ✅ `APP_INSTALLATION` - 应用安装
- ✅ `DEVICE_DELETION` - 设备删除
- ✅ `SNAPSHOT_CREATE` - 快照创建
- ✅ `SNAPSHOT_RESTORE` - 快照恢复

**问题**: **使用率极低** - 只有 billing-service 使用了 `PAYMENT_PURCHASE`

---

#### 2. Outbox 模式 (`@cloudphone/shared/outbox/`)

**位置**: `backend/shared/src/outbox/event-outbox.service.ts`

**核心功能**:
- ✅ 事务性事件发布（确保 At-Least-Once 交付）
- ✅ 自动发布机制（每5秒轮询）
- ✅ 失败重试（指数退避）
- ✅ 定时清理旧事件（7天）

**正确使用方式**:
```typescript
// ❌ 错误：直接发布事件（不保证事务性）
async createUser(dto) {
  const user = await this.userRepo.save(user);
  await this.eventBus.publishUserEvent('created', user); // RabbitMQ 挂了就丢失
}

// ✅ 正确：使用 Outbox 模式
async createUser(dto) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 业务数据
    const user = await queryRunner.manager.save(User, user);

    // 事件写入 Outbox（同一个事务）
    await this.outboxService.writeEvent(
      queryRunner,
      'user',
      user.id,
      'user.created',
      { userId: user.id, email: user.email }
    );

    await queryRunner.commitTransaction();
    // 后台任务会自动发布事件到 RabbitMQ
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

**问题**: **几乎没有服务使用** - 大部分服务直接调用 `eventBus.publish()`

---

#### 3. Event Sourcing (`user-service`)

**位置**: `backend/user-service/src/users/`

**核心功能**:
- ✅ CQRS 模式（命令查询分离）
- ✅ 事件溯源（所有状态变更记录为事件）
- ✅ 快照机制（每10个事件）
- ✅ 事件重放能力

**问题**: **只有 user-service 实现**，其他服务未采用

---

#### 4. 分布式锁 (`@cloudphone/shared`)

**位置**: `backend/shared/src/redis/distributed-lock.service.ts`

**核心功能**:
- ✅ Redis 实现
- ✅ `@Lock()` 装饰器
- ✅ 自动续租
- ✅ 死锁检测

**使用示例**:
```typescript
@Lock('quota:{{userId}}')
async deductQuota(userId: string, amount: number) {
  // 这个方法同一时间只能一个实例执行
  const quota = await this.getQuota(userId);
  if (quota < amount) throw new Error('Insufficient quota');
  await this.updateQuota(userId, quota - amount);
}
```

**问题**: **使用不够广泛**，很多并发场景没有加锁

---

### ❌ 缺失的能力

#### 1. 本地事务装饰器

**现状**: TypeORM 提供 `@Transaction()` 装饰器，但**没有任何服务使用**

**原因**:
- 开发者不知道这个装饰器
- 没有强制规范要求
- 缺少代码示例和文档

**解决方案**: 在 `@cloudphone/shared` 中封装统一的 `@Transactional` 装饰器

---

#### 2. 事务监控和告警

**现状**:
- ❌ 没有事务成功率监控
- ❌ 没有 Saga 执行状态监控
- ❌ 没有 Outbox 积压告警

**影响**:
- 无法及时发现事务失败
- Saga 失败后可能长时间未发现
- Outbox 积压导致事件延迟

**解决方案**: Prometheus + Grafana 监控仪表盘

---

#### 3. 事务测试工具

**现状**:
- ❌ 没有混沌工程测试工具
- ❌ 没有分布式事务集成测试
- ❌ 没有补偿逻辑测试用例

**影响**: 无法验证 Saga 补偿逻辑是否正确

**解决方案**: 混沌工程测试套件 + Saga 测试框架

---

## 🛠️ 统一事务管理框架设计

### 方案：在 @cloudphone/shared 中提供统一装饰器

#### 1. @Transactional 装饰器（L1 本地事务）

**位置**: `backend/shared/src/decorators/transactional.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const TRANSACTIONAL_KEY = 'transactional';

/**
 * 标记方法需要在事务中执行
 *
 * 使用示例:
 * @Transactional()
 * async createUser(dto: CreateUserDto) {
 *   // 所有数据库操作自动在一个事务中
 * }
 */
export function Transactional(options?: {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  propagation?: 'REQUIRED' | 'REQUIRES_NEW' | 'NESTED';
}) {
  return SetMetadata(TRANSACTIONAL_KEY, options || {});
}
```

#### 2. TransactionInterceptor（自动开启事务）

**位置**: `backend/shared/src/interceptors/transaction.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { TRANSACTIONAL_KEY } from '../decorators/transactional.decorator';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const transactionalOptions = this.reflector.get(TRANSACTIONAL_KEY, context.getHandler());

    if (!transactionalOptions) {
      // 没有 @Transactional 装饰器，直接执行
      return next.handle();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction(transactionalOptions.isolationLevel);

    return next.handle().pipe(
      tap(async () => {
        // 成功：提交事务
        await queryRunner.commitTransaction();
        await queryRunner.release();
      }),
      catchError(async (error) => {
        // 失败：回滚事务
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        return throwError(() => error);
      })
    );
  }
}
```

#### 3. @WithSaga 装饰器（L3 分布式事务）

**位置**: `backend/shared/src/decorators/with-saga.decorator.ts`

```typescript
/**
 * 标记方法需要使用 Saga 模式
 *
 * 使用示例:
 * @WithSaga(SagaType.PAYMENT_PURCHASE)
 * async purchasePlan(userId: string, planId: string) {
 *   // 自动创建 Saga 并执行
 * }
 */
export function WithSaga(sagaType: SagaType) {
  return SetMetadata('saga_type', sagaType);
}
```

#### 4. @WithOutbox 装饰器（L2 事务 + 事件发布）

**位置**: `backend/shared/src/decorators/with-outbox.decorator.ts`

```typescript
/**
 * 标记方法需要使用 Outbox 模式发布事件
 *
 * 使用示例:
 * @WithOutbox()
 * async createUser(dto: CreateUserDto) {
 *   // 自动开启事务
 *   // 方法返回值中的 events 数组会自动写入 Outbox
 *   return {
 *     user,
 *     events: [
 *       { type: 'user.created', payload: { userId: user.id } }
 *     ]
 *   };
 * }
 */
export function WithOutbox() {
  return SetMetadata('with_outbox', true);
}
```

---

## 🌐 分布式事务解决方案

### 跨服务业务流程标准化

#### 标准流程：Saga 定义 + 注册 + 使用

**Step 1: 定义 Saga**

```typescript
// backend/billing-service/src/sagas/purchase-plan.saga.ts
export class PurchasePlanSaga {
  createDefinition(): SagaDefinition<PurchasePlanState> {
    return {
      type: SagaType.PAYMENT_PURCHASE,
      timeoutMs: 300000, // 5分钟
      maxRetries: 3,
      steps: [
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
      ],
    };
  }

  // 各步骤的实现...
}
```

**Step 2: 在 Controller 中使用**

```typescript
@Post('purchase')
async purchasePlan(@Body() dto: PurchasePlanDto) {
  const sagaId = await this.purchaseSaga.start(dto.userId, dto.planId, dto.amount);

  return {
    sagaId,
    message: '订单处理中，请稍候查询结果',
  };
}

@Get('purchase/:sagaId/status')
async getSagaStatus(@Param('sagaId') sagaId: string) {
  const status = await this.sagaOrchestrator.getSagaState(sagaId);
  return status;
}
```

---

### 需要 Saga 的典型场景

| 业务场景 | 涉及服务 | Saga 类型 | 优先级 |
|---------|---------|----------|--------|
| 用户注册 | user + notification | USER_REGISTRATION | P0 |
| 订单购买 | billing + device + notification | PAYMENT_PURCHASE | P0 |
| 设备创建 | device + user (quota) + notification | DEVICE_CREATION | P0 |
| 应用安装 | app + device (ADB) | APP_INSTALLATION | P1 |
| 设备删除 | device + user (quota) + billing | DEVICE_DELETION | P1 |
| 快照创建 | device (snapshot) + MinIO | SNAPSHOT_CREATE | P1 |
| 退款流程 | billing + payment + notification | PAYMENT_REFUND | P0 |

---

## 📊 事务监控和可观测性

### Prometheus 指标

```typescript
// backend/shared/src/metrics/transaction-metrics.service.ts
@Injectable()
export class TransactionMetricsService {
  private readonly transactionCounter = new Counter({
    name: 'transaction_total',
    help: 'Total number of transactions',
    labelNames: ['service', 'method', 'status'],
  });

  private readonly transactionDuration = new Histogram({
    name: 'transaction_duration_seconds',
    help: 'Transaction duration in seconds',
    labelNames: ['service', 'method'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly sagaStepCounter = new Counter({
    name: 'saga_step_total',
    help: 'Total number of saga steps executed',
    labelNames: ['saga_type', 'step_name', 'status'],
  });

  private readonly outboxQueueGauge = new Gauge({
    name: 'outbox_pending_events',
    help: 'Number of pending events in outbox',
    labelNames: ['service'],
  });

  recordTransactionSuccess(service: string, method: string, duration: number) {
    this.transactionCounter.inc({ service, method, status: 'success' });
    this.transactionDuration.observe({ service, method }, duration);
  }

  recordTransactionFailure(service: string, method: string, duration: number) {
    this.transactionCounter.inc({ service, method, status: 'failure' });
    this.transactionDuration.observe({ service, method }, duration);
  }

  recordSagaStep(sagaType: string, stepName: string, status: 'success' | 'failure' | 'compensated') {
    this.sagaStepCounter.inc({ saga_type: sagaType, step_name: stepName, status });
  }

  setOutboxQueueSize(service: string, size: number) {
    this.outboxQueueGauge.set({ service }, size);
  }
}
```

### Grafana 仪表盘

```yaml
# infrastructure/monitoring/grafana/dashboards/transaction-monitoring.json
{
  "title": "Transaction Monitoring Dashboard",
  "panels": [
    {
      "title": "Transaction Success Rate",
      "targets": [
        {
          "expr": "rate(transaction_total{status='success'}[5m]) / rate(transaction_total[5m])"
        }
      ]
    },
    {
      "title": "Saga Execution Status",
      "targets": [
        {
          "expr": "sum by (saga_type, status) (saga_step_total)"
        }
      ]
    },
    {
      "title": "Outbox Queue Size",
      "targets": [
        {
          "expr": "outbox_pending_events"
        }
      ],
      "alert": {
        "conditions": [
          {
            "evaluator": {
              "type": "gt",
              "params": [1000]
            },
            "message": "Outbox queue积压超过1000条事件"
          }
        ]
      }
    }
  ]
}
```

---

## 🚀 渐进式迁移策略

### 阶段 1: P0 风险消除（1周）

**目标**: 修复涉及金钱和安全的关键业务

#### 任务清单

1. **billing-service** (2人日)
   - ✅ 订单创建 + 扣款 → 添加 `@Transactional`
   - ✅ 优惠券使用 + 扣款 → 添加 `@Transactional`
   - ✅ 余额充值 + 记录 → 添加 `@Transactional`

2. **user-service** (2人日)
   - ✅ 用户创建 + 角色分配 → 添加 `@Transactional`
   - ✅ 配额扣减 → 添加分布式锁 `@Lock()`
   - ✅ 2FA 设置 → 添加 `@Transactional`

3. **测试验证** (1人日)
   - ✅ 单元测试覆盖事务场景
   - ✅ 集成测试验证回滚逻辑
   - ✅ 手动测试异常场景

**验收标准**:
- [ ] P0 级别业务方法100%有事务保护
- [ ] 所有单元测试通过
- [ ] 手动测试验证事务回滚正确

---

### 阶段 2: 统一框架建设（1周）

**目标**: 在 @cloudphone/shared 中提供统一工具

#### 任务清单

1. **事务装饰器开发** (2人日)
   ```bash
   backend/shared/src/decorators/
   ├── transactional.decorator.ts        # ✅ @Transactional
   ├── with-saga.decorator.ts           # ✅ @WithSaga
   └── with-outbox.decorator.ts         # ✅ @WithOutbox

   backend/shared/src/interceptors/
   ├── transaction.interceptor.ts       # ✅ 自动事务管理
   ├── saga.interceptor.ts              # ✅ 自动 Saga 执行
   └── outbox.interceptor.ts            # ✅ 自动事件写入
   ```

2. **文档编写** (1人日)
   ```bash
   docs/
   ├── TRANSACTION_BEST_PRACTICES.md    # ✅ 最佳实践
   ├── SAGA_PATTERN_GUIDE.md           # ✅ Saga 模式指南
   └── OUTBOX_PATTERN_GUIDE.md         # ✅ Outbox 模式指南
   ```

3. **示例代码** (1人日)
   ```bash
   backend/shared/examples/
   ├── transaction-example.service.ts
   ├── saga-example.service.ts
   └── outbox-example.service.ts
   ```

4. **ESLint 规则** (1人日)
   ```javascript
   // .eslintrc.js
   rules: {
     'require-transactional': [
       'error',
       {
         // 检测包含多个 repository.save() 的方法
         'multipleWrites': true,
         // 检测包含 create/update/delete 的方法名
         'methodNamePatterns': ['/create|update|delete|remove/i'],
       },
     ],
   }
   ```

**验收标准**:
- [ ] 所有装饰器开发完成并有单元测试
- [ ] 文档审核通过
- [ ] ESLint 规则在 CI/CD 中启用

---

### 阶段 3: P1 服务迁移（2周）

**目标**: device-service 和 notification-service 全面事务化

#### 任务清单

1. **device-service** (1周)
   - ✅ 快照创建 + 压缩 → 使用 `@Transactional` + Outbox
   - ✅ 设备迁移 → 使用 Saga 模式
   - ✅ 批量操作 → 使用 `@Transactional`
   - ✅ 故障转移 → 使用 Saga 模式

2. **notification-service** (3天)
   - ✅ 模板更新 → 使用 `@Transactional`
   - ✅ 批量通知 → 使用 Outbox 模式

3. **集成测试** (2天)
   - ✅ Saga 补偿逻辑测试
   - ✅ Outbox 事件发布测试
   - ✅ 并发场景测试

**验收标准**:
- [ ] device-service 事务覆盖率 > 90%
- [ ] notification-service 事务覆盖率 100%
- [ ] 集成测试覆盖所有 Saga 场景

---

### 阶段 4: P2 服务迁移（1周）

**目标**: sms-receive-service 和 proxy-service 完整事务支持

#### 任务清单

1. **sms-receive-service** (3天)
   - ✅ 号码池管理 → 使用 `@Transactional`
   - ✅ 短信记录 → 使用 Outbox 模式

2. **proxy-service** (3天)
   - ✅ 代理分配 → 使用 `@Transactional` + 分布式锁
   - ✅ 使用统计 → 使用 Outbox 模式

3. **回归测试** (1天)

**验收标准**:
- [ ] 所有服务事务覆盖率 > 90%
- [ ] 回归测试通过

---

### 阶段 5: 监控和自动化（1周）

**目标**: 建立完善的监控和自动化检测体系

#### 任务清单

1. **Prometheus 指标集成** (2天)
   - ✅ 事务成功率指标
   - ✅ Saga 执行状态指标
   - ✅ Outbox 队列大小指标

2. **Grafana 仪表盘** (1天)
   - ✅ 事务监控仪表盘
   - ✅ Saga 状态仪表盘
   - ✅ Outbox 健康检查仪表盘

3. **告警规则** (1天)
   - ✅ 事务失败率 > 5% 告警
   - ✅ Saga 补偿执行告警
   - ✅ Outbox 积压 > 1000 告警

4. **混沌工程测试** (2天)
   - ✅ 注入数据库故障
   - ✅ 注入 RabbitMQ 故障
   - ✅ 注入网络延迟

**验收标准**:
- [ ] Grafana 仪表盘上线
- [ ] 告警规则配置完成
- [ ] 混沌测试通过

---

## ✅ 自动化检测和测试方案

### 1. ESLint 规则：检测缺失事务的代码

**位置**: `eslint-plugin-transaction/index.js`

```javascript
module.exports = {
  rules: {
    'require-transactional': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require @Transactional decorator for methods with multiple database writes',
        },
        messages: {
          missingTransactional: 'Method "{{methodName}}" performs multiple database writes but missing @Transactional decorator',
        },
      },
      create(context) {
        return {
          MethodDefinition(node) {
            const methodName = node.key.name;

            // 检测方法名是否匹配 create/update/delete 模式
            if (/^(create|update|delete|remove|assign|activate)/.test(methodName)) {
              // 检查是否有 @Transactional 装饰器
              const hasTransactional = node.decorators?.some(
                d => d.expression.callee?.name === 'Transactional'
              );

              if (!hasTransactional) {
                context.report({
                  node,
                  messageId: 'missingTransactional',
                  data: { methodName },
                });
              }
            }
          },
        };
      },
    },
  },
};
```

**在 CI/CD 中启用**:

```yaml
# .github/workflows/lint.yml
name: Lint Check
on: [push, pull_request]
jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm lint --rule 'require-transactional: error'
```

---

### 2. Jest 测试：Saga 补偿逻辑测试

```typescript
// backend/billing-service/src/sagas/__tests__/purchase-plan.saga.spec.ts
describe('PurchasePlanSaga', () => {
  it('should compensate all steps when payment fails', async () => {
    // Mock: 支付失败
    jest.spyOn(paymentService, 'processPayment').mockRejectedValue(
      new Error('Payment gateway timeout')
    );

    const sagaId = await saga.start('user-123', 'plan-basic', 99.99);

    // 等待 Saga 执行完成
    await waitForSagaCompletion(sagaId, 10000);

    const finalState = await sagaOrchestrator.getSagaState(sagaId);

    // 断言：Saga 状态为 COMPENSATED
    expect(finalState.status).toBe(SagaStatus.COMPENSATED);

    // 断言：订单已取消
    const order = await orderRepo.findOne(finalState.state.orderId);
    expect(order.status).toBe(OrderStatus.CANCELLED);

    // 断言：设备已释放
    const device = await deviceRepo.findOne(finalState.state.deviceId);
    expect(device.status).toBe(DeviceStatus.AVAILABLE);
  });
});
```

---

### 3. 混沌工程测试

```typescript
// backend/e2e-tests/chaos/transaction-resilience.test.ts
describe('Transaction Resilience (Chaos)', () => {
  it('should handle database connection loss during transaction', async () => {
    // 开始创建用户
    const createUserPromise = userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'pass123',
      roleIds: ['role-1'],
    });

    // 等待 100ms 后断开数据库
    await sleep(100);
    await chaosMonkey.killDatabaseConnection();

    // 断言：事务应该失败并回滚
    await expect(createUserPromise).rejects.toThrow();

    // 恢复数据库连接
    await chaosMonkey.restoreDatabaseConnection();

    // 断言：用户未创建
    const user = await userRepo.findOne({ where: { username: 'testuser' } });
    expect(user).toBeNull();
  });

  it('should retry Saga steps when RabbitMQ is temporarily unavailable', async () => {
    // 关闭 RabbitMQ
    await chaosMonkey.stopRabbitMQ();

    // 启动 Saga
    const sagaId = await saga.start('user-123', 'plan-basic', 99.99);

    // 等待 5 秒后恢复 RabbitMQ
    await sleep(5000);
    await chaosMonkey.startRabbitMQ();

    // 等待 Saga 完成
    await waitForSagaCompletion(sagaId, 30000);

    // 断言：Saga 应该成功（经过重试）
    const finalState = await sagaOrchestrator.getSagaState(sagaId);
    expect(finalState.status).toBe(SagaStatus.COMPLETED);
  });
});
```

---

## 📚 最佳实践和开发规范

### 规范 1: 何时使用本地事务

✅ **需要使用 @Transactional 的场景**:

1. **多表写操作**
   ```typescript
   @Transactional()
   async createUser(dto: CreateUserDto) {
     const user = await this.userRepo.save(user);
     await this.userRoleRepo.save(userRoles); // 多表操作
     return user;
   }
   ```

2. **读-修改-写模式**
   ```typescript
   @Transactional()
   async deductBalance(userId: string, amount: number) {
     const user = await this.userRepo.findOne(userId); // 读
     user.balance -= amount; // 修改
     await this.userRepo.save(user); // 写
   }
   ```

3. **包含业务逻辑判断的写操作**
   ```typescript
   @Transactional()
   async activateDevice(deviceId: string) {
     const device = await this.deviceRepo.findOne(deviceId);
     if (device.status !== 'pending') {
       throw new Error('Device already activated');
     }
     device.status = 'active';
     device.activatedAt = new Date();
     await this.deviceRepo.save(device);

     // 更新用户配额
     await this.userQuotaRepo.decrement(device.userId, 'availableDevices', 1);
   }
   ```

❌ **不需要使用 @Transactional 的场景**:

1. **单条 INSERT/UPDATE（无条件判断）**
   ```typescript
   // 不需要事务
   async logActivity(userId: string, action: string) {
     await this.activityLogRepo.save({ userId, action });
   }
   ```

2. **只读操作**
   ```typescript
   // 不需要事务
   async getUser(userId: string) {
     return await this.userRepo.findOne(userId);
   }
   ```

---

### 规范 2: 何时使用 Saga

✅ **需要使用 Saga 的场景**:

1. **跨服务的业务流程**
   ```typescript
   // 订单购买：billing + device + notification
   @WithSaga(SagaType.PAYMENT_PURCHASE)
   async purchasePlan(userId: string, planId: string) {
     // 自动执行 Saga
   }
   ```

2. **长事务（执行时间 > 30秒）**
   ```typescript
   // 设备迁移：可能需要几分钟
   @WithSaga(SagaType.DEVICE_MIGRATION)
   async migrateDevice(deviceId: string, targetNodeId: string) {
     // Saga 支持超时检测和恢复
   }
   ```

3. **需要补偿逻辑的业务**
   ```typescript
   // 退款：需要撤销订单、退款、恢复配额
   @WithSaga(SagaType.PAYMENT_REFUND)
   async refundOrder(orderId: string) {
     // 失败时自动执行补偿
   }
   ```

---

### 规范 3: 何时使用 Outbox

✅ **需要使用 Outbox 的场景**:

1. **业务操作 + 事件发布**
   ```typescript
   @WithOutbox()
   async createDevice(dto: CreateDeviceDto) {
     const device = await this.deviceRepo.save(device);

     // 返回 events 数组，自动写入 Outbox
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
   ```

2. **确保事件至少发布一次（At-Least-Once）**
   ```typescript
   // ❌ 错误：直接发布事件（RabbitMQ 挂了就丢失）
   async createUser(dto) {
     const user = await this.userRepo.save(user);
     await this.eventBus.publish('user.created', user); // 可能丢失
   }

   // ✅ 正确：使用 Outbox 模式
   @WithOutbox()
   async createUser(dto) {
     const user = await this.userRepo.save(user);
     return {
       user,
       events: [{ type: 'user.created', payload: user }],
     };
   }
   ```

---

## 📈 成功指标（KPI）

### 技术指标

| 指标 | 当前值 | 目标值（2个月后） | 说明 |
|-----|--------|------------------|------|
| 事务覆盖率 | 21.2% | 90%+ | 需要事务的方法中已使用事务的比例 |
| Saga 使用率 | <10% | 100% | 跨服务流程中使用 Saga 的比例 |
| Outbox 使用率 | <5% | 90%+ | 事件发布使用 Outbox 的比例 |
| 事务失败率 | 未监控 | <1% | 每日事务失败的比例 |
| Saga 补偿执行次数 | 未监控 | <5次/天 | 每日执行补偿逻辑的次数 |
| Outbox 积压量 | 未监控 | <100 | 待发布事件的数量 |

### 业务指标

| 指标 | 当前值 | 目标值 | 说明 |
|-----|--------|--------|------|
| 订单数据一致性问题 | 未统计 | 0 | 每月订单数据不一致的次数 |
| 配额扣减错误 | 未统计 | 0 | 每月配额扣减错误（负数）的次数 |
| 用户投诉（数据问题） | 未统计 | <5次/月 | 因数据不一致导致的用户投诉 |

---

## ⚠️ 风险评估

### 高风险点

1. **迁移过程中的服务中断**
   - 风险: 修改事务逻辑可能导致服务不可用
   - 缓解: 灰度发布，先在测试环境验证，再逐步上线

2. **性能下降**
   - 风险: 事务增加数据库锁等待时间
   - 缓解:
     - 使用 READ COMMITTED 隔离级别（降低锁冲突）
     - 缩小事务范围（只包装必要的操作）
     - 监控事务执行时间，优化慢查询

3. **Saga 补偿逻辑bug**
   - 风险: 补偿逻辑错误导致数据不一致
   - 缓解:
     - 补偿逻辑必须有单元测试
     - 混沌工程测试验证补偿正确性
     - 生产环境补偿执行时发送告警

4. **Outbox 积压**
   - 风险: RabbitMQ 长时间不可用导致 Outbox 大量积压
   - 缓解:
     - 监控 Outbox 队列大小
     - 积压超过阈值时告警
     - 提供手动触发发布的管理接口

---

## 📅 时间线

```
Week 1: P0 风险消除
├─ Day 1-2: billing-service 关键事务修复
├─ Day 3-4: user-service 关键事务修复
└─ Day 5: 测试验证

Week 2: 统一框架建设
├─ Day 1-2: 装饰器开发
├─ Day 3: 文档编写
├─ Day 4: 示例代码
└─ Day 5: ESLint 规则

Week 3-4: P1 服务迁移
├─ Week 3: device-service 全面事务化
└─ Week 4: notification-service 全面事务化

Week 5: P2 服务迁移
├─ Day 1-3: sms-receive-service
├─ Day 4-5: proxy-service

Week 6: 监控和自动化
├─ Day 1-2: Prometheus 指标
├─ Day 3: Grafana 仪表盘
├─ Day 4: 告警规则
└─ Day 5: 混沌工程测试

Week 7-8: 回归测试和文档完善
```

---

## 🎓 团队培训计划

### 培训课程

1. **事务基础（2小时）**
   - ACID 特性
   - TypeORM 事务 API
   - 隔离级别选择

2. **Saga 模式（3小时）**
   - 什么是 Saga
   - Saga vs 2PC
   - 如何定义 Saga
   - 补偿逻辑设计原则

3. **Outbox 模式（2小时）**
   - 为什么需要 Outbox
   - Outbox vs 直接发布
   - At-Least-Once vs Exactly-Once

4. **实战演练（4小时）**
   - 修复一个缺失事务的 bug
   - 设计一个 Saga 流程
   - 使用 Outbox 发布事件
   - 编写混沌工程测试

---

## 📖 参考资料

### 内部文档

- [Transaction Analysis Report](/docs/TRANSACTION_ANALYSIS_REPORT.md)
- [Saga Pattern Implementation](/backend/shared/src/saga/README.md)
- [Outbox Pattern Implementation](/backend/shared/src/outbox/README.md)
- [Event Sourcing Guide](/backend/user-service/EVENT_SOURCING.md)

### 外部资源

- [Microservices Patterns: Saga](https://microservices.io/patterns/data/saga.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [TypeORM Transactions](https://typeorm.io/transactions)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)

---

## ✅ 检查清单

### 开发阶段

- [ ] 所有 P0 方法添加事务保护
- [ ] @cloudphone/shared 装饰器开发完成
- [ ] ESLint 规则在 CI/CD 中启用
- [ ] 所有 Saga 有单元测试
- [ ] 所有 Saga 有补偿逻辑测试
- [ ] Outbox 模式使用率 > 90%

### 测试阶段

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖所有 Saga 场景
- [ ] 混沌工程测试通过
- [ ] 性能测试（事务执行时间 < 100ms）

### 上线阶段

- [ ] Grafana 仪表盘配置完成
- [ ] 告警规则测试通过
- [ ] 灰度发布计划制定
- [ ] 回滚方案准备
- [ ] 团队培训完成

---

## 📞 联系方式

如有疑问或建议，请联系：

- **架构组**: architecture@cloudphone.run
- **DevOps 组**: devops@cloudphone.run
- **文档仓库**: https://github.com/cloudphone/docs

---

**文档版本**: v1.0
**最后更新**: 2025-01-04
**下次审查**: 2025-02-04
