import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeviceAllocation, AllocationStatus } from "../entities/device-allocation.entity";
import { Device, DeviceStatus } from "../entities/device.entity";
import { EventBusService, Cacheable, CacheEvict, Lock } from "@cloudphone/shared";
import { QuotaClientService } from "../quota/quota-client.service";
import { BillingClientService } from "./billing-client.service";
import { NotificationClientService } from "./notification-client.service";

export enum SchedulingStrategy {
  ROUND_ROBIN = "round_robin",
  LEAST_CONNECTION = "least_connection",
  WEIGHTED_ROUND_ROBIN = "weighted_round_robin",
  RESOURCE_BASED = "resource_based",
}

export interface AllocationRequest {
  userId: string;
  tenantId?: string;
  durationMinutes?: number;
  preferredSpecs?: {
    minCpu?: number;
    minMemory?: number;
  };
}

export interface AllocationResponse {
  allocationId: string;
  deviceId: string;
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
    private notificationClient: NotificationClientService,
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
  @Lock({ key: "allocation:user:{{request.userId}}", ttl: 10000 })
  @CacheEvict({ keys: ["scheduler:available-devices"] })
  async allocateDevice(
    request: AllocationRequest,
  ): Promise<AllocationResponse> {
    this.logger.log(
      `Allocating device for user: ${request.userId}, tenant: ${request.tenantId || "default"}`,
    );

    // 1. 获取可用设备列表
    const availableDevices = await this.getAvailableDevices();

    if (availableDevices.length === 0) {
      this.logger.warn("No available devices for allocation");

      const reason = "当前没有可用设备，请稍后重试";

      // 发布分配失败事件
      await this.eventBus.publish("cloudphone.events", "scheduler.allocation.failed", {
        userId: request.userId,
        tenantId: request.tenantId,
        reason: "no_available_devices",
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

      throw new BadRequestException("No available devices");
    }

    // 2. 根据策略选择设备
    const selectedDevice = this.selectDevice(availableDevices, request);

    if (!selectedDevice) {
      throw new BadRequestException("No suitable device found");
    }

    // 3. 配额验证（Phase 2: 服务集成）
    try {
      const quotaCheck = await this.quotaClient.checkDeviceCreationQuota(
        request.userId,
        {
          cpuCores: selectedDevice.cpuCores,
          memoryMB: selectedDevice.memoryMB,
          storageMB: selectedDevice.storageMB,
        },
      );

      if (!quotaCheck.allowed) {
        this.logger.warn(
          `Quota check failed for user ${request.userId}: ${quotaCheck.reason}`,
        );

        // 发布配额超限事件
        await this.eventBus.publish("cloudphone.events", "scheduler.allocation.quota_exceeded", {
          userId: request.userId,
          tenantId: request.tenantId,
          reason: quotaCheck.reason,
          timestamp: new Date().toISOString(),
        });

        // 发送配额超限通知（Phase 2: Notification Service 集成）
        try {
          await this.notificationClient.notifyAllocationFailed({
            userId: request.userId,
            reason: quotaCheck.reason || "配额已达上限",
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.warn(`Failed to send quota exceeded notification: ${error.message}`);
        }

        throw new ForbiddenException(
          quotaCheck.reason || "Quota limit exceeded",
        );
      }

      this.logger.log(
        `Quota check passed for user ${request.userId}. Remaining devices: ${quotaCheck.remainingDevices}`,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // 配额服务不可用时的错误处理
      this.logger.error(
        `Quota check error for user ${request.userId}: ${error.message}`,
      );
      // 根据配置决定是否允许继续（已在 QuotaClientService 中处理）
      throw error;
    }

    this.logger.log(
      `Selected device: ${selectedDevice.id} using strategy: ${this.strategy}`,
    );

    // 4. 创建分配记录
    const durationMinutes = request.durationMinutes || 60;
    const allocatedAt = new Date();
    const expiresAt = new Date(
      allocatedAt.getTime() + durationMinutes * 60 * 1000,
    );

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
        operation: "increment",
      });
      this.logger.log(
        `Quota usage reported for user ${request.userId}, device ${selectedDevice.id}`,
      );
    } catch (error) {
      // 使用量上报失败不应阻止分配，但记录警告
      this.logger.warn(
        `Failed to report quota usage for user ${request.userId}: ${error.message}`,
      );
    }

    // 6. 发布分配成功事件
    await this.eventBus.publishDeviceEvent("allocated", {
      deviceId: selectedDevice.id,
      userId: request.userId,
      tenantId: request.tenantId,
      allocationId: allocation.id,
      allocatedAt: allocatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      strategy: this.strategy,
    });

    this.logger.log(
      `Device allocated successfully: ${allocation.id} (device: ${selectedDevice.id})`,
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
        adbHost: selectedDevice.adbHost,
        adbPort: selectedDevice.adbPort,
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
  @Lock({ key: "allocation:device:{{deviceId}}", ttl: 10000 })
  @CacheEvict({ keys: ["scheduler:available-devices"] })
  async releaseDevice(
    deviceId: string,
    userId?: string,
  ): Promise<{ deviceId: string; durationSeconds: number }> {
    this.logger.log(`Releasing device: ${deviceId}, user: ${userId || "any"}`);

    // 查找活跃的分配记录
    const query = this.allocationRepository
      .createQueryBuilder("allocation")
      .where("allocation.deviceId = :deviceId", { deviceId })
      .andWhere("allocation.status = :status", {
        status: AllocationStatus.ALLOCATED,
      });

    if (userId) {
      query.andWhere("allocation.userId = :userId", { userId });
    }

    const allocation = await query.getOne();

    if (!allocation) {
      throw new NotFoundException(
        `No active allocation found for device: ${deviceId}`,
      );
    }

    // 更新分配记录
    const releasedAt = new Date();
    const durationSeconds = Math.floor(
      (releasedAt.getTime() - allocation.allocatedAt.getTime()) / 1000,
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
      this.logger.warn(
        `Device ${deviceId} not found, skipping quota restoration and billing`,
      );
    } else {
      // 上报配额恢复（Phase 2: User Service 集成）
      try {
        await this.quotaClient.reportDeviceUsage(allocation.userId, {
          deviceId: device.id,
          cpuCores: device.cpuCores,
          memoryGB: device.memoryMB / 1024,
          storageGB: device.storageMB / 1024,
          operation: "decrement",
        });
        this.logger.log(
          `Quota usage restored for user ${allocation.userId}, device ${deviceId}`,
        );
      } catch (error) {
        // 使用量恢复失败记录警告
        this.logger.warn(
          `Failed to restore quota usage for user ${allocation.userId}: ${error.message}`,
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
          `💰 Billing data reported for user ${allocation.userId}: ${durationSeconds}s`,
        );
      } catch (error) {
        // 计费上报失败记录严重警告
        this.logger.error(
          `❌ Failed to report billing data for allocation ${allocation.id}: ${error.message}`,
        );
        // TODO: 考虑将失败的计费数据写入死信队列供人工处理
      }
    }

    // 发布释放事件
    await this.eventBus.publishDeviceEvent("released", {
      deviceId,
      userId: allocation.userId,
      allocationId: allocation.id,
      releasedAt: releasedAt.toISOString(),
      durationSeconds,
    });

    this.logger.log(
      `Device released successfully: ${allocation.id} (duration: ${durationSeconds}s)`,
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
  @Cacheable({ keyTemplate: "scheduler:available-devices", ttl: 10 })
  async getAvailableDevices(): Promise<Device[]> {
    // 获取所有运行中的设备
    const runningDevices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.RUNNING,
      },
      order: {
        createdAt: "ASC",
      },
    });

    // 过滤掉已分配的设备
    const allocatedDeviceIds = await this.getAllocatedDeviceIds();

    const available = runningDevices.filter(
      (device) => !allocatedDeviceIds.has(device.id),
    );

    this.logger.debug(
      `Available devices: ${available.length}/${runningDevices.length}`,
    );

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
      select: ["deviceId"],
    });

    return new Set(allocations.map((a) => a.deviceId));
  }

  /**
   * 根据策略选择设备
   */
  private selectDevice(
    devices: Device[],
    request: AllocationRequest,
  ): Device | null {
    if (devices.length === 0) {
      return null;
    }

    this.logger.debug(
      `Selecting device using strategy: ${this.strategy}, candidates: ${devices.length}`,
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
  private resourceBasedSelect(
    devices: Device[],
    request: AllocationRequest,
  ): Device {
    const devicesWithScore = devices.map((device) => {
      const cpuAvailable = 100 - (device.cpuUsage || 0);
      const memoryAvailable = 100 - (device.memoryUsage || 0);
      const storageAvailable = 100 - (device.storageUsage || 0);

      // 计算综合得分
      let score = (cpuAvailable + memoryAvailable + storageAvailable) / 3;

      // 如果有最小资源要求，检查是否满足
      if (request.preferredSpecs) {
        if (
          request.preferredSpecs.minCpu &&
          device.cpuCores < request.preferredSpecs.minCpu
        ) {
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
  async getUserAllocations(
    userId: string,
    limit: number = 10,
  ): Promise<DeviceAllocation[]> {
    return this.allocationRepository.find({
      where: { userId },
      order: { allocatedAt: "DESC" },
      take: limit,
      relations: ["device"],
    });
  }

  /**
   * 检查并释放过期的分配
   * 释放后清除可用设备缓存
   */
  @CacheEvict({ keys: ["scheduler:available-devices"] })
  async releaseExpiredAllocations(): Promise<number> {
    const now = new Date();

    const expiredAllocations = await this.allocationRepository
      .createQueryBuilder("allocation")
      .where("allocation.status = :status", {
        status: AllocationStatus.ALLOCATED,
      })
      .andWhere("allocation.expiresAt < :now", { now })
      .getMany();

    if (expiredAllocations.length === 0) {
      return 0;
    }

    this.logger.log(
      `Found ${expiredAllocations.length} expired allocations, releasing...`,
    );

    for (const allocation of expiredAllocations) {
      allocation.status = AllocationStatus.EXPIRED;
      allocation.releasedAt = now;
      allocation.durationSeconds = Math.floor(
        (now.getTime() - allocation.allocatedAt.getTime()) / 1000,
      );

      await this.allocationRepository.save(allocation);

      // 发布过期事件
      await this.eventBus.publish("cloudphone.events", "scheduler.allocation.expired", {
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
      .where("status IN (:...statuses)", {
        statuses: [AllocationStatus.RELEASED, AllocationStatus.EXPIRED],
      })
      .andWhere("releasedAt < :cutoffDate", { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
