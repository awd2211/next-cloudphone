import { Module, Global } from '@nestjs/common';
import { EventBusModule } from '@cloudphone/shared';

/**
 * Device Service 本地 RabbitMQ 模块 V2
 *
 * ✅ 使用 @cloudphone/shared 的 EventBusModule V2 (基于 @golevelup/nestjs-rabbitmq)
 *
 * 优势:
 * - 统一的 RabbitMQ 实现 (与其他服务一致)
 * - 支持 @RabbitSubscribe 装饰器 (可以启用消费者)
 * - 自动重连和连接管理
 * - EventBusService 和 EventOutbox 都使用同一个连接
 *
 * V2 更新:
 * - 使用 EventBusModule.forRoot() 集成 RabbitMQModule
 * - 支持消费者 (之前的 DevicesConsumer 现在可以启用)
 */
@Global() // ✅ 设为全局模块，这样 EventBusService 可以在任何地方使用
@Module({
  imports: [
    EventBusModule.forRoot(), // ✅ V2: 使用 forRoot() 集成 RabbitMQModule
  ],
  exports: [
    EventBusModule, // ✅ 导出 EventBusModule
  ],
})
export class DeviceRabbitMQModule {}
