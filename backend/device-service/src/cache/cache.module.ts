import { Module, Global, Provider } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";
import { Redis } from "ioredis";
import { CacheService } from "./cache.service";

/**
 * Redis 客户端提供者
 * 用于直接注入 Redis 实例
 */
export const RedisProvider: Provider = {
  provide: Redis,
  useFactory: (configService: ConfigService) => {
    const redisHost = configService.get("REDIS_HOST", "localhost");
    const redisPort = configService.get("REDIS_PORT", 6379);
    const redisPassword = configService.get("REDIS_PASSWORD", "");
    const redisDb = configService.get("REDIS_DB", 0);

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
 * Redis 缓存模块
 * 全局模块，提供统一的缓存服务
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get("REDIS_HOST", "localhost");
        const redisPort = configService.get("REDIS_PORT", 6379);
        const redisPassword = configService.get("REDIS_PASSWORD", "");
        const redisDb = configService.get("REDIS_DB", 0);

        return {
          store: await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
            },
            password: redisPassword || undefined,
            database: redisDb,
            ttl: 60 * 1000, // 默认 TTL: 60 秒（毫秒）
          }),
          // 全局配置
          max: 1000, // 最大缓存项数
        };
      },
    }),
    ConfigModule,
  ],
  providers: [CacheService, RedisProvider],
  exports: [CacheService, NestCacheModule, Redis],
})
export class CacheModule {}
