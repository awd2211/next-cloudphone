import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { AppsModule } from './apps/apps.module';
import { MinioModule } from './minio/minio.module';
import { ApkModule } from './apk/apk.module';
import { HealthController } from './health.controller';
import { ConsulModule, createLoggerConfig, EventBusService } from '@cloudphone/shared';
import { validate } from './common/config/env.validation';
import { AppRabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('app-service')),
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
    AppRabbitMQModule,  // ✅ 本地 RabbitMQ 模块(包含 Consumer 注册)
  ],
  controllers: [HealthController],
  providers: [EventBusService],  // ✅ 提供 EventBusService 供其他模块使用
})
export class AppModule {}
