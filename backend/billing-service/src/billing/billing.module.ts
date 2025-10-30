import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaModule } from '@cloudphone/shared';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PricingEngineService } from './pricing-engine.service';
import { Order } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord } from './entities/usage-record.entity';
import { PurchasePlanSagaV2 } from '../sagas/purchase-plan-v2.saga';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Plan, UsageRecord]),
    SagaModule, // ✅ 添加 Saga 模块
  ],
  controllers: [BillingController],
  providers: [BillingService, PricingEngineService, PurchasePlanSagaV2],
  exports: [BillingService, PricingEngineService],
})
export class BillingModule {}
