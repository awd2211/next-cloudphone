import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Device } from "../entities/device.entity";
import { UserEventsHandler } from "./user-events.handler";

/**
 * 事件处理模块
 *
 * 集中管理所有事件监听器
 */
@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  providers: [UserEventsHandler],
  exports: [UserEventsHandler],
})
export class EventsModule {}
