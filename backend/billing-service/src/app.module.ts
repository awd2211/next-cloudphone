import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Pino 日志模块 - 使用统一的增强配置
    LoggerModule.forRoot(createLoggerConfig('billing-service')),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudphone_billing',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // 使用 Atlas 管理迁移
      logging: process.env.NODE_ENV === 'development',
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
    ConsulModule,
    EventBusModule, // ✅ 启用事件总线
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
