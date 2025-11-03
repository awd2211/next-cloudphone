# 事务和 Saga 快速参考指南

> **快速查找**: [何时使用](#何时使用) | [代码示例](#代码示例) | [常见问题](#常见问题-faq) | [检查清单](#检查清单)

## 何时使用

### 使用 @Transaction 装饰器

✅ **应该使用的场景**:
- 多表插入/更新操作
- 业务逻辑涉及多个实体
- CQRS Command Handler
- 需要保证 ACID 特性的操作

❌ **不应该使用的场景**:
- 只读操作 (Query)
- 单表操作
- 跨服务调用 (应该使用 Saga)

### 使用 Saga 模式

✅ **应该使用的场景**:
- 跨服务的业务流程
- 需要补偿逻辑的长事务
- 可能失败且需要回滚的多步骤操作
- 涉及外部系统调用

❌ **不应该使用的场景**:
- 单服务内的简单操作 (使用 @Transaction)
- 不需要补偿的操作
- 实时性要求极高的操作

### 使用 Event Outbox

✅ **应该使用的场景**:
- 关键业务事件发布
- 需要保证事件必达
- 业务操作和事件发布需要原子性

❌ **不应该使用的场景**:
- 不重要的通知事件
- 内部系统日志
- 高频率的监控数据

---

## 代码示例

### 1. 使用 @Transaction 装饰器

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Transaction } from '@cloudphone/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {}

  /**
   * 创建用户并分配角色 (使用事务)
   */
  @Transaction()
  async createUserWithRoles(
    manager: EntityManager,  // ✅ 自动注入
    dto: CreateUserDto
  ): Promise<User> {
    // 1. 创建用户
    const user = manager.create(User, {
      username: dto.username,
      email: dto.email,
      passwordHash: await this.hashPassword(dto.password),
    });
    await manager.save(User, user);

    // 2. 分配角色
    if (dto.roleIds && dto.roleIds.length > 0) {
      const userRoles = dto.roleIds.map(roleId => ({
        userId: user.id,
        roleId,
      }));
      await manager.save(UserRole, userRoles);
    }

    // 3. 初始化配额
    const quota = manager.create(Quota, {
      userId: user.id,
      maxDevices: 5,
      maxCpuCores: 10,
      maxMemoryMB: 16384,
    });
    await manager.save(Quota, quota);

    // ✅ 所有操作在同一事务中
    // ✅ 任何步骤失败都会自动回滚

    return user;
  }
}
```

### 2. 使用 Event Outbox 模式

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventOutboxService } from '@cloudphone/shared';

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private eventOutbox: EventOutboxService
  ) {}

  /**
   * 创建订单 (使用 Outbox 模式)
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 创建订单
      const order = queryRunner.manager.create(Order, {
        userId: dto.userId,
        amount: dto.amount,
        status: OrderStatus.PENDING,
      });
      await queryRunner.manager.save(Order, order);

      // 2. ✅ 写入事件到 Outbox (在同一事务中)
      await this.eventOutbox.writeEvent(
        queryRunner,
        'order',           // aggregateType
        order.id,          // aggregateId
        'order.created',   // eventType
        {                  // payload
          orderId: order.id,
          userId: order.userId,
          amount: order.amount,
          timestamp: new Date().toISOString(),
        },
        {
          maxRetries: 5,   // 可选: 最大重试次数
        }
      );

      // 3. 提交事务
      await queryRunner.commitTransaction();

      // ✅ 事件保证发布 (即使 RabbitMQ 暂时不可用)

      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### 3. 创建新的 Saga

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  SagaStep,
} from '@cloudphone/shared';

// 1. 定义 Saga 状态接口
export interface MyBusinessSagaState {
  userId: string;
  // 输入参数
  inputData: any;
  
  // 步骤执行结果
  step1Result?: any;
  step2Result?: any;
  step3Result?: any;
}

@Injectable()
export class MyBusinessSaga {
  private readonly logger = new Logger(MyBusinessSaga.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    // 注入需要的服务
  ) {}

  /**
   * 启动 Saga
   */
  async start(userId: string, inputData: any): Promise<string> {
    const initialState: MyBusinessSagaState = {
      userId,
      inputData,
    };

    const sagaDefinition = this.createSagaDefinition();
    const sagaId = await this.sagaOrchestrator.executeSaga(
      sagaDefinition,
      initialState
    );

    this.logger.log(`Saga started: ${sagaId}`);
    return sagaId;
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<MyBusinessSagaState> {
    return {
      type: SagaType.MY_BUSINESS_SAGA,  // ✅ 在 SagaType 枚举中添加
      timeoutMs: 5 * 60 * 1000,          // 5分钟超时
      maxRetries: 3,                      // 最多重试3次
      steps: [
        {
          name: 'STEP_1',
          execute: this.executeStep1.bind(this),
          compensate: this.compensateStep1.bind(this),
        },
        {
          name: 'STEP_2',
          execute: this.executeStep2.bind(this),
          compensate: this.compensateStep2.bind(this),
        },
        {
          name: 'STEP_3',
          execute: this.executeStep3.bind(this),
          compensate: this.compensateStep3.bind(this),
        },
      ],
    };
  }

  // ==================== Step 1 ====================

  private async executeStep1(
    state: MyBusinessSagaState
  ): Promise<Partial<MyBusinessSagaState>> {
    this.logger.log('[STEP_1] Executing step 1');

    // 执行业务逻辑
    const result = await this.doSomething(state.inputData);

    // 返回需要更新的状态
    return { step1Result: result };
  }

  private async compensateStep1(
    state: MyBusinessSagaState
  ): Promise<void> {
    this.logger.log('[COMPENSATE] Compensating step 1');

    if (state.step1Result) {
      // 执行补偿逻辑
      await this.undoSomething(state.step1Result);
    }
  }

  // ==================== Step 2 ====================

  private async executeStep2(
    state: MyBusinessSagaState
  ): Promise<Partial<MyBusinessSagaState>> {
    this.logger.log('[STEP_2] Executing step 2');
    // ...
    return { step2Result: {} };
  }

  private async compensateStep2(
    state: MyBusinessSagaState
  ): Promise<void> {
    this.logger.log('[COMPENSATE] Compensating step 2');
    // ...
  }

  // ==================== Step 3 ====================

  private async executeStep3(
    state: MyBusinessSagaState
  ): Promise<Partial<MyBusinessSagaState>> {
    this.logger.log('[STEP_3] Executing step 3');
    // ...
    return { step3Result: {} };
  }

  private async compensateStep3(
    state: MyBusinessSagaState
  ): Promise<void> {
    this.logger.log('[COMPENSATE] Compensating step 3');
    // 最后一步通常不需要补偿
  }

  // ==================== Helper Methods ====================

  private async doSomething(data: any): Promise<any> {
    // 实际业务逻辑
    return {};
  }

  private async undoSomething(result: any): Promise<void> {
    // 补偿逻辑
  }
}
```

