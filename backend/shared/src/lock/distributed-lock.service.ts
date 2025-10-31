import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed Lock Service
 *
 * 基于 Redis 的分布式锁服务，实现 Redlock 算法简化版
 *
 * 使用场景:
 * - 防止并发更新同一资源（如用户登录计数）
 * - 防止重复执行操作（如订单支付）
 * - 协调分布式任务（如定时任务单实例执行）
 *
 * 使用示例:
 * ```typescript
 * // 方式 1: 手动获取和释放锁
 * const lockId = await lockService.acquireLock('user:123:login', 5000);
 * try {
 *   // 执行业务逻辑
 * } finally {
 *   await lockService.releaseLock('user:123:login', lockId);
 * }
 *
 * // 方式 2: 使用 withLock 自动管理（推荐）
 * const result = await lockService.withLock(
 *   'user:123:login',
 *   5000,
 *   async () => {
 *     // 执行业务逻辑
 *     return result;
 *   }
 * );
 * ```
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redis: Redis) {}

  /**
   * 获取分布式锁
   *
   * @param key 锁的键名（如 'user:123:login'）
   * @param ttl 锁的过期时间（毫秒），防止死锁
   * @param retries 获取失败后的重试次数（默认 3 次）
   * @param retryDelay 重试间隔（毫秒，默认 100ms）
   * @returns 锁的唯一标识符（UUID），用于释放锁时验证所有权
   * @throws Error 如果无法获取锁
   */
  async acquireLock(
    key: string,
    ttl: number,
    retries: number = 3,
    retryDelay: number = 100
  ): Promise<string> {
    const lockKey = this.getLockKey(key);
    const lockId = uuidv4();
    const expiryTime = Date.now() + ttl;

    let attempts = 0;
    while (attempts <= retries) {
      try {
        // 使用 SET NX PX 原子操作设置锁
        // NX: 只在键不存在时设置
        // PX: 设置过期时间（毫秒）
        const result = await this.redis.set(lockKey, lockId, 'PX', ttl, 'NX');

        if (result === 'OK') {
          this.logger.debug(`Lock acquired: ${lockKey}, lockId: ${lockId}, ttl: ${ttl}ms`);
          return lockId;
        }

        // 如果获取失败，检查锁是否已过期
        const existingLockId = await this.redis.get(lockKey);
        if (!existingLockId) {
          // 锁已过期，重试
          attempts++;
          if (attempts <= retries) {
            await this.sleep(retryDelay);
            continue;
          }
        }

        // 锁仍被持有
        attempts++;
        if (attempts <= retries) {
          this.logger.debug(
            `Lock acquisition failed, retrying (${attempts}/${retries + 1}): ${lockKey}`
          );
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${lockKey}: ${error.message}`, error.stack);
        attempts++;
        if (attempts <= retries) {
          await this.sleep(retryDelay);
        }
      }
    }

    throw new Error(`Failed to acquire lock '${key}' after ${retries + 1} attempts`);
  }

  /**
   * 释放分布式锁
   *
   * 使用 Lua 脚本保证原子性：只有锁的持有者才能释放锁
   *
   * @param key 锁的键名
   * @param lockId 获取锁时返回的唯一标识符
   * @returns 是否成功释放锁（true: 成功, false: 锁不存在或不属于当前持有者）
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);

    // Lua 脚本确保原子性：检查 lockId 匹配后才删除
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(luaScript, 1, lockKey, lockId);

      if (result === 1) {
        this.logger.debug(`Lock released: ${lockKey}, lockId: ${lockId}`);
        return true;
      } else {
        this.logger.warn(
          `Lock release failed: ${lockKey}, lockId: ${lockId} (lock may have expired or been released)`
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 使用分布式锁执行函数（推荐方式）
   *
   * 自动获取锁、执行函数、释放锁，即使函数抛出异常也会释放锁
   *
   * @param key 锁的键名
   * @param ttl 锁的过期时间（毫秒）
   * @param fn 要执行的函数
   * @param retries 获取锁失败时的重试次数
   * @param retryDelay 重试间隔（毫秒）
   * @returns 函数的返回值
   * @throws 函数抛出的异常或锁获取失败异常
   */
  async withLock<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
    retries: number = 3,
    retryDelay: number = 100
  ): Promise<T> {
    let lockId: string | null = null;

    try {
      // 获取锁
      lockId = await this.acquireLock(key, ttl, retries, retryDelay);

      // 执行业务逻辑
      const result = await fn();

      return result;
    } finally {
      // 总是尝试释放锁
      if (lockId) {
        await this.releaseLock(key, lockId);
      }
    }
  }

  /**
   * 尝试获取锁（非阻塞）
   *
   * 如果锁已被占用，立即返回 null 而不是等待重试
   *
   * @param key 锁的键名
   * @param ttl 锁的过期时间（毫秒）
   * @returns 锁的唯一标识符，如果锁被占用则返回 null
   */
  async tryAcquireLock(key: string, ttl: number): Promise<string | null> {
    const lockKey = this.getLockKey(key);
    const lockId = uuidv4();

    try {
      const result = await this.redis.set(lockKey, lockId, 'PX', ttl, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Lock acquired (try): ${lockKey}, lockId: ${lockId}`);
        return lockId;
      }

      this.logger.debug(`Lock busy (try): ${lockKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Error trying to acquire lock ${lockKey}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 检查锁是否存在
   *
   * @param key 锁的键名
   * @returns 锁是否存在
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const exists = await this.redis.exists(lockKey);
    return exists === 1;
  }

  /**
   * 获取锁的剩余过期时间
   *
   * @param key 锁的键名
   * @returns 剩余过期时间（毫秒），如果锁不存在返回 -1
   */
  async getLockTTL(key: string): Promise<number> {
    const lockKey = this.getLockKey(key);
    const ttl = await this.redis.pttl(lockKey);
    return ttl;
  }

  /**
   * 延长锁的过期时间
   *
   * 只有锁的持有者才能延长过期时间
   *
   * @param key 锁的键名
   * @param lockId 锁的唯一标识符
   * @param ttl 新的过期时间（毫秒）
   * @returns 是否成功延长
   */
  async extendLock(key: string, lockId: string, ttl: number): Promise<boolean> {
    const lockKey = this.getLockKey(key);

    // Lua 脚本确保原子性
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(luaScript, 1, lockKey, lockId, ttl.toString());

      if (result === 1) {
        this.logger.debug(`Lock extended: ${lockKey}, lockId: ${lockId}, new ttl: ${ttl}ms`);
        return true;
      }

      this.logger.warn(`Lock extension failed: ${lockKey}, lockId: ${lockId}`);
      return false;
    } catch (error) {
      this.logger.error(`Error extending lock ${lockKey}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 强制释放锁（危险操作，仅用于管理目的）
   *
   * 无视锁的持有者，直接删除锁
   *
   * @param key 锁的键名
   * @returns 是否成功删除
   */
  async forceReleaseLock(key: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);

    try {
      const result = await this.redis.del(lockKey);
      if (result === 1) {
        this.logger.warn(`Lock force-released: ${lockKey}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error force-releasing lock ${lockKey}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 生成锁的 Redis 键名
   */
  private getLockKey(key: string): string {
    return `lock:${key}`;
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Lock Configuration
 */
export interface LockConfig {
  /**
   * 锁的键名
   */
  key: string;

  /**
   * 锁的过期时间（毫秒）
   */
  ttl: number;

  /**
   * 获取锁失败时的重试次数（默认 3）
   */
  retries?: number;

  /**
   * 重试间隔（毫秒，默认 100ms）
   */
  retryDelay?: number;
}

/**
 * Lock Decorator Factory
 *
 * 为方法添加分布式锁保护
 *
 * 使用示例:
 * ```typescript
 * @Lock({ key: 'user:${args[0]}:login', ttl: 5000 })
 * async login(userId: string) {
 *   // 此方法在执行时会自动获取和释放锁
 * }
 * ```
 */
export function Lock(config: LockConfig | ((args: any[]) => LockConfig)) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockService: DistributedLockService = this.lockService || this.distributedLockService;

      if (!lockService) {
        throw new Error(
          `@Lock decorator requires DistributedLockService to be injected into ${target.constructor.name}`
        );
      }

      // 解析配置
      const lockConfig = typeof config === 'function' ? config(args) : config;

      // 解析键名中的占位符 ${args[0]}, ${args[1]} 等
      const key = lockConfig.key.replace(/\$\{args\[(\d+)\]\}/g, (_, index) => {
        return args[parseInt(index)] || '';
      });

      // 使用 withLock 执行方法
      return await lockService.withLock(
        key,
        lockConfig.ttl,
        async () => {
          return await originalMethod.apply(this, args);
        },
        lockConfig.retries,
        lockConfig.retryDelay
      );
    };

    return descriptor;
  };
}
