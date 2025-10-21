import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { WebsocketModule } from './websocket/websocket.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport: process.env.NODE_ENV !== 'production' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        } : undefined,
        customProps: () => ({
          service: 'notification-service',
          environment: process.env.NODE_ENV || 'development',
        }),
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudphone_notification',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // ✅ 使用 Atlas 管理数据库迁移
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    NotificationsModule,
    WebsocketModule,
    EmailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
