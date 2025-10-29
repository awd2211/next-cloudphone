/**
 * 缓存装饰器
 *
 * 提供通用的缓存功能，支持:
 * - 自动缓存方法返回值
 * - 自定义缓存键模板
 * - 缓存条件判断
 * - 自动缓存失效
 *
 * @example
 * ```typescript
 * @Cacheable({ keyTemplate: 'device:{0}', ttl: 300 })
 * async findOne(id: string): Promise<Device> {
 *   return this.deviceRepository.findOne({ where: { id } });
 * }
 *
 * @CacheEvict({ keys: ['device:{0}', 'devices:user:{userId}:list'] })
 * async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
 *   return this.deviceRepository.save({ id, ...dto });
 * }
 * ```
 */

import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

export interface CacheableOptions {
  /**
   * 缓存键模板
   * 支持占位符: {0}, {1}, {2} 对应方法参数索引
   *
   * @example
   * 'device:{0}' → 'device:abc-123'
   * 'devices:user:{0}:status:{1}' → 'devices:user:user-123:status:running'
   */
  keyTemplate: string;

  /**
   * 缓存过期时间 (秒)
   */
  ttl: number;

  /**
   * 条件缓存: 返回 true 才缓存
   *
   * @example
   * condition: (userId) => !!userId
   */
  condition?: (...args: any[]) => boolean;

  /**
   * 自定义缓存键生成函数 (可选，覆盖 keyTemplate)
   *
   * @example
   * keyGenerator: (id, status) => `device:${id}:${status}`
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * 是否记录日志
   * @default true
   */
  enableLogging?: boolean;
}

/**
 * 缓存装饰器
 *
 * 自动缓存方法返回值到 Redis
 *
 * **使用要求**:
 * - 类中必须有 `cacheService` 或 `redis` 属性
 * - 返回值必须可 JSON 序列化
 *
 * @param options 缓存配置
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, options)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const enableLogging = options.enableLogging !== false;

    descriptor.value = async function (...args: any[]) {
      // 获取缓存服务 (支持多种命名)
      const cacheService = this.cacheService || this.redis || this.cacheManager;

      if (!cacheService) {
        if (enableLogging) {
          console.warn(
            `[Cacheable] Cache service not found in ${target.constructor.name}.${String(propertyKey)}, ` +
            `executing original method without caching`
          );
        }
        return originalMethod.apply(this, args);
      }

      // 生成缓存键
      let cacheKey: string;
      try {
        if (options.keyGenerator) {
          cacheKey = options.keyGenerator(...args);
        } else {
          cacheKey = options.keyTemplate.replace(/\{(\d+)\}/g, (_, index) => {
            const argValue = args[parseInt(index)];
            return argValue !== undefined && argValue !== null ? String(argValue) : '';
          });
        }
      } catch (error) {
        console.error(`[Cacheable] Failed to generate cache key:`, error);
        return originalMethod.apply(this, args);
      }

      // 检查条件
      if (options.condition && !options.condition(...args)) {
        if (enableLogging) {
          console.log(`[Cacheable] Condition not met for key: ${cacheKey}, executing without cache`);
        }
        return originalMethod.apply(this, args);
      }

      try {
        // 1. 尝试从缓存获取
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          if (enableLogging) {
            console.log(`[Cacheable] ✅ Cache HIT: ${cacheKey}`);
          }

          // 处理不同的缓存库返回格式
          if (typeof cached === 'string') {
            try {
              return JSON.parse(cached);
            } catch {
              return cached;
            }
          }
          return cached;
        }

        if (enableLogging) {
          console.log(`[Cacheable] ❌ Cache MISS: ${cacheKey}`);
        }

        // 2. 执行原方法
        const startTime = Date.now();
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;

        // 3. 写入缓存
        if (result !== null && result !== undefined) {
          try {
            // 根据不同的缓存库使用不同的 API
            if (typeof cacheService.set === 'function') {
              // cache-manager 或 ioredis
              if (cacheService.set.length === 2) {
                // cache-manager API: set(key, value, ttl)
                await cacheService.set(cacheKey, result, options.ttl * 1000); // ms
              } else {
                // ioredis API: set(key, value, 'EX', seconds)
                const serialized = typeof result === 'string' ? result : JSON.stringify(result);
                await cacheService.set(cacheKey, serialized, 'EX', options.ttl);
              }

              if (enableLogging) {
                console.log(
                  `[Cacheable] 💾 Cache SET: ${cacheKey} (TTL: ${options.ttl}s, Query: ${executionTime}ms)`
                );
              }
            } else {
              console.warn(`[Cacheable] Cache service does not have a 'set' method`);
            }
          } catch (cacheError) {
            console.error(`[Cacheable] Failed to write cache for key ${cacheKey}:`, cacheError);
            // 缓存失败不影响业务逻辑，继续返回结果
          }
        }

        return result;
      } catch (error) {
        console.error(
          `[Cacheable] Error in ${target.constructor.name}.${String(propertyKey)}:`,
          error
        );
        // 缓存异常时降级到原方法
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

export interface CacheEvictOptions {
  /**
   * 要删除的缓存键列表 (支持占位符)
   *
   * 占位符规则:
   * - {0}, {1}, {2}: 对应方法参数索引
   * - {field}: 从方法返回值中取 field 属性
   *
   * @example
   * keys: [
   *   'device:{0}',                    // 参数 0
   *   'devices:user:{userId}:list',    // 从返回值取 userId
   *   'stats:user:{0}:dashboard',      // 参数 0
   * ]
   */
  keys: string[];

  /**
   * 是否同时删除模式匹配的键 (Redis SCAN + DEL)
   * @default false
   *
   * @example
   * pattern: 'devices:user:{0}:*' // 删除所有匹配的键
   */
  pattern?: string;

  /**
   * 是否记录日志
   * @default true
   */
  enableLogging?: boolean;
}

