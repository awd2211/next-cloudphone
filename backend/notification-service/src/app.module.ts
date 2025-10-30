import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import * as redisStore from 'cache-manager-redis-store';
import { createLoggerConfig, ConsulModule, SecurityModule } from '@cloudphone/shared';
import { HealthController } from './health/health.controller';
import { TasksService } from './tasks/tasks.service';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { TemplatesModule } from './templates/templates.module';
import { NotificationEventsHandler } from './events/notification-events.handler';
// import { CloudphoneRabbitMQModule } from './rabbitmq/rabbitmq.module'; // ❌ V2: 移除独立 RabbitMQ 模块
import { UserEventsConsumer } from './rabbitmq/consumers/user-events.consumer'; // ✅ V2: 直接导入消费者
import { DeviceEventsConsumer } from './rabbitmq/consumers/device-events.consumer';
import { AppEventsConsumer } from './rabbitmq/consumers/app-events.consumer';
import { BillingEventsConsumer } from './rabbitmq/consumers/billing-events.consumer';
import { SchedulerEventsConsumer } from './rabbitmq/consumers/scheduler-events.consumer';
import { MediaEventsConsumer } from './rabbitmq/consumers/media-events.consumer';
import { SystemEventsConsumer } from './rabbitmq/consumers/system-events.consumer';
import { DlxConsumer } from './rabbitmq/consumers/dlx.consumer';
import { AuthModule } from './auth/auth.module';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { validate } from './common/config/env.validation';
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

    // ========== 数据库模块 ==========
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: +configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'cloudphone'),
        entities: [Notification, NotificationTemplate, NotificationPreference],
        synchronize: false, // Disabled to prevent auto schema changes
        logging: configService.get('NODE_ENV') === 'development',
        autoLoadEntities: false,
      }),
      inject: [ConfigService],
    }),

    // ========== Redis 缓存 ==========
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_CACHE_DB', 1),
        ttl: 60,
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),

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

    // ========== 安全模块 ==========
    SecurityModule, // ✅ 统一安全模块（速率限制、IP黑名单、自动封禁、XSS/CSRF防护）
  ],
  controllers: [
    HealthController,
  ],
  providers: [
    TasksService,
    NotificationEventsHandler,
    // ✅ V2: 直接注册所有消费者
    UserEventsConsumer,
    DeviceEventsConsumer,
    AppEventsConsumer,
    BillingEventsConsumer,
    SchedulerEventsConsumer,
    MediaEventsConsumer,
    SystemEventsConsumer,
    DlxConsumer,
  ],
})
export class AppModule {}
