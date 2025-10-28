import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '@cloudphone/shared';

/**
 * 配额限制接口（与 user-service 保持一致）
 */
export interface QuotaLimits {
  maxDevices: number;
  maxConcurrentDevices: number;
  maxCpuCoresPerDevice: number;
  maxMemoryMBPerDevice: number;
  maxStorageGBPerDevice: number;
  totalCpuCores: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  maxBandwidthMbps: number;
  monthlyTrafficGB: number;
  maxUsageHoursPerDay: number;
  maxUsageHoursPerMonth: number;
}

/**
 * 配额使用量接口
 */
export interface QuotaUsage {
  currentDevices: number;
  currentConcurrentDevices: number;
  usedCpuCores: number;
  usedMemoryGB: number;
  usedStorageGB: number;
  currentBandwidthMbps: number;
  monthlyTrafficUsedGB: number;
  todayUsageHours: number;
  monthlyUsageHours: number;
  lastUpdatedAt: Date;
}

/**
 * 配额状态枚举
 */
export enum QuotaStatus {
  ACTIVE = 'active',
  EXCEEDED = 'exceeded',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

/**
 * 配额响应接口
 */
export interface QuotaResponse {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: QuotaStatus;
  limits: QuotaLimits;
  usage: QuotaUsage;
  validFrom: Date;
  validUntil: Date;
  autoRenew: boolean;
}

/**
 * 配额检查结果
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDevices?: number;
  remainingCpu?: number;
  remainingMemory?: number;
  remainingStorage?: number;
}

/**
 * 用量上报数据
 */
export interface UsageReport {
  deviceId: string;
  cpuCores: number;
  memoryGB: number;
  storageGB: number;
  operation: 'increment' | 'decrement'; // 增加或减少
}

/**
 * QuotaClient 服务
 *
 * 负责与 User Service 通信，检查和更新用户配额
 */
@Injectable()
export class QuotaClientService {
  private readonly logger = new Logger(QuotaClientService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ||
      'http://localhost:30001';
  }

