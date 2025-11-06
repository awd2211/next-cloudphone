# 业务指标使用指南

> **文档目的**: 指导开发人员如何在各微服务中集成和使用 Prometheus 业务指标
> **创建时间**: 2025-11-04
> **状态**: ✅ 已完成

---

## 📊 概述

云手机平台已经集成了完整的业务指标监控系统，包括：

- ✅ **Prometheus** - 指标采集和存储
- ✅ **Grafana** - 可视化仪表板（8个）
- ✅ **告警规则** - 50+ 条自动告警规则
- ✅ **业务指标工具类** - 统一的指标记录API

本文档介绍如何使用 `@cloudphone/shared` 提供的业务指标工具类来记录自定义业务指标。

---

## 🛠️ 业务指标工具类

### 可用的指标类

`@cloudphone/shared` 导出了以下业务指标类：

```typescript
import {
  BusinessMetrics,     // 通用指标创建器
  DeviceMetrics,       // 设备管理指标
  BillingMetrics,      // 计费系统指标
  UserMetrics,         // 用户系统指标
  AppMetrics,          // 应用管理指标
  NotificationMetrics, // 通知系统指标
} from '@cloudphone/shared';
```

### 指标类型说明

#### 1. Counter（计数器）
用于累计值统计，只增不减。

**适用场景**:
- 请求总数
- 错误总数
- 订单总数
- 用户注册数

**示例**:
```typescript
// 记录支付尝试
BillingMetrics.paymentAttempts.inc({ userId: '123', method: 'alipay' });

// 记录支付失败
BillingMetrics.paymentFailures.inc({
  userId: '123',
  method: 'alipay',
  reason: 'insufficient_balance'
});
```

#### 2. Gauge（测量值）
用于可增可减的值。

**适用场景**:
- 当前在线用户数
- 活跃设备数
- 队列长度
- 余额不足用户数

**示例**:
```typescript
// 设置活跃设备数
DeviceMetrics.devicesActive.set(42);

// 增加在线用户数
UserMetrics.usersOnline.inc();

// 减少在线用户数
UserMetrics.usersOnline.dec();
```

#### 3. Histogram（直方图）
用于统计分布情况（如耗时、大小）。

**适用场景**:
- 响应时间
- 支付处理耗时
- 文件大小
- 请求大小

**示例**:
```typescript
// 记录支付耗时（秒）
BillingMetrics.paymentDuration.observe(
  { method: 'alipay', status: 'success' },
  0.523
);

// 记录设备操作耗时
DeviceMetrics.operationDuration.observe(
  { operation: 'create', status: 'success' },
  2.5
);
```

---

## 🚀 集成步骤

### Step 1: 在服务中导入指标类

```typescript
// billing-service/src/billing/billing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BillingMetrics } from '@cloudphone/shared';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  async processPayment(userId: string, amount: number, method: string): Promise<void> {
    const startTime = Date.now();

    // 记录尝试
    BillingMetrics.paymentAttempts.inc({ userId, method });

    try {
      // 执行支付逻辑
      await this.executePayment(userId, amount, method);

      // 记录成功
      BillingMetrics.paymentsSuccess.inc({ userId, method });

      // 记录耗时
      const durationSeconds = (Date.now() - startTime) / 1000;
      BillingMetrics.paymentDuration.observe(
        { method, status: 'success' },
        durationSeconds
      );

      this.logger.log(`Payment successful: userId=${userId}, amount=${amount}`);
    } catch (error) {
      // 记录失败
      BillingMetrics.paymentFailures.inc({
        userId,
        method,
        reason: error.code || 'unknown'
      });

      // 记录耗时（失败也要记录）
      const durationSeconds = (Date.now() - startTime) / 1000;
      BillingMetrics.paymentDuration.observe(
        { method, status: 'failure' },
        durationSeconds
      );

      throw error;
    }
  }
}
```

### Step 2: 定时更新 Gauge 指标

对于需要定期统计的指标（如活跃用户数、余额不足用户数），使用定时任务：

```typescript
// user-service/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMetrics } from '@cloudphone/shared';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 每分钟更新用户状态指标
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateUserMetrics(): Promise<void> {
    try {
      // 统计活跃用户数
      const activeCount = await this.userRepository.count({
        where: { status: UserStatus.ACTIVE },
      });
      UserMetrics.usersActive.set(activeCount);

      // 统计被锁定用户数
      const lockedCount = await this.userRepository.count({
        where: { status: UserStatus.LOCKED },
      });
      UserMetrics.usersLocked.set(lockedCount);

      // 统计在线用户数（需要根据实际登录session判断）
      // 这里简化为示例
      const onlineCount = await this.getOnlineUserCount();
      UserMetrics.usersOnline.set(onlineCount);
    } catch (error) {
      this.logger.error('Failed to update user metrics', error.stack);
    }
  }
}
```

