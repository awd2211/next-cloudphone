import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as redisStore from 'cache-manager-redis-store';
import { EventBusModule, ConsulModule, createLoggerConfig } from '@cloudphone/shared';
import { HealthController } from './health/health.controller';
import { TasksService } from './tasks/tasks.service';
import { NotificationGateway } from './gateway/notification.gateway';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { EmailModule } from './email/email.module';
import { NotificationEventsHandler } from './events/notification-events.handler';

@Module({
  imports: [
    // ========== 全局配置 ==========
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ========== 日志模块 ==========
    LoggerModule.forRoot(createLoggerConfig('notification-service')),

    // ========== 数据库模块 ==========
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: +configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'cloudphone_notification'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // ========== 实体注册 ==========
    TypeOrmModule.forFeature([Notification, NotificationTemplate]),

    // ========== Redis 缓存 ==========
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_CACHE_DB', 1),
        ttl: 60,
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),

    // ========== 定时任务 ==========
    ScheduleModule.forRoot(),

    // ========== 事件发射器 ==========
    EventEmitterModule.forRoot(),

    // ========== 事件总线 ==========
    EventBusModule,

    // ========== 服务发现 ==========
    ConsulModule,

    // ========== 邮件模块 ==========
    EmailModule,
  ],
  controllers: [
    HealthController,
    NotificationsController,
  ],
  providers: [
    NotificationGateway,
    NotificationsService,
    TasksService,
    NotificationEventsHandler,
  ],
})
export class AppModule {}
