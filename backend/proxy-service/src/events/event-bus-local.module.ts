import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { EventBusLocalService } from './event-bus-local.service';

/**
 * Proxy Service 本地事件总线模块
 *
 * ⚠️ 与 shared 包中的 EventBusModule 不同,这是 proxy-service 专用的配置
 * 原因：通过 shared 包导入时遇到 DiscoveryModule 依赖解析问题
 *
 * 这个模块直接在 proxy-service 中配置 RabbitMQ,避免跨包依赖问题
 */
@Global()
@Module({
  imports: [
    ConfigModule,  // Explicitly import ConfigModule for EventBusService
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'RABBITMQ_URL',
          'amqp://admin:admin123@localhost:5672/cloudphone'
        ),
        connectionInitOptions: {
          wait: true,
          timeout: 30000,
        },
        enableControllerDiscovery: false, // proxy-service 不消费事件,只发布
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
            prefetchCount: 10,
            default: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventBusLocalService],
  exports: [EventBusLocalService, RabbitMQModule],
})
export class EventBusLocalModule {}