### Step 3: 在Controller中记录操作指标

```typescript
// device-service/src/devices/devices.controller.ts
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { DeviceMetrics } from '@cloudphone/shared';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';

@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    const startTime = Date.now();

    // 记录创建尝试
    DeviceMetrics.creationAttempts.inc({
      userId: createDeviceDto.userId,
      provider: createDeviceDto.providerType || 'redroid',
    });

    try {
      const result = await this.devicesService.create(createDeviceDto);

      // 记录创建耗时
      const durationSeconds = (Date.now() - startTime) / 1000;
      DeviceMetrics.operationDuration.observe(
        { operation: 'create', status: 'success' },
        durationSeconds
      );

      return result;
    } catch (error) {
      // 记录创建失败
      DeviceMetrics.creationFailures.inc({
        userId: createDeviceDto.userId,
        provider: createDeviceDto.providerType || 'redroid',
        reason: error.code || 'unknown',
      });

      // 记录失败耗时
      const durationSeconds = (Date.now() - startTime) / 1000;
      DeviceMetrics.operationDuration.observe(
        { operation: 'create', status: 'failure' },
        durationSeconds
      );

      throw error;
    }
  }
}
```

---

## 📋 各服务集成指南

### Device Service（设备服务）

**关键指标**:
- `cloudphone_device_creation_attempts_total` - 设备创建尝试数
- `cloudphone_device_creation_failures_total` - 设备创建失败数
- `cloudphone_device_start_attempts_total` - 设备启动尝试数
- `cloudphone_device_start_failures_total` - 设备启动失败数
- `cloudphone_devices_active` - 活跃设备数
- `cloudphone_devices_error` - 错误状态设备数

**集成位置**:
1. `DevicesService.create()` - 记录创建尝试和失败
2. `DevicesService.startDevice()` - 记录启动尝试和失败
3. 定时任务 - 每分钟更新设备状态Gauge指标

**已完成**:
- ✅ 创建了 `DeviceMetricsService`
- ✅ 创建了 `MetricsModule`
- ✅ 集成到 `DevicesModule`

**待完成**:
- ⏳ 在 `DevicesService` 中注入 `DeviceMetricsService`
- ⏳ 在关键操作点调用指标记录方法

---

### Billing Service（计费服务）

**关键指标**:
- `cloudphone_payment_attempts_total` - 支付尝试数
- `cloudphone_payment_failures_total` - 支付失败数
- `cloudphone_payments_success_total` - 支付成功数
- `cloudphone_refunds_total` - 退款总数
- `cloudphone_users_low_balance` - 余额不足用户数
- `cloudphone_payment_duration_seconds` - 支付耗时

**集成位置**:
1. `BillingService.processPayment()` - 支付流程
2. `BillingService.refund()` - 退款流程
3. 定时任务 - 统计余额不足用户数

**示例代码**:
```typescript
// billing-service/src/billing/billing.service.ts
import { BillingMetrics } from '@cloudphone/shared';

// 在支付方法中
async processPayment(orderId: string, userId: string, method: string) {
  BillingMetrics.paymentAttempts.inc({ userId, method });

  try {
    const result = await this.paymentGateway.charge(...);
    BillingMetrics.paymentsSuccess.inc({ userId, method });
    return result;
  } catch (error) {
    BillingMetrics.paymentFailures.inc({
      userId,
      method,
      reason: error.code
    });
    throw error;
  }
}

// 定时任务统计余额不足用户
@Cron(CronExpression.EVERY_5_MINUTES)
async updateLowBalanceMetrics() {
  const count = await this.userRepository.count({
    where: { balance: LessThan(10) }
  });
  BillingMetrics.usersLowBalance.set(count);
}
```

---

### User Service（用户服务）

**关键指标**:
- `cloudphone_user_registration_attempts_total` - 注册尝试数
- `cloudphone_user_registration_failures_total` - 注册失败数
- `cloudphone_user_login_attempts_total` - 登录尝试数
- `cloudphone_user_login_failures_total` - 登录失败数
- `cloudphone_users_active` - 活跃用户数
- `cloudphone_users_locked` - 被锁定用户数

**集成位置**:
1. `AuthService.register()` - 用户注册
2. `AuthService.login()` - 用户登录
3. 定时任务 - 更新用户状态统计

