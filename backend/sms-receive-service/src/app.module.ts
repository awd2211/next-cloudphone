import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import {
  EventBusModule,
  ConsulModule,
  AppCacheModule,
  createLoggerConfig,
  DistributedLockModule,
  AllExceptionsFilter,
} from '@cloudphone/shared';

// Entities
import {
  VirtualNumber,
  SmsMessage,
  ProviderConfig,
  NumberPool,
  ProviderBlacklist,
  ABTestConfig,
} from './entities';

// Providers
import { SmsActivateAdapter } from './providers/sms-activate.adapter';
import { FiveSimAdapter } from './providers/5sim.adapter';

// Services
import { NumberManagementService } from './services/number-management.service';
import { MessagePollingService } from './services/message-polling.service';
import { PlatformSelectorService } from './services/platform-selector.service';
import { BlacklistManagerService } from './services/blacklist-manager.service';
import { ABTestManagerService } from './services/ab-test-manager.service';
import { NumberPoolManagerService } from './services/number-pool-manager.service';
import { VerificationCodeExtractorService } from './services/verification-code-extractor.service';
import { VerificationCodeCacheService } from './services/verification-code-cache.service';
import { FiveSimService } from './services/5sim.service';
import { SmsActivateService } from './services/sms-activate.service';

// Controllers
import { NumbersController } from './controllers/numbers.controller';
import { StatisticsController } from './controllers/statistics.controller';
import { VerificationCodeController } from './controllers/verification-code.controller';
import { ProviderConfigController } from './controllers/provider-config.controller';
import { AlertsController } from './controllers/alerts.controller';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { IntelligenceController } from './controllers/intelligence.controller';
import { FiveSimController } from './controllers/5sim.controller';
import { SmsActivateController } from './controllers/sms-activate.controller';

// Modules
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { getDatabaseConfig } from './common/config/database.config';
import { validate } from './common/config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate, // ✅ 添加环境变量验证
    }),

    // Throttler 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig, // ✅ 使用优化的连接池配置
    }),

    // TypeORM Repositories
    TypeOrmModule.forFeature([
      VirtualNumber,
      SmsMessage,
      ProviderConfig,
      NumberPool,
      ProviderBlacklist,
      ABTestConfig,
    ]),

    // HTTP Client
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    // Schedule (for cron jobs)
    ScheduleModule.forRoot(),

    // Shared Modules from @cloudphone/shared
    EventBusModule.forRoot(),
    ConsulModule,
    AppCacheModule,
    DistributedLockModule.forRoot(), // ✅ K8s cluster safety: Redis distributed lock for cron tasks

    // Authentication
    AuthModule,

    // Health & Monitoring
    HealthModule,
  ],

  controllers: [
    // 具体路径的控制器必须在参数路由控制器之前声明
    AlertsController,        // /sms/alerts/*
    AuditLogsController,     // /sms/audit-logs/*
    FiveSimController,       // /sms/5sim/* (5sim高级功能)
    SmsActivateController,   // /sms/sms-activate/* (sms-activate高级功能)
    IntelligenceController,  // /sms/code-recognition/*, /sms/intelligence/*, /sms/numbers/geo/*
    NumbersController,       // /sms/numbers/*
    StatisticsController,    // /sms/statistics/*
    VerificationCodeController,
    ProviderConfigController, // /sms/providers/:id (参数路由，必须最后)
  ],

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
    // Adapters
    SmsActivateAdapter,
    FiveSimAdapter,

    // Services
    PlatformSelectorService,
    NumberManagementService,
    MessagePollingService,
    BlacklistManagerService,
    ABTestManagerService,
    NumberPoolManagerService,
    VerificationCodeExtractorService,
    VerificationCodeCacheService,
    FiveSimService,
    SmsActivateService,
  ],
})
export class AppModule {}