---

## 常见问题 (FAQ)

### Q1: @Transaction 装饰器的 EntityManager 参数一定要放在第一个位置吗?

**A**: 是的。`@Transaction` 装饰器会自动将 `EntityManager` 注入到方法的第一个参数。

```typescript
// ✅ 正确
@Transaction()
async myMethod(manager: EntityManager, userId: string, data: any) {
  // manager 会被自动注入
}

// ❌ 错误
@Transaction()
async myMethod(userId: string, manager: EntityManager, data: any) {
  // manager 不会被注入到正确的位置
}
```

---

### Q2: Saga 步骤失败后，补偿逻辑是如何执行的?

**A**: Saga 编排器会**反向**执行已完成步骤的补偿逻辑。

```typescript
流程: Step1 → Step2 → Step3 (失败)

补偿顺序: 
  1. compensate(Step3) ❌ (失败的步骤不补偿)
  2. compensate(Step2) ✅
  3. compensate(Step1) ✅
```

---

### Q3: Event Outbox 的事件什么时候发布?

**A**: 
- **写入**: 在业务事务中写入 `event_outbox` 表
- **发布**: 后台定时任务每 **5秒** 轮询一次，发布 pending 状态的事件
- **重试**: 失败的事件会自动重试，使用指数退避策略

---

### Q4: Saga 超时后会怎样?

**A**: 
- Saga 编排器会定期检查超时的 Saga
- 超时的 Saga 状态会被设置为 `TIMEOUT`
- 超时的 Saga **不会自动补偿**，需要手动处理

---

### Q5: 如何查询 Saga 的执行状态?

**A**: 

```typescript
// 注入 SagaOrchestratorService
constructor(
  private sagaOrchestrator: SagaOrchestratorService
) {}

// 查询状态
const state = await this.sagaOrchestrator.getSagaState(sagaId);

console.log(state.status);  // RUNNING, COMPLETED, FAILED, etc.
console.log(state.currentStep);
console.log(state.state);  // 当前状态数据
```

---

### Q6: 补偿逻辑失败了怎么办?

