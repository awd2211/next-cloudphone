import { Module } from "@nestjs/common";
import { GpuManagerService } from "./gpu-manager.service";
import { GpuController } from "./gpu.controller";

@Module({
  providers: [GpuManagerService],
  controllers: [GpuController],
  exports: [GpuManagerService],
})
export class GpuModule {}
