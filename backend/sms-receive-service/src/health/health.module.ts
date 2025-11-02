import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { EventBusModule } from '@cloudphone/shared';
import { VirtualNumber, SmsMessage } from '../entities';
import { HealthCheckService } from './health-check.service';
import { MetricsService } from './metrics.service';
import { HealthController } from './health.controller';

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
    EventBusModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [HealthCheckService, MetricsService],
  exports: [HealthCheckService, MetricsService],
})
export class HealthModule {}
