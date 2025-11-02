import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyClientModule } from '@cloudphone/shared';
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { Device } from '../entities/device.entity';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyHealthService } from './proxy-health.service';
import { ProxyCleanupService } from './proxy-cleanup.service';
import { ProxyAdminController } from './proxy-admin.controller';
import { ProxyMetricsService } from './proxy-metrics.service';
import { MetricsModule } from '../metrics/metrics.module';

/**
 * 代理管理模块
 *
 * 功能:
 * - 代理使用统计 (ProxyStatsService)
 * - 代理健康检查 (ProxyHealthService)
 * - 代理孤儿清理 (ProxyCleanupService)
 * - 代理管理 API (ProxyAdminController)
 * - 代理 Prometheus 指标 (ProxyMetricsService)
 * - 代理客户端 (ProxyClientModule from @cloudphone/shared)
 */
@Module({
  imports: [
    // 导入 ProxyClientModule（来自 shared 包）
    ProxyClientModule.register({
      serviceUrl: process.env.PROXY_SERVICE_URL || 'http://localhost:30007',
      enabled: process.env.PROXY_ENABLED !== 'false', // 默认启用
      maxRetries: 2,
      circuitBreaker: true,
    }),
    // 注册实体
    TypeOrmModule.forFeature([ProxyUsage, Device]),
    // 导入 MetricsModule（用于访问 Prometheus registry）
    MetricsModule,
  ],
  controllers: [ProxyAdminController],
  providers: [
    ProxyStatsService,
    ProxyHealthService,
    ProxyCleanupService,
    ProxyMetricsService,
  ],
  exports: [
    ProxyStatsService,
    ProxyHealthService,
    ProxyCleanupService,
    ProxyMetricsService,
    ProxyClientModule,
  ],
})
export class ProxyModule {}
