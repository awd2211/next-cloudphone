import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StateRecoveryService } from "./state-recovery.service";
import { StateRecoveryController } from "./state-recovery.controller";
import { Device } from "../entities/device.entity";
import { DockerModule } from "../docker/docker.module";

@Module({
  imports: [TypeOrmModule.forFeature([Device]), DockerModule],
  controllers: [StateRecoveryController],
  providers: [StateRecoveryService],
  exports: [StateRecoveryService],
})
export class StateRecoveryModule {}