/**
 * 缓存失效装饰器
 *
 * 在方法执行后自动删除相关缓存
 *
 * **使用要求**:
 * - 类中必须有 `cacheService` 或 `redis` 属性
 *
 * @param options 缓存失效配置
 */
export function CacheEvict(options: CacheEvictOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const enableLogging = options.enableLogging !== false;

    descriptor.value = async function (...args: any[]) {
      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 获取缓存服务
      const cacheService = this.cacheService || this.redis || this.cacheManager;

      if (!cacheService) {
        if (enableLogging) {
          console.warn(
            `[CacheEvict] Cache service not found in ${target.constructor.name}.${String(propertyKey)}, ` +
            `skipping cache eviction`
          );
        }
        return result;
      }

      // 删除缓存
      const keysToDelete: string[] = [];

      for (const keyTemplate of options.keys) {
        try {
          const cacheKey = keyTemplate
            // 替换参数占位符 {0}, {1}, {2}
            .replace(/\{(\d+)\}/g, (_, index) => {
              const argValue = args[parseInt(index)];
              return argValue !== undefined && argValue !== null ? String(argValue) : '';
            })
            // 替换结果字段占位符 {field}
            .replace(/\{(\w+)\}/g, (_, field) => {
              // 优先从结果对象中取值
              if (result && typeof result === 'object' && field in result) {
                return String(result[field]);
              }
              // 降级：从第一个参数中取值 (如果是对象)
              if (args[0] && typeof args[0] === 'object' && field in args[0]) {
                return String(args[0][field]);
              }
              return '';
            });

          keysToDelete.push(cacheKey);
        } catch (error) {
          console.error(`[CacheEvict] Failed to generate cache key from template "${keyTemplate}":`, error);
        }
      }

      // 批量删除缓存
      for (const key of keysToDelete) {
        try {
          await cacheService.del(key);
          if (enableLogging) {
            console.log(`[CacheEvict] 🗑️  Deleted cache: ${key}`);
          }
        } catch (error) {
          console.error(`[CacheEvict] Failed to delete cache ${key}:`, error);
        }
      }

      // 如果指定了模式匹配，删除所有匹配的键
      if (options.pattern && typeof cacheService.keys === 'function') {
        try {
          const pattern = options.pattern.replace(/\{(\d+)\}/g, (_, index) => {
            const argValue = args[parseInt(index)];
            return argValue !== undefined && argValue !== null ? String(argValue) : '';
          });

          const matchingKeys = await cacheService.keys(pattern);
          if (matchingKeys && matchingKeys.length > 0) {
            await Promise.all(matchingKeys.map(key => cacheService.del(key)));
            if (enableLogging) {
              console.log(`[CacheEvict] 🗑️  Deleted ${matchingKeys.length} keys matching pattern: ${pattern}`);
            }
          }
        } catch (error) {
          console.error(`[CacheEvict] Failed to delete keys by pattern "${options.pattern}":`, error);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存预热装饰器 (可选)
 *
 * 在应用启动时预加载热点数据到缓存
 *
 * @example
 * ```typescript
 * @CacheWarmup({ keyTemplate: 'popular_devices', ttl: 600 })
 * async getPopularDevices(): Promise<Device[]> {
 *   return this.deviceRepository.find({ order: { views: 'DESC' }, take: 10 });
 * }
 * ```
 */
export function CacheWarmup(options: CacheableOptions): MethodDecorator {
  return Cacheable(options);
}

/**
 * 批量缓存失效辅助函数
 *
 * 用于在没有装饰器的场景下手动删除缓存
 *
 * @example
 * ```typescript
 * await evictCaches(this.cacheService, [
 *   'device:123',
 *   'devices:user:user-456:list',
 * ]);
 * ```
 */
export async function evictCaches(
  cacheService: any,
  keys: string[],
  enableLogging = true
): Promise<void> {
  if (!cacheService) {
    console.warn('[evictCaches] Cache service not provided');
    return;
  }

  for (const key of keys) {
    try {
      await cacheService.del(key);
      if (enableLogging) {
        console.log(`[evictCaches] 🗑️  Deleted cache: ${key}`);
      }
    } catch (error) {
      console.error(`[evictCaches] Failed to delete cache ${key}:`, error);
    }
  }
}

/**
 * 批量缓存设置辅助函数
 *
 * @example
 * ```typescript
 * await setCaches(this.cacheService, [
 *   { key: 'device:123', value: device, ttl: 300 },
 *   { key: 'device:456', value: anotherDevice, ttl: 300 },
 * ]);
 * ```
 */
export async function setCaches(
  cacheService: any,
  items: Array<{ key: string; value: any; ttl: number }>,
  enableLogging = true
): Promise<void> {
  if (!cacheService) {
    console.warn('[setCaches] Cache service not provided');
    return;
  }

  for (const { key, value, ttl } of items) {
    try {
      if (typeof cacheService.set === 'function') {
        if (cacheService.set.length === 2) {
          await cacheService.set(key, value, ttl * 1000);
        } else {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          await cacheService.set(key, serialized, 'EX', ttl);
        }

        if (enableLogging) {
          console.log(`[setCaches] 💾 Set cache: ${key} (TTL: ${ttl}s)`);
        }
      }
    } catch (error) {
      console.error(`[setCaches] Failed to set cache ${key}:`, error);
    }
  }
}
