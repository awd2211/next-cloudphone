import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quota, QuotaStatus, QuotaType, QuotaLimits, QuotaUsage } from '../entities/quota.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CheckQuotaRequest {
  userId: string;
  quotaType: QuotaType;
  requestedAmount: number;
  deviceConfig?: {
    cpuCores?: number;
    memoryGB?: number;
    storageGB?: number;
  };
}

export interface CheckQuotaResult {
  allowed: boolean;
  reason?: string;
  quota?: Quota;
  remaining?: number;
}

export interface DeductQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  trafficGB?: number;
  usageHours?: number;
  concurrent?: boolean;
}

export interface RestoreQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  concurrent?: boolean;
}

export interface CreateQuotaDto {
  userId: string;
  planId?: string;
  planName?: string;
  limits: QuotaLimits;
  validFrom?: Date;
  validUntil?: Date;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateQuotaDto {
  limits?: Partial<QuotaLimits>;
  status?: QuotaStatus;
  validFrom?: Date;
  validUntil?: Date;
  autoRenew?: boolean;
  notes?: string;
}

@Injectable()
export class QuotasService {
  private readonly logger = new Logger(QuotasService.name);

  constructor(
    @InjectRepository(Quota)
    private quotaRepository: Repository<Quota>,
  ) {}

  /**
   * 创建用户配额
   */
  async createQuota(dto: CreateQuotaDto): Promise<Quota> {
    const existingQuota = await this.quotaRepository.findOne({
      where: { userId: dto.userId, status: QuotaStatus.ACTIVE },
    });

    if (existingQuota) {
      throw new BadRequestException('用户已有活跃配额');
    }

    const quota = this.quotaRepository.create({
      userId: dto.userId,
      planId: dto.planId,
      planName: dto.planName,
      status: QuotaStatus.ACTIVE,
      limits: dto.limits,
      usage: this.initializeUsage(),
      validFrom: dto.validFrom || new Date(),
      validUntil: dto.validUntil,
      autoRenew: dto.autoRenew || false,
      notes: dto.notes,
    });

    const savedQuota = await this.quotaRepository.save(quota);
    this.logger.log(`配额已创建 - 用户: ${dto.userId}, ID: ${savedQuota.id}`);
    return savedQuota;
  }

  /**
   * 获取用户配额
   */
  async getUserQuota(userId: string): Promise<Quota> {
    const quota = await this.quotaRepository.findOne({
      where: { userId, status: QuotaStatus.ACTIVE },
      relations: ['user'],
    });

    if (!quota) {
      throw new NotFoundException(`用户 ${userId} 未找到活跃配额`);
    }

    // 检查是否过期
    if (quota.isExpired()) {
      quota.status = QuotaStatus.EXPIRED;
      await this.quotaRepository.save(quota);
      throw new BadRequestException('配额已过期');
    }

    return quota;
  }

