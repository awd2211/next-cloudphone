import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 缓存层级枚举
 */
export enum CacheLayer {
  /** 仅本地缓存 (内存 Map) */
  L1_ONLY = 'l1',
  /** 仅 Redis 缓存 */
  L2_ONLY = 'l2',
  /** 两级缓存 (L1 + L2) */
  L1_AND_L2 = 'both',
}

/**
 * 缓存配置
 */
export interface UnifiedCacheConfig {
  /** 缓存键前缀 */
  keyPrefix?: string;
  /** 默认 TTL (秒) */
  defaultTTL?: number;
  /** 是否启用 L1 本地缓存 */
  enableL1Cache?: boolean;
  /** L1 缓存最大条目数 */
  l1MaxSize?: number;
  /** L1 缓存 TTL (秒) */
  l1TTL?: number;
  /** 随机 TTL 范围 (秒) - 用于防止缓存雪崩 */
  randomTTLRange?: number;
  /** 空值缓存 TTL (秒) - 用于防止缓存穿透 */
  nullValueTTL?: number;
  /** 热点数据前缀列表 - 这些数据永不过期 */
  hotDataPrefixes?: string[];
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 过期时间 (秒) */
  ttl?: number;
  /** 缓存层级 */
  layer?: CacheLayer;
  /** 是否随机 TTL (防雪崩) */
  randomTTL?: boolean;
  /** 是否缓存空值 (防穿透) */
  cacheNullValue?: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  l1: {
    hits: number;
    hitRate: string;
    size: number;
  };
  l2: {
    hits: number;
    hitRate: string;
  };
  total: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: string;
  };
}

/** 空值标记 */
const NULL_VALUE_MARKER = '__CACHE_NULL__';

/**
 * 统一缓存服务
 *
 * 提供跨服务一致的缓存接口，支持:
 * - 单层/两层缓存架构 (L1 内存 + L2 Redis)
 * - 缓存雪崩防护 (随机 TTL)
 * - 缓存穿透防护 (空值缓存)
 * - 热点数据处理 (永不过期)
 * - 统计信息追踪
 * - 批量操作支持
 *
 * @example
 * ```typescript
 * // 基础使用
 * await cache.set('user:123', userData);
 * const user = await cache.get<User>('user:123');
 *
 * // 带选项
 * await cache.set('session:abc', session, { ttl: 3600, randomTTL: true });
 *
 * // Cache-aside 模式
 * const user = await cache.getOrSet('user:123', () => userService.findById(123), { ttl: 300 });
 *
 * // 两层缓存
 * const data = await cache.get<Data>('hot:key', { layer: CacheLayer.L1_AND_L2 });
 * ```
 */
