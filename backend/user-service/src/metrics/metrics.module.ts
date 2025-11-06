/**
 * 业务指标模块
 * 提供用户服务的 Prometheus 业务指标采集
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMetricsService } from './user-metrics.service';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserMetricsService],
  exports: [UserMetricsService],
})
export class MetricsModule {}
