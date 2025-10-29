import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MetricsService } from "./metrics.service";
import { MetricsController } from "./metrics.controller";
import { Device } from "../entities/device.entity";
import { DockerModule } from "../docker/docker.module";

@Module({
  imports: [TypeOrmModule.forFeature([Device]), DockerModule],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService], // 导出给其他模块使用
})
export class MetricsModule {}
