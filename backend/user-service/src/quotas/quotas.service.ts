import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Quota, QuotaStatus, QuotaType, QuotaLimits, QuotaUsage } from '../entities/quota.entity';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService, Cacheable, CacheEvict } from '@cloudphone/shared';
import { CreateQuotaDto, UpdateQuotaDto } from './dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventBusService } from '@cloudphone/shared';

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

// CreateQuotaDto 和 UpdateQuotaDto 已移至 ./dto 目录
// 使用 class-validator 进行验证

@Injectable()
export class QuotasService {
  private readonly logger = new Logger(QuotasService.name);
  private readonly CACHE_TTL = 300; // 5分钟缓存
  private readonly CACHE_PREFIX = 'quota:';

  constructor(
    @InjectRepository(Quota)
    private quotaRepository: Repository<Quota>,
    private dataSource: DataSource,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly eventBus: EventBusService, // ✅ 事件发布
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
   * 获取用户配额 (带缓存)
   */
  async getUserQuota(userId: string): Promise<Quota> {
    // 1. 尝试从缓存获取
    const cacheKey = `${this.CACHE_PREFIX}user:${userId}`;
    const cachedQuota = await this.cacheManager.get<Quota>(cacheKey);

    if (cachedQuota) {
      this.logger.debug(`配额缓存命中 - 用户: ${userId}`);
      return cachedQuota;
    }

    // 2. 缓存未命中,从数据库查询
    const quota = await this.quotaRepository.findOne({
      where: { userId, status: QuotaStatus.ACTIVE },
      relations: ['user'],
    });

    if (!quota) {
      throw new NotFoundException(`用户 ${userId} 未找到活跃配额`);
    }

    // 3. 检查是否过期
    if (quota.isExpired()) {
      quota.status = QuotaStatus.EXPIRED;
      await this.quotaRepository.save(quota);
      // 清除缓存
      await this.cacheManager.del(cacheKey);
      throw new BadRequestException('配额已过期');
    }

    // 4. 写入缓存
    await this.cacheManager.set(cacheKey, quota, this.CACHE_TTL * 1000);
    this.logger.debug(`配额已缓存 - 用户: ${userId}, TTL: ${this.CACHE_TTL}s`);

    return quota;
  }

  /**
   * 清除用户配额缓存
   */
  private async clearQuotaCache(userId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}user:${userId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`配额缓存已清除 - 用户: ${userId}`);
  }

  /**
   * 清除所有配额缓存
   * ✅ 优化: 清除列表缓存和告警缓存
   */
  private async clearAllQuotaCache(): Promise<void> {
    try {
      // 注意: 这个方法依赖于 Redis 的 KEYS 命令
      // 在生产环境中,考虑使用 Redis SCAN 命令以避免阻塞
      const pattern = `${this.CACHE_PREFIX}*`;

      // 如果 cache-manager 支持 reset 或 keys 方法
      if (typeof (this.cacheManager as any).store?.keys === 'function') {
        const keys = await (this.cacheManager as any).store.keys(pattern);
        for (const key of keys) {
          await this.cacheManager.del(key);
        }
        this.logger.log(`已清除 ${keys.length} 个配额缓存`);
      } else {
        // 如果不支持,使用 reset 清除所有缓存
        await this.cacheManager.reset();
        this.logger.log('已清除所有缓存');
      }
    } catch (error) {
      this.logger.error('清除配额缓存失败', error.stack);
    }
  }

