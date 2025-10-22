import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthModule } from './auth/auth.module';
import { QuotasModule } from './quotas/quotas.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { QueueModule } from './queues/queue.module';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
// 通知功能已迁移到独立的 notification-service
// import { NotificationsController } from './common/controllers/notifications.controller';
// import { NotificationService } from './common/services/notification.service';
// import { Notification } from './entities/notification.entity';
import { PrometheusMiddleware } from './common/middleware/prometheus.middleware';
import { IpFilterMiddleware } from './common/middleware/ip-filter.middleware';
import { throttlerConfig } from './common/config/throttler.config';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { SensitiveDataInterceptor } from './common/interceptors/sensitive-data.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CircuitBreakerService } from './common/services/circuit-breaker.service';
import { AuditLogService } from './common/services/audit-log.service';
import { EncryptionService } from './common/services/encryption.service';
import { DatabaseMonitorService } from './common/services/database-monitor.service';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { HealthCheckService } from './common/services/health-check.service';
import { AlertService } from './common/services/alert/alert.service';
import { RequestTrackerMiddleware } from './common/middleware/request-tracker.middleware';
import { getDatabaseConfig } from './common/config/database.config';
import { ConsulModule, createLoggerConfig } from '@cloudphone/shared';
import { CacheWarmupService } from './cache/cache-warmup.service';
import { CacheService } from './cache/cache.service';
import { UserMetricsService } from './common/metrics/user-metrics.service';
import { TracingService } from './common/tracing/tracing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('user-service')),
    // Throttler 限流模块
    ThrottlerModule.forRoot(throttlerConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    // 为全局服务提供实体访问
    TypeOrmModule.forFeature([
      require('./entities/audit-log.entity').AuditLog,
      require('./entities/role.entity').Role,
      require('./entities/permission.entity').Permission,
      // Notification 已迁移到 notification-service
    ]),
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuthModule,
    QuotasModule,
    TicketsModule,
    AuditLogsModule,
    ApiKeysModule,
    QueueModule,
    ConsulModule,  // ✅ 已修复 DiscoveryService 依赖问题
    // ScheduleModule 放在最后，避免依赖问题
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    // 全局应用异常过滤器（统一错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局应用 Throttler 守卫
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // 全局应用敏感数据脱敏拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: SensitiveDataInterceptor,
    },
    // 全局服务
    CircuitBreakerService,
    AuditLogService,
    EncryptionService,
    DatabaseMonitorService,
    GracefulShutdownService,
    HealthCheckService,
    AlertService,
    CacheService,
    CacheWarmupService,  // 缓存预热
    UserMetricsService,  // 用户业务指标
    TracingService,      // Jaeger 分布式追踪
    // NotificationService 已迁移到 notification-service
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 请求追踪（优雅关闭支持）
    consumer.apply(RequestTrackerMiddleware).forRoutes('*');
    // IP 黑名单过滤
    consumer.apply(IpFilterMiddleware).forRoutes('*');
    // Prometheus 指标收集
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
