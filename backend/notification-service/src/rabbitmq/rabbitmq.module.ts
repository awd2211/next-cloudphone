import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { UserEventsConsumer } from './consumers/user-events.consumer';
import { DeviceEventsConsumer } from './consumers/device-events.consumer';
import { AppEventsConsumer } from './consumers/app-events.consumer';
import { BillingEventsConsumer } from './consumers/billing-events.consumer';
import { SchedulerEventsConsumer } from './consumers/scheduler-events.consumer';
import { MediaEventsConsumer } from './consumers/media-events.consumer';
import { SystemEventsConsumer } from './consumers/system-events.consumer';
import { DlxConsumer } from './consumers/dlx.consumer';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        connectionInitOptions: { wait: true, timeout: 30000 },
        enableControllerDiscovery: true,
        exchanges: [
          {
            name: 'cloudphone.events',
            type: 'topic',
            options: {
              durable: true, // 交换机持久化
            },
          },
          {
            name: 'cloudphone.notifications.dlx',
            type: 'topic',
            options: {
              durable: true,
            },
          },
        ],
        channels: {
          // 默认通道配置
          default: {
            prefetchCount: 10, // 每次获取10条消息
            default: true,
          },
          // 高优先级通道
          urgent: {
            prefetchCount: 1, // 紧急消息立即处理
          },
        },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
    EmailModule,
    TemplatesModule,
  ],
  providers: [
    UserEventsConsumer,
    DeviceEventsConsumer,
    AppEventsConsumer,
    BillingEventsConsumer,
    SchedulerEventsConsumer,
    MediaEventsConsumer,
    SystemEventsConsumer,
    DlxConsumer,
  ],
  exports: [RabbitMQModule],
})
export class CloudphoneRabbitMQModule {}
