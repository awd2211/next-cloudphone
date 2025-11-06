/**
 * 业务指标模块
 * 提供计费服务的 Prometheus 业务指标采集
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingMetricsService } from './billing-metrics.service';
import { Order } from '../billing/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [BillingMetricsService],
  exports: [BillingMetricsService],
})
export class MetricsModule {}
