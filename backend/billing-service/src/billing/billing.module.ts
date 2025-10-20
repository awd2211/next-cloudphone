import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Order } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord } from './entities/usage-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Plan, UsageRecord])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
