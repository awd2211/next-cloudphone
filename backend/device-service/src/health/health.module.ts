import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnhancedHealthService } from "./enhanced-health.service";
import { Device } from "../entities/device.entity";
import { DockerModule } from "../docker/docker.module";
import { AdbModule } from "../adb/adb.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    DockerModule,
    AdbModule,
    MetricsModule,
  ],
  providers: [EnhancedHealthService],
  exports: [EnhancedHealthService],
})
export class HealthModule {}
