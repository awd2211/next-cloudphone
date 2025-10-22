import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { ConsulModule, createLoggerConfig } from '@cloudphone/shared';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('api-gateway')),

    // 限流模块 - 防止 DDoS 攻击
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 秒
        limit: 10, // 每秒最多 10 个请求
      },
      {
        name: 'medium',
        ttl: 10000, // 10 秒
        limit: 100, // 每 10 秒最多 100 个请求
      },
      {
        name: 'long',
        ttl: 60000, // 1 分钟
        limit: 500, // 每分钟最多 500 个请求
      },
    ]),

    // ✅ API Gateway 不再需要数据库连接
    // 认证逻辑已迁移到 User Service
    // API Gateway 只负责：
    // 1. JWT Token 验证
    // 2. 请求路由和代理
    // 3. 限流和安全控制

    // 业务模块
    AuthModule,
    ProxyModule,
    
    // Consul 服务发现
    ConsulModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
