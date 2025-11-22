import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { VirtualNumber, SmsMessage } from '../entities';
import { HealthCheckService } from './health-check.service';
import { MetricsService } from './metrics.service';
import { HealthController } from './health.controller';

/**
 * 健康检查模块
 *
 * 注意：不要在这里重复导入 EventBusModule.forRoot()
 * EventBusModule 是全局模块，已在 AppModule 中初始化
 * 这里只需要导入 RabbitMQModule 以获取 AmqpConnection 的访问权限
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([VirtualNumber, SmsMessage]),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get<string>('REDIS_HOST', 'localhost')}:${configService.get<number>('REDIS_PORT', 6379)}`,
      }),
    }),
    // 不再重复调用 EventBusModule.forRoot()
    // AmqpConnection 将从全局的 EventBusModule 中获取
  ],
  controllers: [HealthController],
  providers: [HealthCheckService, MetricsService],
  exports: [HealthCheckService, MetricsService],
})
export class HealthModule {}