**A**: 
- Saga 编排器会**继续执行**后续的补偿逻辑（尽力而为）
- 补偿失败会记录日志，但不会中断补偿流程
- 最终 Saga 状态会设置为 `COMPENSATED`
- 需要通过监控告警发现补偿失败的 Saga

---

### Q7: 可以在 Saga 步骤中调用其他 Saga 吗?

**A**: 
- **可以**，但**不推荐**（会增加复杂度）
- 更好的做法是将子流程拆分为独立的步骤

---

### Q8: @Transaction 装饰器支持嵌套事务吗?

**A**: 
- **不支持**嵌套事务
- 如果方法A调用方法B，两个都有 `@Transaction`，会创建两个独立的事务
- 建议只在最外层方法使用 `@Transaction`

---

## 检查清单

### 添加新业务功能时

- [ ] 是否涉及多表操作? → 使用 `@Transaction`
- [ ] 是否跨服务调用? → 考虑使用 `Saga`
- [ ] 是否需要发布事件? → 使用 `EventOutbox`
- [ ] 是否需要补偿逻辑? → 定义 `compensate()` 方法
- [ ] 是否需要处理超时? → 设置 `timeoutMs`
- [ ] 是否需要重试? → 设置 `maxRetries`

### Code Review 检查项

- [ ] 多表操作是否在事务中?
- [ ] 事件发布是否使用 Outbox?
- [ ] Saga 步骤是否有补偿逻辑?
- [ ] 是否有单元测试?
- [ ] 是否有集成测试?
- [ ] 是否添加了监控指标?

### 测试检查项

- [ ] Happy path 测试
- [ ] 失败场景测试
- [ ] 补偿逻辑测试
- [ ] 重试逻辑测试
- [ ] 超时测试
- [ ] 并发测试

---

## 最佳实践

### 1. Saga 步骤设计原则

✅ **DO**:
- 每个步骤职责单一
- 步骤名称清晰 (动词 + 名词)
- 步骤可独立测试
- 补偿逻辑幂等

❌ **DON'T**:
- 步骤过于复杂
- 步骤之间强耦合
- 忘记定义补偿逻辑
- 补偿逻辑有副作用

### 2. 事务边界

✅ **DO**:
- 事务尽可能小
- 避免长事务
- 避免在事务中调用外部服务

❌ **DON'T**:
- 事务嵌套
- 事务中执行耗时操作
- 事务中调用 HTTP 接口

### 3. 补偿逻辑

✅ **DO**:
- 补偿逻辑幂等
- 补偿逻辑简单
- 记录补偿日志

❌ **DON'T**:
- 补偿逻辑依赖外部状态
- 补偿逻辑抛出异常
- 忘记处理边界情况

---

## 监控指标

### Saga 指标

```typescript
saga_total                    // Saga 总数
saga_running                  // 运行中的 Saga
saga_completed                // 完成的 Saga
saga_failed                   // 失败的 Saga
saga_compensated              // 已补偿的 Saga
saga_timeout                  // 超时的 Saga
saga_duration_seconds         // Saga 执行时长
saga_step_duration_seconds    // 单步执行时长
```

### Event Outbox 指标

```typescript
outbox_pending_events         // 待发送事件数
outbox_failed_events          // 失败事件数
outbox_oldest_pending_age     // 最老待发送事件的年龄
outbox_publish_duration       // 发布耗时
```

---

## 故障排查

### Saga 卡住不动

**排查步骤**:
1. 查询 `saga_state` 表，找到卡住的 Saga
2. 查看 `current_step` 和 `error_message`
3. 检查对应步骤的日志
4. 检查是否超时 (`timeout_at`)
5. 手动重试或补偿

**SQL 查询**:
```sql
-- 查找运行中的 Saga
SELECT * FROM saga_state 
WHERE status = 'RUNNING' 
ORDER BY started_at DESC;

-- 查找超时的 Saga
SELECT * FROM saga_state 
WHERE status = 'RUNNING' 
  AND timeout_at < CURRENT_TIMESTAMP;
```

### Event Outbox 积压

**排查步骤**:
1. 查询 `event_outbox` 表，查看积压数量
2. 检查 RabbitMQ 是否可用
3. 检查定时任务是否正常运行
4. 查看失败事件的 `error_message`

**SQL 查询**:
```sql
-- 查看积压情况
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM event_outbox
GROUP BY status;

-- 查看失败事件
SELECT * FROM event_outbox
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 参考资料

- [详细分析报告](./TRANSACTION_SAGA_ANALYSIS.md) - 完整的分析和改进建议
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs)

---

**最后更新**: 2025-11-02
