import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { UnifiedCacheModule } from '@cloudphone/shared';

/**
 * Redis 客户端提供者
 * 用于需要直接操作 Redis 的服务（如 QuotaCacheService, PortManagerService）
 */
export const RedisProvider: Provider = {
  provide: Redis,
  useFactory: (configService: ConfigService) => {
    const redisHost = configService.get('REDIS_HOST', 'localhost');
    const redisPort = configService.get('REDIS_PORT', 6379);
    const redisPassword = configService.get('REDIS_PASSWORD', '');
    const redisDb = configService.get('REDIS_DB', 0);

    return new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb,
    });
  },
  inject: [ConfigService],
};

/**
 * Device Service 缓存模块
 *
 * 已迁移至 @cloudphone/shared 的 UnifiedCacheService
 * 提供两层缓存（L1 内存 + L2 Redis）架构
 *
 * 同时保留 Redis 直接注入，供以下服务使用：
 * - QuotaCacheService: 配额缓存（需要 setex, keys 等命令）
 * - PortManagerService: 端口分配（需要原子操作）
 * - ThrottleGuard/RateLimitGuard: 限流（需要 incr, expire 等命令）
 * - DeviceStatsCacheService: 设备统计缓存
 */
@Global()
@Module({
  imports: [
    UnifiedCacheModule.forRoot({
      keyPrefix: 'device-service:',
      defaultTTL: 300,
      enableL1Cache: true,
      l1MaxSize: 1000,
      l1TTL: 60,
      hotDataPrefixes: ['device:', 'template:', 'stats:'],
    }),
    ConfigModule,
  ],
  providers: [RedisProvider],
  exports: [UnifiedCacheModule, Redis],
})
export class CacheModule {}
