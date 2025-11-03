import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { DeviceSnapshot } from '../entities/device-snapshot.entity';
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';
import { DevicesModule } from '../devices/devices.module';
import { AuthModule } from '../auth/auth.module';
import { PortManagerModule } from '../port-manager/port-manager.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceSnapshot, Device]),
    DockerModule,
    DevicesModule,
    AuthModule,
    PortManagerModule,
    ProvidersModule, // 添加 ProvidersModule 支持多 provider 快照
  ],
  controllers: [SnapshotsController],
  providers: [SnapshotsService],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
