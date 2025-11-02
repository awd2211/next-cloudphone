import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Device } from '../entities/device.entity';
import { ProxyUsage, ProxyReleaseReason } from '../entities/proxy-usage.entity';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyClientService } from '@cloudphone/shared';

/**
 * 代理清理服务
 * 负责检测和清理孤儿代理（已分配但设备不存在的代理）
 */
@Injectable()
export class ProxyCleanupService {
  private readonly logger = new Logger(ProxyCleanupService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(ProxyUsage)
    private readonly proxyUsageRepository: Repository<ProxyUsage>,
    private readonly proxyStats: ProxyStatsService,
    private readonly proxyClient: ProxyClientService,
  ) {}

  /**
   * 定时清理任务（每 2 小时）
   * 自动检测并清理孤儿代理
   */
  @Cron('0 */2 * * *') // 每2小时执行一次
  async performScheduledCleanup(): Promise<void> {
    this.logger.log('Starting scheduled orphan proxy cleanup...');

    try {
      const orphans = await this.detectOrphanProxies();

      if (orphans.length === 0) {
        this.logger.debug('No orphan proxies found');
        return;
      }

      this.logger.warn(
        `Found ${orphans.length} orphan proxies, initiating cleanup...`,
      );

      const results = await this.cleanupOrphanProxies(orphans);

      this.logger.log(
        `Orphan proxy cleanup completed: ${results.released}/${results.total} released successfully, ${results.failed} failed`,
      );
    } catch (error) {
      this.logger.error('Scheduled orphan cleanup failed', error.stack);
    }
  }

  /**
   * 检测孤儿代理
   * 孤儿代理定义：proxy_usage 中存在但对应的设备不存在或已删除
   */
  async detectOrphanProxies(): Promise<
    Array<{
      usageId: string;
      deviceId: string;
      proxyId: string;
      proxyHost: string;
      proxyPort: number;
      assignedAt: Date;
      reason: string;
    }>
  > {
    this.logger.debug('Detecting orphan proxies...');

    // 1. 获取所有未释放的代理使用记录
    const activeUsages = await this.proxyUsageRepository.find({
      where: {
        releasedAt: IsNull(),
      },
      select: [
        'id',
        'deviceId',
        'proxyId',
        'proxyHost',
        'proxyPort',
        'assignedAt',
      ],
    });

    if (activeUsages.length === 0) {
      this.logger.debug('No active proxy usages found');
      return [];
    }

    this.logger.debug(`Found ${activeUsages.length} active proxy usages`);

    // 2. 交叉检查设备是否存在
    const deviceIds = activeUsages.map((usage) => usage.deviceId);
    const existingDevices = await this.deviceRepository.find({
      where: deviceIds.map((id) => ({ id })),
      select: ['id'],
    });

    const existingDeviceIds = new Set(existingDevices.map((d) => d.id));

    // 3. 识别孤儿代理
    const orphans = activeUsages
      .filter((usage) => !existingDeviceIds.has(usage.deviceId))
      .map((usage) => ({
        usageId: usage.id,
        deviceId: usage.deviceId,
        proxyId: usage.proxyId,
        proxyHost: usage.proxyHost,
        proxyPort: usage.proxyPort,
        assignedAt: usage.assignedAt,
        reason: 'Device not found in database',
      }));

    if (orphans.length > 0) {
      this.logger.warn(
        `Detected ${orphans.length} orphan proxies: ${orphans.map((o) => o.proxyId).join(', ')}`,
      );
    }

    return orphans;
  }

  /**
   * 清理孤儿代理
   * 释放代理并更新统计记录
   */
  async cleanupOrphanProxies(
    orphans: Array<{
      usageId: string;
      deviceId: string;
      proxyId: string;
      proxyHost: string;
      proxyPort: number;
      assignedAt: Date;
      reason: string;
    }>,
  ): Promise<{
    total: number;
    released: number;
    failed: number;
    errors: Array<{ proxyId: string; error: string }>;
  }> {
    const results = {
      total: orphans.length,
      released: 0,
      failed: 0,
      errors: [] as Array<{ proxyId: string; error: string }>,
    };

    // 并发清理所有孤儿代理
    const cleanupPromises = orphans.map((orphan) =>
      this.cleanupSingleOrphan(orphan)
        .then(() => {
          results.released++;
          this.logger.debug(`Successfully cleaned up orphan proxy: ${orphan.proxyId}`);
        })
        .catch((error) => {
          results.failed++;
          results.errors.push({
            proxyId: orphan.proxyId,
            error: error.message,
          });
          this.logger.error(
            `Failed to cleanup orphan proxy ${orphan.proxyId}`,
            error.stack,
          );
        }),
    );

    await Promise.allSettled(cleanupPromises);

    return results;
  }

