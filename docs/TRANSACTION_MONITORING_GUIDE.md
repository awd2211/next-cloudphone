# 事务性能监控使用指南

> **文件位置**: `backend/shared/src/decorators/monitor-transaction.decorator.ts`
> **目的**: 自动收集事务性能指标并集成 Prometheus + Grafana 监控

---

## 📊 监控能力概览

### 自动收集的指标

| 指标名称 | 类型 | 用途 | 标签 |
|---------|------|------|------|
| `transaction_duration_seconds` | Histogram | 事务执行时间 | service, operation, status |
| `transaction_total` | Counter | 事务执行总数 | service, operation, status |
| `transaction_errors_total` | Counter | 事务错误总数 | service, operation, error_type |
| `outbox_delivery_delay_seconds` | Histogram | Outbox 事件投递延迟 | event_type, status |
| `outbox_backlog_total` | Counter | Outbox 待处理事件数 | event_type |
| `saga_duration_seconds` | Histogram | Saga 执行时间 | saga_type, status |
| `saga_step_duration_seconds` | Histogram | Saga 步骤执行时间 | saga_type, step_name, status |
| `saga_total` | Counter | Saga 执行总数 | saga_type, status |
| `saga_compensations_total` | Counter | Saga 补偿执行次数 | saga_type, step_name |

---

## 🚀 快速开始

### 1. 基础用法 - @MonitorTransaction

```typescript
import {
  Transaction,
  MonitorTransaction,
  SimplePublishEvent
} from '@cloudphone/shared';
import { EntityManager } from 'typeorm';

export class UserService {
  @Transaction()
  @SimplePublishEvent('user', 'user.created')
  @MonitorTransaction('user-service', 'createUser')  // 👈 添加性能监控
  async createUser(manager: EntityManager, dto: CreateUserDto): Promise<User> {
    const user = manager.create(User, dto);
    return await manager.save(User, user);
  }
}
```

**效果**:
- ✅ 自动记录 `createUser` 方法的执行时间
- ✅ 统计成功/失败次数
- ✅ 记录错误类型
- ✅ 慢查询警告（默认 > 1000ms）

---

### 2. 简化用法 - @MonitorTransactionSimple

自动从方法名推断 operation 名称：

```typescript
export class DeviceService {
  @Transaction()
  @SimplePublishEvent('device', 'device.started')
  @MonitorTransactionSimple('device-service')  // 👈 自动使用 "startDevice" 作为 operation
  async startDevice(manager: EntityManager, id: string): Promise<Device> {
    const device = await manager.findOne(Device, { where: { id } });
    device.status = DeviceStatus.RUNNING;
    return await manager.save(Device, device);
  }
}
```

---

### 3. 高级配置

```typescript
@MonitorTransaction('billing-service', 'processPayment', {
  enableDetailedLogs: true,        // 启用详细日志（默认 false）
  slowQueryThresholdMs: 500,       // 慢查询阈值 500ms（默认 1000ms）
})
async processPayment(manager: EntityManager, paymentDto: PaymentDto) {
  // 业务逻辑
}
```

**配置选项说明**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `service` | string | - | 服务名（必填） |
| `operation` | string | - | 操作名（必填） |
| `enableDetailedLogs` | boolean | false | 启用详细日志（包含每次执行的 debug 日志） |
| `slowQueryThresholdMs` | number | 1000 | 慢查询阈值（毫秒），超过会记录 warn 日志 |

---

## 📈 Grafana 仪表板

### 1. 导入仪表板

```bash
# Grafana 仪表板配置文件位置
infrastructure/monitoring/grafana/dashboards/transaction-performance.json
```

**手动导入步骤**:
1. 访问 Grafana: http://localhost:3000
2. 左侧菜单 → Dashboards → Import
3. 上传 `transaction-performance.json`
4. 选择 Prometheus 数据源
5. 点击 Import

---

### 2. 仪表板面板说明

