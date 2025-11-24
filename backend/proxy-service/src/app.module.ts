import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, Reflector } from '@nestjs/core';

// ✅ 导入共享模块
import {
  ConsulModule,
  AppCacheModule,
  createLoggerConfig,
  RequestIdMiddleware,
  DistributedLockModule,
  AllExceptionsFilter,
} from '@cloudphone/shared';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { AdaptersModule } from './adapters/adapters.module';
import { PoolModule } from './pool/pool.module';
import { ProxyModule } from './proxy/proxy.module';
import { EventBusLocalModule } from './events/event-bus-local.module';
/**
 * 🚧 预留模块（按需实现）
 * - StatisticsModule: 代理使用统计分析（当前由 ProxyUsageReportService 处理）
 * - MonitoringModule: 代理健康监控告警（当前由 ProxyAlertService 处理）
 * - EventsModule: 事件处理（proxy-service 为独立服务，暂不参与事件架构）
 */
// import { StatisticsModule } from './statistics/statistics.module';
// import { MonitoringModule } from './monitoring/monitoring.module';
// import { EventsModule } from './events/events.module';

// 实体导入
import { ProxyProvider } from './entities/proxy-provider.entity';
import { ProxyUsage } from './entities/proxy-usage.entity';
import { ProxyHealth } from './entities/proxy-health.entity';
import { ProxySession } from './entities/proxy-session.entity';
import { CostRecord } from './entities/cost-record.entity';
import { getDatabaseConfig } from './common/config/database.config';

// Controllers
import { ProxyProviderConfigController } from './proxy/controllers/proxy-provider-config.controller';

@Module({
  imports: [
    // ===== 配置模块 - 全局可用 =====
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),

    // ===== Pino 日志模块 =====
    LoggerModule.forRoot(createLoggerConfig('proxy-service')),

    // ===== Throttler 限流模块 =====
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // ===== 共享模块集成 =====
    // ✅ Consul 服务注册与发现
    ConsulModule,

    // ✅ EventBusLocalModule - 本地 RabbitMQ 配置
    // 事件类型：proxy.health_changed, proxy.cost_alert, proxy.pool_low 等
    EventBusLocalModule,

    // ✅ Redis 缓存 (ProxyPoolManager 需要)
    AppCacheModule,

    // ⚠️ SecurityModule 暂时禁用（在共享模块中未启用）
    // SecurityModule,

    // ===== 数据库模块 =====
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig, // ✅ 使用优化的连接池配置
    }),

    // ===== 定时任务模块 =====
    ScheduleModule.forRoot(),

    // ===== K8s 集群安全：分布式锁 =====
    DistributedLockModule.forRoot(), // ✅ K8s cluster safety: Redis distributed lock for cron tasks

    // ===== Prometheus 监控模块 =====
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'proxy_service_',
        },
      },
    }),

    // ===== TypeORM Repository 注入 =====
    TypeOrmModule.forFeature([ProxyProvider]),

    // ===== 认证模块 =====
    AuthModule, // JWT 认证

    // ===== 健康检查模块 =====
    HealthModule, // 服务健康状态监控

    // ===== 业务模块 =====
    AdaptersModule, // 供应商适配器
    PoolModule, // 代理池管理
    ProxyModule, // 代理业务逻辑
    // 🚧 预留模块 - 当前功能已由 ProxyModule 内的 Services 覆盖
    // StatisticsModule,  // → ProxyUsageReportService
    // MonitoringModule,  // → ProxyAlertService + ProxyHealthCheckService
    // EventsModule,      // → 独立服务，不参与事件架构
  ],
  controllers: [ProxyProviderConfigController],
  providers: [
    // 全局异常过滤器（统一错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局 Throttler 守卫（限流保护）
    // ⚠️ 暂时禁用 - proxy-service 是内部服务,不需要全局限流
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
