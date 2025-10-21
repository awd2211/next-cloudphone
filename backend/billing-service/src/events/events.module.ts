import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { BillingUserEventsHandler } from './user-events.handler';
import { BillingDeviceEventsHandler } from './device-events.handler';

/**
 * 事件处理模块（Billing Service）
 * 
 * 监听其他服务的事件，同步冗余数据
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, UsageRecord]),
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

