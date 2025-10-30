# 🚫 部署阻塞问题报告

**日期**: 2025-10-29
**优先级**: **P0 - 阻塞部署**
**影响范围**: device-service 无法启动

---

## 问题概述

在部署架构修复(Transactional Outbox Pattern)过程中,发现 device-service 无法启动。

**症状**:
```
ERROR [ExceptionHandler] UnknownDependenciesException [Error]:
Nest can't resolve dependencies of the DiscoveryService (?, MetadataScanner).
```

**根本原因**: `@golevelup/nestjs-rabbitmq` v6.0.2 与 `@nestjs/core` v11 存在依赖冲突

---

## 技术分析

### 依赖链

```
device-service
  ↓
@cloudphone/shared (EventBusModule)
  ↓
@golevelup/nestjs-rabbitmq v6.0.2
  ↓
DiscoveryService (内部依赖 ModulesContainer)
  ↓
❌ 在 NestJS v11 中 ModulesContainer 注入方式发生变化
```

### 已尝试的解决方案

1. ✅ 移除 device-service 本地的 DeviceRabbitMQModule 对 @golevelup 的直接依赖
   → **结果**: 仍然失败,因为 shared 模块的 EventBusModule 使用了它

2. ✅ 禁用 device-service 中的 RabbitMQ Consumer (`@RabbitSubscribe` 装饰器)
   → **结果**: 仍然失败,问题来自 shared 模块

3. ❌ 尝试配置 `enableControllerDiscovery: false`
   → **结果**: 无效,DiscoveryModule 仍会被自动加载

### 为什么会影响 Outbox 部署

架构修复引入了 `EventOutboxModule`,它依赖于 `EventBusModule`(来自 shared 模块),而 `EventBusModule` 使用 `@golevelup/nestjs-rabbitmq`,导致整个服务无法启动。

**依赖关系**:
```
EventOutboxModule (新增)
  ↓ imports
EventBusModule (@cloudphone/shared)
  ↓ imports
RabbitMQModule.forRootAsync (from @golevelup/nestjs-rabbitmq)
  ↓ 自动注册
DiscoveryModule
  ↓ 尝试注入
ModulesContainer ← ❌ 在 NestJS 11 中失败
```

---

## 解决方案

### 方案 A: 使用原生 amqplib 重写 EventBusModule (推荐,工作量:2-4小时)

**步骤**:
1. 在 `@cloudphone/shared` 中创建新的 RabbitMQ 连接管理器(基于 amqplib)
2. 重写 `EventBusService.publish()` 方法
3. 移除 `@golevelup/nestjs-rabbitmq` 依赖
4. 更新所有依赖 EventBusModule 的服务

**优势**:
- ✅ 彻底解决兼容性问题
- ✅ 减少依赖,性能更好
- ✅ 更灵活,完全可控

**代码示例**:
```typescript
// shared/src/events/event-bus.service.ts (重写版本)
import * as amqplib from 'amqplib';

@Injectable()
export class EventBusService {
  private connection: amqplib.Connection;
  private channel: amqplib.Channel;

  async onModuleInit() {
    this.connection = await amqplib.connect(this.rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange('cloudphone.events', 'topic', { durable: true });
  }

  async publish(exchange: string, routingKey: string, payload: any) {
    await this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
  }
}
```

### 方案 B: 暂时移除 EventOutboxModule,仅使用 setImmediate 发布事件

**步骤**:
1. 回滚 device-service 中对 EventOutboxModule 的导入
2. 保留 ADB 录屏修复和配额缓存修复(这两个不依赖 Outbox)
3. 继续使用 setImmediate 方式发布事件(接受一定的事件丢失风险)

**优势**:
- ✅ 快速部署其他修复(ADB 录屏、配额缓存)
- ✅ 工作量小

**劣势**:
- ❌ 无法获得 Transactional Outbox 的可靠性保证
- ❌ 仍然存在事件丢失风险

### 方案 C: 降级 @nestjs/core 到 v10 (不推荐)

**步骤**:
1. 降级所有 @nestjs/* 包到 v10
2. 测试兼容性

**劣势**:
- ❌ 失去 NestJS 11 的新特性和修复
- ❌ 可能引入其他兼容性问题
- ❌ 长期维护负担

---

## 推荐行动方案

**优先级排序**:

1. **立即**: 采用方案 B,部署 ADB 录屏修复 + 配额缓存修复
   **预计时间**: 30 分钟
   **收益**: 解决 P0-2(user-service 单点故障)和 Critical(ADB 资源泄漏)

2. **短期(1-2天内)**: 实施方案 A,重写 EventBusModule
   **预计时间**: 2-4 小时
   **收益**: 解决 P0-1(事件发布失败),获得完整的架构修复收益

3. **后续**: 考虑移除所有 RabbitMQ Consumer,改用 HTTP 回调或轮询
   **预计时间**: 1-2 周
   **收益**: 简化架构,提高可靠性

---

## 影响评估

### 已完成且不受影响的修复

✅ **数据库迁移**:
- event_outbox 表已创建
- saga_state 索引已优化(如果表存在)

✅ **代码改进**:
- ADB 录屏会话管理完全重写(不依赖 RabbitMQ)
- 配额缓存服务实现(不依赖 RabbitMQ)
- 环境变量配置完成

### 被阻塞的修复

❌ **Transactional Outbox Pattern**:
- EventOutboxModule 无法使用
- device-service 无法启动

---

## 临时绕过方案(用于开发和测试)

如果需要立即验证 Outbox 逻辑,可以使用以下绕过方案:

### 方法 1: 在 device-service 中使用原生 amqplib

```bash
# 安装 amqplib
pnpm add amqplib @types/amqplib

# 创建临时 EventBusService
# backend/device-service/src/events/simple-event-bus.service.ts
```

### 方法 2: 使用 Mock EventBusService

在开发环境中临时 mock EventBusService,仅记录日志:

```typescript
// backend/device-service/src/events/mock-event-bus.service.ts
@Injectable()
export class MockEventBusService {
  async publish(exchange: string, routingKey: string, payload: any) {
    console.log(`[MOCK] Would publish event: ${routingKey}`, payload);
    return Promise.resolve();
  }
}
```

---

## 下一步行动

**建议决策**:

1. **现在**: 采用方案 B,部署非 RabbitMQ 相关的修复
2. **今天**: 启动方案 A 的实施,重写 EventBusModule
3. **明天**: 完成方案 A,部署完整的架构修复

---

## 附录: 相关文件

**受影响文件**:
- `/backend/shared/src/events/event-bus.module.ts`
- `/backend/shared/src/events/event-bus.service.ts`
- `/backend/device-service/src/rabbitmq/rabbitmq.module.ts`
- `/backend/device-service/src/events/user-events.handler.ts`
- `/backend/device-service/src/devices/devices.consumer.ts`

**已创建文件(等待部署)**:
- `/backend/shared/src/outbox/*` (Outbox 实现)
- `/backend/device-service/src/quota/quota-cache.service.ts`
- `/database/migrations/20250129_add_event_outbox.sql`
- `/database/migrations/20250129_add_saga_indexes.sql`

---

**报告人**: Claude
**最后更新**: 2025-10-29 20:38 UTC+8
