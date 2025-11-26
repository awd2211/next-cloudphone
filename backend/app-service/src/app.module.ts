import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AppsModule } from './apps/apps.module';
import { MinioModule } from './minio/minio.module';
import { ApkModule } from './apk/apk.module';
import { HealthController } from './health.controller';
import {
  ConsulModule,
  createLoggerConfig,
  EventBusModule,
  SagaModule,
  EventOutboxModule,
  ProxyClientModule, // ✅ 导入代理客户端模块
  AllExceptionsFilter, // ✅ 统一异常过滤器
  RequestTracingMiddleware, // ✅ 分布式追踪中间件
} from '@cloudphone/shared';
import { validate } from './common/config/env.validation';
import { getDatabaseConfig } from './common/config/database.config';
import { CacheModule } from './cache/cache.module';
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
    // Throttler 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig, // ✅ 使用优化的连接池配置
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([DeviceApplication]), // ✅ V2: Consumer 需要的仓库
    CacheModule, // ✅ Redis 缓存模块（全局模块）
    AuthModule,
    AppsModule,
    MinioModule,
    ApkModule,
    ConsulModule,
    EventBusModule.forRoot(), // ✅ V2: 统一使用 EventBusModule.forRoot() (包含 RabbitMQModule)
    EventOutboxModule, // ✅ Transactional Outbox Pattern
    SagaModule, // Saga 编排模块（用于分布式事务）
    // ✅ 代理客户端模块 - 用于外部APK下载和第三方API访问
    ProxyClientModule.registerAsync(), // 从环境变量读取配置
  ],
  controllers: [HealthController],
  providers: [
    // 全局异常过滤器（统一错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局 Throttler 守卫（限流保护）
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppsConsumer, // ✅ V2: 直接注册消费者
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ✅ 分布式追踪中间件
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
  }
}
