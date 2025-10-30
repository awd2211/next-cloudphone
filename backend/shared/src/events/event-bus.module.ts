import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { EventBusService } from './event-bus.service';

/**
 * 事件总线模块 V2 (基于 @golevelup/nestjs-rabbitmq)
 *
 * 使用方法:
 * ```typescript
 * // 在 app.module.ts 中
 * @Module({
 *   imports: [EventBusModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 在服务中注入
 * constructor(private eventBus: EventBusService) {}
 *
 * // 发布事件
 * await this.eventBus.publishDeviceEvent('created', { deviceId: '123' });
 *
 * // 消费事件 (使用 @RabbitSubscribe 装饰器)
 * @RabbitSubscribe({
 *   exchange: 'cloudphone.events',
 *   routingKey: 'device.created',
 *   queue: 'my-service.device-created',
 * })
 * async handleDeviceCreated(event: any) {
 *   // Handle event
 * }
 * ```
 */
@Global()
@Module({})
export class EventBusModule {
  /**
   * 创建带有 RabbitMQ 配置的动态模块
   * 这个方法会自动配置 RabbitMQModule 和 EventBusService
   */
  static forRoot(): DynamicModule {
    return {
      module: EventBusModule,
      imports: [
        ConfigModule,
        RabbitMQModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            uri: configService.get<string>(
              'RABBITMQ_URL',
              'amqp://admin:admin123@localhost:5672/cloudphone',
            ),
            connectionInitOptions: {
              wait: true,
              timeout: 30000,
            },
            enableControllerDiscovery: true, // ✅ 自动发现 @RabbitSubscribe 装饰器
            exchanges: [
              {
                name: 'cloudphone.events',
                type: 'topic',
                options: {
                  durable: true,
                },
              },
            ],
            channels: {
              default: {
                prefetchCount: 10, // 每次预取 10 条消息
                default: true,
              },
            },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [EventBusService],
      exports: [EventBusService, RabbitMQModule],
    };
  }
}
