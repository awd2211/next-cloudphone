import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Winston 日志模块
    WinstonModule.forRoot(winstonConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    DevicesModule,
    DockerModule,
    AdbModule,
    GpuModule,
    TemplatesModule,
    SnapshotsModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
