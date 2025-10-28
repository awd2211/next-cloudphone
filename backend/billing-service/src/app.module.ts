import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillingModule } from './billing/billing.module';
import { MeteringModule } from './metering/metering.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentsModule } from './payments/payments.module';
import { BalanceModule } from './balance/balance.module';
import { InvoicesModule } from './invoices/invoices.module';
import { BillingRulesModule } from './billing-rules/billing-rules.module';
import { StatsModule } from './stats/stats.module';
import { HealthController } from './health.controller';
import { EventsModule } from './events/events.module';
import { ConsulModule, EventBusModule, createLoggerConfig } from '@cloudphone/shared';
import { validate } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('billing-service')),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: +configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'cloudphone_billing'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development', // 开发环境自动同步表结构
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    BillingModule,
    MeteringModule,
    ReportsModule,
    StatsModule,
    PaymentsModule,
    BalanceModule,
    InvoicesModule,
    BillingRulesModule,
    EventsModule, // 事件处理模块
    ConsulModule,     // ✅ 已修复 DiscoveryService 依赖问题
    EventBusModule,   // ✅ 已修复 DiscoveryService 依赖问题
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
