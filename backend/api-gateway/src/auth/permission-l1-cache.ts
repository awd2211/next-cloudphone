import { LRUCache } from 'lru-cache';
import { Logger } from '@nestjs/common';

/**
 * API Gateway L1 权限缓存（内存级）
 *
 * 特点：
 * - 超快速访问（纯内存，<1ms）
 * - 自动过期（TTL 10秒）
 * - 自动淘汰（LRU策略，最多缓存10000个用户）
 * - 配合 user-service 的 L2 缓存（Redis）形成多层缓存
 *
 * 缓存层级：
 * L0: API Gateway 内存缓存（本文件）- 10秒 TTL
 * L1: User Service 内存缓存（未启用）
 * L2: User Service Redis 缓存 - 5分钟 TTL
 * L3: PostgreSQL 数据库
 */

export interface CachedUserInfo {
  id: string;
  userId: string;
  username: string;
  email: string;
  roles: any[];
  permissions: string[];
  tenantId: string;
  isSuperAdmin?: boolean;
  cachedAt: number; // Unix timestamp
}

export class PermissionL1Cache {
  private readonly logger = new Logger(PermissionL1Cache.name);
  private cache: LRUCache<string, CachedUserInfo>;

  // 统计信息
  private hits = 0;
  private misses = 0;
  private sets = 0;

  constructor(options?: { max?: number; ttl?: number }) {
    const maxSize = options?.max || 10000; // 最多缓存 10000 个用户
    const ttl = options?.ttl || 10 * 1000; // 默认 10 秒 TTL

    this.cache = new LRUCache<string, CachedUserInfo>({
      max: maxSize,
      ttl: ttl,
      updateAgeOnGet: true, // 访问时更新过期时间
      updateAgeOnHas: false,
    });

    this.logger.log(`L1 缓存已初始化: max=${maxSize}, ttl=${ttl}ms`);
  }

  /**
   * 获取用户信息
   */
  get(userId: string): CachedUserInfo | null {
    const cached = this.cache.get(userId);

    if (cached) {
      this.hits++;
      this.logger.debug(`L1 缓存命中: ${userId}`);
      return cached;
    }

    this.misses++;
    this.logger.debug(`L1 缓存未命中: ${userId}`);
    return null;
  }

  /**
   * 设置用户信息
   */
  set(userId: string, userInfo: Omit<CachedUserInfo, 'cachedAt'>): void {
    this.cache.set(userId, {
      ...userInfo,
      cachedAt: Date.now(),
    });

    this.sets++;
    this.logger.debug(`L1 缓存已更新: ${userId}`);
  }

  /**
   * 删除用户缓存
   */
  delete(userId: string): void {
    this.cache.delete(userId);
    this.logger.debug(`L1 缓存已删除: ${userId}`);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`L1 缓存已清空: ${size} 条记录`);
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0.00';

    return {
      size: this.cache.size,
      max: this.cache.max,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      hitRate: `${hitRate}%`,
      total,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.logger.log('L1 缓存统计已重置');
  }
}

// ✅ 全局单例
export const permissionL1Cache = new PermissionL1Cache();
