import { Module } from '@nestjs/common';
import { GpuManagerService } from './gpu-manager.service';
import { GpuResourceService } from './gpu-resource.service';
import { GpuController } from './gpu.controller';
import { GpuResourceController } from './gpu-resource.controller';

@Module({
  providers: [GpuManagerService, GpuResourceService],
  controllers: [GpuController, GpuResourceController],
  exports: [GpuManagerService, GpuResourceService],
})
export class GpuModule {}
