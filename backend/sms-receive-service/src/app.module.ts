import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import {
  EventBusModule,
  ConsulModule,
  AppCacheModule,
  createLoggerConfig,
  DistributedLockModule,
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

// Controllers
import { NumbersController } from './controllers/numbers.controller';
import { StatisticsController } from './controllers/statistics.controller';
import { VerificationCodeController } from './controllers/verification-code.controller';
import { ProviderConfigController } from './controllers/provider-config.controller';

// Modules
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'cloudphone_sms'),
        entities: [
          VirtualNumber,
          SmsMessage,
          ProviderConfig,
          NumberPool,
          ProviderBlacklist,
          ABTestConfig,
        ],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: configService.get<string>('NODE_ENV') === 'production' ? {
          rejectUnauthorized: false
        } : false,
      }),
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
    NumbersController,
    StatisticsController,
    VerificationCodeController,
    ProviderConfigController,
  ],

  providers: [
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
  ],
})
export class AppModule {}