  /**
   * 检查配额是否足够
   */
  async checkQuota(request: CheckQuotaRequest): Promise<CheckQuotaResult> {
    const quota = await this.getUserQuota(request.userId);

    if (!quota.isActive()) {
      return {
        allowed: false,
        reason: `配额状态异常: ${quota.status}`,
        quota,
      };
    }

    switch (request.quotaType) {
      case QuotaType.DEVICE:
        if (!quota.hasAvailableDeviceQuota(request.requestedAmount)) {
          return {
            allowed: false,
            reason: `设备配额不足 (已用: ${quota.usage.currentDevices}/${quota.limits.maxDevices})`,
            quota,
            remaining: quota.getRemainingDevices(),
          };
        }
        break;

      case QuotaType.CPU:
        if (!quota.hasAvailableCpuQuota(request.requestedAmount)) {
          return {
            allowed: false,
            reason: `CPU 配额不足 (已用: ${quota.usage.usedCpuCores}/${quota.limits.totalCpuCores} 核)`,
            quota,
            remaining: quota.limits.totalCpuCores - quota.usage.usedCpuCores,
          };
        }
        break;

      case QuotaType.MEMORY:
        if (!quota.hasAvailableMemoryQuota(request.requestedAmount)) {
          return {
            allowed: false,
            reason: `内存配额不足 (已用: ${quota.usage.usedMemoryGB}/${quota.limits.totalMemoryGB} GB)`,
            quota,
            remaining: quota.limits.totalMemoryGB - quota.usage.usedMemoryGB,
          };
        }
        break;

      case QuotaType.STORAGE:
        if (!quota.hasAvailableStorageQuota(request.requestedAmount)) {
          return {
            allowed: false,
            reason: `存储配额不足 (已用: ${quota.usage.usedStorageGB}/${quota.limits.totalStorageGB} GB)`,
            quota,
            remaining: quota.limits.totalStorageGB - quota.usage.usedStorageGB,
          };
        }
        break;

      case QuotaType.BANDWIDTH:
        const remainingTraffic =
          quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB;
        if (remainingTraffic < request.requestedAmount) {
          return {
            allowed: false,
            reason: `月流量配额不足 (已用: ${quota.usage.monthlyTrafficUsedGB}/${quota.limits.monthlyTrafficGB} GB)`,
            quota,
            remaining: Math.max(0, remainingTraffic),
          };
        }
        break;

      case QuotaType.DURATION:
        const remainingHours =
          quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours;
        if (remainingHours < request.requestedAmount) {
          return {
            allowed: false,
            reason: `月使用时长配额不足 (已用: ${quota.usage.monthlyUsageHours}/${quota.limits.maxUsageHoursPerMonth} 小时)`,
            quota,
            remaining: Math.max(0, remainingHours),
          };
        }
        break;

      default:
        throw new BadRequestException(`不支持的配额类型: ${request.quotaType}`);
    }

    // 如果是创建设备，还需检查每设备资源限制
    if (request.quotaType === QuotaType.DEVICE && request.deviceConfig) {
      const { cpuCores, memoryGB, storageGB } = request.deviceConfig;

      if (
        cpuCores &&
        cpuCores > quota.limits.maxCpuCoresPerDevice
      ) {
        return {
          allowed: false,
          reason: `单设备 CPU 超限 (请求: ${cpuCores}, 限制: ${quota.limits.maxCpuCoresPerDevice} 核)`,
          quota,
        };
      }

      if (
        memoryGB &&
        memoryGB > quota.limits.maxMemoryMBPerDevice / 1024
      ) {
        return {
          allowed: false,
          reason: `单设备内存超限 (请求: ${memoryGB}GB, 限制: ${quota.limits.maxMemoryMBPerDevice / 1024}GB)`,
          quota,
        };
      }

      if (
        storageGB &&
        storageGB > quota.limits.maxStorageGBPerDevice
      ) {
        return {
          allowed: false,
          reason: `单设备存储超限 (请求: ${storageGB}GB, 限制: ${quota.limits.maxStorageGBPerDevice}GB)`,
          quota,
        };
      }
    }

    return {
      allowed: true,
      quota,
      remaining: this.calculateRemaining(quota, request.quotaType),
    };
  }

  /**
   * 扣减配额
   */
  async deductQuota(request: DeductQuotaRequest): Promise<Quota> {
    const quota = await this.getUserQuota(request.userId);

    if (request.deviceCount) {
      quota.usage.currentDevices += request.deviceCount;
      if (request.concurrent) {
        quota.usage.currentConcurrentDevices += request.deviceCount;
      }
    }

    if (request.cpuCores) {
      quota.usage.usedCpuCores += request.cpuCores;
    }

    if (request.memoryGB) {
      quota.usage.usedMemoryGB += request.memoryGB;
    }

    if (request.storageGB) {
      quota.usage.usedStorageGB += request.storageGB;
    }

    if (request.trafficGB) {
      quota.usage.monthlyTrafficUsedGB += request.trafficGB;
    }

    if (request.usageHours) {
      quota.usage.todayUsageHours += request.usageHours;
      quota.usage.monthlyUsageHours += request.usageHours;
    }

    quota.usage.lastUpdatedAt = new Date();

    // 检查是否超额
    if (
      quota.usage.currentDevices > quota.limits.maxDevices ||
      quota.usage.usedCpuCores > quota.limits.totalCpuCores ||
      quota.usage.usedMemoryGB > quota.limits.totalMemoryGB ||
      quota.usage.usedStorageGB > quota.limits.totalStorageGB
    ) {
      quota.status = QuotaStatus.EXCEEDED;
    }

    const updatedQuota = await this.quotaRepository.save(quota);
    this.logger.log(
      `配额已扣减 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}, CPU: ${request.cpuCores || 0}`,
    );

    return updatedQuota;
  }

