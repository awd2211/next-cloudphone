# RabbitMQ 统一实现方案

**目标**: 将所有服务统一使用 `@golevelup/nestjs-rabbitmq`

---

## 当前状态

| 服务 | 当前实现 | 发布 | 消费 | 状态 |
|-----|---------|------|------|------|
| notification-service | @golevelup | ✅ | ✅ (12) | ✅ 正常 |
| billing-service | @golevelup | ✅ | ✅ (5) | ✅ 正常 |
| device-service | 原生 amqplib | ✅ (EventOutbox) | ❌ | ⚠️ 需迁移 |
| user-service | 原生 amqplib | ✅ (EventOutbox) | ❌ | ⚠️ 需迁移 |
| app-service | 原生 amqplib | ✅ | ❌ | ⚠️ 需迁移 |

---

## 迁移策略

### 方案 A: 修改 @cloudphone/shared 的 EventBusService (推荐)

**优点**:
- ✅ 一次修改,所有服务受益
- ✅ 保持 EventOutbox Pattern 完整性
- ✅ 最小化代码改动

**实施步骤**:

1. **修改 EventBusService 使用 AmqpConnection**

   文件: `backend/shared/src/events/event-bus.service.ts`

   ```typescript
   import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

   @Injectable()
   export class EventBusService implements OnModuleInit {
     private readonly logger = new Logger(EventBusService.name);

     constructor(
       private readonly configService: ConfigService,
       private readonly amqpConnection: AmqpConnection,  // ✅ 注入 AmqpConnection
     ) {}

     async onModuleInit() {
       this.logger.log('EventBusService initialized with @golevelup/nestjs-rabbitmq');
     }

     /**
      * 发布事件到 RabbitMQ
      */
     async publish(
       exchange: string,
       routingKey: string,
       message: Record<string, any>,
     ): Promise<void> {
       try {
         // ✅ 使用 AmqpConnection 发布
         await this.amqpConnection.publish(exchange, routingKey, message, {
           persistent: true,
           timestamp: Date.now(),
         });

         this.logger.debug(`Published event: ${routingKey}`);
       } catch (error) {
         this.logger.error(`Failed to publish event: ${error.message}`);
         throw error;
       }
     }

     // ... 其他方法保持不变
   }
   ```

2. **修改 EventBusModule 导入 RabbitMQModule**

   文件: `backend/shared/src/events/event-bus.module.ts`

   ```typescript
   import { Module, Global, DynamicModule } from '@nestjs/common';
   import { ConfigModule, ConfigService } from '@nestjs/config';
   import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
   import { EventBusService } from './event-bus.service';

   @Global()
   @Module({})
   export class EventBusModule {
     static forRoot(): DynamicModule {
       return {
         module: EventBusModule,
         imports: [
           ConfigModule,
           RabbitMQModule.forRootAsync(RabbitMQModule, {
             imports: [ConfigModule],
             useFactory: (configService: ConfigService) => ({
               uri: configService.get('RABBITMQ_URL', 'amqp://admin:admin123@localhost:5672/cloudphone'),
               connectionInitOptions: { wait: true, timeout: 30000 },
               exchanges: [
                 {
                   name: 'cloudphone.events',
                   type: 'topic',
                   options: { durable: true },
                 },
               ],
             }),
             inject: [ConfigService],
           }),
         ],
         providers: [EventBusService],
         exports: [EventBusService, RabbitMQModule],
       };
     }
   }
   ```

3. **各服务更新导入**

   所有服务的 `app.module.ts`:

   ```typescript
   // 之前
   import { EventBusModule } from '@cloudphone/shared';
   imports: [EventBusModule]

   // 之后
   import { EventBusModule } from '@cloudphone/shared';
   imports: [EventBusModule.forRoot()]  // ✅ 调用 forRoot()
   ```

4. **启用 device-service 的消费者**

   现在 `@RabbitSubscribe` 装饰器可以工作了:

   ```typescript
   // backend/device-service/src/devices/devices.module.ts
   import { DevicesConsumer } from './devices.consumer';

   @Module({
     // ...
     providers: [
       DevicesService,
       DevicesConsumer,  // ✅ 启用消费者
     ],
   })
   export class DevicesModule {}
   ```

---

### 方案 B: 每个服务单独配置 (备选)

**缺点**:
- ❌ 每个服务都需要修改
- ❌ 代码重复
- ❌ 维护成本高

不推荐使用此方案。

---

