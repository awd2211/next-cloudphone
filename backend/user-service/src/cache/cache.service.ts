import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { EventBusService } from '@cloudphone/shared';

// 缓存层级枚举
export enum CacheLayer {
  L1_ONLY = 'l1',        // 仅本地缓存
  L2_ONLY = 'l2',        // 仅 Redis 缓存
  L1_AND_L2 = 'both',    // 两级缓存
}

// 缓存配置接口
export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  local: {
    stdTTL: number;
    checkperiod: number;
    maxKeys: number;
    useClones: boolean;
  };
  strategy: {
    randomTTLRange: number;
    nullValueTTL: number;
    hotDataPrefixes: string[];
  };
}

// 缓存选项
export interface CacheOptions {
  ttl?: number;              // 过期时间 (秒)
  layer?: CacheLayer;        // 缓存层级
  randomTTL?: boolean;       // 是否随机 TTL
  nullValueCache?: boolean;  // 是否缓存空值
}

// 空值标记
const NULL_VALUE = '__NULL__';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly config: CacheConfig;

  // L1: 本地内存缓存
  private readonly localCache: NodeCache;

  // L2: Redis 缓存
  private readonly redis: Redis;

  // 统计信息
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    sets: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly eventBus: EventBusService,
  ) {
    // 从 ConfigService 读取配置
    this.config = {
      redis: {
        host: this.configService.get('cache.redis.host', 'localhost'),
        port: this.configService.get('cache.redis.port', 6379),
        password: this.configService.get('cache.redis.password'),
        db: this.configService.get('cache.redis.db', 1),
      },
      local: {
        stdTTL: this.configService.get('cache.local.stdTTL', 300),
        checkperiod: this.configService.get('cache.local.checkperiod', 120),
        maxKeys: this.configService.get('cache.local.maxKeys', 2000),
        useClones: this.configService.get('cache.local.useClones', false),
      },
      strategy: {
        randomTTLRange: this.configService.get('cache.strategy.randomTTLRange', 60),
        nullValueTTL: this.configService.get('cache.strategy.nullValueTTL', 120),
        hotDataPrefixes: this.configService.get('cache.strategy.hotDataPrefixes', [
          'user:', 'role:', 'permission:', 'plan:', 'config:', 'device:',
        ]),
      },
    };

    // 初始化本地缓存
    this.localCache = new NodeCache({
      stdTTL: this.config.local.stdTTL,
      checkperiod: this.config.local.checkperiod,
      maxKeys: this.config.local.maxKeys,
      useClones: this.config.local.useClones,
    });

    // 初始化 Redis
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);

      // 发布严重错误事件（Redis 连接失败）
      if (this.eventBus) {
        this.eventBus.publishSystemError(
          'high',
          'REDIS_CONNECTION_FAILED',
          `Redis connection error: ${err.message}`,
          'user-service',
          {
            userMessage: 'Redis 缓存服务连接失败',
            stackTrace: err.stack,
            metadata: {
              host: this.config.redis.host,
              port: this.config.redis.port,
              db: this.config.redis.db,
              errorMessage: err.message,
            },
          }
        ).catch(eventError => {
          this.logger.error('Failed to publish Redis error event', eventError);
        });
      }
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.localCache.on('expired', (key, value) => {
      this.logger.debug(`Local cache expired: ${key}`);
    });

    this.logger.log('CacheService initialized');
  }

  /**
   * 获取缓存值 (多层查询)
   */
  async get<T>(
    key: string,
    options: CacheOptions = {},
  ): Promise<T | null> {
    const layer = options.layer || CacheLayer.L1_AND_L2;

    try {
      // L1: 本地缓存
      if (layer === CacheLayer.L1_ONLY || layer === CacheLayer.L1_AND_L2) {
        const localValue = this.localCache.get<string>(key);
        if (localValue !== undefined) {
          this.stats.l1Hits++;
          this.logger.debug(`L1 cache hit: ${key}`);

          // 检查是否为空值标记
          if (localValue === NULL_VALUE) {
            return null;
          }

          return this.deserialize<T>(localValue);
        }
      }

      // L2: Redis 缓存
      if (layer === CacheLayer.L2_ONLY || layer === CacheLayer.L1_AND_L2) {
        const redisValue = await this.redis.get(key);
        if (redisValue !== null) {
          this.stats.l2Hits++;
          this.logger.debug(`L2 cache hit: ${key}`);

          // 回填 L1 缓存
          if (layer === CacheLayer.L1_AND_L2) {
            this.localCache.set(key, redisValue, options.ttl || this.config.local.stdTTL);
          }

          // 检查是否为空值标记
          if (redisValue === NULL_VALUE) {
            return null;
          }

          return this.deserialize<T>(redisValue);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存值 (多层写入)
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const layer = options.layer || CacheLayer.L1_AND_L2;
    let ttl = options.ttl || this.config.local.stdTTL;

    // 缓存雪崩防护: 随机 TTL
    if (options.randomTTL) {
      const randomOffset = Math.floor(Math.random() * this.config.strategy.randomTTLRange);
      ttl += randomOffset;
    }

    // 热点数据永不过期
    if (this.isHotData(key)) {
      ttl = 0; // 0 表示永不过期
    }

    try {
      // 处理空值缓存
      const serializedValue = value === null || value === undefined
        ? NULL_VALUE
        : this.serialize(value);

      this.stats.sets++;

      // L1: 本地缓存
      if (layer === CacheLayer.L1_ONLY || layer === CacheLayer.L1_AND_L2) {
        if (ttl && ttl > 0) {
          this.localCache.set(key, serializedValue, ttl);
        } else {
          this.localCache.set(key, serializedValue);
        }
      }

      // L2: Redis 缓存
      if (layer === CacheLayer.L2_ONLY || layer === CacheLayer.L1_AND_L2) {
        if (ttl > 0) {
          await this.redis.setex(key, ttl, serializedValue);
        } else {
          await this.redis.set(key, serializedValue);
        }
      }

      this.logger.debug(`Cache set: ${key} (layer: ${layer}, ttl: ${ttl}s)`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<boolean> {
    const keys = Array.isArray(key) ? key : [key];

    try {
      // 删除 L1
      keys.forEach((k) => this.localCache.del(k));

      // 删除 L2
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.debug(`Cache deleted: ${keys.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting cache keys: ${error.message}`);
      return false;
    }
  }

  /**
   * 延迟双删 (解决缓存一致性问题)
   */
  async delayedDoubleDel(key: string, delayMs: number = 500): Promise<void> {
    // 第一次删除
    await this.del(key);

    // 延迟后第二次删除
    setTimeout(async () => {
      await this.del(key);
      this.logger.debug(`Delayed double deletion: ${key}`);
    }, delayMs);
  }

  /**
   * 批量删除 (支持模式匹配)
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      // 删除 L1 (遍历所有键)
      const localKeys = this.localCache.keys();
      const matchedLocalKeys = localKeys.filter((key) =>
        this.matchPattern(key, pattern),
      );
      matchedLocalKeys.forEach((key) => this.localCache.del(key));

      // 删除 L2 (使用 SCAN 命令)
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      this.logger.log(
        `Pattern deletion: ${pattern} (L1: ${matchedLocalKeys.length}, L2: ${deletedCount})`,
      );
      return matchedLocalKeys.length + deletedCount;
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    // 检查 L1
    if (this.localCache.has(key)) {
      return true;
    }

    // 检查 L2
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 获取或设置 (缓存穿透防护)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T | null> {
    // 先尝试获取缓存
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    try {
      // 执行工厂函数获取数据
      const value = await factory();

      // 缓存空值防护
      if (value === null || value === undefined) {
        if (options.nullValueCache !== false) {
          await this.set(
            key,
            null,
            {
              ...options,
              ttl: this.config.strategy.nullValueTTL,
            },
          );
        }
        return null;
      }

      // 设置缓存
      await this.set(key, value, options);
      return value;
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<void> {
    this.localCache.flushAll();
    await this.redis.flushdb();
    this.logger.warn('All caches flushed');
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const l1HitRate = total > 0 ? (this.stats.l1Hits / total) * 100 : 0;
    const l2HitRate = total > 0 ? (this.stats.l2Hits / total) * 100 : 0;
    const totalHitRate = total > 0
      ? ((this.stats.l1Hits + this.stats.l2Hits) / total) * 100
      : 0;

    return {
      l1: {
        hits: this.stats.l1Hits,
        hitRate: `${l1HitRate.toFixed(2)}%`,
        keys: this.localCache.keys().length,
        stats: this.localCache.getStats(),
      },
      l2: {
        hits: this.stats.l2Hits,
        hitRate: `${l2HitRate.toFixed(2)}%`,
      },
      total: {
        hits: this.stats.l1Hits + this.stats.l2Hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        hitRate: `${totalHitRate.toFixed(2)}%`,
      },
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  // 私有辅助方法

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string): T {
    return JSON.parse(value) as T;
  }

  private isHotData(key: string): boolean {
    return this.config.strategy.hotDataPrefixes.some((prefix) =>
      key.startsWith(prefix),
    );
  }

  private matchPattern(key: string, pattern: string): boolean {
    // 简单的通配符匹配
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    return regex.test(key);
  }

  async onModuleDestroy() {
    this.logger.log('Cleaning up cache connections...');
    await this.redis.quit();
    this.localCache.close();
  }
}
