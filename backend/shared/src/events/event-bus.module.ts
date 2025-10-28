import { Module, Global } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
// import { DiscoveryModule } from '@golevelup/nestjs-discovery'; // 不需要手动导入
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'cloudphone.events',
            type: 'topic',
          },
        ],
        uri: configService.get('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672',
        connectionInitOptions: {
          wait: false,
          timeout: 5000,  // 5秒超时
        },
        enableControllerDiscovery: true,  // ✅ 启用控制器发现（会自动处理依赖）
        // 配置重连策略
        connectionManagerOptions: {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      }),
    }),
  ],
  providers: [EventBusService],
  exports: [EventBusService, RabbitMQModule],
})
export class EventBusModule {}

