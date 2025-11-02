import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * App Service 缓存服务
 *
 * 提供 Redis 缓存功能，包括:
 * - 基础 get/set/del 操作
 * - 缓存包装器 (cache wrapper) 模式
 * - 模式匹配删除 (pattern-based deletion)
 * - 连接池管理
 *
 * 性能优化目标:
 * - 应用详情查询: 100ms → 3ms (97% 提升)
 * - 应用列表查询: 150ms → 5ms (96% 提升)
 * - 版本历史查询: 80ms → 2ms (97% 提升)
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redisClient: Redis;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisDb = this.configService.get<number>('REDIS_DB', 3); // App Service 使用 DB 3

    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Redis connected: ${redisHost}:${redisPort} (DB ${redisDb})`);
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error.message);
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * 缓存包装器模式
   *
   * 工作流程:
   * 1. 尝试从缓存获取数据
   * 2. 如果缓存命中，直接返回
   * 3. 如果缓存未命中，执行回调函数获取数据
   * 4. 将数据写入缓存并返回
   *
   * @param key - 缓存键
   * @param fn - 获取数据的回调函数
   * @param ttl - 缓存过期时间 (秒)
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number = 60): Promise<T> {
    try {
      // 1. 尝试从缓存获取
      const cached = await this.get<T>(key);
      if (cached !== null) {
        this.logger.debug(`Cache hit: ${key}`);
        return cached;
      }

      // 2. 缓存未命中，执行回调
      this.logger.debug(`Cache miss: ${key}`);
      const result = await fn();

      // 3. 将结果写入缓存
      await this.set(key, result, ttl);

      return result;
    } catch (error) {
      this.logger.error(`Cache wrap error for key ${key}:`, error.message);
      // 缓存失败时，直接执行回调 (降级策略)
      return await fn();
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl: number = 60): Promise<void> {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error.message);
    }
  }

  /**
   * 删除单个缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error.message);
    }
  }

  /**
   * 模式匹配删除
   *
   * 使用 SCAN 命令遍历匹配的键并删除
   * 比 KEYS 命令更安全，不会阻塞 Redis
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      const stream = this.redisClient.scanStream({
        match: pattern,
        count: 100,
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern ${pattern}:`, error.message);
    }
  }

  /**
   * 清空所有缓存 (仅开发环境使用)
   */
  async flush(): Promise<void> {
    try {
      await this.redisClient.flushdb();
      this.logger.warn('All cache flushed');
    } catch (error) {
      this.logger.error('Failed to flush cache:', error.message);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    try {
      const info = await this.redisClient.info('stats');
      const dbsize = await this.redisClient.dbsize();

      // 解析 Redis INFO 输出
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const memory = info.match(/used_memory_human:(.+)/)?.[1] || 'N/A';

      return {
        keys: dbsize,
        memory,
        hits,
        misses,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error.message);
      return { keys: 0, memory: 'N/A', hits: 0, misses: 0 };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.redisClient.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Cache health check failed:', error.message);
      return false;
    }
  }

  /**
   * 模块销毁时关闭连接
   */
  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Failed to close Redis connection:', error.message);
    }
  }
}
