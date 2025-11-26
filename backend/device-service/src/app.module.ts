import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { DockerModule } from './docker/docker.module';
import { AdbModule } from './adb/adb.module';
import { GpuModule } from './gpu/gpu.module';
import { TemplatesModule } from './templates/templates.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';
import { HealthController } from './health.controller';
import { EventsModule } from './events/events.module';
import { QuotaModule } from './quota/quota.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { CommonModule } from './common/common.module';
import { FailoverModule } from './failover/failover.module';
import { StateRecoveryModule } from './state-recovery/state-recovery.module';
import { CacheModule } from './cache/cache.module';
import { ProvidersModule } from './providers/providers.module';
import { PhysicalDevicesModule } from './physical-devices/physical-devices.module';
import { ProxyModule } from './proxy/proxy.module';
import { WebSocketModule } from './websocket/websocket.module';

import {
  ConsulModule,
  createLoggerConfig,
  EventBusService,
  EventBusModule,
  EventOutbox,
  RequestIdMiddleware,
  RequestTracingMiddleware, // ✅ 分布式追踪中间件
  SagaModule,
  DistributedLockModule, // ✅ K8s 集群安全：分布式锁模块
  AllExceptionsFilter, // ✅ 统一异常过滤器
} from '@cloudphone/shared';
import { validate } from './common/config/env.validation';
import { getDatabaseConfig } from './common/config/database.config';
import { DeviceRabbitMQModule } from './rabbitmq/rabbitmq.module';
import { SmsEventsConsumer } from './rabbitmq/consumers/sms-events.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate, // ✅ 添加环境变量验证
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('device-service')),
    // Throttler 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig, // ✅ 使用优化的连接池配置
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DeviceRabbitMQModule, // ✅ RabbitMQ 模块（使用 @golevelup/nestjs-rabbitmq）
    ConsulModule,
    EventBusModule.forRoot(), // ✅ 事件总线（用于错误通知）
    CacheModule, // ✅ Redis 缓存模块（全局模块）
    CommonModule, // 通用工具模块（重试、错误处理等）
    ProvidersModule, // ✅ 设备 Provider 抽象层（多设备源支持）
    PhysicalDevicesModule, // ✅ 物理设备池管理模块
    AuthModule,
    // ⚠️ LifecycleModule 必须在 DevicesModule 之前，否则 /devices/lifecycle/* 会被 /devices/:id 匹配
    LifecycleModule, // 生命周期自动化
    DevicesModule,
    DockerModule,
    AdbModule,
    GpuModule,
    TemplatesModule,
    SnapshotsModule,
    SchedulerModule,
    EventsModule, // 事件处理模块
    MetricsModule, // Prometheus 指标采集
    HealthModule, // 增强健康检查
    QuotaModule, // 多租户配额管理
    FailoverModule, // 故障转移和自动恢复
    StateRecoveryModule, // 状态自愈和回滚
    SagaModule, // Saga 编排模块（用于分布式事务）
    DistributedLockModule.forRoot(), // ✅ K8s 集群安全：Redis 分布式锁（防止定时任务重复执行）
    ProxyModule, // ✅ 代理管理模块（统计、健康检查、客户端）
    WebSocketModule, // ✅ WebSocket 模块（设备状态实时推送）
  ],
  controllers: [HealthController],
  providers: [
    // 全局异常过滤器（统一错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局 Throttler 守卫（限流保护）
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    SmsEventsConsumer, // ✅ SMS 事件消费者 - 监听短信验证码事件
  ], // EventBusService 由 EventBusModule 提供
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ✅ 分布式追踪中间件（必须在 RequestIdMiddleware 之前）
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
    // 应用 Request ID 中间件到所有路由
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
