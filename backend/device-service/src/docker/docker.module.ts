import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { GpuModule } from '../gpu/gpu.module';

@Module({
  imports: [GpuModule],
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {}