@Injectable()
export class UnifiedCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(UnifiedCacheService.name);
  private readonly config: Required<UnifiedCacheConfig>;

  /** L1: 本地内存缓存 (带 TTL 支持) */
  private readonly l1Cache = new Map<string, { value: string; expireAt: number | null }>();

  /** L2: Redis 客户端 */
  private redis: Redis | null = null;

  /** 统计计数器 */
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /** L1 缓存清理定时器 */
  private l1CleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() customConfig?: UnifiedCacheConfig,
  ) {
    // 合并默认配置
    this.config = {
      keyPrefix: customConfig?.keyPrefix ?? '',
      defaultTTL: customConfig?.defaultTTL ?? 300,
      enableL1Cache: customConfig?.enableL1Cache ?? true,
      l1MaxSize: customConfig?.l1MaxSize ?? 1000,
      l1TTL: customConfig?.l1TTL ?? 60,
      randomTTLRange: customConfig?.randomTTLRange ?? 30,
      nullValueTTL: customConfig?.nullValueTTL ?? 60,
      hotDataPrefixes: customConfig?.hotDataPrefixes ?? [],
    };

    // 初始化 Redis 连接
    this.initRedis();

    // 启动 L1 缓存清理定时器 (每分钟清理过期条目)
    if (this.config.enableL1Cache) {
      this.l1CleanupTimer = setInterval(() => this.cleanupL1Cache(), 60000);
    }

    this.logger.log(`UnifiedCacheService initialized (L1: ${this.config.enableL1Cache ? 'enabled' : 'disabled'})`);
  }

  /**
   * 初始化 Redis 连接
   */
  private initRedis(): void {
    try {
      const host = this.configService?.get('REDIS_HOST', 'localhost') ?? 'localhost';
      const port = this.configService?.get('REDIS_PORT', 6379) ?? 6379;
      const password = this.configService?.get('REDIS_PASSWORD');
      const db = this.configService?.get('REDIS_CACHE_DB', 1) ?? 1;

      this.redis = new Redis({
        host,
        port,
        password,
        db,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        this.logger.error(`Redis connection error: ${err.message}`);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected');
      });

      // 延迟连接
      this.redis.connect().catch((err) => {
        this.logger.error(`Failed to connect to Redis: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const layer = options.layer ?? (this.config.enableL1Cache ? CacheLayer.L1_AND_L2 : CacheLayer.L2_ONLY);

    try {
      // L1 查询
      if (layer !== CacheLayer.L2_ONLY) {
        const l1Result = this.getFromL1<T>(fullKey);
        if (l1Result !== undefined) {
          this.stats.l1Hits++;
          this.logger.debug(`L1 HIT: ${key}`);
          return l1Result;
        }
      }

      // L2 查询
      if (layer !== CacheLayer.L1_ONLY && this.redis) {
        const l2Value = await this.redis.get(fullKey);
        if (l2Value !== null) {
          this.stats.l2Hits++;
          this.logger.debug(`L2 HIT: ${key}`);

          // 回填 L1
          if (layer === CacheLayer.L1_AND_L2) {
            this.setToL1(fullKey, l2Value, this.config.l1TTL);
          }

          return this.deserialize<T>(l2Value);
        }
      }

      this.stats.misses++;
      this.logger.debug(`MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error [${key}]: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const layer = options.layer ?? (this.config.enableL1Cache ? CacheLayer.L1_AND_L2 : CacheLayer.L2_ONLY);

    // 计算 TTL
    let ttl = options.ttl ?? this.config.defaultTTL;

    // 随机 TTL (防雪崩)
    if (options.randomTTL !== false && this.config.randomTTLRange > 0) {
      ttl += Math.floor(Math.random() * this.config.randomTTLRange);
    }

    // 热点数据永不过期
    if (this.isHotData(key)) {
      ttl = 0;
    }

    // 空值处理
    const isNullValue = value === null || value === undefined;
    if (isNullValue && options.cacheNullValue === false) {
      return false;
    }

    const serializedValue = isNullValue ? NULL_VALUE_MARKER : this.serialize(value);
    const effectiveTTL = isNullValue ? this.config.nullValueTTL : ttl;

    try {
      this.stats.sets++;

      // L1 写入
      if (layer !== CacheLayer.L2_ONLY) {
        const l1TTL = Math.min(effectiveTTL || this.config.l1TTL, this.config.l1TTL);
        this.setToL1(fullKey, serializedValue, l1TTL);
      }

      // L2 写入
      if (layer !== CacheLayer.L1_ONLY && this.redis) {
        if (effectiveTTL > 0) {
          await this.redis.setex(fullKey, effectiveTTL, serializedValue);
        } else {
          await this.redis.set(fullKey, serializedValue);
        }
      }

      this.logger.debug(`SET: ${key} (TTL: ${effectiveTTL}s)`);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error [${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    const fullKeys = keys.map((k) => this.buildKey(k));

    try {
      let deletedCount = 0;

      // L1 删除
      for (const fk of fullKeys) {
        if (this.l1Cache.delete(fk)) {
          deletedCount++;
        }
      }

      // L2 删除
      if (this.redis && fullKeys.length > 0) {
        const l2Deleted = await this.redis.del(...fullKeys);
        deletedCount = Math.max(deletedCount, l2Deleted);
      }

      this.stats.deletes += deletedCount;
      this.logger.debug(`DEL: ${keys.join(', ')} (${deletedCount} keys)`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache del error: ${error.message}`);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    // L1 检查
    const l1Entry = this.l1Cache.get(fullKey);
    if (l1Entry && (l1Entry.expireAt === null || l1Entry.expireAt > Date.now())) {
      return true;
    }

    // L2 检查
    if (this.redis) {
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    }

    return false;
  }

  /**
   * 获取或设置 (Cache-Aside 模式)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T | null> {
    // 先尝试获取
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    try {
      // 执行工厂函数
      const value = await factory();

      // 设置缓存 (包括空值)
      await this.set(key, value, { ...options, cacheNullValue: options.cacheNullValue ?? true });

      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error [${key}]: ${error.message}`);
      throw error;
    }
  }

  /**
   * 模式删除 (使用 SCAN 安全迭代)
   */
  async delPattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    let deletedCount = 0;

    try {
      // L1 模式删除
      const regex = this.patternToRegex(fullPattern);
      for (const key of this.l1Cache.keys()) {
        if (regex.test(key)) {
          this.l1Cache.delete(key);
          deletedCount++;
        }
      }

      // L2 模式删除 (使用 SCAN)
      if (this.redis) {
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
          cursor = newCursor;

          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
          }
        } while (cursor !== '0');
      }

      this.stats.deletes += deletedCount;
      this.logger.log(`DEL pattern: ${pattern} (${deletedCount} keys)`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache delPattern error [${pattern}]: ${error.message}`);
      return 0;
    }
  }

  /**
   * 延迟双删 (解决数据库-缓存一致性问题)
   */
  async delayedDoubleDel(key: string, delayMs: number = 500): Promise<void> {
    // 第一次删除
    await this.del(key);

    // 延迟后第二次删除
    setTimeout(async () => {
      await this.del(key);
      this.logger.debug(`Delayed double del: ${key}`);
    }, delayMs);
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (keys.length === 0) return result;

    const fullKeys = keys.map((k) => this.buildKey(k));
    const missingKeys: string[] = [];
    const missingFullKeys: string[] = [];

    // L1 批量查询
    for (let i = 0; i < keys.length; i++) {
      const l1Value = this.getFromL1<T>(fullKeys[i]);
      if (l1Value !== undefined) {
        result.set(keys[i], l1Value);
        this.stats.l1Hits++;
      } else {
        missingKeys.push(keys[i]);
        missingFullKeys.push(fullKeys[i]);
      }
    }

    // L2 批量查询 (仅查询 L1 未命中的)
    if (this.redis && missingFullKeys.length > 0) {
      const l2Values = await this.redis.mget(...missingFullKeys);
      for (let i = 0; i < missingKeys.length; i++) {
        const value = l2Values[i];
        if (value !== null) {
          result.set(missingKeys[i], this.deserialize<T>(value));
          this.stats.l2Hits++;
          // 回填 L1
          this.setToL1(missingFullKeys[i], value, this.config.l1TTL);
        } else {
          result.set(missingKeys[i], null);
          this.stats.misses++;
        }
      }
    } else {
      // Redis 不可用，标记所有缺失的键为 miss
      for (const key of missingKeys) {
        result.set(key, null);
        this.stats.misses++;
      }
    }

    return result;
  }

  /**
   * 批量设置
   */
  async mset<T>(items: Array<{ key: string; value: T }>, options: CacheOptions = {}): Promise<boolean> {
    if (items.length === 0) return true;

    const ttl = options.ttl ?? this.config.defaultTTL;

    try {
      // L1 批量设置
      for (const item of items) {
        const fullKey = this.buildKey(item.key);
        const serialized = this.serialize(item.value);
        this.setToL1(fullKey, serialized, this.config.l1TTL);
      }

      // L2 批量设置 (使用 pipeline)
      if (this.redis) {
        const pipeline = this.redis.pipeline();
        for (const item of items) {
          const fullKey = this.buildKey(item.key);
          const serialized = this.serialize(item.value);
          if (ttl > 0) {
            pipeline.setex(fullKey, ttl, serialized);
          } else {
            pipeline.set(fullKey, serialized);
          }
        }
        await pipeline.exec();
      }

      this.stats.sets += items.length;
      return true;
    } catch (error) {
      this.logger.error(`Cache mset error: ${error.message}`);
      return false;
    }
  }

  /**
   * 清空所有缓存 (谨慎使用)
   */
  async flush(): Promise<void> {
    this.l1Cache.clear();
    if (this.redis) {
      await this.redis.flushdb();
    }
    this.resetStats();
    this.logger.warn('Cache FLUSHED');
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const l1HitRate = total > 0 ? (this.stats.l1Hits / total) * 100 : 0;
    const l2HitRate = total > 0 ? (this.stats.l2Hits / total) * 100 : 0;
    const totalHitRate = total > 0 ? ((this.stats.l1Hits + this.stats.l2Hits) / total) * 100 : 0;

    return {
      l1: {
        hits: this.stats.l1Hits,
        hitRate: `${l1HitRate.toFixed(2)}%`,
        size: this.l1Cache.size,
      },
      l2: {
        hits: this.stats.l2Hits,
        hitRate: `${l2HitRate.toFixed(2)}%`,
      },
      total: {
        hits: this.stats.l1Hits + this.stats.l2Hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
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
      deletes: 0,
    };
  }

  /**
   * 获取 Redis 客户端 (用于高级操作)
   */
  getRedisClient(): Redis | null {
    return this.redis;
  }

  // ==================== 私有辅助方法 ====================

  private buildKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}${key}` : key;
  }

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string): T | null {
    if (value === NULL_VALUE_MARKER) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  private isHotData(key: string): boolean {
    return this.config.hotDataPrefixes.some((prefix) => key.startsWith(prefix));
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  private getFromL1<T>(key: string): T | null | undefined {
    const entry = this.l1Cache.get(key);
    if (!entry) return undefined;

    // 检查过期
    if (entry.expireAt !== null && entry.expireAt <= Date.now()) {
      this.l1Cache.delete(key);
      return undefined;
    }

    return this.deserialize<T>(entry.value);
  }

  private setToL1(key: string, value: string, ttlSeconds: number): void {
    // 检查大小限制
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      // LRU: 删除最老的条目 (Map 按插入顺序迭代)
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) {
        this.l1Cache.delete(firstKey);
      }
    }

    this.l1Cache.set(key, {
      value,
      expireAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  private cleanupL1Cache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expireAt !== null && entry.expireAt <= now) {
        this.l1Cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`L1 cleanup: ${cleaned} expired entries removed`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up cache connections...');

    if (this.l1CleanupTimer) {
      clearInterval(this.l1CleanupTimer);
    }

    if (this.redis) {
      await this.redis.quit();
    }

    this.l1Cache.clear();
  }
}
