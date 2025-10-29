import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PortManagerService } from "./port-manager.service";
import { Device } from "../entities/device.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  providers: [PortManagerService],
  exports: [PortManagerService],
})
export class PortManagerModule {}
