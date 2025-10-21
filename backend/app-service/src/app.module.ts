import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { AppsModule } from './apps/apps.module';
import { MinioModule } from './minio/minio.module';
import { ApkModule } from './apk/apk.module';
import { HealthController } from './health.controller';
import { ConsulModule } from '@cloudphone/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Pino 日志模块
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
          service: 'app-service',
          environment: process.env.NODE_ENV || 'development',
        }),
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE') || 'cloudphone_app',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // ✅ 使用 Atlas 管理数据库迁移
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AppsModule,
    MinioModule,
    ApkModule,
    ConsulModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
