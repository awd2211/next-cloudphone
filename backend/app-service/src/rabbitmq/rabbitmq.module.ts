import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppsConsumer } from '../apps/apps.consumer';
import { DeviceApplication } from '../entities/device-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceApplication]),  // ✅ Consumer 需要 DeviceApplication 仓库
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
        connectionInitOptions: {
          wait: false,
          timeout: 5000,
        },
        enableControllerDiscovery: false,
        exchanges: [
          {
            name: 'cloudphone.events',
            type: 'topic',
            options: {
              durable: true,
            },
          },
        ],
        connectionManagerOptions: {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppsConsumer],
  exports: [RabbitMQModule],
})
export class AppRabbitMQModule {}
