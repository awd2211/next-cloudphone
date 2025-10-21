import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesConsumer } from './devices.consumer';
import { BatchOperationsService } from './batch-operations.service';
import { BatchOperationsController } from './batch-operations.controller';
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { PortManagerModule } from '../port-manager/port-manager.module';
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    DockerModule,
    AdbModule,
    PortManagerModule,
    // EventBusModule,  // 暂时禁用，等RabbitMQ配置完成后再启用
  ],
  controllers: [DevicesController, BatchOperationsController],
  providers: [DevicesService, BatchOperationsService], // DevicesConsumer 暂时禁用
  exports: [DevicesService, BatchOperationsService],
})
export class DevicesModule {}
