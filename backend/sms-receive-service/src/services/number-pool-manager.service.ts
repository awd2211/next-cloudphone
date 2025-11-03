import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NumberPool } from '../entities/number-pool.entity';
import { PlatformSelectorService } from './platform-selector.service';
import { MetricsService } from '../health/metrics.service';

/**
 * 号码池管理器服务
 *
 * 核心功能：
 * 1. 号码预热 - 提前获取号码，减少用户等待时间
 * 2. 号码复用 - 号码使用后冷却，然后可以再次使用
 * 3. 自动补充 - 监控池大小，自动补充到目标水平
 * 4. 过期清理 - 自动清理过期的号码
 * 5. 智能分配 - 优先分配预热的号码
 */
@Injectable()
export class NumberPoolManagerService {
  private readonly logger = new Logger(NumberPoolManagerService.name);

  // 配置参数
  private readonly MIN_POOL_SIZE = 5; // 最小池大小
  private readonly TARGET_POOL_SIZE = 10; // 目标池大小
  private readonly MAX_POOL_SIZE = 20; // 最大池大小
  private readonly NUMBER_COOLDOWN_HOURS = 24; // 号码冷却时间（小时）
  private readonly NUMBER_LIFETIME_MINUTES = 20; // 号码有效期（分钟）

  constructor(
    @InjectRepository(NumberPool)
    private readonly numberPoolRepo: Repository<NumberPool>,
    private readonly platformSelector: PlatformSelectorService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.log('Number Pool Manager initialized');
  }

