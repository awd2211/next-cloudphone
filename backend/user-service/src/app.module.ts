import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthModule } from './auth/auth.module';
import { QuotasModule } from './quotas/quotas.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { winstonConfig } from './config/winston.config';
import { PrometheusMiddleware } from './common/middleware/prometheus.middleware';
import { IpFilterMiddleware } from './common/middleware/ip-filter.middleware';
import { throttlerConfig } from './common/config/throttler.config';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(winstonConfig),
    ScheduleModule.forRoot(),
    // Throttler 限流模块
    ThrottlerModule.forRoot(throttlerConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuthModule,
    QuotasModule,
    TicketsModule,
    AuditLogsModule,
    ApiKeysModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    // 全局应用 Throttler 守卫
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // IP 黑名单过滤（最先执行）
    consumer.apply(IpFilterMiddleware).forRoutes('*');
    // Prometheus 指标收集
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
