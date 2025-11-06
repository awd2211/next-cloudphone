import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaModule, HttpClientModule } from '@cloudphone/shared';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PricingEngineService } from './pricing-engine.service';
import { AdminUsageController } from './admin-usage.controller';
import { AdminUsageService } from './admin-usage.service';
import { Order } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord } from './entities/usage-record.entity';
import { PurchasePlanSagaV2 } from '../sagas/purchase-plan-v2.saga';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Plan, UsageRecord]),
    SagaModule, // ✅ 添加 Saga 模块
    MetricsModule, // ✅ 添加业务指标模块
    HttpClientModule, // ✅ 添加 HTTP 客户端模块（用于服务间调用）
  ],
  controllers: [BillingController, AdminUsageController],
  providers: [BillingService, PricingEngineService, PurchasePlanSagaV2, AdminUsageService],
  exports: [BillingService, PricingEngineService],
})
export class BillingModule {}
