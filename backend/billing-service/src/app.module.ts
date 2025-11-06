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
import { ActivitiesModule } from './activities/activities.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReferralsModule } from './referrals/referrals.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { CacheModule } from './cache/cache.module';
// import { BillingRabbitMQModule } from './rabbitmq/rabbitmq.module'; // ❌ V2: 移除独立 RabbitMQ 模块
import { BillingDeviceEventsHandler } from './events/device-events.handler'; // ✅ V2: 直接导入消费者
import { BillingUserEventsHandler } from './events/user-events.handler'; // ✅ V2: 直接导入消费者
import { Order as BillingOrder } from './billing/entities/order.entity'; // ✅ V2: 消费者需要的实体（重命名避免冲突）
import { UsageRecord } from './billing/entities/usage-record.entity'; // ✅ V2: 消费者需要的实体
import {
  ConsulModule,
  EventBusModule,
  createLoggerConfig,
  SagaModule,
  ProxyClientModule, // ✅ 导入代理客户端模块
  DistributedLockModule, // ✅ K8s集群安全：分布式锁模块
} from '@cloudphone/shared';
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
        entities: [`${__dirname}/**/*.entity{.ts,.js}`],
        synchronize: false, // ✅ 使用 TypeORM Migrations 管理数据库架构
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([BillingOrder, UsageRecord]), // ✅ V2: 消费者需要的仓库
    ScheduleModule.forRoot(),
    CacheModule, // ✅ Redis 缓存模块
    AuthModule,
    BillingModule,
    MeteringModule,
    ReportsModule,
    StatsModule,
    DashboardModule,
    PaymentsModule,
    BalanceModule,
    InvoicesModule,
    BillingRulesModule,
    ActivitiesModule,
    CouponsModule,
    ReferralsModule,
    ConsulModule, // ✅ 已修复 DiscoveryService 依赖问题
    EventBusModule.forRoot(), // ✅ V2: 统一使用 EventBusModule.forRoot() (替换 BillingRabbitMQModule + EventBusModule)
    SagaModule, // Saga 编排模块（用于分布式事务）
    DistributedLockModule.forRoot(), // ✅ K8s集群安全：Redis分布式锁（防止重复购买）
    // ✅ 代理客户端模块 - 用于汇率API和支付网关
    ProxyClientModule.registerAsync(), // 从环境变量读取配置
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    BillingDeviceEventsHandler, // ✅ V2: 直接注册消费者
    BillingUserEventsHandler, // ✅ V2: 直接注册消费者
  ],
})
export class AppModule {}
