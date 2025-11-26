import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusModule, DistributedLockModule } from '@cloudphone/shared';
import { EnhancedHealthService } from './enhanced-health.service';
import { ConcurrentHealthCheckService } from './concurrent-health-check.service';
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ConfigModule,
    EventEmitterModule.forRoot(),
    EventBusModule,
    DistributedLockModule,
    DockerModule,
    AdbModule,
    MetricsModule,
  ],
  providers: [EnhancedHealthService, ConcurrentHealthCheckService],
  exports: [EnhancedHealthService, ConcurrentHealthCheckService],
})
export class HealthModule {}
