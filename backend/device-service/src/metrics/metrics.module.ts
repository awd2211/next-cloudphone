/**
 * 业务指标模块
 * 提供设备服务的 Prometheus 业务指标采集
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceMetricsService } from './device-metrics.service';
import { MetricsService } from './metrics.service';
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    DockerModule,
  ],
  providers: [MetricsService, DeviceMetricsService],
  exports: [MetricsService, DeviceMetricsService],
})
export class MetricsModule {}
