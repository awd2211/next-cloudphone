import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '@cloudphone/shared';
import { MeteringService } from './metering.service';
import { MeteringController } from './metering.controller';
import { MeteringConsumer } from './metering.consumer';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { BillingModule } from '../billing/billing.module'; // 导入 BillingModule 以使用 PricingEngineService

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    HttpClientModule,
    BillingModule, // ✅ 导入 BillingModule 以注入 PricingEngineService
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [MeteringController],
  providers: [MeteringService, MeteringConsumer],
  exports: [MeteringService],
})
export class MeteringModule {}
