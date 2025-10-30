import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggerModule } from "nestjs-pino";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { DevicesModule } from "./devices/devices.module";
import { DockerModule } from "./docker/docker.module";
import { AdbModule } from "./adb/adb.module";
import { GpuModule } from "./gpu/gpu.module";
import { TemplatesModule } from "./templates/templates.module";
import { SnapshotsModule } from "./snapshots/snapshots.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { MetricsModule } from "./metrics/metrics.module";
import { HealthModule } from "./health/health.module";
import { HealthController } from "./health.controller";
import { EventsModule } from "./events/events.module";
import { QuotaModule } from "./quota/quota.module";
import { LifecycleModule } from "./lifecycle/lifecycle.module";
import { CommonModule } from "./common/common.module";
import { FailoverModule } from "./failover/failover.module";
import { StateRecoveryModule } from "./state-recovery/state-recovery.module";
import { CacheModule } from "./cache/cache.module";
import { ProvidersModule } from "./providers/providers.module";
import { PhysicalDevicesModule } from "./physical-devices/physical-devices.module";

import {
  ConsulModule,
  createLoggerConfig,
  EventBusService,
  EventOutbox,
  RequestIdMiddleware,
  SagaModule,
  SecurityModule,
} from "@cloudphone/shared";
import { validate } from "./common/config/env.validation";
import { DeviceRabbitMQModule } from "./rabbitmq/rabbitmq.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate, // ✅ 添加环境变量验证
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig("device-service")),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres" as const,
        host: configService.get<string>("DB_HOST", "localhost"),
        port: +configService.get<number>("DB_PORT", 5432),
        username: configService.get<string>("DB_USERNAME", "postgres"),
        password: configService.get<string>("DB_PASSWORD", "postgres"),
        database: configService.get<string>("DB_DATABASE", "cloudphone_device"),
        entities: [`${__dirname}/**/*.entity{.ts,.js}`, EventOutbox],
        synchronize: false, // ✅ 使用 Atlas 管理数据库迁移
        logging: configService.get<string>("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DeviceRabbitMQModule, // ✅ RabbitMQ 模块（使用 @golevelup/nestjs-rabbitmq）
    ConsulModule,
    CacheModule, // ✅ Redis 缓存模块（全局模块）
    CommonModule, // 通用工具模块（重试、错误处理等）
    ProvidersModule, // ✅ 设备 Provider 抽象层（多设备源支持）
    PhysicalDevicesModule, // ✅ 物理设备池管理模块
    AuthModule,
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
    LifecycleModule, // 生命周期自动化
    FailoverModule, // 故障转移和自动恢复
    StateRecoveryModule, // 状态自愈和回滚
    SagaModule, // Saga 编排模块（用于分布式事务）
    SecurityModule, // ✅ 已修复 AutoBanMiddleware 上下文绑定问题
  ],
  controllers: [HealthController],
  providers: [], // EventBusService 由 EventBusModule 提供
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 应用 Request ID 中间件到所有路由
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