  /**
   * 恢复配额
   */
  async restoreQuota(request: RestoreQuotaRequest): Promise<Quota> {
    const quota = await this.getUserQuota(request.userId);

    if (request.deviceCount) {
      quota.usage.currentDevices = Math.max(
        0,
        quota.usage.currentDevices - request.deviceCount,
      );
      if (request.concurrent) {
        quota.usage.currentConcurrentDevices = Math.max(
          0,
          quota.usage.currentConcurrentDevices - request.deviceCount,
        );
      }
    }

    if (request.cpuCores) {
      quota.usage.usedCpuCores = Math.max(
        0,
        quota.usage.usedCpuCores - request.cpuCores,
      );
    }

    if (request.memoryGB) {
      quota.usage.usedMemoryGB = Math.max(
        0,
        quota.usage.usedMemoryGB - request.memoryGB,
      );
    }

    if (request.storageGB) {
      quota.usage.usedStorageGB = Math.max(
        0,
        quota.usage.usedStorageGB - request.storageGB,
      );
    }

    quota.usage.lastUpdatedAt = new Date();

    // 如果之前是超额状态，恢复后重新检查
    if (quota.status === QuotaStatus.EXCEEDED) {
      if (
        quota.usage.currentDevices <= quota.limits.maxDevices &&
        quota.usage.usedCpuCores <= quota.limits.totalCpuCores &&
        quota.usage.usedMemoryGB <= quota.limits.totalMemoryGB &&
        quota.usage.usedStorageGB <= quota.limits.totalStorageGB
      ) {
        quota.status = QuotaStatus.ACTIVE;
      }
    }

    const updatedQuota = await this.quotaRepository.save(quota);
    this.logger.log(
      `配额已恢复 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}`,
    );

    return updatedQuota;
  }

  /**
   * 更新配额
   */
  async updateQuota(quotaId: string, dto: UpdateQuotaDto): Promise<Quota> {
    const quota = await this.quotaRepository.findOne({
      where: { id: quotaId },
    });

    if (!quota) {
      throw new NotFoundException(`配额 ${quotaId} 未找到`);
    }

    if (dto.limits) {
      quota.limits = { ...quota.limits, ...dto.limits };
    }

    if (dto.status) {
      quota.status = dto.status;
    }

    if (dto.validFrom) {
      quota.validFrom = dto.validFrom;
    }

    if (dto.validUntil) {
      quota.validUntil = dto.validUntil;
    }

    if (dto.autoRenew !== undefined) {
      quota.autoRenew = dto.autoRenew;
    }

    if (dto.notes) {
      quota.notes = dto.notes;
    }

    const updatedQuota = await this.quotaRepository.save(quota);
    this.logger.log(`配额已更新 - ID: ${quotaId}`);

    return updatedQuota;
  }

  /**
   * 获取用户使用统计
   */
  async getUsageStats(userId: string): Promise<{
    quota: Quota;
    percentage: ReturnType<Quota['getUsagePercentage']>;
    remaining: {
      devices: number;
      cpu: number;
      memory: number;
      storage: number;
      traffic: number;
      hours: number;
    };
    alerts: string[];
  }> {
    const quota = await this.getUserQuota(userId);
    const percentage = quota.getUsagePercentage();
    const alerts: string[] = [];

    // 生成告警
    if (percentage.devices >= 90) {
      alerts.push(`设备配额使用率达到 ${percentage.devices.toFixed(1)}%`);
    }
    if (percentage.cpu >= 80) {
      alerts.push(`CPU 配额使用率达到 ${percentage.cpu.toFixed(1)}%`);
    }
    if (percentage.memory >= 80) {
      alerts.push(`内存配额使用率达到 ${percentage.memory.toFixed(1)}%`);
    }
    if (percentage.storage >= 80) {
      alerts.push(`存储配额使用率达到 ${percentage.storage.toFixed(1)}%`);
    }
    if (percentage.traffic >= 90) {
      alerts.push(`月流量配额使用率达到 ${percentage.traffic.toFixed(1)}%`);
    }

    return {
      quota,
      percentage,
      remaining: {
        devices: quota.getRemainingDevices(),
        cpu: quota.limits.totalCpuCores - quota.usage.usedCpuCores,
        memory: quota.limits.totalMemoryGB - quota.usage.usedMemoryGB,
        storage: quota.limits.totalStorageGB - quota.usage.usedStorageGB,
        traffic:
          quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB,
        hours:
          quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours,
      },
      alerts,
    };
  }

  /**
   * 每月重置流量和时长配额（每月1号凌晨）
   */
  @Cron('0 0 1 * *')
  async resetMonthlyQuotas(): Promise<void> {
    this.logger.log('开始重置月度配额...');
    const quotas = await this.quotaRepository.find({
      where: { status: QuotaStatus.ACTIVE },
    });

    for (const quota of quotas) {
      quota.usage.monthlyTrafficUsedGB = 0;
      quota.usage.monthlyUsageHours = 0;
      await this.quotaRepository.save(quota);
    }

    this.logger.log(`已重置 ${quotas.length} 个配额的月度使用量`);
  }

