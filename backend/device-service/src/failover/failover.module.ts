import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FailoverService } from './failover.service';
import { FailoverController } from './failover.controller';
import { Device } from '../entities/device.entity';
import { DeviceSnapshot } from '../entities/device-snapshot.entity';
import { DockerModule } from '../docker/docker.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { PortManagerModule } from '../port-manager/port-manager.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceSnapshot]),
    DockerModule,
    SnapshotsModule,
    PortManagerModule,
  ],
  controllers: [FailoverController],
  providers: [FailoverService],
  exports: [FailoverService],
})
export class FailoverModule {}