#### Panel 1: Transaction Duration (P50, P95, P99)
- **用途**: 查看事务执行时间分布
- **指标**: P50（中位数）、P95、P99
- **告警阈值**: P95 > 1s

**PromQL 查询**:
```promql
# P95 延迟
histogram_quantile(0.95,
  sum(rate(transaction_duration_seconds_bucket[5m]))
  by (service, operation, le)
)
```

#### Panel 2: Transaction Error Rate
- **用途**: 监控事务错误率
- **指标**: 错误率（失败数/总数）
- **告警阈值**: 错误率 > 5%

**PromQL 查询**:
```promql
sum(rate(transaction_errors_total[5m])) by (service, operation)
/
sum(rate(transaction_total[5m])) by (service, operation)
```

#### Panel 3: Transaction Rate
- **用途**: 查看事务吞吐量
- **指标**: 每秒事务数（TPS）

#### Panel 4: Outbox Event Backlog
- **用途**: 监控 Outbox 事件积压
- **告警阈值**: 积压 > 1000

#### Panel 5: Outbox Delivery Delay
- **用途**: 监控事件投递延迟
- **告警阈值**: P95 > 10s

#### Panel 6: Saga Execution Duration
- **用途**: 监控 Saga 执行时间
- **告警阈值**: P95 > 30s

#### Panel 7: Saga Compensation Rate
- **用途**: 监控 Saga 补偿频率（越低越好）
- **告警阈值**: 补偿率 > 10%

#### Panel 8: Transaction Distribution
- **用途**: 查看各服务的事务分布（饼图）

#### Panel 9: Transaction Errors by Type
- **用途**: 查看错误类型分布
- **常见错误**: QueryFailedError, TimeoutError, ConflictError

---

## 🎯 实战示例

