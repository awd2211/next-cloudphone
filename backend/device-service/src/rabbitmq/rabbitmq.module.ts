import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DevicesConsumer } from '../devices/devices.consumer';
import { DevicesModule } from '../devices/devices.module';
import { AdbModule } from '../adb/adb.module';

@Module({
  imports: [
    forwardRef(() => DevicesModule),  // ✅ Consumer 需要 DevicesService (使用 forwardRef 避免循环依赖)
    AdbModule,  // ✅ Consumer 需要 AdbService
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
  providers: [DevicesConsumer],
  exports: [RabbitMQModule],
})
export class DeviceRabbitMQModule {}
