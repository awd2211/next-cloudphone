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
import { ConsulModule } from '@cloudphone/shared';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // 配置模块
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
          service: 'api-gateway',
          environment: process.env.NODE_ENV || 'development',
        }),
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),

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

    // 数据库模块
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudphone_auth',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // ✅ 使用 Atlas 管理数据库迁移
      logging: process.env.NODE_ENV === 'development',
    }),

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
