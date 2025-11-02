import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import * as redisStore from 'cache-manager-redis-store';

import { AdaptersModule } from './adapters/adapters.module';
import { PoolModule } from './pool/pool.module';
import { ProxyModule } from './proxy/proxy.module';
// TODO: 待实现的模块
// import { StatisticsModule } from './statistics/statistics.module';
// import { MonitoringModule } from './monitoring/monitoring.module';
// import { EventsModule } from './events/events.module';

// 实体导入
import { ProxyProvider } from './entities/proxy-provider.entity';
import { ProxyUsage } from './entities/proxy-usage.entity';
import { ProxyHealth } from './entities/proxy-health.entity';
import { ProxySession } from './entities/proxy-session.entity';
import { CostRecord } from './entities/cost-record.entity';

@Module({
  imports: [
    // 配置模块 - 全局可用
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'cloudphone_proxy'),
        entities: [
          ProxyProvider,
          ProxyUsage,
          ProxyHealth,
          ProxySession,
          CostRecord,
        ],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
        poolSize: 20, // 连接池大小（支持高并发）
        extra: {
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),

    // Redis缓存模块
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore as any,
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD'),
        ttl: 600, // 默认TTL: 10分钟
        max: 10000, // 最大缓存条目数
      }),
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // Prometheus监控模块
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'proxy_service_',
        },
      },
    }),

    // 业务模块
    AdaptersModule,    // 供应商适配器
    PoolModule,        // 代理池管理
    ProxyModule,       // 代理业务逻辑
    // TODO: 待实现的模块
    // StatisticsModule,  // 统计分析
    // MonitoringModule,  // 监控告警
    // EventsModule,      // 事件处理
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
