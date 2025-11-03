import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * 健康检查模块
 * 提供服务健康状态监控端点
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
