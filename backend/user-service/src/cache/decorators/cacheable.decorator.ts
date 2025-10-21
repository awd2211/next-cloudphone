import { CacheOptions } from '../cache.service';

// 缓存元数据的 key
export const CACHEABLE_METADATA = 'cacheable';

// 缓存装饰器元数据
export interface CacheableMetadata {
  keyPrefix?: string;        // 缓存键前缀
  ttl?: number;              // 过期时间 (秒)
  options?: CacheOptions;    // 缓存选项
  keyGenerator?: (...args: any[]) => string; // 自定义键生成器
}

/**
 * Cacheable 装饰器
 *
 * 使用示例:
 * ```typescript
 * @Cacheable({ keyPrefix: 'user', ttl: 300 })
 * async getUser(userId: string) {
 *   return await this.userRepository.findOne({ where: { id: userId } });
 * }
 * ```
 *
 * 自定义键生成器:
 * ```typescript
 * @Cacheable({
 *   keyPrefix: 'user_quota',
 *   ttl: 300,
 *   keyGenerator: (userId: string, planId: string) => `${userId}:${planId}`
 * })
 * async getUserQuota(userId: string, planId: string) {
 *   // ...
 * }
 * ```
 */
export function Cacheable(metadata: CacheableMetadata = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取 CacheService 实例 (假设通过依赖注入)
      const cacheService = (this as any).cacheService;

      if (!cacheService) {
        // 如果没有 CacheService，直接执行原方法
        console.warn(
          `CacheService not found in ${target.constructor.name}. Cacheable decorator will be ignored.`,
        );
        return originalMethod.apply(this, args);
      }

      // 生成缓存键
      const cacheKey = generateCacheKey(
        metadata.keyPrefix || String(propertyKey),
        metadata.keyGenerator,
        args,
      );

      // 尝试从缓存获取
      const cachedValue = await cacheService.get(cacheKey, metadata.options);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 设置缓存
      await cacheService.set(cacheKey, result, {
        ...metadata.options,
        ttl: metadata.ttl,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * CacheEvict 装饰器 - 清除缓存
 *
 * 使用示例:
 * ```typescript
 * @CacheEvict({ keyPrefix: 'user' })
 * async updateUser(userId: string, data: UpdateUserDto) {
 *   return await this.userRepository.update(userId, data);
 * }
 * ```
 */
export function CacheEvict(metadata: {
  keyPrefix?: string;
  keyGenerator?: (...args: any[]) => string;
  allEntries?: boolean; // 是否清除所有以 keyPrefix 开头的缓存
}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 获取 CacheService 实例
      const cacheService = (this as any).cacheService;
      if (!cacheService) {
        return result;
      }

      if (metadata.allEntries) {
        // 删除所有匹配的缓存
        const pattern = `${metadata.keyPrefix || String(propertyKey)}:*`;
        await cacheService.delPattern(pattern);
      } else {
        // 删除特定缓存
        const cacheKey = generateCacheKey(
          metadata.keyPrefix || String(propertyKey),
          metadata.keyGenerator,
          args,
        );
        await cacheService.del(cacheKey);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * CachePut 装饰器 - 更新缓存
 *
 * 无论缓存是否存在，都会执行方法并更新缓存
 *
 * 使用示例:
 * ```typescript
 * @CachePut({ keyPrefix: 'user', ttl: 300 })
 * async refreshUser(userId: string) {
 *   return await this.userRepository.findOne({ where: { id: userId } });
 * }
 * ```
 */
export function CachePut(metadata: CacheableMetadata = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 获取 CacheService 实例
      const cacheService = (this as any).cacheService;
      if (!cacheService) {
        return result;
      }

      // 生成缓存键
      const cacheKey = generateCacheKey(
        metadata.keyPrefix || String(propertyKey),
        metadata.keyGenerator,
        args,
      );

      // 更新缓存
      await cacheService.set(cacheKey, result, {
        ...metadata.options,
        ttl: metadata.ttl,
      });

      return result;
    };

    return descriptor;
  };
}

// 辅助函数: 生成缓存键
function generateCacheKey(
  prefix: string,
  keyGenerator: ((...args: any[]) => string) | undefined,
  args: any[],
): string {
  if (keyGenerator) {
    const suffix = keyGenerator(...args);
    return `${prefix}:${suffix}`;
  }

  // 默认键生成: prefix:arg1:arg2:...
  const argsKey = args
    .map((arg) => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    })
    .join(':');

  return argsKey ? `${prefix}:${argsKey}` : prefix;
}
