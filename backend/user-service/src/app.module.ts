import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(winstonConfig),
    ScheduleModule.forRoot(),
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
