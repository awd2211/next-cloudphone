import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

/**
 * 全局缓存模块
 * 使用 Redis 作为缓存存储
 *
 * 注意：使用 cache-manager-redis-yet 以兼容 cache-manager v5
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          password: configService.get('REDIS_PASSWORD'),
          database: configService.get('REDIS_CACHE_DB', 1), // 使用 DB 1 存缓存
        }),
        ttl: 300 * 1000, // 默认 TTL 5分钟（毫秒）
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}
