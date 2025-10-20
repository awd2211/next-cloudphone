import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
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
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
    // Winston 日志模块
    WinstonModule.forRoot(winstonConfig),
      isGlobal: true,
    // Winston 日志模块
    WinstonModule.forRoot(winstonConfig),
      envFilePath: '.env',
    // Winston 日志模块
    WinstonModule.forRoot(winstonConfig),
    }),
    // Winston 日志模块
    WinstonModule.forRoot(winstonConfig),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudphone',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    BillingModule,
    MeteringModule,
    ReportsModule,
    PaymentsModule,
    BalanceModule,
    InvoicesModule,
    BillingRulesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
