import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { createLoggerConfig, ConsulModule, DistributedLockModule, AllExceptionsFilter, RequestTracingMiddleware } from '@cloudphone/shared';
import { HealthController } from './health/health.controller';
import { TasksService } from './tasks/tasks.service';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { TemplatesModule } from './templates/templates.module';
import { NotificationEventsHandler } from './events/notification-events.handler';
import { NotificationGateway } from './gateway/notification.gateway';
// import { CloudphoneRabbitMQModule } from './rabbitmq/rabbitmq.module'; // ❌ V2: 移除独立 RabbitMQ 模块
import { UserEventsConsumer } from './rabbitmq/consumers/user-events.consumer'; // ✅ V2: 直接导入消费者
import { DeviceEventsConsumer } from './rabbitmq/consumers/device-events.consumer';
import { AppEventsConsumer } from './rabbitmq/consumers/app-events.consumer';
import { BillingEventsConsumer } from './rabbitmq/consumers/billing-events.consumer';
import { SchedulerEventsConsumer } from './rabbitmq/consumers/scheduler-events.consumer';
import { MediaEventsConsumer } from './rabbitmq/consumers/media-events.consumer';
import { SystemEventsConsumer } from './rabbitmq/consumers/system-events.consumer';
import { DlxConsumer } from './rabbitmq/consumers/dlx.consumer';
import { QuotaEventsConsumer } from './rabbitmq/consumers/quota-events.consumer'; // ✅ 配额事件消费者
import { ProxyEventsConsumer } from './rabbitmq/consumers/proxy-events.consumer'; // ✅ 代理事件消费者 (2025-11-26)
import { SmsEventsConsumer } from './rabbitmq/consumers/sms-events.consumer'; // ✅ 短信事件消费者 (2025-11-26)
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module'; // ✅ 使用自定义的 @Global() CacheModule
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { SmsRecord } from './sms/entities/sms-record.entity';
import { validate } from './common/config/env.validation';
import { getDatabaseConfig } from './common/config/database.config';
import { EventBusModule } from '@cloudphone/shared'; // ✅ V2: 导入 EventBusModule

@Module({
  imports: [
    // ========== 全局配置 ==========
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate, // ✅ 添加环境变量验证
    }),

    // ========== 日志模块 ==========
    LoggerModule.forRoot(createLoggerConfig('notification-service')),

    // ========== Throttler 限流模块 ==========
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // ========== 数据库模块 ==========
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig, // ✅ 使用优化的连接池配置
      inject: [ConfigService],
    }),

    // ========== Redis 缓存 (使用自定义 @Global CacheModule) ==========
    CacheModule,

    // ========== Redis 直接连接 (用于 OTP) ==========
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`,
        options: {
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_OTP_DB', 2), // 使用独立的 DB 用于 OTP
        },
      }),
      inject: [ConfigService],
    }),

    // ========== 定时任务 ==========
    ScheduleModule.forRoot(),

    // ========== 事件发射器 ==========
    EventEmitterModule.forRoot(),

    // ========== 邮件模块 ==========
    EmailModule,

    // ========== SMS 短信模块 ==========
    SmsModule,

    // ========== 通知模块 ==========
    NotificationsModule,

    // ========== 模板模块 ==========
    TemplatesModule,

    // ========== 认证模块 ==========
    AuthModule,

    // ========== RabbitMQ 消息队列 ==========
    EventBusModule.forRoot(), // ✅ V2: 统一使用 EventBusModule.forRoot() (替换 CloudphoneRabbitMQModule)

    // ========== Consul 服务注册 ==========
    ConsulModule,

    // ========== K8s 集群安全：分布式锁 ==========
    DistributedLockModule.forRoot(), // ✅ K8s cluster safety: Redis distributed lock for cron tasks

    // ========== 安全模块 ==========
    // SecurityModule, // ⚠️ 暂时禁用以便测试 API
  ],
  controllers: [HealthController],
  providers: [
    // 全局异常过滤器（统一错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局 Throttler 守卫（限流保护）
    // 使用自定义 HttpThrottlerGuard 跳过非 HTTP 上下文（如 RabbitMQ 消费者）
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
    TasksService,
    NotificationEventsHandler,
    NotificationGateway, // ✅ WebSocket 网关
    // ✅ V2: 直接注册所有消费者
    UserEventsConsumer,
    DeviceEventsConsumer,
    AppEventsConsumer,
    BillingEventsConsumer,
    SchedulerEventsConsumer,
    MediaEventsConsumer,
    SystemEventsConsumer,
    QuotaEventsConsumer, // ✅ 配额事件消费者（修复注册缺失）
    ProxyEventsConsumer, // ✅ 代理事件消费者 (2025-11-26)
    SmsEventsConsumer, // ✅ 短信事件消费者 (2025-11-26)
    DlxConsumer,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ✅ 分布式追踪中间件
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
  }
}
