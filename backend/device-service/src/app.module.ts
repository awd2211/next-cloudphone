import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { DockerModule } from './docker/docker.module';
import { AdbModule } from './adb/adb.module';
import { GpuModule } from './gpu/gpu.module';
import { TemplatesModule } from './templates/templates.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthController } from './health.controller';
import { EventsModule } from './events/events.module';

import { EventBusModule, ConsulModule, createLoggerConfig } from '@cloudphone/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('device-service')),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudphone_device',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // ✅ 使用 Atlas 管理数据库迁移
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    EventBusModule,  // ✅ 已启用 - RabbitMQ 已配置完成
    ConsulModule,
    AuthModule,
    DevicesModule,
    DockerModule,
    AdbModule,
    GpuModule,
    TemplatesModule,
    SnapshotsModule,
    SchedulerModule,
    EventsModule, // 事件处理模块
  ],
  controllers: [HealthController],
})
export class AppModule {}
