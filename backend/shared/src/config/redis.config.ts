import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Redis 配置选项
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void;
}

/**
 * 创建 Redis 配置
 *
 * @param keyPrefix 键名前缀，如：'cloudphone:device:'
 * @returns Redis 异步配置对象
 *
 * @example
 * ```typescript
 * // 在服务中使用
 * import { createRedisConfig } from '@cloudphone/shared';
 *
 * const redisConfig = createRedisConfig('cloudphone:device:');
 * // 然后传给 Redis 客户端库（如 ioredis）
 * ```
 */
export function createRedisConfig(keyPrefix?: string) {
  return {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService): RedisConfig => ({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: +configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: +configService.get<number>('REDIS_DB', 0),
      keyPrefix: keyPrefix || configService.get<string>('REDIS_KEY_PREFIX', 'cloudphone:'),
      retryStrategy: (times: number) => {
        // 最多重试 10 次
        if (times > 10) {
          return undefined;
        }
        // 延迟时间递增: 50ms, 100ms, 200ms...
        return Math.min(times * 50, 2000);
      },
    }),
    inject: [ConfigService],
  };
}

/**
 * 创建自定义 Redis 配置
 *
 * @param options 自定义配置选项
 * @returns Redis 异步配置对象
 *
 * @example
 * ```typescript
 * const redisConfig = createCustomRedisConfig({
 *   keyPrefix: 'session:',
 *   db: 1,
 *   maxRetries: 5
 * });
 * ```
 */
export function createCustomRedisConfig(options?: {
  keyPrefix?: string;
  db?: number;
  maxRetries?: number;
}) {
  return {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService): RedisConfig => ({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: +configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: options?.db ?? +configService.get<number>('REDIS_DB', 0),
      keyPrefix: options?.keyPrefix || configService.get<string>('REDIS_KEY_PREFIX', 'cloudphone:'),
      retryStrategy: (times: number) => {
        const maxRetries = options?.maxRetries ?? 10;
        if (times > maxRetries) {
          return undefined;
        }
        return Math.min(times * 50, 2000);
      },
    }),
    inject: [ConfigService],
  };
}

/**
 * 获取 Redis URL 格式的连接字符串
 *
 * @param configService ConfigService 实例
 * @returns Redis URL，格式：redis://[:password@]host[:port][/db-number]
 *
 * @example
 * ```typescript
 * const redisUrl = getRedisUrl(configService);
 * // 输出: redis://:mypassword@localhost:6379/0
 * ```
 */
export function getRedisUrl(configService: ConfigService): string {
  const host = configService.get<string>('REDIS_HOST', 'localhost');
  const port = configService.get<number>('REDIS_PORT', 6379);
  const password = configService.get<string>('REDIS_PASSWORD');
  const db = configService.get<number>('REDIS_DB', 0);

  let url = 'redis://';
  if (password) {
    url += `:${password}@`;
  }
  url += `${host}:${port}`;
  if (db) {
    url += `/${db}`;
  }

  return url;
}
