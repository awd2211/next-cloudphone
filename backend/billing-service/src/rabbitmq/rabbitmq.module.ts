import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MeteringModule } from '../metering/metering.module';
import { BalanceModule } from '../balance/balance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { BillingDeviceEventsHandler } from '../events/device-events.handler';
import { BillingUserEventsHandler } from '../events/user-events.handler';

/**
 * RabbitMQ 消费者模块 (Billing Service)
 *
 * 使用 @golevelup/nestjs-rabbitmq 实现消费者
 */
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('RABBITMQ_URL', 'amqp://admin:admin123@localhost:5672/cloudphone'),
        connectionInitOptions: { wait: true, timeout: 30000 },
        enableControllerDiscovery: true,
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
    TypeOrmModule.forFeature([Order, UsageRecord]),
    MeteringModule,
    BalanceModule,
  ],
  providers: [BillingDeviceEventsHandler, BillingUserEventsHandler],
  exports: [RabbitMQModule],
})
export class BillingRabbitMQModule {}