  /**
   * 每日重置日使用时长（每天凌晨）
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyQuotas(): Promise<void> {
    this.logger.log('开始重置每日配额...');
    const quotas = await this.quotaRepository.find({
      where: { status: QuotaStatus.ACTIVE },
    });

    for (const quota of quotas) {
      quota.usage.todayUsageHours = 0;
      await this.quotaRepository.save(quota);
    }

    this.logger.log(`已重置 ${quotas.length} 个配额的每日使用量`);
  }

  /**
   * 检查过期配额（每小时）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredQuotas(): Promise<void> {
    const quotas = await this.quotaRepository.find({
      where: { status: QuotaStatus.ACTIVE },
    });

    let expiredCount = 0;
    for (const quota of quotas) {
      if (quota.isExpired()) {
        quota.status = QuotaStatus.EXPIRED;
        await this.quotaRepository.save(quota);
        expiredCount++;
        this.logger.warn(`配额已过期 - 用户: ${quota.userId}, ID: ${quota.id}`);
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`检测到 ${expiredCount} 个过期配额`);
    }
  }

  // 私有辅助方法
  private initializeUsage(): QuotaUsage {
    return {
      currentDevices: 0,
      currentConcurrentDevices: 0,
      usedCpuCores: 0,
      usedMemoryGB: 0,
      usedStorageGB: 0,
      currentBandwidthMbps: 0,
      monthlyTrafficUsedGB: 0,
      todayUsageHours: 0,
      monthlyUsageHours: 0,
      lastUpdatedAt: new Date(),
    };
  }

  private calculateRemaining(quota: Quota, quotaType: QuotaType): number {
    switch (quotaType) {
      case QuotaType.DEVICE:
        return quota.getRemainingDevices();
      case QuotaType.CPU:
        return quota.limits.totalCpuCores - quota.usage.usedCpuCores;
      case QuotaType.MEMORY:
        return quota.limits.totalMemoryGB - quota.usage.usedMemoryGB;
      case QuotaType.STORAGE:
        return quota.limits.totalStorageGB - quota.usage.usedStorageGB;
      case QuotaType.BANDWIDTH:
        return (
          quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB
        );
      case QuotaType.DURATION:
        return (
          quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours
        );
      default:
        return 0;
    }
  }

  /**
   * 获取配额告警列表
   */
  async getQuotaAlerts(threshold: number = 80): Promise<{
    total: number;
    alerts: Array<{
      userId: string;
      quotaId: string;
      planName: string;
      percentage: ReturnType<Quota['getUsagePercentage']>;
      warnings: string[];
      severity: 'warning' | 'critical';
    }>;
  }> {
    const quotas = await this.quotaRepository.find({
      where: { status: QuotaStatus.ACTIVE },
      relations: ['user'],
    });

    const alerts: Array<{
      userId: string;
      quotaId: string;
      planName: string;
      percentage: ReturnType<Quota['getUsagePercentage']>;
      warnings: string[];
      severity: 'warning' | 'critical';
    }> = [];

    for (const quota of quotas) {
      const percentage = quota.getUsagePercentage();
      const warnings: string[] = [];
      let maxPercentage = 0;

      if (percentage.devices >= threshold) {
        warnings.push(`设备配额使用率 ${percentage.devices.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.devices);
      }
      if (percentage.cpu >= threshold) {
        warnings.push(`CPU 配额使用率 ${percentage.cpu.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.cpu);
      }
      if (percentage.memory >= threshold) {
        warnings.push(`内存配额使用率 ${percentage.memory.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.memory);
      }
      if (percentage.storage >= threshold) {
        warnings.push(`存储配额使用率 ${percentage.storage.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.storage);
      }
      if (percentage.traffic >= threshold) {
        warnings.push(`流量配额使用率 ${percentage.traffic.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.traffic);
      }

      // 检查使用时长配额
      if (percentage.hours >= threshold) {
        warnings.push(`时长配额使用率 ${percentage.hours.toFixed(1)}%`);
        maxPercentage = Math.max(maxPercentage, percentage.hours);
      }

      if (warnings.length > 0) {
        alerts.push({
          userId: quota.userId,
          quotaId: quota.id,
          planName: quota.planName || '未知套餐',
          percentage,
          warnings,
          severity: maxPercentage >= 95 ? 'critical' : 'warning',
        });
      }
    }

    alerts.sort((a, b) => {
      const maxA = Math.max(
        a.percentage.devices,
        a.percentage.cpu,
        a.percentage.memory,
        a.percentage.storage,
        a.percentage.traffic,
      );
      const maxB = Math.max(
        b.percentage.devices,
        b.percentage.cpu,
        b.percentage.memory,
        b.percentage.storage,
        b.percentage.traffic,
      );
      return maxB - maxA;
    });

    return {
      total: alerts.length,
      alerts,
    };
  }
}
