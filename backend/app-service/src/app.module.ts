import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { AppsModule } from './apps/apps.module';
import { MinioModule } from './minio/minio.module';
import { ApkModule } from './apk/apk.module';
import { HealthController } from './health.controller';
import { ConsulModule, createLoggerConfig, EventBusModule, SagaModule, SecurityModule, EventOutboxModule } from '@cloudphone/shared';
import { validate } from './common/config/env.validation';
// import { AppRabbitMQModule } from './rabbitmq/rabbitmq.module'; // ❌ V2: 移除重复的 RabbitMQ 模块
import { AppsConsumer } from './apps/apps.consumer'; // ✅ V2: 直接导入消费者
import { DeviceApplication } from './entities/device-application.entity'; // ✅ V2: Consumer 需要的实体

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
    TypeOrmModule.forFeature([DeviceApplication]), // ✅ V2: Consumer 需要的仓库
    AuthModule,
    AppsModule,
    MinioModule,
    ApkModule,
    ConsulModule,
    EventBusModule.forRoot(), // ✅ V2: 统一使用 EventBusModule.forRoot() (包含 RabbitMQModule)
    EventOutboxModule,        // ✅ Transactional Outbox Pattern
    SagaModule,               // Saga 编排模块（用于分布式事务）
    SecurityModule,           // ✅ 统一安全模块（已修复 AutoBanMiddleware）
  ],
  controllers: [HealthController],
  providers: [AppsConsumer],  // ✅ V2: 直接注册消费者
})
export class AppModule {}
