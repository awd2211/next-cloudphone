import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { BatchOperationsService } from './batch-operations.service';
import { BatchOperationsController } from './batch-operations.controller';
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { PortManagerModule } from '../port-manager/port-manager.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    DockerModule,
    AdbModule,
    PortManagerModule,
  ],
  controllers: [DevicesController, BatchOperationsController],
  providers: [DevicesService, BatchOperationsService],
  exports: [DevicesService, BatchOperationsService],
})
export class DevicesModule {}
