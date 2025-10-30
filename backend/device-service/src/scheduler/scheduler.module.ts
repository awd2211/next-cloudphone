import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerService } from "./scheduler.service";
import { NodeManagerService } from "./node-manager.service";
import { ResourceMonitorService } from "./resource-monitor.service";
import { AllocationService } from "./allocation.service";
import { AllocationSchedulerService } from "./allocation-scheduler.service";
import { BillingClientService } from "./billing-client.service";
import { NotificationClientService } from "./notification-client.service";
import { DeviceEventsConsumer } from "./consumers/device-events.consumer";
import { UserEventsConsumer } from "./consumers/user-events.consumer";
import { BillingEventsConsumer } from "./consumers/billing-events.consumer";
import { SchedulerController } from "./scheduler.controller";
import { Node } from "../entities/node.entity";
import { Device } from "../entities/device.entity";
import { DeviceAllocation } from "../entities/device-allocation.entity";
import { AuthModule } from "../auth/auth.module";
import { EventBusModule } from "@cloudphone/shared";
import { QuotaModule } from "../quota/quota.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Node, Device, DeviceAllocation]),
    ScheduleModule.forRoot(), // 启用定时任务
    AuthModule,
    EventBusModule,
    QuotaModule, // 配额服务集成（Phase 2）
  ],
  controllers: [SchedulerController],
  providers: [
    SchedulerService,
    NodeManagerService,
    ResourceMonitorService,
    AllocationService,
    AllocationSchedulerService, // 定时任务服务
    BillingClientService, // Phase 2: Billing Service 集成
    NotificationClientService, // Phase 2: Notification Service 集成
    // Phase 2: RabbitMQ 事件消费者
    DeviceEventsConsumer,
    UserEventsConsumer,
    BillingEventsConsumer,
  ],
  exports: [
    SchedulerService,
    NodeManagerService,
    ResourceMonitorService,
    AllocationService,
  ],
})
export class SchedulerModule {}