  /**
   * 清理单个孤儿代理
   */
  private async cleanupSingleOrphan(orphan: {
    usageId: string;
    deviceId: string;
    proxyId: string;
    proxyHost: string;
    proxyPort: number;
    assignedAt: Date;
    reason: string;
  }): Promise<void> {
    this.logger.log(
      `Cleaning up orphan proxy: ${orphan.proxyId} (device: ${orphan.deviceId}, reason: ${orphan.reason})`,
    );

    try {
      // 1. 调用 proxy-service 释放代理
      await this.proxyClient.releaseProxy(orphan.proxyId);
      this.logger.debug(`Released orphan proxy ${orphan.proxyId} from proxy-service`);
    } catch (error) {
      // 即使 proxy-service 释放失败，也继续更新本地统计
      this.logger.warn(
        `Failed to release orphan proxy ${orphan.proxyId} from proxy-service: ${error.message}`,
      );
    }

    // 2. 更新统计记录（标记为已释放）
    await this.proxyStats.recordProxyRelease(
      orphan.deviceId,
      orphan.proxyId,
      ProxyReleaseReason.ORPHAN_CLEANUP,
    );

    this.logger.log(`Orphan proxy ${orphan.proxyId} cleanup completed`);
  }

  /**
   * 手动触发孤儿检测（仅检测，不清理）
   */
  async triggerOrphanDetection(): Promise<{
    orphanCount: number;
    orphans: Array<{
      proxyId: string;
      deviceId: string;
      assignedAt: Date;
      reason: string;
    }>;
  }> {
    this.logger.log('Manual orphan detection triggered');

    const orphans = await this.detectOrphanProxies();

    return {
      orphanCount: orphans.length,
      orphans: orphans.map((o) => ({
        proxyId: o.proxyId,
        deviceId: o.deviceId,
        assignedAt: o.assignedAt,
        reason: o.reason,
      })),
    };
  }

  /**
   * 手动触发完整清理（检测 + 清理）
   */
  async triggerFullCleanup(): Promise<{
    detected: number;
    released: number;
    failed: number;
    errors: Array<{ proxyId: string; error: string }>;
  }> {
    this.logger.log('Manual full cleanup triggered');

    const orphans = await this.detectOrphanProxies();

    if (orphans.length === 0) {
      return {
        detected: 0,
        released: 0,
        failed: 0,
        errors: [],
      };
    }

    const results = await this.cleanupOrphanProxies(orphans);

    this.logger.log(
      `Manual cleanup completed: ${results.released}/${results.total} released, ${results.failed} failed`,
    );

    return {
      detected: orphans.length,
      released: results.released,
      failed: results.failed,
      errors: results.errors,
    };
  }

  /**
   * 清理特定代理（强制释放）
   */
  async forceCleanupProxy(proxyId: string): Promise<void> {
    this.logger.log(`Force cleanup proxy: ${proxyId}`);

    // 查找使用记录
    const usage = await this.proxyUsageRepository.findOne({
      where: {
        proxyId,
        releasedAt: IsNull(),
      },
    });

    if (!usage) {
      throw new Error(`No active usage found for proxy ${proxyId}`);
    }

    // 执行清理
    await this.cleanupSingleOrphan({
      usageId: usage.id,
      deviceId: usage.deviceId,
      proxyId: usage.proxyId,
      proxyHost: usage.proxyHost,
      proxyPort: usage.proxyPort,
      assignedAt: usage.assignedAt,
      reason: 'Manual force cleanup',
    });

    this.logger.log(`Force cleanup completed for proxy ${proxyId}`);
  }

  /**
   * 获取孤儿代理统计信息
   */
  async getOrphanStatistics(): Promise<{
    totalActiveUsages: number;
    orphanCount: number;
    orphanPercentage: number;
    oldestOrphan: Date | null;
  }> {
    const activeUsages = await this.proxyUsageRepository.count({
      where: {
        releasedAt: IsNull(),
      },
    });

    const orphans = await this.detectOrphanProxies();
    const orphanCount = orphans.length;

    const oldestOrphan =
      orphans.length > 0
        ? orphans.reduce((oldest, current) =>
            current.assignedAt < oldest.assignedAt ? current : oldest,
          ).assignedAt
        : null;

    return {
      totalActiveUsages: activeUsages,
      orphanCount,
      orphanPercentage:
        activeUsages > 0 ? (orphanCount / activeUsages) * 100 : 0,
      oldestOrphan,
    };
  }
}
