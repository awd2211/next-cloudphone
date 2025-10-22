import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { BillingUserEventsHandler } from './user-events.handler';
import { BillingDeviceEventsHandler } from './device-events.handler';
import { MeteringModule } from '../metering/metering.module';
import { BalanceModule } from '../balance/balance.module';

/**
 * 事件处理模块（Billing Service）
 *
 * 监听其他服务的事件，同步冗余数据并进行计费
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, UsageRecord]),
    MeteringModule, // 用量追踪服务
    BalanceModule,  // 余额管理服务
  ],
  providers: [
    BillingUserEventsHandler,
    BillingDeviceEventsHandler,
  ],
  exports: [
    BillingUserEventsHandler,
    BillingDeviceEventsHandler,
  ],
})
export class EventsModule {}