  /**
   * 从池中获取一个号码（立即可用）
   * @param serviceCode 服务代码
   * @param countryCode 国家代码
   * @param deviceId 设备ID（用于追踪）
   * @returns 号码信息或null
   */
  async acquireNumber(
    serviceCode: string,
    countryCode: string,
    deviceId?: string,
  ): Promise<NumberPool | null> {
    const now = new Date();

    // 1. 查找可用的预热号码（优先）
    const preheatedNumber = await this.numberPoolRepo.findOne({
      where: {
        serviceCode,
        countryCode,
        status: 'available',
        preheated: true,
        expiresAt: MoreThan(now),
      },
      order: { priority: 'DESC', preheatedAt: 'ASC' },
    });

    if (preheatedNumber) {
      return await this.reserveNumber(preheatedNumber, deviceId);
    }

    // 2. 如果没有预热号码，查找普通可用号码
    const availableNumber = await this.numberPoolRepo.findOne({
      where: {
        serviceCode,
        countryCode,
        status: 'available',
        expiresAt: MoreThan(now),
      },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    if (availableNumber) {
      return await this.reserveNumber(availableNumber, deviceId);
    }

    this.logger.warn(
      `No available numbers in pool for service=${serviceCode}, country=${countryCode}`,
    );

    return null;
  }

  /**
   * 保留号码
   */
  private async reserveNumber(
    number: NumberPool,
    deviceId?: string,
  ): Promise<NumberPool> {
    number.status = 'reserved';
    number.reservedByDevice = deviceId || null;
    number.reservedAt = new Date();
    number.reservedCount++;

    const saved = await this.numberPoolRepo.save(number);

    // 记录指标
    this.metricsService.recordNumberPoolReused(number.provider);

    this.logger.log(
      `Number reserved: ${number.phoneNumber} (provider=${number.provider}, preheated=${number.preheated})`,
    );

    return saved;
  }

  /**
   * 标记号码已使用
   */
  async markNumberUsed(numberId: string, success: boolean): Promise<void> {
    const number = await this.numberPoolRepo.findOne({ where: { id: numberId } });

    if (!number) {
      this.logger.warn(`Number ${numberId} not found in pool`);
      return;
    }

    number.status = 'used';
    number.usedCount++;

    // 如果使用成功，设置冷却期后可以复用
    if (success && number.usedCount < 3) {
      // 限制最多复用3次
      const cooldownEnd = new Date();
      cooldownEnd.setHours(cooldownEnd.getHours() + this.NUMBER_COOLDOWN_HOURS);
      number.expiresAt = cooldownEnd;
    }

    await this.numberPoolRepo.save(number);

    this.logger.log(`Number marked as used: ${number.phoneNumber} (success=${success})`);
  }

  /**
   * 释放保留的号码（未使用）
   */
  async releaseNumber(numberId: string): Promise<void> {
    const number = await this.numberPoolRepo.findOne({ where: { id: numberId } });

    if (!number) {
      this.logger.warn(`Number ${numberId} not found in pool`);
      return;
    }

    if (number.status !== 'reserved') {
      this.logger.warn(`Number ${numberId} is not in reserved state`);
      return;
    }

    // 检查是否过期
    if (number.expiresAt < new Date()) {
      number.status = 'expired';
    } else {
      number.status = 'available';
      number.reservedByDevice = null;
      number.reservedAt = null;
    }

    await this.numberPoolRepo.save(number);

    this.logger.log(`Number released: ${number.phoneNumber}`);
  }

  /**
   * 预热号码（批量获取）
   * @param serviceCode 服务代码
   * @param countryCode 国家代码
   * @param count 数量
   */
  async preheatNumbers(
    serviceCode: string,
    countryCode: string,
    count: number,
  ): Promise<number> {
    this.logger.log(`Preheating ${count} numbers for ${serviceCode}/${countryCode}`);

    let successCount = 0;

    for (let i = 0; i < count; i++) {
      try {
        // 选择最优平台
        const selection = await this.platformSelector.selectBestPlatform(
          serviceCode,
          countryCode,
        );

        // 这里应该调用实际的号码获取API
        // 简化示例：模拟获取号码
        const phoneNumber = `+${countryCode}${Math.floor(Math.random() * 10000000000)}`;
        const activationId = `preheat_${Date.now()}_${i}`;
        const cost = Math.random() * 0.1 + 0.05; // $0.05-$0.15

        const numberPool = this.numberPoolRepo.create({
          provider: selection.providerName,
          providerActivationId: activationId,
          phoneNumber,
          countryCode,
          serviceCode,
          cost,
          status: 'available',
          preheated: true,
          preheatedAt: new Date(),
          priority: 10, // 预热号码优先级更高
          expiresAt: new Date(Date.now() + this.NUMBER_LIFETIME_MINUTES * 60 * 1000),
        });

        await this.numberPoolRepo.save(numberPool);
        successCount++;

        this.logger.debug(`Preheated number: ${phoneNumber}`);
      } catch (error) {
        this.logger.error(`Failed to preheat number ${i + 1}/${count}: ${error.message}`);
      }
    }

    this.logger.log(`Successfully preheated ${successCount}/${count} numbers`);

    return successCount;
  }

  /**
   * 获取池统计信息
   */
  async getPoolStatistics(serviceCode?: string, countryCode?: string) {
    const where: any = {};

    if (serviceCode) {
      where.serviceCode = serviceCode;
    }

    if (countryCode) {
      where.countryCode = countryCode;
    }

    const [total, available, reserved, used] = await Promise.all([
      this.numberPoolRepo.count({ where }),
      this.numberPoolRepo.count({ where: { ...where, status: 'available' } }),
      this.numberPoolRepo.count({ where: { ...where, status: 'reserved' } }),
      this.numberPoolRepo.count({ where: { ...where, status: 'used' } }),
    ]);

    const preheated = await this.numberPoolRepo.count({
      where: { ...where, preheated: true, status: 'available' },
    });

    return {
      total,
      available,
      reserved,
      used,
      preheated,
      utilizationRate: total > 0 ? ((reserved + used) / total) * 100 : 0,
      preheatedRate: available > 0 ? (preheated / available) * 100 : 0,
    };
  }

  /**
   * 定时任务：自动补充号码池
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoReplenishPool() {
    this.logger.debug('Running auto-replenish pool job...');

    // 针对常用的服务和国家组合
    const commonConfigs = [
      { serviceCode: 'telegram', countryCode: '1' }, // 美国
      { serviceCode: 'whatsapp', countryCode: '1' },
      { serviceCode: 'twitter', countryCode: '1' },
    ];

    for (const config of commonConfigs) {
      try {
        const stats = await this.getPoolStatistics(config.serviceCode, config.countryCode);

        if (stats.available < this.MIN_POOL_SIZE) {
          const toAdd = this.TARGET_POOL_SIZE - stats.available;
          this.logger.log(
            `Pool low for ${config.serviceCode}/${config.countryCode}: ${stats.available}/${this.MIN_POOL_SIZE}. Adding ${toAdd} numbers.`,
          );

          await this.preheatNumbers(config.serviceCode, config.countryCode, toAdd);
        }
      } catch (error) {
        this.logger.error(
          `Failed to replenish pool for ${config.serviceCode}/${config.countryCode}: ${error.message}`,
        );
      }
    }
  }

  /**
   * 定时任务：清理过期号码
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredNumbers() {
    const now = new Date();

    const expired = await this.numberPoolRepo.find({
      where: {
        expiresAt: LessThan(now),
        status: 'available', // 只清理未使用的过期号码
      },
    });

    if (expired.length > 0) {
      // 标记为过期
      for (const number of expired) {
        number.status = 'expired';
      }

      await this.numberPoolRepo.save(expired);

      this.logger.log(`Cleaned up ${expired.length} expired numbers`);

      // 删除很久以前过期的号码（超过7天）
      const veryOld = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await this.numberPoolRepo.delete({
        status: 'expired',
        expiresAt: LessThan(veryOld),
      });
    }
  }

  /**
   * 定时任务：处理冷却中的号码
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processCooldownNumbers() {
    const now = new Date();

    // 找出已经过了冷却期的号码
    const cooledDown = await this.numberPoolRepo.find({
      where: {
        status: 'used',
        expiresAt: LessThan(now), // 冷却期已结束
      },
    });

    if (cooledDown.length > 0) {
      for (const number of cooledDown) {
        // 重置号码状态，可以再次使用
        number.status = 'available';
        number.reservedByDevice = null;
        number.reservedAt = null;
        number.preheated = false; // 复用的号码不再标记为预热
        number.priority = 5; // 降低优先级
        // 延长有效期
        number.expiresAt = new Date(Date.now() + this.NUMBER_LIFETIME_MINUTES * 60 * 1000);
      }

      await this.numberPoolRepo.save(cooledDown);

      this.logger.log(`Reactivated ${cooledDown.length} cooled-down numbers`);
    }
  }
}
