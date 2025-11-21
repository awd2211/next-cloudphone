import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifecycleService } from './lifecycle.service';
import { AutoScalingService } from './autoscaling.service';
import { BackupExpirationService } from './backup-expiration.service';
import { LifecycleRulesService } from './lifecycle-rules.service';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleRulesController } from './lifecycle-rules.controller';
import { LifecycleHistoryController } from './lifecycle-history.controller';
import { Device } from '../entities/device.entity';
import { DeviceSnapshot } from '../entities/device-snapshot.entity';
import { LifecycleRule } from '../entities/lifecycle-rule.entity';
import { LifecycleExecutionHistory } from '../entities/lifecycle-execution-history.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { PortManagerModule } from '../port-manager/port-manager.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceSnapshot, LifecycleRule, LifecycleExecutionHistory]),
    DockerModule,
    AdbModule,
    PortManagerModule,
    MetricsModule,
    SnapshotsModule,
  ],
  controllers: [LifecycleController, LifecycleRulesController, LifecycleHistoryController],
  providers: [LifecycleService, AutoScalingService, BackupExpirationService, LifecycleRulesService],
  exports: [LifecycleService, AutoScalingService, BackupExpirationService, LifecycleRulesService],
})
export class LifecycleModule {}