**示例代码**:
```typescript
// user-service/src/auth/auth.service.ts
import { UserMetrics } from '@cloudphone/shared';

async register(dto: RegisterDto) {
  UserMetrics.registrationAttempts.inc({ source: dto.source || 'web' });

  try {
    const user = await this.createUser(dto);
    return user;
  } catch (error) {
    UserMetrics.registrationFailures.inc({
      source: dto.source || 'web',
      reason: error.code
    });
    throw error;
  }
}

async login(username: string, password: string) {
  UserMetrics.loginAttempts.inc();

  const user = await this.findUser(username);
  if (!user || !await this.verifyPassword(password, user.password)) {
    UserMetrics.loginFailures.inc({ reason: 'invalid_credentials' });
    throw new UnauthorizedException();
  }

  return this.generateTokens(user);
}
```

---

### App Service（应用服务）

**关键指标**:
- `cloudphone_app_install_attempts_total` - 应用安装尝试数
- `cloudphone_app_install_failures_total` - 应用安装失败数
- `cloudphone_app_downloads_total` - 应用下载总数

**示例代码**:
```typescript
import { AppMetrics } from '@cloudphone/shared';

async installApp(appId: string, deviceId: string) {
  AppMetrics.installAttempts.inc({ appId, deviceId });

  try {
    await this.adbService.installApk(deviceId, appPath);
  } catch (error) {
    AppMetrics.installFailures.inc({
      appId,
      deviceId,
      reason: error.code
    });
    throw error;
  }
}

async downloadApp(appId: string) {
  AppMetrics.downloads.inc({ appId });
  return this.minioService.getDownloadUrl(appId);
}
```

---

### Notification Service（通知服务）

**关键指标**:
- `cloudphone_notifications_sent_total` - 通知发送总数
- `cloudphone_notifications_failed_total` - 通知发送失败数
- `cloudphone_notifications_queue_size` - 通知队列长度

**示例代码**:
```typescript
import { NotificationMetrics } from '@cloudphone/shared';

async sendEmail(to: string, subject: string, body: string) {
  try {
    await this.smtpService.send({ to, subject, body });
    NotificationMetrics.sent.inc({ channel: 'email', type: 'transactional' });
  } catch (error) {
    NotificationMetrics.failures.inc({
      channel: 'email',
      type: 'transactional',
      reason: error.code
    });
    throw error;
  }
}

@Cron(CronExpression.EVERY_30_SECONDS)
async updateQueueMetrics() {
  const queueSize = await this.getEmailQueueSize();
  NotificationMetrics.queueSize.set({ channel: 'email' }, queueSize);
}
```

---

## 🎯 最佳实践

### 1. 指标命名规范

遵循 Prometheus 指标命名最佳实践：

```
cloudphone_<component>_<metric>_<unit>

示例:
- cloudphone_device_creation_attempts_total (Counter)
- cloudphone_devices_active (Gauge)
- cloudphone_payment_duration_seconds (Histogram)
```

### 2. 标签使用原则

- **使用标签** - 区分不同维度（userId, method, status）
- **避免过度使用** - 标签值组合不要过多（<1000）
- **不要包含动态值** - 避免使用 orderId, timestamp 等高基数值

```typescript
// ✅ 好的标签使用
BillingMetrics.paymentAttempts.inc({ userId: '123', method: 'alipay' });

// ❌ 不好的标签使用（orderId 有无限可能值）
BillingMetrics.paymentAttempts.inc({ orderId: '20250101123456' });
```

### 3. 错误处理

即使操作失败也要记录指标：

```typescript
async createDevice(dto: CreateDeviceDto) {
  DeviceMetrics.creationAttempts.inc({ userId: dto.userId, provider: dto.provider });

  try {
    const device = await this.dockerService.create(dto);
    return device;
  } catch (error) {
    // ✅ 记录失败指标
    DeviceMetrics.creationFailures.inc({
      userId: dto.userId,
      provider: dto.provider,
      reason: this.getErrorReason(error)
    });
    throw error;
  }
}
```

### 4. 性能考虑

指标记录操作是轻量级的，但仍要注意：

- ✅ 在异步操作中记录
- ✅ 不阻塞主业务逻辑
- ✅ 使用 try-catch 保护指标记录
- ❌ 不要在循环中频繁记录 Histogram

```typescript
// ✅ 好的做法
async processBatch(items: Item[]) {
  const startTime = Date.now();

  try {
    for (const item of items) {
      await this.processItem(item);
    }
  } finally {
    // 只记录一次总耗时
    const duration = (Date.now() - startTime) / 1000;
    Metrics.batchDuration.observe({ size: items.length }, duration);
  }
}

// ❌ 不好的做法
async processBatch(items: Item[]) {
  for (const item of items) {
    const start = Date.now();
    await this.processItem(item);
    // 每个item都记录一次，开销大
    Metrics.itemDuration.observe({}, (Date.now() - start) / 1000);
  }
}
```