### 示例 1: User Service - 用户注册

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  Transaction,
  SimplePublishEvent,
  MonitorTransaction
} from '@cloudphone/shared';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  @Transaction()
  @SimplePublishEvent('user', 'user.registered')
  @MonitorTransaction('user-service', 'registerUser', {
    slowQueryThresholdMs: 500,  // 注册操作应该很快
  })
  async registerUser(
    manager: EntityManager,
    dto: RegisterDto
  ): Promise<User> {
    // 1. 检查用户是否存在
    const existing = await manager.findOne(User, {
      where: { email: dto.email }
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 2. 创建用户
    const user = manager.create(User, {
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
    });

    return await manager.save(User, user);
  }
}
```

**监控效果**:
- ✅ 记录 P50/P95/P99 延迟（预期 < 100ms）
- ✅ 如果 > 500ms，记录慢查询警告
- ✅ 统计 ConflictException 错误次数

---

### 示例 2: Device Service - 启动设备（悲观锁）

```typescript
@Transaction()
@SimplePublishEvent('device', 'device.started')
@MonitorTransaction('device-service', 'startDevice', {
  slowQueryThresholdMs: 2000,  // Docker 启动较慢，容忍 2s
})
async startDevice(
  manager: EntityManager,
  id: string
): Promise<Device> {
  // 悲观写锁防止并发启动
  const device = await manager.findOne(Device, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });

  if (!device) {
    throw new NotFoundException('Device not found');
  }

  if (device.status === DeviceStatus.RUNNING) {
    throw new ConflictException('Device already running');
  }

  // 启动 Docker 容器
  await this.dockerService.startContainer(device.containerId);

  device.status = DeviceStatus.RUNNING;
  return await manager.save(Device, device);
}
```

**监控效果**:
- ✅ 记录启动延迟（包括悲观锁等待时间）
- ✅ 如果 > 2s，记录慢查询警告
- ✅ 统计 ConflictException 和 NotFoundException

---

### 示例 3: Billing Service - 支付处理（Saga）

```typescript
@Injectable()
export class PaymentSagaService {
  async processPayment(paymentDto: PaymentDto): Promise<PaymentResult> {
    // Saga 执行会自动被 SagaOrchestratorService 监控
    // 无需手动添加 @MonitorTransaction

    const sagaDefinition: SagaDefinition = {
      name: 'payment-saga',
      steps: [
        {
          name: 'DEDUCT_BALANCE',
          execute: async (state) => {
            // 扣减余额
            // sagaStepDuration 自动记录此步骤时间
          },
          compensate: async (state) => {
            // 补偿：退款
            // sagaCompensations 自动记录补偿次数
          },
        },
        {
          name: 'CREATE_ORDER',
          execute: async (state) => {
            // 创建订单
          },
          compensate: async (state) => {
            // 补偿：取消订单
          },
        },
      ],
    };

    return await this.sagaOrchestrator.execute(sagaDefinition, paymentDto);
  }
}
```

**监控效果**（由 SagaOrchestratorService 自动提供）:
- ✅ `saga_duration_seconds` - 整个 Saga 执行时间
- ✅ `saga_step_duration_seconds` - 每个步骤的执行时间
- ✅ `saga_compensations_total` - 补偿执行次数
- ✅ `saga_total` - Saga 执行总数（成功/失败）

---

## 📊 查询示例

### 1. 查找最慢的事务操作

```promql
topk(10,
  histogram_quantile(0.95,
    sum(rate(transaction_duration_seconds_bucket[1h]))
    by (service, operation, le)
  )
)
```

---

### 2. 查找错误率最高的事务

```promql
topk(10,
  sum(rate(transaction_errors_total[1h])) by (service, operation)
  /
  sum(rate(transaction_total[1h])) by (service, operation)
)
```

---

### 3. 查看某个服务的事务吞吐量

```promql
sum(rate(transaction_total[5m])) by (service)
```

---

### 4. 查看 Outbox 事件积压趋势

```promql
sum(outbox_backlog_total) by (event_type)
```

---

### 5. 查看 Saga 补偿率

```promql
sum(rate(saga_compensations_total[1h])) by (saga_type)
/
sum(rate(saga_total[1h])) by (saga_type)
```

---

## 🚨 告警规则

### 1. 事务延迟告警

```yaml
# prometheus/alerts/transaction-alerts.yml
groups:
  - name: transaction-performance
    rules:
      - alert: HighTransactionLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(transaction_duration_seconds_bucket[5m]))
            by (service, operation, le)
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "事务延迟过高: {{ $labels.service }}.{{ $labels.operation }}"
          description: "P95 延迟 {{ $value }}s，超过 1s 阈值"
```

---

### 2. 事务错误率告警

```yaml
- alert: HighTransactionErrorRate
  expr: |
    sum(rate(transaction_errors_total[5m])) by (service, operation)
    /
    sum(rate(transaction_total[5m])) by (service, operation)
    > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "事务错误率过高: {{ $labels.service }}.{{ $labels.operation }}"
    description: "错误率 {{ $value | humanizePercentage }}，超过 5% 阈值"
```

---

### 3. Outbox 事件积压告警

```yaml
- alert: OutboxBacklogHigh
  expr: sum(outbox_backlog_total) > 1000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Outbox 事件积压过多"
    description: "待处理事件数 {{ $value }}，超过 1000"
```

---

### 4. Saga 补偿率告警

```yaml
- alert: HighSagaCompensationRate
  expr: |
    sum(rate(saga_compensations_total[1h])) by (saga_type)
    /
    sum(rate(saga_total[1h])) by (saga_type)
    > 0.1
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Saga 补偿率过高: {{ $labels.saga_type }}"
    description: "补偿率 {{ $value | humanizePercentage }}，超过 10%"
