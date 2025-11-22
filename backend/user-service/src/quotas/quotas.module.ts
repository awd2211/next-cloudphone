import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service';
import { QuotasController } from './quotas.controller';
import { QuotasInternalController } from './quotas-internal.controller';
import { QuotaMetricsService } from './quota-metrics.service';
import { Quota } from '../entities/quota.entity';
import { AuthModule } from '../auth/auth.module';
import { EventBusModule } from '@cloudphone/shared';
// 注意：CACHE_MANAGER 由全局 AppCacheModule 提供，不需要导入自定义 CacheModule

@Module({
  imports: [TypeOrmModule.forFeature([Quota]), AuthModule, EventBusModule],
  controllers: [QuotasController, QuotasInternalController], // ✅ 添加内部控制器
  providers: [QuotasService, QuotaMetricsService], // ✅ 添加指标服务
  exports: [QuotasService, QuotaMetricsService],
})
export class QuotasModule {}
