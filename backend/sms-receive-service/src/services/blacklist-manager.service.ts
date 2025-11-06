import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { ProviderBlacklist } from '../entities/provider-blacklist.entity';

/**
 * 黑名单管理器服务
 *
 * 功能：
 * 1. 自动黑名单管理（连续失败触发）
 * 2. 手动黑名单添加/移除
 * 3. 临时黑名单自动过期
 * 4. 黑名单查询和统计
 */
@Injectable()
export class BlacklistManagerService {
  private readonly logger = new Logger(BlacklistManagerService.name);

  // 触发自动黑名单的连续失败次数阈值
  private readonly AUTO_BLACKLIST_THRESHOLD = 5;

  // 自动黑名单默认持续时间（小时）
  private readonly AUTO_BLACKLIST_DURATION_HOURS = 1;

  constructor(
    @InjectRepository(ProviderBlacklist)
    private readonly blacklistRepo: Repository<ProviderBlacklist>,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety: Required for @ClusterSafeCron
  ) {}

  /**
   * 检查平台是否在黑名单中
   */
  async isBlacklisted(provider: string): Promise<boolean> {
    const now = new Date();

    const count = await this.blacklistRepo.count({
      where: [
        {
          provider,
          isActive: true,
          blacklistType: 'permanent',
        },
        {
          provider,
          isActive: true,
          blacklistType: 'manual',
        },
        {
          provider,
          isActive: true,
          blacklistType: 'temporary',
          expiresAt: MoreThan(now),
        },
      ],
    });

    return count > 0;
  }

  /**
   * 添加到黑名单（手动）
   */
  async addToBlacklist(
    provider: string,
    reason: string,
    options?: {
      type?: 'temporary' | 'permanent' | 'manual';
      durationHours?: number;
      triggeredBy?: string;
      notes?: string;
    },
  ): Promise<ProviderBlacklist> {
    const blacklistType = options?.type || 'manual';
    let expiresAt: Date | undefined;

    if (blacklistType === 'temporary') {
      const hours = options?.durationHours || this.AUTO_BLACKLIST_DURATION_HOURS;
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const blacklistEntry = this.blacklistRepo.create({
      provider,
      reason,
      blacklistType,
      triggeredBy: options?.triggeredBy || 'admin',
      expiresAt,
      isActive: true,
      notes: options?.notes,
    });

    const saved = await this.blacklistRepo.save(blacklistEntry);

    this.logger.warn(
      `Provider ${provider} added to blacklist (${blacklistType}). Reason: ${reason}`,
    );

    return saved;
  }

  /**
   * 从黑名单移除
   */
  async removeFromBlacklist(
    provider: string,
    reason: string = 'Manual removal',
  ): Promise<void> {
    const entries = await this.blacklistRepo.find({
      where: {
        provider,
        isActive: true,
      },
    });

    for (const entry of entries) {
      entry.isActive = false;
      entry.removedAt = new Date();
      entry.notes = (entry.notes || '') + `\nRemoved: ${reason}`;
      await this.blacklistRepo.save(entry);
    }

    this.logger.log(`Provider ${provider} removed from blacklist: ${reason}`);
  }

  /**
   * 自动黑名单处理（连续失败触发）
   */
  async handleConsecutiveFailures(
    provider: string,
    failureCount: number,
    lastError: string,
  ): Promise<void> {
    if (failureCount >= this.AUTO_BLACKLIST_THRESHOLD) {
      // 检查是否已经在黑名单中
      const isBlacklisted = await this.isBlacklisted(provider);

      if (!isBlacklisted) {
        await this.addToBlacklist(
          provider,
          `Auto-blacklisted after ${failureCount} consecutive failures`,
          {
            type: 'temporary',
            durationHours: this.AUTO_BLACKLIST_DURATION_HOURS,
            triggeredBy: 'auto',
            notes: `Last error: ${lastError}`,
          },
        );
      }
    }
  }

  /**
   * 获取所有黑名单记录
   */
  async getAllBlacklist(includeInactive: boolean = false): Promise<ProviderBlacklist[]> {
    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.blacklistRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取特定平台的黑名单历史
   */
  async getProviderBlacklistHistory(provider: string): Promise<ProviderBlacklist[]> {
    return this.blacklistRepo.find({
      where: { provider },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 定时任务：清理过期的临时黑名单
   */
  @ClusterSafeCron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredBlacklist() {
    const now = new Date();

    const expired = await this.blacklistRepo.find({
      where: {
        isActive: true,
        blacklistType: 'temporary',
        expiresAt: LessThan(now),
      },
    });

    if (expired.length > 0) {
      for (const entry of expired) {
        entry.isActive = false;
        entry.autoRemoved = true;
        entry.removedAt = now;
        await this.blacklistRepo.save(entry);

        this.logger.log(
          `Auto-removed expired blacklist for provider ${entry.provider}`,
        );
      }
    }
  }

  /**
   * 获取黑名单统计
   */
  async getBlacklistStatistics() {
    const total = await this.blacklistRepo.count({ where: { isActive: true } });
    const permanent = await this.blacklistRepo.count({
      where: { isActive: true, blacklistType: 'permanent' },
    });
    const temporary = await this.blacklistRepo.count({
      where: { isActive: true, blacklistType: 'temporary' },
    });
    const manual = await this.blacklistRepo.count({
      where: { isActive: true, blacklistType: 'manual' },
    });

    return {
      total,
      permanent,
      temporary,
      manual,
    };
  }
}
