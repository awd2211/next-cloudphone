import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifecycleService } from './lifecycle.service';
import { AutoScalingService } from './autoscaling.service';
import { BackupExpirationService } from './backup-expiration.service';
import { LifecycleController } from './lifecycle.controller';
import { Device } from '../entities/device.entity';
import { DeviceSnapshot } from '../entities/device-snapshot.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { PortManagerModule } from '../port-manager/port-manager.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceSnapshot]),
    DockerModule,
    AdbModule,
    PortManagerModule,
    MetricsModule,
    SnapshotsModule,
  ],
  controllers: [LifecycleController],
  providers: [LifecycleService, AutoScalingService, BackupExpirationService],
  exports: [LifecycleService, AutoScalingService, BackupExpirationService],
})
export class LifecycleModule {}