```

---

## 🔧 调优建议

### 1. 识别性能瓶颈

使用 Grafana 仪表板查看 P95 延迟最高的操作：

1. 打开 **Transaction Duration (P50, P95, P99)** 面板
2. 按 P95 值排序
3. 定位到慢的操作

**常见瓶颈**:
- 缺少数据库索引
- N+1 查询问题
- 未使用连接池
- 悲观锁等待时间过长

---

### 2. 优化慢查询

**示例：优化前**
```typescript
@MonitorTransaction('user-service', 'getUserDevices')
async getUserDevices(userId: string): Promise<Device[]> {
  const devices = await this.deviceRepository.find({
    where: { userId },  // ❌ 可能缺少索引
  });

  // ❌ N+1 查询
  for (const device of devices) {
    device.template = await this.templateRepository.findOne(device.templateId);
  }

  return devices;
}
```

**监控显示**: P95 = 2.5s（慢！）

**示例：优化后**
```typescript
@MonitorTransaction('user-service', 'getUserDevices')
async getUserDevices(userId: string): Promise<Device[]> {
  // ✅ 使用 JOIN 避免 N+1 查询
  return await this.deviceRepository
    .createQueryBuilder('device')
    .leftJoinAndSelect('device.template', 'template')
    .where('device.userId = :userId', { userId })
    .getMany();
}
```

**监控显示**: P95 = 150ms（优化 94%！）

---

### 3. 监控趋势变化

使用 Prometheus 查看性能趋势：

```promql
# 查看过去 24 小时的延迟趋势
histogram_quantile(0.95,
  sum(rate(transaction_duration_seconds_bucket[5m]))
  by (service, operation, le)
) [24h]
```

**告警条件**:
- 延迟突增 > 2x
- 错误率突增 > 5%
- Outbox 积压持续增长

---

## ✅ 最佳实践

### 1. 为所有关键事务添加监控

```typescript
// ✅ 好的实践：所有写操作都监控
@MonitorTransaction('billing-service', 'createOrder')
async createOrder() { ... }

@MonitorTransaction('billing-service', 'processPayment')
async processPayment() { ... }

// ❌ 不推荐：只监控部分操作
async createOrder() { ... }  // 没有监控
async processPayment() { ... }  // 没有监控
```

---

### 2. 使用合理的慢查询阈值

```typescript
// ✅ 根据操作复杂度设置阈值
@MonitorTransaction('device-service', 'startDevice', {
  slowQueryThresholdMs: 2000,  // Docker 启动慢，容忍 2s
})

@MonitorTransaction('user-service', 'login', {
  slowQueryThresholdMs: 300,   // 登录应该快，300ms
})
```

---

### 3. 启用详细日志用于调试

```typescript
// 开发环境启用详细日志
@MonitorTransaction('billing-service', 'processPayment', {
  enableDetailedLogs: process.env.NODE_ENV === 'development',
})
```

---

### 4. 结合 Outbox 和 Saga 监控

```typescript
// Outbox 监控（自动）
@Transaction()
@SimplePublishEvent('order', 'order.created')  // 👈 Outbox 自动监控
@MonitorTransaction('billing-service', 'createOrder')
async createOrder() { ... }

// Saga 监控（自动）
// SagaOrchestratorService 会自动记录所有 Saga 指标
```

---

## 📚 相关文档

- [事务装饰器使用指南](/docs/TRANSACTION_DECORATORS_GUIDE.md)
- [代码审查清单](/docs/TRANSACTION_CODE_REVIEW_CHECKLIST.md)
- [VS Code 代码片段使用指南](/.vscode/SNIPPETS_GUIDE.md)
- [ESLint 规则说明](/backend/shared/eslint-plugin/README.md)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 仪表板指南](https://grafana.com/docs/grafana/latest/dashboards/)

---

## 🎉 总结

使用事务性能监控可以：
- ✅ **自动收集指标** - 无需手动埋点
- ✅ **识别性能瓶颈** - P50/P95/P99 延迟分析
- ✅ **监控错误趋势** - 错误率和错误类型
- ✅ **优化事务性能** - 数据驱动的优化决策
- ✅ **告警及时响应** - Grafana 告警集成

**现在就为你的事务方法添加监控装饰器，让性能问题无处遁形！** 🚀
