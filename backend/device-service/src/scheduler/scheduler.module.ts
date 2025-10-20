import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { NodeManagerService } from './node-manager.service';
import { ResourceMonitorService } from './resource-monitor.service';
import { SchedulerController } from './scheduler.controller';
import { Node } from '../entities/node.entity';
import { Device } from '../entities/device.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Node, Device]), AuthModule],
  controllers: [SchedulerController],
  providers: [SchedulerService, NodeManagerService, ResourceMonitorService],
  exports: [SchedulerService, NodeManagerService, ResourceMonitorService],
})
export class SchedulerModule {}