  /**
   * 清除列表和告警缓存（配额变更时调用）
   */
  private async clearListAndAlertsCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}list:*`;
      const alertPattern = `${this.CACHE_PREFIX}alerts:*`;

      if (typeof (this.cacheManager as any).store?.keys === 'function') {
        // 清除列表缓存
        const listKeys = await (this.cacheManager as any).store.keys(pattern);
        const alertKeys = await (this.cacheManager as any).store.keys(alertPattern);
        const allKeys = [...listKeys, ...alertKeys];

        for (const key of allKeys) {
          await this.cacheManager.del(key);
        }
        this.logger.debug(`已清除 ${allKeys.length} 个配额列表/告警缓存`);
      }
    } catch (error) {
      this.logger.error('清除列表/告警缓存失败', error.stack);
    }
  }

  /**
   * 获取所有配额列表（管理员）
   * ✅ 优化: 添加缓存、避免不必要的 JOIN、优化分页
   */
  async getAllQuotas(options?: {
    status?: QuotaStatus;
    page?: number;
    limit?: number;
    includeUser?: boolean; // 是否包含用户信息
  }): Promise<{
    data: Quota[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100); // 限制最大 100 条
    const skip = (page - 1) * limit;
    const includeUser = options?.includeUser ?? true;

    // 构建缓存键
    const cacheKey = `${this.CACHE_PREFIX}list:page${page}:limit${limit}:status${options?.status || 'all'}:user${includeUser}`;

    // 1. 尝试从缓存获取
    const cachedResult = await this.cacheManager.get<{
      data: Quota[];
      total: number;
      page: number;
      limit: number;
    }>(cacheKey);

    if (cachedResult) {
      this.logger.debug(`配额列表缓存命中 - 页码: ${page}, 状态: ${options?.status || '全部'}`);
      return cachedResult;
    }

    // 2. 缓存未命中，从数据库查询
    const queryBuilder = this.quotaRepository
      .createQueryBuilder('quota')
      .orderBy('quota.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // 如果需要用户信息，才进行 JOIN
    if (includeUser) {
      queryBuilder.leftJoinAndSelect('quota.user', 'user');
    }

    // 如果指定了状态，添加过滤条件
    if (options?.status) {
      queryBuilder.where('quota.status = :status', { status: options.status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    const result = {
      data,
      total,
      page,
      limit,
    };

    // 3. 写入缓存 (30秒)
    await this.cacheManager.set(cacheKey, result, 30000);
    this.logger.debug(`配额列表已缓存 - 页码: ${page}, TTL: 30s`);

    return result;
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
        const remainingTraffic = quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB;
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
        const remainingHours = quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours;
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

      if (cpuCores && cpuCores > quota.limits.maxCpuCoresPerDevice) {
        return {
          allowed: false,
          reason: `单设备 CPU 超限 (请求: ${cpuCores}, 限制: ${quota.limits.maxCpuCoresPerDevice} 核)`,
          quota,
        };
      }

      if (memoryGB && memoryGB > quota.limits.maxMemoryMBPerDevice / 1024) {
        return {
          allowed: false,
          reason: `单设备内存超限 (请求: ${memoryGB}GB, 限制: ${quota.limits.maxMemoryMBPerDevice / 1024}GB)`,
          quota,
        };
      }

      if (storageGB && storageGB > quota.limits.maxStorageGBPerDevice) {
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
   *
   * ✅ 事务保护：防止并发扣减导致配额统计错误
   * ✅ 悲观锁：确保配额数据的一致性
   */
  async deductQuota(request: DeductQuotaRequest): Promise<Quota> {
    this.logger.log(
      `开始扣减配额 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}, CPU: ${request.cpuCores || 0}`
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 使用悲观写锁获取配额，防止并发修改
      const quota = await queryRunner.manager.findOne(Quota, {
        where: { userId: request.userId, status: QuotaStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!quota) {
        throw new NotFoundException(`用户 ${request.userId} 未找到活跃配额`);
      }

      // 在锁保护下修改配额
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
      const wasExceeded = quota.status === QuotaStatus.EXCEEDED;
      const isNowExceeded =
        quota.usage.currentDevices > quota.limits.maxDevices ||
        quota.usage.usedCpuCores > quota.limits.totalCpuCores ||
        quota.usage.usedMemoryGB > quota.limits.totalMemoryGB ||
        quota.usage.usedStorageGB > quota.limits.totalStorageGB;

      if (isNowExceeded) {
        quota.status = QuotaStatus.EXCEEDED;
      }

      const updatedQuota = await queryRunner.manager.save(Quota, quota);

      await queryRunner.commitTransaction();

      // ✅ 清除缓存并发布事件
      await this.clearQuotaCache(request.userId);
      await this.clearListAndAlertsCache(); // 清除列表和告警缓存
      await this.publishQuotaChangeEvent(request.userId, 'deducted', updatedQuota);

      // ✅ 如果刚刚超额，发布超额事件
      if (isNowExceeded && !wasExceeded) {
        await this.eventBus.publish('cloudphone.events', 'quota.exceeded', {
          userId: request.userId,
          quotaId: quota.id,
          type: 'exceeded',
          limits: quota.limits,
          usage: quota.usage,
          usagePercent: Math.max(
            (quota.usage.currentDevices / quota.limits.maxDevices) * 100,
            (quota.usage.usedCpuCores / quota.limits.totalCpuCores) * 100,
            (quota.usage.usedMemoryGB / quota.limits.totalMemoryGB) * 100,
            (quota.usage.usedStorageGB / quota.limits.totalStorageGB) * 100
          ),
          timestamp: new Date().toISOString(),
        });
        this.logger.error(`配额超额 - 用户: ${request.userId}, 配额: ${quota.id}`);
      }

      this.logger.log(
        `配额已扣减 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}, CPU: ${request.cpuCores || 0}`
      );

      return updatedQuota;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `配额扣减失败 - 用户: ${request.userId}: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 恢复配额
   *
   * ✅ 事务保护：防止并发恢复导致配额统计错误
   * ✅ 悲观锁：确保配额数据的一致性
   */
  async restoreQuota(request: RestoreQuotaRequest): Promise<Quota> {
    this.logger.log(
      `开始恢复配额 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}`
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 使用悲观写锁获取配额，防止并发修改
      const quota = await queryRunner.manager.findOne(Quota, {
        where: { userId: request.userId, status: QuotaStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });

      if (!quota) {
        throw new NotFoundException(`用户 ${request.userId} 未找到活跃配额`);
      }

      // 在锁保护下修改配额
      if (request.deviceCount) {
        quota.usage.currentDevices = Math.max(0, quota.usage.currentDevices - request.deviceCount);
        if (request.concurrent) {
          quota.usage.currentConcurrentDevices = Math.max(
            0,
            quota.usage.currentConcurrentDevices - request.deviceCount
          );
        }
      }

      if (request.cpuCores) {
        quota.usage.usedCpuCores = Math.max(0, quota.usage.usedCpuCores - request.cpuCores);
      }

      if (request.memoryGB) {
        quota.usage.usedMemoryGB = Math.max(0, quota.usage.usedMemoryGB - request.memoryGB);
      }

      if (request.storageGB) {
        quota.usage.usedStorageGB = Math.max(0, quota.usage.usedStorageGB - request.storageGB);
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

      const updatedQuota = await queryRunner.manager.save(Quota, quota);

      await queryRunner.commitTransaction();

      // ✅ 清除缓存并发布事件
      await this.clearQuotaCache(request.userId);
      await this.clearListAndAlertsCache(); // 清除列表和告警缓存
      await this.publishQuotaChangeEvent(request.userId, 'restored', updatedQuota);

      this.logger.log(`配额已恢复 - 用户: ${request.userId}, 设备: ${request.deviceCount || 0}`);

      return updatedQuota;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `配额恢复失败 - 用户: ${request.userId}: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
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

    // ✅ 清除缓存
    await this.clearQuotaCache(quota.userId);
    await this.clearListAndAlertsCache();

    // ✅ 发布配额更新事件
    await this.eventBus.publish('cloudphone.events', 'quota.updated', {
      userId: quota.userId,
      quotaId: quota.id,
      type: 'updated',
      limits: quota.limits,
      usage: quota.usage,
      status: quota.status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`配额已更新 - ID: ${quotaId}`);

    return updatedQuota;
  }

  /**
   * 删除配额
   */
  async deleteQuota(quotaId: string): Promise<void> {
    const quota = await this.quotaRepository.findOne({
      where: { id: quotaId },
    });

    if (!quota) {
      throw new NotFoundException(`配额 ${quotaId} 未找到`);
    }

    // 软删除：将状态设置为 SUSPENDED
    quota.status = QuotaStatus.SUSPENDED;
    await this.quotaRepository.save(quota);

    // 清除缓存
    await this.clearQuotaCache(quota.userId);
    await this.clearListAndAlertsCache();

    // 发布配额删除事件
    await this.eventBus.publish('cloudphone.events', 'quota.deleted', {
      userId: quota.userId,
      quotaId: quota.id,
      type: 'deleted',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`配额已删除 - ID: ${quotaId}, 用户: ${quota.userId}`);
  }

  /**
   * 续费配额
   *
   * 延长配额有效期，常用于套餐续费场景
   */
  async renewQuota(userId: string, extensionDays: number = 30): Promise<Quota> {
    const quota = await this.getUserQuota(userId);

    if (!quota) {
      throw new NotFoundException(`用户 ${userId} 未找到活跃配额`);
    }

    // 计算新的有效期
    const now = new Date();
    let newValidUntil: Date;

    if (quota.validUntil && quota.validUntil > now) {
      // 如果还未过期，从当前有效期开始延长
      newValidUntil = new Date(quota.validUntil.getTime() + extensionDays * 24 * 60 * 60 * 1000);
    } else {
      // 如果已过期，从现在开始计算
      newValidUntil = new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000);
    }

    quota.validUntil = newValidUntil;

    // 如果之前是过期状态，恢复为活跃
    if (quota.status === QuotaStatus.EXPIRED) {
      quota.status = QuotaStatus.ACTIVE;
    }

    const renewedQuota = await this.quotaRepository.save(quota);

    // ✅ 清除缓存
    await this.clearQuotaCache(userId);
    await this.clearListAndAlertsCache();

    // ✅ 发布配额续费事件
    await this.eventBus.publish('cloudphone.events', 'quota.renewed', {
      userId,
      quotaId: quota.id,
      type: 'renewed',
      limits: quota.limits,
      validUntil: newValidUntil.toISOString(),
      extensionDays,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`配额已续费 - 用户: ${userId}, 延长: ${extensionDays} 天, 新有效期: ${newValidUntil.toISOString()}`);

    return renewedQuota;
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
        traffic: quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB,
        hours: quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours,
      },
      alerts,
    };
  }

  /**
   * 每月重置流量和时长配额（每月1号凌晨）
   * ✅ 优化: 使用批量更新 + 分布式锁
   */
  @ClusterSafeCron('0 0 1 * *')
  async resetMonthlyQuotas(): Promise<void> {
    await this.lockService.withLock(
      'quota:reset:monthly',
      300000, // 5分钟超时
      async () => {
        this.logger.log('开始重置月度配额...');

        // ✅ 使用批量更新替代逐个保存
        const result = await this.quotaRepository
          .createQueryBuilder()
          .update(Quota)
          .set({
            usage: () => `jsonb_set(jsonb_set(usage, '{monthlyTrafficUsedGB}', '0'), '{monthlyUsageHours}', '0')`,
          })
          .where('status = :status', { status: QuotaStatus.ACTIVE })
          .execute();

        this.logger.log(`已重置 ${result.affected} 个配额的月度使用量`);

        // ✅ 清除所有配额缓存
        await this.clearAllQuotaCache();
      },
    );
  }

  /**
   * 每日重置日使用时长（每天凌晨）
   * ✅ 优化: 使用批量更新 + 分布式锁
   */
  @ClusterSafeCron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyQuotas(): Promise<void> {
    await this.lockService.withLock(
      'quota:reset:daily',
      300000, // 5分钟超时
      async () => {
        this.logger.log('开始重置每日配额...');

        // ✅ 使用批量更新
        const result = await this.quotaRepository
          .createQueryBuilder()
          .update(Quota)
          .set({
            usage: () => `jsonb_set(usage, '{todayUsageHours}', '0')`,
          })
          .where('status = :status', { status: QuotaStatus.ACTIVE })
          .execute();

        this.logger.log(`已重置 ${result.affected} 个配额的每日使用量`);

        // ✅ 清除所有配额缓存
        await this.clearAllQuotaCache();
      },
    );
  }

  /**
   * 检查过期配额（每小时）
   */
  @ClusterSafeCron(CronExpression.EVERY_HOUR)
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
        return quota.limits.monthlyTrafficGB - quota.usage.monthlyTrafficUsedGB;
      case QuotaType.DURATION:
        return quota.limits.maxUsageHoursPerMonth - quota.usage.monthlyUsageHours;
      default:
        return 0;
    }
  }

  /**
   * 发布配额变更事件
   */
  private async publishQuotaChangeEvent(
    userId: string,
    action: 'deducted' | 'restored' | 'exceeded' | 'expired',
    quota: Quota
  ): Promise<void> {
    try {
      await this.eventBus.publish('cloudphone.events', `quota.${action}`, {
        userId,
        quotaId: quota.id,
        action,
        usage: quota.usage,
        limits: quota.limits,
        status: quota.status,
        percentage: quota.getUsagePercentage(),
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`配额事件已发布 - 用户: ${userId}, 动作: ${action}`);
    } catch (error) {
      this.logger.error(`发布配额事件失败 - 用户: ${userId}`, error.stack);
    }
  }

  /**
   * 获取配额告警列表
   * ✅ 优化: 添加缓存，减少重复计算
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
    // 构建缓存键
    const cacheKey = `${this.CACHE_PREFIX}alerts:threshold${threshold}`;

    // 1. 尝试从缓存获取
    const cachedAlerts = await this.cacheManager.get<{
      total: number;
      alerts: Array<{
        userId: string;
        quotaId: string;
        planName: string;
        percentage: ReturnType<Quota['getUsagePercentage']>;
        warnings: string[];
        severity: 'warning' | 'critical';
      }>;
    }>(cacheKey);

    if (cachedAlerts) {
      this.logger.debug(`告警列表缓存命中 - 阈值: ${threshold}%`);
      return cachedAlerts;
    }

    // 2. 缓存未命中，从数据库查询
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
        a.percentage.traffic
      );
      const maxB = Math.max(
        b.percentage.devices,
        b.percentage.cpu,
        b.percentage.memory,
        b.percentage.storage,
        b.percentage.traffic
      );
      return maxB - maxA;
    });

    const result = {
      total: alerts.length,
      alerts,
    };

    // 3. 写入缓存 (60秒)
    await this.cacheManager.set(cacheKey, result, 60000);
    this.logger.debug(`告警列表已缓存 - 阈值: ${threshold}%, TTL: 60s`);

    return result;
  }
}
