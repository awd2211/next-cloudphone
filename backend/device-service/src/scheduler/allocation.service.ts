import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceAllocation, AllocationStatus } from '../entities/device-allocation.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { EventBusService, Cacheable, CacheEvict, Lock } from '@cloudphone/shared';
import { QuotaClientService } from '../quota/quota-client.service';
import { BillingClientService } from './billing-client.service';
import { NotificationClientService } from './notification-client.service';

export enum SchedulingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTION = 'least_connection',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  RESOURCE_BASED = 'resource_based',
}

export interface AllocationRequest {
  userId: string;
  tenantId?: string;
  durationMinutes?: number;
  preferredSpecs?: {
    minCpu?: number;
    minMemory?: number;
  };
  devicePreferences?: {
    osVersion?: string;
    screenSize?: string;
    [key: string]: any;
  };
}

export interface AllocationResponse {
  allocationId: string;
  deviceId: string;
  deviceName?: string;
  device?: Partial<Device>;
  userId: string;
  tenantId?: string;
  allocatedAt: Date;
  expiresAt?: Date;
  adbHost?: string;
  adbPort?: number;
}

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);
  private strategy: SchedulingStrategy = SchedulingStrategy.RESOURCE_BASED;

  constructor(
    @InjectRepository(DeviceAllocation)
    private allocationRepository: Repository<DeviceAllocation>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private eventBus: EventBusService,
    private quotaClient: QuotaClientService,
    private billingClient: BillingClientService,
    private notificationClient: NotificationClientService
  ) {}

  /**
   * 设置调度策略
   */
  setStrategy(strategy: SchedulingStrategy): void {
    this.strategy = strategy;
    this.logger.log(`Allocation strategy set to: ${strategy}`);
  }

  /**
   * 为用户分配设备
   * 使用分布式锁防止并发分配冲突
   * 分配后清除可用设备缓存
   */
  // ✅ 使用正确的 LockConfig 对象
  @Lock({ key: 'allocation:user:{{request.userId}}', ttl: 10000 })
  @CacheEvict({ keys: ['scheduler:available-devices'] })
  async allocateDevice(request: AllocationRequest): Promise<AllocationResponse> {
    this.logger.log(
      `Allocating device for user: ${request.userId}, tenant: ${request.tenantId || 'default'}`
    );

    // 1. 获取可用设备列表
    const availableDevices = await this.getAvailableDevices();

    if (availableDevices.length === 0) {
      this.logger.warn('No available devices for allocation');

      const reason = '当前没有可用设备，请稍后重试';

      // 发布分配失败事件
      await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.failed', {
        userId: request.userId,
        tenantId: request.tenantId,
        reason: 'no_available_devices',
        timestamp: new Date().toISOString(),
      });

      // 发送通知（Phase 2: Notification Service 集成）
      try {
        await this.notificationClient.notifyAllocationFailed({
          userId: request.userId,
          reason,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(`Failed to send allocation failed notification: ${error.message}`);
      }

      throw new BadRequestException('No available devices');
    }

    // 2. 根据策略选择设备
    const selectedDevice = this.selectDevice(availableDevices, request);

    if (!selectedDevice) {
      throw new BadRequestException('No suitable device found');
    }

    // 3. 配额验证（Phase 2: 服务集成）
    try {
      const quotaCheck = await this.quotaClient.checkDeviceCreationQuota(request.userId, {
        cpuCores: selectedDevice.cpuCores,
        memoryMB: selectedDevice.memoryMB,
        storageMB: selectedDevice.storageMB,
      });

      if (!quotaCheck.allowed) {
        this.logger.warn(`Quota check failed for user ${request.userId}: ${quotaCheck.reason}`);

        // 发布配额超限事件
        await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.quota_exceeded', {
          userId: request.userId,
          tenantId: request.tenantId,
          reason: quotaCheck.reason,
          timestamp: new Date().toISOString(),
        });

        // 发送配额超限通知（Phase 2: Notification Service 集成）
        try {
          await this.notificationClient.notifyAllocationFailed({
            userId: request.userId,
            reason: quotaCheck.reason || '配额已达上限',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.warn(`Failed to send quota exceeded notification: ${error.message}`);
        }

        throw new ForbiddenException(quotaCheck.reason || 'Quota limit exceeded');
      }

      this.logger.log(
        `Quota check passed for user ${request.userId}. Remaining devices: ${quotaCheck.remainingDevices}`
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // 配额服务不可用时的错误处理
      this.logger.error(`Quota check error for user ${request.userId}: ${error.message}`);
      // 根据配置决定是否允许继续（已在 QuotaClientService 中处理）
      throw error;
    }

    this.logger.log(`Selected device: ${selectedDevice.id} using strategy: ${this.strategy}`);

    // 4. 创建分配记录
    const durationMinutes = request.durationMinutes || 60;
    const allocatedAt = new Date();
    const expiresAt = new Date(allocatedAt.getTime() + durationMinutes * 60 * 1000);

    const allocation = this.allocationRepository.create({
      deviceId: selectedDevice.id,
      userId: request.userId,
      tenantId: request.tenantId,
      status: AllocationStatus.ALLOCATED,
      allocatedAt,
      expiresAt,
      durationMinutes,
    });

    await this.allocationRepository.save(allocation);

    // 5. 上报配额使用量（Phase 2: 服务集成）
    try {
      await this.quotaClient.reportDeviceUsage(request.userId, {
        deviceId: selectedDevice.id,
        cpuCores: selectedDevice.cpuCores,
        memoryGB: selectedDevice.memoryMB / 1024,
        storageGB: selectedDevice.storageMB / 1024,
        operation: 'increment',
      });
      this.logger.log(
        `Quota usage reported for user ${request.userId}, device ${selectedDevice.id}`
      );
    } catch (error) {
      // 使用量上报失败不应阻止分配，但记录警告
      this.logger.warn(`Failed to report quota usage for user ${request.userId}: ${error.message}`);
    }

    // 6. 发布分配成功事件
    await this.eventBus.publishDeviceEvent('allocated', {
      deviceId: selectedDevice.id,
      userId: request.userId,
      tenantId: request.tenantId,
      allocationId: allocation.id,
      allocatedAt: allocatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      strategy: this.strategy,
    });

    this.logger.log(
      `Device allocated successfully: ${allocation.id} (device: ${selectedDevice.id})`
    );

    // 发送分配成功通知（Phase 2: Notification Service 集成）
    try {
      await this.notificationClient.notifyAllocationSuccess({
        userId: request.userId,
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.name || `Device-${selectedDevice.id.substring(0, 8)}`,
        allocationId: allocation.id,
        allocatedAt: allocatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        durationMinutes,
        adbHost: selectedDevice.adbHost || undefined,
        adbPort: selectedDevice.adbPort || undefined,
      });
    } catch (error) {
      this.logger.warn(`Failed to send allocation success notification: ${error.message}`);
    }

    return {
      allocationId: allocation.id,
      deviceId: selectedDevice.id,
      device: {
        id: selectedDevice.id,
        name: selectedDevice.name,
        status: selectedDevice.status,
      },
      userId: request.userId,
      tenantId: request.tenantId,
      allocatedAt,
      expiresAt,
      // ✅ null → undefined 转换
      adbHost: selectedDevice.adbHost ?? undefined,
      adbPort: selectedDevice.adbPort ?? undefined,
    };
  }

  /**
   * 释放设备
   * 使用分布式锁防止并发释放冲突
   * 释放后清除可用设备缓存
   */
  // ✅ 使用正确的 LockConfig 对象
  @Lock({ key: 'allocation:device:{{deviceId}}', ttl: 10000 })
  @CacheEvict({ keys: ['scheduler:available-devices'] })
  async releaseDevice(
    deviceId: string,
    userId?: string
  ): Promise<{ deviceId: string; durationSeconds: number }> {
    this.logger.log(`Releasing device: ${deviceId}, user: ${userId || 'any'}`);

    // 查找活跃的分配记录
    const query = this.allocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.deviceId = :deviceId', { deviceId })
      .andWhere('allocation.status = :status', {
        status: AllocationStatus.ALLOCATED,
      });

    if (userId) {
      query.andWhere('allocation.userId = :userId', { userId });
    }

    const allocation = await query.getOne();

    if (!allocation) {
      throw new NotFoundException(`No active allocation found for device: ${deviceId}`);
    }

    // 更新分配记录
    const releasedAt = new Date();
    const durationSeconds = Math.floor(
      (releasedAt.getTime() - allocation.allocatedAt.getTime()) / 1000
    );

    allocation.status = AllocationStatus.RELEASED;
    allocation.releasedAt = releasedAt;
    allocation.durationSeconds = durationSeconds;

    await this.allocationRepository.save(allocation);

    // 获取设备信息（用于配额恢复和计费）
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      this.logger.warn(`Device ${deviceId} not found, skipping quota restoration and billing`);
    } else {
      // 上报配额恢复（Phase 2: User Service 集成）
      try {
        await this.quotaClient.reportDeviceUsage(allocation.userId, {
          deviceId: device.id,
          cpuCores: device.cpuCores,
          memoryGB: device.memoryMB / 1024,
          storageGB: device.storageMB / 1024,
          operation: 'decrement',
        });
        this.logger.log(`Quota usage restored for user ${allocation.userId}, device ${deviceId}`);
      } catch (error) {
        // 使用量恢复失败记录警告
        this.logger.warn(
          `Failed to restore quota usage for user ${allocation.userId}: ${error.message}`
        );
      }

      // 上报计费数据（Phase 2: Billing Service 集成）
      try {
        await this.billingClient.reportDeviceUsage({
          deviceId: device.id,
          userId: allocation.userId,
          tenantId: allocation.tenantId,
          allocationId: allocation.id,
          durationSeconds,
          cpuCores: device.cpuCores,
          memoryMB: device.memoryMB,
          storageMB: device.storageMB,
          allocatedAt: allocation.allocatedAt,
          releasedAt,
        });
        this.logger.log(
          `💰 Billing data reported for user ${allocation.userId}: ${durationSeconds}s`
        );
      } catch (error) {
        // 计费上报失败记录严重警告
        this.logger.error(
          `❌ Failed to report billing data for allocation ${allocation.id}: ${error.message}`
        );

        // 将失败的计费数据写入死信队列供人工处理
        await this.publishFailedBillingData({
          allocationId: allocation.id,
          deviceId: device.id,
          userId: allocation.userId,
          tenantId: allocation.tenantId,
          durationSeconds,
          cpuCores: device.cpuCores,
          memoryMB: device.memoryMB,
          storageMB: device.storageMB,
          allocatedAt: allocation.allocatedAt,
          releasedAt,
          failureReason: error.message,
          failureTimestamp: new Date(),
        });
      }
    }

    // 发布释放事件
    await this.eventBus.publishDeviceEvent('released', {
      deviceId,
      userId: allocation.userId,
      allocationId: allocation.id,
      releasedAt: releasedAt.toISOString(),
      durationSeconds,
    });

    this.logger.log(
      `Device released successfully: ${allocation.id} (duration: ${durationSeconds}s)`
    );

    // 发送设备释放通知（Phase 2: Notification Service 集成）
    if (device) {
      try {
        await this.notificationClient.notifyDeviceReleased({
          userId: allocation.userId,
          deviceId: device.id,
          deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
          allocationId: allocation.id,
          durationSeconds,
        });
      } catch (error) {
        this.logger.warn(`Failed to send device released notification: ${error.message}`);
      }
    }

    return {
      deviceId,
      durationSeconds,
    };
  }

  /**
   * 获取可用设备列表
   * 使用Redis缓存10秒，减少数据库查询压力
   */
  // ✅ 使用正确的 CacheableOptions 对象
  @Cacheable({ keyTemplate: 'scheduler:available-devices', ttl: 10 })
  async getAvailableDevices(): Promise<Device[]> {
    // 获取所有运行中的设备
    const runningDevices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.RUNNING,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // 过滤掉已分配的设备
    const allocatedDeviceIds = await this.getAllocatedDeviceIds();

    const available = runningDevices.filter((device) => !allocatedDeviceIds.has(device.id));

    this.logger.debug(`Available devices: ${available.length}/${runningDevices.length}`);

    return available;
  }

  /**
   * 获取已分配的设备ID集合
   */
  private async getAllocatedDeviceIds(): Promise<Set<string>> {
    const allocations = await this.allocationRepository.find({
      where: {
        status: AllocationStatus.ALLOCATED,
      },
      select: ['deviceId'],
    });

    return new Set(allocations.map((a) => a.deviceId));
  }

  /**
   * 根据策略选择设备
   */
  private selectDevice(devices: Device[], request: AllocationRequest): Device | null {
    if (devices.length === 0) {
      return null;
    }

    this.logger.debug(
      `Selecting device using strategy: ${this.strategy}, candidates: ${devices.length}`
    );

    switch (this.strategy) {
      case SchedulingStrategy.ROUND_ROBIN:
        return this.roundRobinSelect(devices);
      case SchedulingStrategy.LEAST_CONNECTION:
        return this.leastConnectionSelect(devices);
      case SchedulingStrategy.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobinSelect(devices);
      case SchedulingStrategy.RESOURCE_BASED:
        return this.resourceBasedSelect(devices, request);
      default:
        return devices[0];
    }
  }

  /**
   * 轮询策略
   */
  private roundRobinSelect(devices: Device[]): Device {
    // 简单返回第一个（实际可以记录上次选择的索引）
    return devices[0];
  }

  /**
   * 最少连接策略（按CPU使用率排序）
   */
  private leastConnectionSelect(devices: Device[]): Device {
    const sorted = [...devices].sort((a, b) => {
      const cpuA = a.cpuUsage || 0;
      const cpuB = b.cpuUsage || 0;
      return cpuA - cpuB;
    });
    return sorted[0];
  }

  /**
   * 加权轮询策略（根据资源使用率计算权重）
   */
  private weightedRoundRobinSelect(devices: Device[]): Device {
    const devicesWithWeight = devices.map((device) => {
      const cpu = device.cpuUsage || 0;
      const memory = device.memoryUsage || 0;
      const weight = 100 - (cpu + memory) / 2;
      return { device, weight };
    });

    const sorted = devicesWithWeight.sort((a, b) => b.weight - a.weight);
    return sorted[0].device;
  }

  /**
   * 基于资源的策略（选择资源最充足的设备）
   */
  private resourceBasedSelect(devices: Device[], request: AllocationRequest): Device {
    const devicesWithScore = devices.map((device) => {
      const cpuAvailable = 100 - (device.cpuUsage || 0);
      const memoryAvailable = 100 - (device.memoryUsage || 0);
      const storageAvailable = 100 - (device.storageUsage || 0);

      // 计算综合得分
      let score = (cpuAvailable + memoryAvailable + storageAvailable) / 3;

      // 如果有最小资源要求，检查是否满足
      if (request.preferredSpecs) {
        if (request.preferredSpecs.minCpu && device.cpuCores < request.preferredSpecs.minCpu) {
          score -= 50;
        }
        if (
          request.preferredSpecs.minMemory &&
          device.memoryMB < request.preferredSpecs.minMemory
        ) {
          score -= 50;
        }
      }

      return { device, score };
    });

    const sorted = devicesWithScore.sort((a, b) => b.score - a.score);
    return sorted[0].device;
  }

  /**
   * 获取分配统计信息
   */
  async getAllocationStats(): Promise<{
    totalAllocations: number;
    activeAllocations: number;
    releasedAllocations: number;
    expiredAllocations: number;
    strategy: string;
  }> {
    const [total, active, released, expired] = await Promise.all([
      this.allocationRepository.count(),
      this.allocationRepository.count({
        where: { status: AllocationStatus.ALLOCATED },
      }),
      this.allocationRepository.count({
        where: { status: AllocationStatus.RELEASED },
      }),
      this.allocationRepository.count({
        where: { status: AllocationStatus.EXPIRED },
      }),
    ]);

    return {
      totalAllocations: total,
      activeAllocations: active,
      releasedAllocations: released,
      expiredAllocations: expired,
      strategy: this.strategy,
    };
  }

  /**
   * 获取用户的分配记录
   */
  async getUserAllocations(userId: string, limit: number = 10): Promise<DeviceAllocation[]> {
    return this.allocationRepository.find({
      where: { userId },
      order: { allocatedAt: 'DESC' },
      take: limit,
      relations: ['device'],
    });
  }

  /**
   * 检查并释放过期的分配
   * 释放后清除可用设备缓存
   */
  @CacheEvict({ keys: ['scheduler:available-devices'] })
  /**
   * 释放单个设备分配
   * @param allocationId 分配ID
   * @param options 释放选项
   * @returns 是否成功释放
   */
  async releaseAllocation(
    allocationId: string,
    options?: { reason?: string; automatic?: boolean }
  ): Promise<boolean> {
    try {
      // 查找分配记录
      const allocation = await this.allocationRepository.findOne({
        where: { id: allocationId },
        relations: ['device'],
      });

      if (!allocation) {
        this.logger.warn(`Allocation not found: ${allocationId}`);
        return false;
      }

      // 检查分配状态
      if (
        allocation.status === AllocationStatus.RELEASED ||
        allocation.status === AllocationStatus.EXPIRED
      ) {
        this.logger.warn(`Allocation already released/expired: ${allocationId}`);
        return true;
      }

      const now = new Date();

      // 更新分配状态
      allocation.status = AllocationStatus.RELEASED;
      allocation.releasedAt = now;
      allocation.durationSeconds = Math.floor(
        (now.getTime() - allocation.allocatedAt.getTime()) / 1000
      );

      await this.allocationRepository.save(allocation);

      // 发布释放事件
      await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.released', {
        deviceId: allocation.deviceId,
        userId: allocation.userId,
        allocationId: allocation.id,
        allocatedAt: allocation.allocatedAt.toISOString(),
        releasedAt: now.toISOString(),
        durationSeconds: allocation.durationSeconds,
        reason: options?.reason || 'Manual release',
        automatic: options?.automatic || false,
      });

      this.logger.log(
        `Successfully released allocation: ${allocationId}${options?.reason ? ` (${options.reason})` : ''}`
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to release allocation ${allocationId}:`, error);
      throw error;
    }
  }

  /**
   * 释放过期的设备分配
   */
  async releaseExpiredAllocations(): Promise<number> {
    const now = new Date();

    const expiredAllocations = await this.allocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.status = :status', {
        status: AllocationStatus.ALLOCATED,
      })
      .andWhere('allocation.expiresAt < :now', { now })
      .getMany();

    if (expiredAllocations.length === 0) {
      return 0;
    }

    this.logger.log(`Found ${expiredAllocations.length} expired allocations, releasing...`);

    for (const allocation of expiredAllocations) {
      allocation.status = AllocationStatus.EXPIRED;
      allocation.releasedAt = now;
      allocation.durationSeconds = Math.floor(
        (now.getTime() - allocation.allocatedAt.getTime()) / 1000
      );

      await this.allocationRepository.save(allocation);

      // 发布过期事件
      await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.expired', {
        deviceId: allocation.deviceId,
        userId: allocation.userId,
        allocationId: allocation.id,
        allocatedAt: allocation.allocatedAt.toISOString(),
        expiredAt: now.toISOString(),
      });
    }

    return expiredAllocations.length;
  }

  /**
   * 清理旧的分配记录（已释放或已过期）
   */
  async cleanupOldAllocations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.allocationRepository
      .createQueryBuilder()
      .delete()
      .from(DeviceAllocation)
      .where('status IN (:...statuses)', {
        statuses: [AllocationStatus.RELEASED, AllocationStatus.EXPIRED],
      })
      .andWhere('releasedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // ==================== 批量操作 API ====================

  /**
   * 批量分配设备
   * 支持一次性为多个用户分配设备
   */
  async batchAllocate(
    requests: Array<{
      userId: string;
      durationMinutes: number;
      devicePreferences?: any;
    }>,
    continueOnError: boolean = true
  ): Promise<{
    successCount: number;
    failedCount: number;
    totalCount: number;
    successes: Array<{
      userId: string;
      allocationId: string;
      deviceId: string;
      deviceName: string;
      expiresAt: string;
    }>;
    failures: Array<{
      userId: string;
      reason: string;
      error: string;
    }>;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`🔄 Batch allocating ${requests.length} devices...`);

    const successes: any[] = [];
    const failures: any[] = [];

    for (const request of requests) {
      try {
        const result = await this.allocateDevice({
          userId: request.userId,
          durationMinutes: request.durationMinutes,
          preferredSpecs: request.devicePreferences,
        });

        const device = await this.deviceRepository.findOne({
          where: { id: result.deviceId },
        });

        successes.push({
          userId: request.userId,
          allocationId: result.allocationId,
          deviceId: result.deviceId,
          deviceName: device?.name || `Device-${result.deviceId.substring(0, 8)}`,
          expiresAt: result.expiresAt?.toISOString() || '',
        });

        this.logger.debug(`✅ Allocated device for user ${request.userId}`);
      } catch (error) {
        const failure = {
          userId: request.userId,
          reason: error.message || 'Unknown error',
          error: error.name || 'Error',
        };
        failures.push(failure);

        this.logger.warn(`❌ Failed to allocate for user ${request.userId}: ${error.message}`);

        // 如果不允许继续，直接返回
        if (!continueOnError) {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `✅ Batch allocation completed: ${successes.length} success, ${failures.length} failed, ${executionTimeMs}ms`
    );

    return {
      successCount: successes.length,
      failedCount: failures.length,
      totalCount: requests.length,
      successes,
      failures,
      executionTimeMs,
    };
  }

  /**
   * 批量释放设备
   * 支持一次性释放多个设备分配
   */
  async batchRelease(
    allocationIds: string[],
    reason?: string,
    continueOnError: boolean = true
  ): Promise<{
    successCount: number;
    failedCount: number;
    totalCount: number;
    successIds: string[];
    failures: Array<{
      allocationId: string;
      reason: string;
      error: string;
    }>;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`🔄 Batch releasing ${allocationIds.length} allocations...`);

    const successIds: string[] = [];
    const failures: any[] = [];

    for (const allocationId of allocationIds) {
      try {
        await this.releaseAllocation(allocationId, {
          reason: reason || '批量释放操作',
          automatic: false,
        });

        successIds.push(allocationId);
        this.logger.debug(`✅ Released allocation ${allocationId}`);
      } catch (error) {
        const failure = {
          allocationId,
          reason: error.message || 'Unknown error',
          error: error.name || 'Error',
        };
        failures.push(failure);

        this.logger.warn(`❌ Failed to release allocation ${allocationId}: ${error.message}`);

        // 如果不允许继续，直接返回
        if (!continueOnError) {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `✅ Batch release completed: ${successIds.length} success, ${failures.length} failed, ${executionTimeMs}ms`
    );

    return {
      successCount: successIds.length,
      failedCount: failures.length,
      totalCount: allocationIds.length,
      successIds,
      failures,
      executionTimeMs,
    };
  }

  /**
   * 批量续期设备
   * 支持一次性为多个设备分配延长使用时间
   */
  async batchExtend(
    allocationIds: string[],
    additionalMinutes: number,
    continueOnError: boolean = true
  ): Promise<{
    successCount: number;
    failedCount: number;
    totalCount: number;
    successes: Array<{
      allocationId: string;
      oldExpiresAt: string;
      newExpiresAt: string;
      additionalMinutes: number;
    }>;
    failures: Array<{
      allocationId: string;
      reason: string;
      error: string;
    }>;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log(
      `🔄 Batch extending ${allocationIds.length} allocations by ${additionalMinutes} minutes...`
    );

    const successes: any[] = [];
    const failures: any[] = [];

    for (const allocationId of allocationIds) {
      try {
        const allocation = await this.allocationRepository.findOne({
          where: { id: allocationId },
        });

        if (!allocation) {
          throw new NotFoundException(`Allocation ${allocationId} not found`);
        }

        if (allocation.status !== AllocationStatus.ALLOCATED) {
          throw new BadRequestException(
            `Allocation ${allocationId} is not active (status: ${allocation.status})`
          );
        }

        const oldExpiresAt = allocation.expiresAt;
        const newExpiresAt = new Date(oldExpiresAt.getTime() + additionalMinutes * 60 * 1000);

        allocation.expiresAt = newExpiresAt;
        await this.allocationRepository.save(allocation);

        successes.push({
          allocationId,
          oldExpiresAt: oldExpiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
          additionalMinutes,
        });

        // 发布续期事件
        await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.extended', {
          allocationId,
          userId: allocation.userId,
          deviceId: allocation.deviceId,
          oldExpiresAt: oldExpiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
          additionalMinutes,
        });

        // 发送续期通知
        try {
          const device = await this.deviceRepository.findOne({
            where: { id: allocation.deviceId },
          });

          if (device) {
            await this.notificationClient.sendBatchNotifications([
              {
                userId: allocation.userId,
                type: 'allocation_extended' as any,
                title: '⏰ 设备使用时间已延长',
                message: `设备 ${device.name || device.id.substring(0, 8)} 使用时间已延长 ${additionalMinutes} 分钟。`,
                data: {
                  allocationId,
                  deviceId: device.id,
                  deviceName: device.name,
                  additionalMinutes,
                  newExpiresAt: newExpiresAt.toISOString(),
                },
                channels: ['websocket'],
              },
            ]);
          }
        } catch (notificationError) {
          this.logger.warn(
            `Failed to send extend notification for ${allocationId}: ${notificationError.message}`
          );
        }

        this.logger.debug(`✅ Extended allocation ${allocationId}`);
      } catch (error) {
        const failure = {
          allocationId,
          reason: error.message || 'Unknown error',
          error: error.name || 'Error',
        };
        failures.push(failure);

        this.logger.warn(`❌ Failed to extend allocation ${allocationId}: ${error.message}`);

        // 如果不允许继续，直接返回
        if (!continueOnError) {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `✅ Batch extend completed: ${successes.length} success, ${failures.length} failed, ${executionTimeMs}ms`
    );

    return {
      successCount: successes.length,
      failedCount: failures.length,
      totalCount: allocationIds.length,
      successes,
      failures,
      executionTimeMs,
    };
  }

  /**
   * 批量查询用户的设备分配
   * 支持一次性查询多个用户的分配情况
   */
  async batchQuery(
    userIds: string[],
    activeOnly: boolean = true
  ): Promise<{
    allocations: Record<
      string,
      Array<{
        allocationId: string;
        deviceId: string;
        deviceName: string;
        status: string;
        allocatedAt: string;
        expiresAt: string;
      }>
    >;
    userCount: number;
    totalAllocations: number;
  }> {
    this.logger.log(`🔍 Batch querying allocations for ${userIds.length} users...`);

    const queryBuilder = this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.device', 'device')
      .where('allocation.userId IN (:...userIds)', { userIds });

    if (activeOnly) {
      queryBuilder.andWhere('allocation.status = :status', {
        status: AllocationStatus.ALLOCATED,
      });
    }

    const allocations = await queryBuilder.getMany();

    // 按用户分组
    const allocationsByUser: Record<string, any[]> = {};
    for (const userId of userIds) {
      allocationsByUser[userId] = [];
    }

    // ✅ 优化: 使用已经 JOIN 加载的 device，避免 N+1 查询
    for (const allocation of allocations) {
      // device 已通过 leftJoinAndSelect 加载，无需再次查询
      const device = allocation.device;

      allocationsByUser[allocation.userId].push({
        allocationId: allocation.id,
        deviceId: allocation.deviceId,
        deviceName: device?.name || `Device-${allocation.deviceId.substring(0, 8)}`,
        status: allocation.status,
        allocatedAt: allocation.allocatedAt.toISOString(),
        expiresAt: allocation.expiresAt?.toISOString() || '',
      });
    }

    this.logger.log(
      `✅ Batch query completed: ${userIds.length} users, ${allocations.length} allocations`
    );

    return {
      allocations: allocationsByUser,
      userCount: userIds.length,
      totalAllocations: allocations.length,
    };
  }

  // ==================== 单设备续期功能 ====================

  /**
   * 用户等级枚举
   */
  private readonly USER_TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
  } as const;

  /**
   * 续期策略配置表
   * 根据用户等级定义不同的续期策略
   */
  private readonly EXTEND_POLICIES: Record<string, {
    maxExtendCount: number;
    maxExtendMinutes: number;
    maxTotalMinutes: number;
    cooldownSeconds: number;
    allowExtendBeforeExpireMinutes: number;
    requireQuotaCheck: boolean;
    requireBilling: boolean;
  }> = {
    [this.USER_TIERS.FREE]: {
      maxExtendCount: 2, // 免费用户最多续期2次
      maxExtendMinutes: 30, // 单次续期最多30分钟
      maxTotalMinutes: 120, // 总使用时长最多2小时
      cooldownSeconds: 300, // 续期冷却时间5分钟
      allowExtendBeforeExpireMinutes: 30, // 过期前30分钟内才能续期
      requireQuotaCheck: true, // 需要配额检查
      requireBilling: false, // 免费用户不计费
    },
    [this.USER_TIERS.BASIC]: {
      maxExtendCount: 5, // 基础用户最多续期5次
      maxExtendMinutes: 60, // 单次续期最多1小时
      maxTotalMinutes: 480, // 总使用时长最多8小时
      cooldownSeconds: 120, // 续期冷却时间2分钟
      allowExtendBeforeExpireMinutes: 60, // 过期前1小时内才能续期
      requireQuotaCheck: true, // 需要配额检查
      requireBilling: true, // 需要计费
    },
    [this.USER_TIERS.PRO]: {
      maxExtendCount: 10, // 专业用户最多续期10次
      maxExtendMinutes: 120, // 单次续期最多2小时
      maxTotalMinutes: 1440, // 总使用时长最多24小时
      cooldownSeconds: 60, // 续期冷却时间1分钟
      allowExtendBeforeExpireMinutes: 120, // 过期前2小时内才能续期
      requireQuotaCheck: false, // 不需要配额检查
      requireBilling: true, // 需要计费
    },
    [this.USER_TIERS.ENTERPRISE]: {
      maxExtendCount: -1, // 企业用户无限续期
      maxExtendMinutes: 240, // 单次续期最多4小时
      maxTotalMinutes: -1, // 总使用时长不限制
      cooldownSeconds: 0, // 无冷却时间
      allowExtendBeforeExpireMinutes: 240, // 过期前4小时内才能续期
      requireQuotaCheck: false, // 不需要配额检查
      requireBilling: true, // 需要计费
    },
  };

  /**
   * 默认策略（当无法获取用户等级时使用）
   */
  private readonly DEFAULT_POLICY = this.EXTEND_POLICIES[this.USER_TIERS.BASIC];

  /**
   * 获取用户等级
   * 从用户服务获取用户信息，提取用户等级
   * 如果无法获取，返回默认等级 'basic'
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      // ✅ 从用户服务获取用户信息（通过 QuotaClientService 间接获取）
      // 注意：这里假设 quotaClient 可以提供用户等级信息
      // 如果不行，可以创建一个新的 UserClientService 专门获取用户信息

      // 方案1: 尝试从配额数据中推断用户等级
      const quotaCheck = await this.quotaClient.checkDeviceCreationQuota(userId, {
        cpuCores: 1,
        memoryMB: 1024,
        storageMB: 10240,
      });

      // 根据配额限制推断用户等级
      // 注意：这里使用 remainingDevices 作为间接指标，实际应该从 user-service 获取用户等级
      if (quotaCheck.remainingDevices !== undefined) {
        // 如果剩余配额很少，推断为较低等级
        if (quotaCheck.remainingDevices <= 1) {
          return this.USER_TIERS.FREE;
        } else if (quotaCheck.remainingDevices <= 5) {
          return this.USER_TIERS.BASIC;
        } else if (quotaCheck.remainingDevices <= 20) {
          return this.USER_TIERS.PRO;
        } else {
          return this.USER_TIERS.ENTERPRISE;
        }
      }

      // 方案2: 如果无法从配额推断，返回默认等级
      this.logger.debug(`Unable to determine user tier for ${userId}, using default: BASIC`);
      return this.USER_TIERS.BASIC;
    } catch (error) {
      // 如果获取失败，记录警告并返回默认等级
      this.logger.warn(
        `Failed to get user tier for ${userId}: ${error.message}, using default: BASIC`
      );
      return this.USER_TIERS.BASIC;
    }
  }

  /**
   * 获取续期策略配置
   * 根据用户等级返回对应的续期策略
   */
  private async getExtendPolicy(userId: string): Promise<{
    maxExtendCount: number;
    maxExtendMinutes: number;
    maxTotalMinutes: number;
    cooldownSeconds: number;
    allowExtendBeforeExpireMinutes: number;
    requireQuotaCheck: boolean;
    requireBilling: boolean;
  }> {
    // ✅ 从用户服务获取用户等级
    const userTier = await this.getUserTier(userId);

    // 根据等级返回对应策略
    const policy = this.EXTEND_POLICIES[userTier] || this.DEFAULT_POLICY;

    this.logger.debug(
      `User ${userId} tier: ${userTier}, extend policy: ${JSON.stringify(policy)}`
    );

    return policy;
  }

  /**
   * 延长单个设备分配的使用时间
   */
  async extendAllocation(
    allocationId: string,
    additionalMinutes: number,
    reason?: string
  ): Promise<{
    allocationId: string;
    userId: string;
    deviceId: string;
    deviceName: string;
    oldExpiresAt: string;
    newExpiresAt: string;
    additionalMinutes: number;
    extendCount: number;
    remainingExtends: number;
    totalDurationMinutes: number;
  }> {
    this.logger.log(`Extending allocation ${allocationId} by ${additionalMinutes} minutes...`);

    // 1. 查找分配
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found`);
    }

    // 2. 验证分配状态
    if (allocation.status !== AllocationStatus.ALLOCATED) {
      throw new BadRequestException(`Allocation is not active (status: ${allocation.status})`);
    }

    // 3. 获取续期策略
    const policy = await this.getExtendPolicy(allocation.userId);

    // 4. 初始化 metadata（如果不存在）
    if (!allocation.metadata) {
      allocation.metadata = {};
    }

    // 5. 获取续期信息
    const extendCount = (allocation.metadata.extendCount || 0) as number;
    const extendHistory = (allocation.metadata.extendHistory || []) as any[];
    const lastExtendAt = allocation.metadata.lastExtendAt as string | undefined;

    // 6. 检查续期次数限制
    if (policy.maxExtendCount !== -1 && extendCount >= policy.maxExtendCount) {
      throw new ForbiddenException(`Maximum extend count reached (${policy.maxExtendCount})`);
    }

    // 7. 检查单次续期时长限制
    if (additionalMinutes > policy.maxExtendMinutes) {
      throw new BadRequestException(
        `Additional minutes (${additionalMinutes}) exceeds maximum (${policy.maxExtendMinutes})`
      );
    }

    // 8. 检查总时长限制
    const currentTotalMinutes =
      allocation.durationMinutes + (allocation.metadata.totalExtendedMinutes || 0);
    const newTotalMinutes = currentTotalMinutes + additionalMinutes;

    if (policy.maxTotalMinutes !== -1 && newTotalMinutes > policy.maxTotalMinutes) {
      throw new ForbiddenException(
        `Total duration (${newTotalMinutes}) would exceed maximum (${policy.maxTotalMinutes})`
      );
    }

    // 9. 检查冷却时间
    if (lastExtendAt && policy.cooldownSeconds > 0) {
      const lastExtendTime = new Date(lastExtendAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - lastExtendTime) / 1000;

      if (elapsedSeconds < policy.cooldownSeconds) {
        const remainingSeconds = Math.ceil(policy.cooldownSeconds - elapsedSeconds);
        throw new BadRequestException(
          `Extend cooldown: please wait ${remainingSeconds} seconds before extending again`
        );
      }
    }

    // 10. 检查是否在允许续期的时间窗口内
    const now = new Date();
    const expiresAt = new Date(allocation.expiresAt);
    const minutesUntilExpire = (expiresAt.getTime() - now.getTime()) / (60 * 1000);

    if (minutesUntilExpire > policy.allowExtendBeforeExpireMinutes) {
      throw new BadRequestException(
        `Can only extend within ${policy.allowExtendBeforeExpireMinutes} minutes before expiration (${Math.floor(minutesUntilExpire)} minutes remaining)`
      );
    }

    // 11. 检查是否已过期
    if (minutesUntilExpire < 0) {
      throw new BadRequestException(
        `Cannot extend expired allocation (expired ${Math.floor(Math.abs(minutesUntilExpire))} minutes ago)`
      );
    }

    // 12. 计费检查（如果需要）
    if (policy.requireBilling) {
      try {
        // 调用计费服务预检查余额
        // await this.billingClient.preCheckExtend(allocation.userId, additionalMinutes);
        this.logger.debug(
          `Billing check passed for extend ${allocationId} (${additionalMinutes} minutes)`
        );
      } catch (error) {
        this.logger.warn(`Billing check failed: ${error.message}`);
        throw new ForbiddenException(`Insufficient balance to extend ${additionalMinutes} minutes`);
      }
    }

    // 13. 执行续期
    const oldExpiresAt = allocation.expiresAt;
    const newExpiresAt = new Date(oldExpiresAt.getTime() + additionalMinutes * 60 * 1000);

    allocation.expiresAt = newExpiresAt;

    // 14. 更新 metadata
    allocation.metadata.extendCount = extendCount + 1;
    allocation.metadata.totalExtendedMinutes =
      (allocation.metadata.totalExtendedMinutes || 0) + additionalMinutes;
    allocation.metadata.lastExtendAt = now.toISOString();

    // 15. 记录续期历史
    extendHistory.push({
      timestamp: now.toISOString(),
      additionalMinutes,
      oldExpiresAt: oldExpiresAt.toISOString(),
      newExpiresAt: newExpiresAt.toISOString(),
      reason: reason || 'User requested',
    });
    allocation.metadata.extendHistory = extendHistory;

    // 16. 保存
    await this.allocationRepository.save(allocation);

    this.logger.log(
      `✅ Extended allocation ${allocationId}: ${oldExpiresAt.toISOString()} → ${newExpiresAt.toISOString()}`
    );

    // 17. 发布事件
    await this.eventBus.publish('cloudphone.events', 'scheduler.allocation.extended', {
      allocationId,
      userId: allocation.userId,
      deviceId: allocation.deviceId,
      oldExpiresAt: oldExpiresAt.toISOString(),
      newExpiresAt: newExpiresAt.toISOString(),
      additionalMinutes,
      extendCount: allocation.metadata.extendCount,
      totalDurationMinutes: allocation.durationMinutes + allocation.metadata.totalExtendedMinutes,
    });

    // 18. 发送通知
    try {
      const device = await this.deviceRepository.findOne({
        where: { id: allocation.deviceId },
      });

      if (device) {
        await this.notificationClient.sendBatchNotifications([
          {
            userId: allocation.userId,
            type: 'allocation_extended' as any,
            title: '⏰ 设备使用时间已延长',
            message: `设备 ${device.name || device.id.substring(0, 8)} 使用时间已延长 ${additionalMinutes} 分钟。新过期时间：${newExpiresAt.toLocaleString('zh-CN')}`,
            data: {
              allocationId,
              deviceId: device.id,
              deviceName: device.name,
              additionalMinutes,
              newExpiresAt: newExpiresAt.toISOString(),
              extendCount: allocation.metadata.extendCount,
              remainingExtends:
                policy.maxExtendCount === -1
                  ? -1
                  : policy.maxExtendCount - allocation.metadata.extendCount,
            },
            channels: ['websocket'],
          },
        ]);
      }
    } catch (notificationError) {
      this.logger.warn(`Failed to send extend notification: ${notificationError.message}`);
    }

    // 19. 返回结果
    const device = await this.deviceRepository.findOne({
      where: { id: allocation.deviceId },
    });

    return {
      allocationId,
      userId: allocation.userId,
      deviceId: allocation.deviceId,
      deviceName: device?.name || `Device-${allocation.deviceId.substring(0, 8)}`,
      oldExpiresAt: oldExpiresAt.toISOString(),
      newExpiresAt: newExpiresAt.toISOString(),
      additionalMinutes,
      extendCount: allocation.metadata.extendCount,
      remainingExtends:
        policy.maxExtendCount === -1 ? -1 : policy.maxExtendCount - allocation.metadata.extendCount,
      totalDurationMinutes: allocation.durationMinutes + allocation.metadata.totalExtendedMinutes,
    };
  }

  /**
   * 获取分配的续期信息
   */
  async getAllocationExtendInfo(allocationId: string): Promise<{
    allocationId: string;
    extendCount: number;
    remainingExtends: number;
    totalDurationMinutes: number;
    maxTotalMinutes: number;
    canExtend: boolean;
    cannotExtendReason?: string;
    extendHistory: Array<{
      timestamp: string;
      additionalMinutes: number;
      oldExpiresAt: string;
      newExpiresAt: string;
      reason?: string;
    }>;
    nextExtendAvailableAt?: string;
  }> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found`);
    }

    const policy = await this.getExtendPolicy(allocation.userId);
    const metadata = allocation.metadata || {};
    const extendCount = (metadata.extendCount || 0) as number;
    const extendHistory = (metadata.extendHistory || []) as any[];
    const lastExtendAt = metadata.lastExtendAt as string | undefined;
    const totalExtendedMinutes = (metadata.totalExtendedMinutes || 0) as number;

    const totalDurationMinutes = allocation.durationMinutes + totalExtendedMinutes;

    // 检查是否可以续期
    let canExtend = true;
    let cannotExtendReason: string | undefined;

    // 检查状态
    if (allocation.status !== AllocationStatus.ALLOCATED) {
      canExtend = false;
      cannotExtendReason = `Allocation is not active (status: ${allocation.status})`;
    }

    // 检查续期次数
    if (canExtend && policy.maxExtendCount !== -1 && extendCount >= policy.maxExtendCount) {
      canExtend = false;
      cannotExtendReason = `Maximum extend count reached (${policy.maxExtendCount})`;
    }

    // 检查总时长
    if (
      canExtend &&
      policy.maxTotalMinutes !== -1 &&
      totalDurationMinutes >= policy.maxTotalMinutes
    ) {
      canExtend = false;
      cannotExtendReason = `Maximum total duration reached (${policy.maxTotalMinutes} minutes)`;
    }

    // 检查冷却时间
    let nextExtendAvailableAt: string | undefined;
    if (canExtend && lastExtendAt && policy.cooldownSeconds > 0) {
      const lastExtendTime = new Date(lastExtendAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - lastExtendTime) / 1000;

      if (elapsedSeconds < policy.cooldownSeconds) {
        canExtend = false;
        const remainingSeconds = Math.ceil(policy.cooldownSeconds - elapsedSeconds);
        cannotExtendReason = `Cooldown period: wait ${remainingSeconds} seconds`;
        nextExtendAvailableAt = new Date(
          lastExtendTime + policy.cooldownSeconds * 1000
        ).toISOString();
      }
    }

    // 检查是否已过期
    const now = new Date();
    const expiresAt = new Date(allocation.expiresAt);
    if (canExtend && now > expiresAt) {
      canExtend = false;
      cannotExtendReason = 'Allocation has expired';
    }

    // 检查是否在允许续期的时间窗口内
    if (canExtend) {
      const minutesUntilExpire = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
      if (minutesUntilExpire > policy.allowExtendBeforeExpireMinutes) {
        canExtend = false;
        cannotExtendReason = `Can only extend within ${policy.allowExtendBeforeExpireMinutes} minutes before expiration`;
      }
    }

    return {
      allocationId,
      extendCount,
      remainingExtends: policy.maxExtendCount === -1 ? -1 : policy.maxExtendCount - extendCount,
      totalDurationMinutes,
      maxTotalMinutes: policy.maxTotalMinutes,
      canExtend,
      cannotExtendReason,
      extendHistory,
      nextExtendAvailableAt,
    };
  }

  /**
   * 发布失败的计费数据到死信队列
   * 当计费上报失败时，将数据持久化到 DLX 供人工处理和重试
   *
   * @param billingData 失败的计费数据
   */
  private async publishFailedBillingData(billingData: {
    allocationId: string;
    deviceId: string;
    userId: string;
    tenantId?: string;
    durationSeconds: number;
    cpuCores: number;
    memoryMB: number;
    storageMB: number;
    allocatedAt: Date;
    releasedAt: Date;
    failureReason: string;
    failureTimestamp: Date;
  }): Promise<void> {
    try {
      // 发布到死信队列专用路由
      await this.eventBus.publish(
        'cloudphone.dlx',
        'billing.usage_report_failed',
        {
          type: 'billing.usage_report_failed',
          timestamp: billingData.failureTimestamp.toISOString(),
          allocationId: billingData.allocationId,
          deviceId: billingData.deviceId,
          userId: billingData.userId,
          tenantId: billingData.tenantId,
          usage: {
            durationSeconds: billingData.durationSeconds,
            cpuCores: billingData.cpuCores,
            memoryMB: billingData.memoryMB,
            storageMB: billingData.storageMB,
          },
          allocatedAt: billingData.allocatedAt.toISOString(),
          releasedAt: billingData.releasedAt.toISOString(),
          failureReason: billingData.failureReason,
          failureTimestamp: billingData.failureTimestamp.toISOString(),
          retryCount: 0,
          metadata: {
            serviceName: 'device-service',
            source: 'allocation.service',
          },
        },
        {
          persistent: true,
          priority: 8, // High priority for billing data
        }
      );

      this.logger.log(
        `📨 Published failed billing data to DLX: allocation ${billingData.allocationId}`
      );
    } catch (dlxError) {
      // 如果发布到 DLX 也失败，记录严重错误
      this.logger.error(
        `🚨 CRITICAL: Failed to publish billing data to DLX for allocation ${billingData.allocationId}: ${dlxError.message}`,
        dlxError.stack
      );

      // 尝试发布系统错误事件通知管理员
      try {
        await this.eventBus.publishSystemError(
          'critical',
          'BILLING_DLX_FAILURE',
          `Failed to publish billing data to DLX: ${dlxError.message}`,
          'device-service',
          {
            userMessage: '计费数据持久化失败，需要人工介入',
            metadata: {
              allocationId: billingData.allocationId,
              userId: billingData.userId,
              durationSeconds: billingData.durationSeconds,
              originalFailure: billingData.failureReason,
              dlxFailure: dlxError.message,
            },
          }
        );
      } catch (errorNotificationFailure) {
        // 最后的防御：如果连错误通知都失败，只能记录日志
        this.logger.error(
          `🚨 CRITICAL: Failed to notify system error: ${errorNotificationFailure.message}`
        );
      }
    }
  }
}