---

## 📊 查看指标

### 1. 通过 /metrics 端点

每个服务都暴露了 `/metrics` 端点：

```bash
# 查看 device-service 指标
curl http://localhost:30002/metrics | grep cloudphone_device

# 查看 billing-service 指标
curl http://localhost:30005/metrics | grep cloudphone_payment
```

### 2. 通过 Prometheus UI

访问 Prometheus 查询界面：http://localhost:9090

**示例查询**:
```promql
# 设备创建失败率
sum(rate(cloudphone_device_creation_failures_total[5m]))
/
sum(rate(cloudphone_device_creation_attempts_total[5m]))

# 支付成功率
sum(rate(cloudphone_payments_success_total[5m]))
/
sum(rate(cloudphone_payment_attempts_total[5m]))

# P95 支付耗时
histogram_quantile(0.95, sum(rate(cloudphone_payment_duration_seconds_bucket[5m])) by (le, method))
```

### 3. 通过 Grafana 仪表板

访问 Grafana: http://localhost:3000

已创建的仪表板：
- **Business Metrics** - 业务指标总览
- **Microservices Performance** - 微服务性能
- **Alerts & SLA** - 告警和 SLA

---

## 🚨 告警规则

已配置的业务指标告警规则：

### 设备管理告警

```yaml
# 设备创建失败率过高
- alert: HighDeviceCreationFailureRate
  expr: |
    sum(rate(cloudphone_device_creation_failures_total[5m]))
    /
    sum(rate(cloudphone_device_creation_attempts_total[5m]))
    > 0.10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "设备创建失败率超过 10%"
```

### 计费系统告警

```yaml
# 支付失败率过高
- alert: HighPaymentFailureRate
  expr: |
    sum(rate(cloudphone_payment_failures_total[5m]))
    /
    sum(rate(cloudphone_payment_attempts_total[5m]))
    > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "支付失败率超过 5%"
```

### 用户系统告警

```yaml
# 登录失败率过高（可能暴力破解）
- alert: HighLoginFailureRate
  expr: |
    sum(rate(cloudphone_user_login_failures_total[5m]))
    /
    sum(rate(cloudphone_user_login_attempts_total[5m]))
    > 0.20
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "登录失败率超过 20%，可能遭受攻击"
```

---

## 📚 参考资料

### 相关文档

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Prometheus 最佳实践](https://prometheus.io/docs/practices/)
- [告警规则配置](../infrastructure/monitoring/prometheus/alert.rules.yml)
- [Grafana 仪表板](../infrastructure/monitoring/grafana/dashboards/)

### 项目内部文档

- [监控系统集成报告](./MONITORING_INTEGRATION_COMPLETE.md)
- [Jaeger 分布式追踪](./JAEGER_INTEGRATION_COMPLETE.md)
- [告警规则配置](../infrastructure/monitoring/prometheus/alert.rules.yml)

---

## ✅ 检查清单

在集成业务指标前，确认以下事项：

- [ ] shared 模块已更新并重新构建
- [ ] 服务已导入业务指标类
- [ ] 在关键操作点记录指标（尝试、成功、失败）
- [ ] 配置定时任务更新 Gauge 指标
- [ ] 测试指标是否正确暴露在 /metrics 端点
- [ ] 在 Prometheus 中查询指标验证数据
- [ ] 在 Grafana 中查看指标图表
- [ ] 验证告警规则是否触发

---

## 🎓 总结

业务指标是监控系统的重要组成部分，通过本指南，您可以：

1. ✅ 使用预定义的业务指标类快速集成
2. ✅ 在关键业务逻辑中记录指标
3. ✅ 通过 Prometheus 和 Grafana 查看指标
4. ✅ 配置告警规则及时发现问题

`★ Insight ─────────────────────────────────────`

**监控三大黄金指标：**

1. **Latency（延迟）** - 操作需要多长时间
   - 使用 Histogram 记录：`paymentDuration.observe()`
   - 查询 P50/P95/P99 分位数了解用户体验

2. **Traffic（流量）** - 系统承受多少请求
   - 使用 Counter 记录：`paymentAttempts.inc()`
   - 计算 QPS/TPS 了解系统负载

3. **Errors（错误）** - 有多少请求失败
   - 使用 Counter 记录：`paymentFailures.inc()`
   - 计算错误率监控系统健康度

**业务指标vs技术指标：**
- 技术指标（HTTP响应时间、CPU使用率）自动采集
- 业务指标（订单成功率、设备创建失败率）需要手动埋点
- 二者结合才能全面了解系统状态

`─────────────────────────────────────────────────`

**开始使用业务指标，让数据驱动决策！** 🚀