## 迁移优先级

### Phase 1: 修改 @cloudphone/shared (P0)
1. ✅ 修改 EventBusService 使用 AmqpConnection
2. ✅ 修改 EventBusModule.forRoot() 集成 RabbitMQModule
3. ✅ 更新 shared 模块的 package.json 依赖

### Phase 2: 更新 device-service (P0)
1. ✅ 更新 app.module.ts 使用 EventBusModule.forRoot()
2. ✅ 启用 DevicesConsumer
3. ✅ 测试 EventOutbox 发布
4. ✅ 测试 app-install 消费

### Phase 3: 更新 user-service (P1)
1. ✅ 更新 app.module.ts 使用 EventBusModule.forRoot()
2. ✅ 测试 EventOutbox 发布
3. ✅ (可选) 添加消费者处理 device 事件

### Phase 4: 更新 app-service (P1)
1. ✅ 更新 app.module.ts 使用 EventBusModule.forRoot()
2. ✅ 测试事件发布
3. ✅ (可选) 添加消费者

### Phase 5: 验证和测试 (P0)
1. ✅ 运行 EventOutbox 测试
2. ✅ 运行端到端事件流测试
3. ✅ 验证所有消费者连接
4. ✅ 性能测试

---

## 预期收益

### 代码一致性
- ✅ 所有服务使用相同的 RabbitMQ 客户端
- ✅ 统一的配置方式
- ✅ 统一的错误处理

### 功能完整性
- ✅ 所有服务都可以使用 `@RabbitSubscribe` 装饰器
- ✅ 自动管理连接和消费者
- ✅ 内置重连机制

### 维护性
- ✅ 减少依赖包 (移除 amqplib 直接依赖)
- ✅ 更简单的配置
- ✅ 更好的 TypeScript 类型支持

---

## 潜在风险

### Risk 1: EventOutbox 兼容性
**风险**: AmqpConnection 的 API 可能与原生 amqplib 不同

**缓解措施**:
- ✅ AmqpConnection 提供 `publish()` 方法,API 兼容
- ✅ 先在开发环境测试
- ✅ 保留原 EventBusService 的接口签名

### Risk 2: 连接管理
**风险**: @golevelup 的连接管理可能与 EventOutbox 轮询冲突

**缓解措施**:
- ✅ @golevelup 自动重连
- ✅ EventOutbox 有错误处理和重试
- ✅ 两者互补,提高稳定性

### Risk 3: 性能影响
**风险**: @golevelup 可能比原生 amqplib 慢

**缓解措施**:
- ✅ @golevelup 基于 amqplib,性能差异小
- ✅ 提供 prefetchCount 等性能调优选项
- ✅ 运行性能测试验证

---

## 回滚方案

如果迁移后出现严重问题:

1. **立即回滚** (< 5分钟)
   ```bash
   git checkout HEAD~1 backend/shared/src/events/
   pnpm --filter @cloudphone/shared build
   pm2 restart all
   ```

2. **部分回滚** (保留已迁移的服务)
   - 回滚 shared 模块
   - notification-service 和 billing-service 保留独立的 RabbitMQModule
   - 其他服务继续使用原生 amqplib

---

## 测试计划

### 单元测试
- [ ] EventBusService.publish() 测试
- [ ] EventOutboxService.publishPendingEvents() 测试
- [ ] RabbitMQ 连接失败场景测试

### 集成测试
- [ ] EventOutbox 端到端测试
- [ ] 消费者注册测试
- [ ] 事件发布和消费测试

### 性能测试
- [ ] 1000 events/second 发布测试
- [ ] EventOutbox 积压处理测试
- [ ] 内存和 CPU 使用率监控

---

## 时间估算

| 阶段 | 任务 | 预计时间 |
|-----|------|---------|
| Phase 1 | 修改 @cloudphone/shared | 30 min |
| Phase 2 | 更新 device-service | 20 min |
| Phase 3 | 更新 user-service | 15 min |
| Phase 4 | 更新 app-service | 15 min |
| Phase 5 | 测试和验证 | 30 min |
| **总计** | | **~2 hours** |

---

## 决策

✅ **采用方案 A: 修改 @cloudphone/shared 的 EventBusService**

理由:
1. 最小化代码改动
2. 保持架构一致性
3. 所有服务统一升级
4. 维护成本最低

---

**创建时间**: 2025-10-30
**状态**: 待实施
**优先级**: P0 (核心架构统一)
