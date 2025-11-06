import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { NodeManagerService } from './node-manager.service';
import { ResourceMonitorService } from './resource-monitor.service';
import { AllocationService } from './allocation.service';
import { AllocationSchedulerService } from './allocation-scheduler.service';
import { ReservationService } from './reservation.service';
import { QueueService } from './queue.service';
import { StrategyService } from './strategy.service';
import { BillingClientService } from './billing-client.service';
import { NotificationClientService } from './notification-client.service';
import { DeviceEventsConsumer } from './consumers/device-events.consumer';
import { UserEventsConsumer } from './consumers/user-events.consumer';
import { BillingEventsConsumer } from './consumers/billing-events.consumer';
import { SchedulerController } from './scheduler.controller';
import { StrategyController } from './strategy.controller';
import { Node } from '../entities/node.entity';
import { Device } from '../entities/device.entity';
import { DeviceAllocation } from '../entities/device-allocation.entity';
import { DeviceReservation } from '../entities/device-reservation.entity';
import { AllocationQueue } from '../entities/allocation-queue.entity';
import { SchedulingStrategy } from './entities/scheduling-strategy.entity';
import { ResourceUsageHistory } from '../entities/resource-usage-history.entity';
import { AuthModule } from '../auth/auth.module';
import { EventBusModule, ServiceTokenService, DistributedLockModule } from '@cloudphone/shared';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Node,
      Device,
      DeviceAllocation,
      DeviceReservation,
      AllocationQueue,
      SchedulingStrategy,
      ResourceUsageHistory,
    ]),
    ScheduleModule.forRoot(), // 启用定时任务
    AuthModule,
    EventBusModule,
    DistributedLockModule, // 分布式锁服务
    QuotaModule, // 配额服务集成（Phase 2）
  ],
  controllers: [SchedulerController, StrategyController],
  providers: [
    ServiceTokenService, // 服务间认证token服务
    SchedulerService,
    NodeManagerService,
    ResourceMonitorService,
    AllocationService,
    AllocationSchedulerService, // 定时任务服务
    ReservationService, // Phase 3: 设备预约服务
    QueueService, // Phase 3: 优先级队列服务
    StrategyService, // 调度策略服务
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
    ReservationService,
    QueueService,
    StrategyService,
  ],
})
export class SchedulerModule {}
