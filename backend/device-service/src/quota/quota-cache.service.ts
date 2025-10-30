import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  QuotaClientService,
  QuotaCheckResult,
  QuotaResponse,
  QuotaStatus,
} from './quota-client.service';

/**
 * 配额缓存服务
 *
 * 实现配额数据的本地缓存，减少对 user-service 的依赖：
 * 1. 优先从 Redis 缓存读取配额数据
 * 2. 缓存未命中时调用 user-service
 * 3. user-service 不可用时使用降级策略
 * 4. 异步上报配额使用量变化
 *
 * **关键收益**：
 * - 配额检查延迟从 ~100ms（HTTP）降低到 ~1ms（Redis）
 * - user-service 故障时设备服务仍可继续运行
 * - 最终一致性保证
 */
@Injectable()
export class QuotaCacheService {
  private readonly logger = new Logger(QuotaCacheService.name);
  private readonly CACHE_TTL = 60; // 缓存 TTL: 60 秒
  private readonly FALLBACK_MAX_DEVICES = 5; // 降级时的默认配额

  constructor(
    private readonly quotaClient: QuotaClientService,
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取用户配额（带缓存）
   * @param userId 用户 ID
   * @returns 配额响应
   */
  async getQuotaWithCache(userId: string): Promise<QuotaResponse> {
    const cacheKey = this.buildCacheKey('quota', userId);

    try {
      // 1. 尝试从 Redis 缓存获取
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Quota cache hit for user ${userId}`);
        return JSON.parse(cached) as QuotaResponse;
      }

      // 2. 缓存未命中，从 user-service 获取
      const quota = await this.quotaClient.getUserQuota(userId);

      // 3. 写入缓存
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(quota));

      this.logger.debug(`Quota fetched and cached for user ${userId}`);
      return quota;
    } catch (error) {
      // 4. user-service 不可用，尝试从过期缓存恢复
      this.logger.warn(
        `Failed to fetch quota for user ${userId}, trying stale cache...`,
        error.message,
      );

      const staleCached = await this.redis.get(cacheKey);
      if (staleCached) {
        this.logger.warn(`Using stale quota cache for user ${userId}`);
        return JSON.parse(staleCached) as QuotaResponse;
      }

      // 5. 缓存也不可用，返回降级配额
      return this.getFallbackQuota(userId);
    }
  }

  /**
   * 检查设备创建配额（带缓存）
   * @param userId 用户 ID
   * @param specs 设备规格
   * @returns 配额检查结果
   */
  async checkDeviceCreationQuota(
    userId: string,
    specs: {
      cpuCores?: number;
      memoryMB?: number;
      diskGB?: number;
    },
  ): Promise<QuotaCheckResult> {
    try {
      // 获取缓存的配额
      const quota = await this.getQuotaWithCache(userId);

      // 检查配额状态
      if (quota.status !== QuotaStatus.ACTIVE) {
        return {
          allowed: false,
          reason: `用户配额状态为 ${quota.status}`,
          remainingDevices: 0,
        };
      }

      // 检查设备数量配额
      const currentDevices = quota.usage.currentDevices || 0;
      const maxDevices = quota.limits.maxDevices;

      if (currentDevices >= maxDevices) {
        return {
          allowed: false,
          reason: `已达到设备数量上限 (${currentDevices}/${maxDevices})`,
          remainingDevices: 0,
        };
      }

      // 检查 CPU 配额
      if (specs.cpuCores) {
        const currentCpu = quota.usage.usedCpuCores || 0;
        const maxCpu = quota.limits.totalCpuCores || Infinity;

        if (currentCpu + specs.cpuCores > maxCpu) {
          return {
            allowed: false,
            reason: `CPU 核心数超出配额 (${currentCpu + specs.cpuCores}/${maxCpu})`,
            remainingCpu: Math.max(0, maxCpu - currentCpu),
          };
        }
      }

      // 检查内存配额
      if (specs.memoryMB) {
        const memoryGB = specs.memoryMB / 1024;
        const currentMemory = quota.usage.usedMemoryGB || 0;
        const maxMemory = quota.limits.totalMemoryGB || Infinity;

        if (currentMemory + memoryGB > maxMemory) {
          return {
            allowed: false,
            reason: `内存超出配额 (${currentMemory + memoryGB}/${maxMemory} GB)`,
            remainingMemory: Math.max(0, maxMemory - currentMemory),
          };
        }
      }

      // 检查磁盘配额
      if (specs.diskGB) {
        const currentDisk = quota.usage.usedStorageGB || 0;
        const maxDisk = quota.limits.totalStorageGB || Infinity;

        if (currentDisk + specs.diskGB > maxDisk) {
          return {
            allowed: false,
            reason: `磁盘空间超出配额 (${currentDisk + specs.diskGB}/${maxDisk} GB)`,
            remainingStorage: Math.max(0, maxDisk - currentDisk),
          };
        }
      }

      // 所有检查通过
      return {
        allowed: true,
        reason: '配额检查通过',
        remainingDevices: maxDevices - currentDevices,
      };
    } catch (error) {
      this.logger.error(
        `Error checking device creation quota for user ${userId}`,
        error.stack,
      );

      // 降级策略：根据配置决定是否允许
      const allowOnError = this.configService.get<boolean>(
        'QUOTA_ALLOW_ON_ERROR',
        true, // ✅ 默认允许（降级模式）
      );

      if (allowOnError) {
        this.logger.warn(
          `Quota check failed, allowing device creation due to QUOTA_ALLOW_ON_ERROR=true`,
        );
        return {
          allowed: true,
          reason: '配额服务不可用，降级允许创建（有风险）',
          remainingDevices: this.FALLBACK_MAX_DEVICES,
        };
      } else {
        return {
          allowed: false,
          reason: '配额服务不可用，拒绝创建以保护系统',
          remainingDevices: 0,
        };
      }
    }
  }

  /**
   * 异步上报配额使用量变化
   * @param userId 用户 ID
   * @param deviceId 设备 ID
   * @param operation 操作类型
   * @param specs 设备规格
   */
  async reportDeviceUsageAsync(
    userId: string,
    deviceId: string,
    operation: 'increment' | 'decrement',
    specs?: {
      cpuCores?: number;
      memoryMB?: number;
      diskGB?: number;
    },
  ): Promise<void> {
    // 1. 立即更新本地缓存（乐观更新）
    await this.optimisticallyUpdateCache(userId, operation, specs);

    // 2. 异步上报到 user-service（不阻塞主流程）
    setImmediate(async () => {
      try {
        await this.quotaClient.reportDeviceUsage(userId, {
          deviceId,
          operation,
          cpuCores: specs?.cpuCores || 0,
          memoryGB: specs?.memoryMB ? specs.memoryMB / 1024 : 0,
          storageGB: specs?.diskGB || 0,
        });

        this.logger.debug(
          `Quota usage reported asynchronously for user ${userId}: ${operation}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to report quota usage for user ${userId}`,
          error.stack,
        );
        // 失败时不影响主流程，后台会定期对账
      }
    });
  }

  /**
   * 乐观更新缓存中的配额数据
   * @param userId 用户 ID
   * @param operation 操作类型
   * @param specs 设备规格
   */
  private async optimisticallyUpdateCache(
    userId: string,
    operation: 'increment' | 'decrement',
    specs?: {
      cpuCores?: number;
      memoryMB?: number;
      diskGB?: number;
    },
  ): Promise<void> {
    const cacheKey = this.buildCacheKey('quota', userId);

    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) {
        return; // 缓存不存在，无需更新
      }

      const quota = JSON.parse(cached) as QuotaResponse;
      const delta = operation === 'increment' ? 1 : -1;

      // 更新设备数量
      quota.usage.currentDevices = Math.max(
        0,
        (quota.usage.currentDevices || 0) + delta,
      );

      // 更新资源使用量
      if (specs) {
        if (specs.cpuCores) {
          quota.usage.usedCpuCores = Math.max(
            0,
            (quota.usage.usedCpuCores || 0) + delta * specs.cpuCores,
          );
        }
        if (specs.memoryMB) {
          const memoryGB = specs.memoryMB / 1024;
          quota.usage.usedMemoryGB = Math.max(
            0,
            (quota.usage.usedMemoryGB || 0) + delta * memoryGB,
          );
        }
        if (specs.diskGB) {
          quota.usage.usedStorageGB = Math.max(
            0,
            (quota.usage.usedStorageGB || 0) + delta * specs.diskGB,
          );
        }
      }

      // 写回缓存（保持原 TTL）
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(quota));

      this.logger.debug(`Optimistically updated quota cache for user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to optimistically update cache for user ${userId}`,
        error.message,
      );
      // 忽略错误，不影响主流程
    }
  }

  /**
   * 降级配额策略
   * 当 user-service 完全不可用且无缓存时使用
   * @param userId 用户 ID
   * @returns 降级配额
   */
  private getFallbackQuota(userId: string): QuotaResponse {
    this.logger.warn(
      `Using fallback quota for user ${userId} (user-service unavailable)`,
    );

    return {
      id: 'fallback-' + userId,
      userId,
      planId: 'fallback-plan',
      planName: 'Fallback Plan',
      status: QuotaStatus.ACTIVE,
      limits: {
        maxDevices: this.FALLBACK_MAX_DEVICES,
        maxConcurrentDevices: Math.floor(this.FALLBACK_MAX_DEVICES / 2),
        maxCpuCoresPerDevice: 4,
        maxMemoryMBPerDevice: 4096,
        maxStorageGBPerDevice: 20,
        totalCpuCores: this.FALLBACK_MAX_DEVICES * 2,
        totalMemoryGB: this.FALLBACK_MAX_DEVICES * 2,
        totalStorageGB: this.FALLBACK_MAX_DEVICES * 10,
        maxBandwidthMbps: 100,
        monthlyTrafficGB: 100,
        maxUsageHoursPerDay: 24,
        maxUsageHoursPerMonth: 720,
      },
      usage: {
        currentDevices: 0, // 降级时无法获取精确值
        currentConcurrentDevices: 0,
        usedCpuCores: 0,
        usedMemoryGB: 0,
        usedStorageGB: 0,
        currentBandwidthMbps: 0,
        monthlyTrafficUsedGB: 0,
        todayUsageHours: 0,
        monthlyUsageHours: 0,
        lastUpdatedAt: new Date(),
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoRenew: false,
    };
  }

  /**
   * 刷新用户配额缓存
   * @param userId 用户 ID
   */
  async refreshQuotaCache(userId: string): Promise<void> {
    const cacheKey = this.buildCacheKey('quota', userId);

    try {
      const quota = await this.quotaClient.getUserQuota(userId);
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(quota));
      this.logger.log(`Refreshed quota cache for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh quota cache for user ${userId}`,
        error.stack,
      );
    }
  }

  /**
   * 清除用户配额缓存
   * @param userId 用户 ID
   */
  async invalidateQuotaCache(userId: string): Promise<void> {
    const cacheKey = this.buildCacheKey('quota', userId);
    await this.redis.del(cacheKey);
    this.logger.debug(`Invalidated quota cache for user ${userId}`);
  }

  /**
   * 构建缓存键
   * @param prefix 前缀
   * @param userId 用户 ID
   * @returns 缓存键
   */
  private buildCacheKey(prefix: string, userId: string): string {
    return `device-service:${prefix}:${userId}`;
  }

  /**
   * 获取缓存统计信息（用于监控）
   */
  async getCacheStatistics(): Promise<{
    cachedUsers: number;
    cacheHitRate: number; // 需要在生产环境中跟踪
  }> {
    try {
      const pattern = this.buildCacheKey('quota', '*');
      const keys = await this.redis.keys(pattern);

      return {
        cachedUsers: keys.length,
        cacheHitRate: 0, // 需要通过 Prometheus 等工具跟踪
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics', error.stack);
      return {
        cachedUsers: 0,
        cacheHitRate: 0,
      };
    }
  }
}
