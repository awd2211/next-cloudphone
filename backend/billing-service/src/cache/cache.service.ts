import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Redis 缓存服务 (Billing Service)
 * 提供统一的缓存操作接口，支持 TTL、模式匹配删除等功能
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值，不存在返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error.message);
      return null; // 缓存错误时降级为查询数据库
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认 60 秒
   */
  async set<T>(key: string, value: T, ttl: number = 60): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl * 1000); // cache-manager 使用毫秒
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error.message);
    }
  }

  /**
   * 删除缓存键
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error.message);
    }
  }

  /**
   * 删除匹配模式的所有缓存键
   * @param pattern 匹配模式（如 "balance:*"）
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // cache-manager-redis-yet 支持通过 Redis store 访问底层客户端
      const store: any = this.cacheManager.store;
      if (store && store.client) {
        const keys = await store.client.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
          this.logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
        }
      }
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error.message);
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Cache RESET: All keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error.message);
    }
  }

  /**
   * 包装函数：缓存优先，未命中时执行回调并缓存结果
   * @param key 缓存键
   * @param fn 回调函数（缓存未命中时执行）
   * @param ttl 过期时间（秒）
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number = 60): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 缓存未命中，执行回调
    const result = await fn();

    // 3. 将结果写入缓存
    await this.set(key, result, ttl);

    return result;
  }

  /**
   * 批量获取
   * @param keys 缓存键数组
   * @returns 缓存值数组
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  /**
   * 批量设置
   * @param items 键值对数组
   * @param ttl 过期时间（秒）
   */
  async mset<T>(items: Array<{ key: string; value: T }>, ttl: number = 60): Promise<void> {
    await Promise.all(items.map((item) => this.set(item.key, item.value, ttl)));
  }
}
