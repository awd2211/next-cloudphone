import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

/**
 * 全局缓存模块
 * 使用 Redis 作为缓存存储
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_CACHE_DB', 1), // 使用 DB 1 存缓存
        ttl: 300, // 默认 TTL 5分钟
        max: 1000, // 最多缓存 1000 个键
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}