  /**
   * 获取用户配额信息
   */
  async getUserQuota(userId: string): Promise<QuotaResponse> {
    try {
      this.logger.debug(`Fetching quota for user ${userId}`);

      const data = await this.httpClient.get<QuotaResponse>(
        `${this.userServiceUrl}/api/quotas/user/${userId}`,
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch quota for user ${userId}`,
        error.stack,
      );

      if (error.response?.status === 404) {
        throw new HttpException(
          `User quota not found for user ${userId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // 熔断器打开时的降级处理
      if (error.message?.includes('Circuit breaker is open')) {
        throw new HttpException(
          'User service temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Failed to fetch user quota',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 检查用户是否可以创建设备
   *
   * @param userId 用户 ID
   * @param deviceSpecs 设备规格
   * @returns 检查结果
   */
  async checkDeviceCreationQuota(
    userId: string,
    deviceSpecs: {
      cpuCores: number;
      memoryMB: number;
      storageMB: number;
    },
  ): Promise<QuotaCheckResult> {
    try {
      const quota = await this.getUserQuota(userId);

      // 1. 检查配额状态
      if (quota.status !== QuotaStatus.ACTIVE) {
        return {
          allowed: false,
          reason: `Quota status is ${quota.status}`,
        };
      }

      // 2. 检查配额是否过期
      if (quota.validUntil && new Date() > new Date(quota.validUntil)) {
        return {
          allowed: false,
          reason: 'Quota has expired',
        };
      }

      // 3. 检查设备数量配额
      const remainingDevices =
        quota.limits.maxDevices - quota.usage.currentDevices;

      if (remainingDevices < 1) {
        return {
          allowed: false,
          reason: `Device quota exceeded. Max: ${quota.limits.maxDevices}, Current: ${quota.usage.currentDevices}`,
          remainingDevices: 0,
        };
      }

      // 4. 检查单设备规格限制
      if (deviceSpecs.cpuCores > quota.limits.maxCpuCoresPerDevice) {
        return {
          allowed: false,
          reason: `CPU cores per device exceeds limit (${deviceSpecs.cpuCores} > ${quota.limits.maxCpuCoresPerDevice})`,
        };
      }

      const memoryGB = deviceSpecs.memoryMB / 1024;
      if (memoryGB > quota.limits.maxMemoryMBPerDevice / 1024) {
        return {
          allowed: false,
          reason: `Memory per device exceeds limit (${memoryGB}GB > ${quota.limits.maxMemoryMBPerDevice / 1024}GB)`,
        };
      }

      const storageGB = deviceSpecs.storageMB / 1024;
      if (storageGB > quota.limits.maxStorageGBPerDevice) {
        return {
          allowed: false,
          reason: `Storage per device exceeds limit (${storageGB}GB > ${quota.limits.maxStorageGBPerDevice}GB)`,
        };
      }

      // 5. 检查总资源配额
      const remainingCpu =
        quota.limits.totalCpuCores - quota.usage.usedCpuCores;
      const remainingMemory =
        quota.limits.totalMemoryGB - quota.usage.usedMemoryGB;
      const remainingStorage =
        quota.limits.totalStorageGB - quota.usage.usedStorageGB;

      if (deviceSpecs.cpuCores > remainingCpu) {
        return {
          allowed: false,
          reason: `Total CPU quota exceeded. Remaining: ${remainingCpu} cores, Requested: ${deviceSpecs.cpuCores} cores`,
          remainingCpu,
        };
      }

      if (memoryGB > remainingMemory) {
        return {
          allowed: false,
          reason: `Total memory quota exceeded. Remaining: ${remainingMemory}GB, Requested: ${memoryGB}GB`,
          remainingMemory,
        };
      }

      if (storageGB > remainingStorage) {
        return {
          allowed: false,
          reason: `Total storage quota exceeded. Remaining: ${remainingStorage}GB, Requested: ${storageGB}GB`,
          remainingStorage,
        };
      }

      // 所有检查通过
      return {
        allowed: true,
        remainingDevices,
        remainingCpu,
        remainingMemory,
        remainingStorage,
      };
    } catch (error) {
      this.logger.error(
        `Quota check failed for user ${userId}`,
        error.stack,
      );

      // 如果配额服务不可用，根据配置决定是否允许创建
      const allowOnError = this.configService.get<boolean>(
        'QUOTA_ALLOW_ON_ERROR',
        false,
      );

      if (allowOnError) {
        this.logger.warn(
          'Quota service unavailable, allowing operation due to QUOTA_ALLOW_ON_ERROR=true',
        );
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'Quota service unavailable',
      };
    }
  }

  /**
   * 上报设备用量（创建设备时增加用量）
   */
  async reportDeviceUsage(
    userId: string,
    usageReport: UsageReport,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Reporting usage for user ${userId}: ${JSON.stringify(usageReport)}`,
      );

      await this.httpClient.post(
        `${this.userServiceUrl}/api/quotas/user/${userId}/usage`,
        usageReport,
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(`Usage reported successfully for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to report usage for user ${userId}`,
        error.stack,
      );

      // 用量上报失败不应阻止设备创建，但应该记录告警
      // 可以考虑使用消息队列进行重试
      this.logger.warn(
        'Usage reporting failed, device created but quota may be inconsistent',
      );
    }
  }

  /**
   * 检查并发配额
   */
  async checkConcurrentQuota(userId: string): Promise<QuotaCheckResult> {
    try {
      const quota = await this.getUserQuota(userId);

      const remainingConcurrent =
        quota.limits.maxConcurrentDevices -
        quota.usage.currentConcurrentDevices;

      if (remainingConcurrent < 1) {
        return {
          allowed: false,
          reason: `Concurrent device quota exceeded. Max: ${quota.limits.maxConcurrentDevices}, Current: ${quota.usage.currentConcurrentDevices}`,
        };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(
        `Concurrent quota check failed for user ${userId}`,
        error.stack,
      );
      return { allowed: true }; // 检查失败时默认允许
    }
  }

  /**
   * 增加并发设备计数（设备启动时调用）
   */
  async incrementConcurrentDevices(userId: string): Promise<void> {
    try {
      this.logger.debug(`Incrementing concurrent devices for user ${userId}`);

      await this.httpClient.post(
        `${this.userServiceUrl}/api/quotas/deduct`,
        {
          userId,
          deviceCount: 0, // 不增加总设备数，只增加并发数
          concurrent: true,
        },
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(`Concurrent device count incremented for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to increment concurrent devices for user ${userId}`,
        error.stack,
      );
    }
  }

  /**
   * 减少并发设备计数（设备停止时调用）
   */
  async decrementConcurrentDevices(userId: string): Promise<void> {
    try {
      this.logger.debug(`Decrementing concurrent devices for user ${userId}`);

      await this.httpClient.post(
        `${this.userServiceUrl}/api/quotas/restore`,
        {
          userId,
          deviceCount: 0, // 不减少总设备数，只减少并发数
          concurrent: true,
        },
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(`Concurrent device count decremented for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to decrement concurrent devices for user ${userId}`,
        error.stack,
      );
    }
  }

  /**
   * 获取配额使用统计
   */
  async getQuotaUsageStats(userId: string): Promise<{
    devices: number;
    cpu: number;
    memory: number;
    storage: number;
    traffic: number;
    hours: number;
  }> {
    const quota = await this.getUserQuota(userId);

    return {
      devices:
        quota.limits.maxDevices > 0
          ? (quota.usage.currentDevices / quota.limits.maxDevices) * 100
          : 0,
      cpu:
        quota.limits.totalCpuCores > 0
          ? (quota.usage.usedCpuCores / quota.limits.totalCpuCores) * 100
          : 0,
      memory:
        quota.limits.totalMemoryGB > 0
          ? (quota.usage.usedMemoryGB / quota.limits.totalMemoryGB) * 100
          : 0,
      storage:
        quota.limits.totalStorageGB > 0
          ? (quota.usage.usedStorageGB / quota.limits.totalStorageGB) * 100
          : 0,
      traffic:
        quota.limits.monthlyTrafficGB > 0
          ? (quota.usage.monthlyTrafficUsedGB /
              quota.limits.monthlyTrafficGB) *
            100
          : 0,
      hours:
        quota.limits.maxUsageHoursPerMonth > 0
          ? (quota.usage.monthlyUsageHours /
              quota.limits.maxUsageHoursPerMonth) *
            100
          : 0,
    };
  }
}
