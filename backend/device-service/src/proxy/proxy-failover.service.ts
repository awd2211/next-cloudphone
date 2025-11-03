import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import {
  ProxyUsage,
  ProxyReleaseReason,
  ProxyHealthStatus,
} from '../entities/proxy-usage.entity';
import { ProxyPoolService } from './proxy-pool.service';
import {
  ProxySelectionService,
  ProxySelectionStrategy,
} from './proxy-selection.service';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyHealthService } from './proxy-health.service';
import { ProxyClientService } from '@cloudphone/shared';

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  // 是否启用自动故障转移
  enabled: boolean;
  // 最大重试次数
  maxRetries: number;
  // 重试延迟（毫秒）
  retryDelayMs: number;
  // 失败后黑名单持续时间（毫秒）
  blacklistDurationMs: number;
  // 自动触发故障转移的条件
  triggers: {
    // 连续失败次数阈值
    consecutiveFailures: number;
    // 健康检查失败次数阈值
    healthCheckFailures: number;
    // 延迟阈值（毫秒）
    latencyThreshold: number;
  };
}

/**
 * 故障转移记录
 */
export interface FailoverRecord {
  deviceId: string;
  deviceName: string;
  oldProxyId: string;
  newProxyId: string;
  reason: string;
  timestamp: Date;
  success: boolean;
  retries: number;
  error?: string;
}

/**
 * 代理故障转移服务
 *
 * 功能:
 * 1. 自动检测代理故障
 * 2. 自动切换到新代理
 * 3. 更新设备代理配置
 * 4. 记录故障转移历史
 * 5. 触发健康检查
 * 6. 管理失败代理黑名单
 */
@Injectable()
export class ProxyFailoverService {
  private readonly logger = new Logger(ProxyFailoverService.name);

  // 故障转移配置
  private config: FailoverConfig = {
    enabled: true,
    maxRetries: 3,
    retryDelayMs: 2000,
    blacklistDurationMs: 5 * 60 * 1000, // 5分钟
    triggers: {
      consecutiveFailures: 3,
      healthCheckFailures: 2,
      latencyThreshold: 5000,
    },
  };

  // 故障转移历史
  private failoverHistory: FailoverRecord[] = [];

  // 设备故障计数（deviceId -> failure count）
  private deviceFailureCounts: Map<string, number> = new Map();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(ProxyUsage)
    private readonly proxyUsageRepository: Repository<ProxyUsage>,
    private readonly proxyPool: ProxyPoolService,
    private readonly proxySelection: ProxySelectionService,
    private readonly proxyStats: ProxyStatsService,
    private readonly proxyHealth: ProxyHealthService,
    private readonly proxyClient: ProxyClientService,
  ) {}

  /**
   * 执行代理故障转移
   */
  async performFailover(
    deviceId: string,
    reason: string,
    options?: {
      preferredCountry?: string;
      strategy?: ProxySelectionStrategy;
    },
  ): Promise<FailoverRecord> {
    this.logger.warn(`Initiating failover for device ${deviceId}: ${reason}`);

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (!device.proxyId) {
      throw new Error(`Device ${deviceId} has no proxy assigned`);
    }

    const oldProxyId = device.proxyId;
    let retries = 0;
    let newProxyId: string | null = null;
    let error: string | undefined;

    // 尝试选择新代理
    while (retries < this.config.maxRetries && !newProxyId) {
      try {
        const selectionResult = await this.proxySelection.selectProxy({
          preferredCountry: options?.preferredCountry || (device.proxyCountry ?? undefined),
          strategy: options?.strategy || ProxySelectionStrategy.HIGHEST_SCORE,
          excludeProxyIds: [oldProxyId], // 排除旧代理
          minScore: 50, // 要求最低评分50
        });

        if (selectionResult.success && selectionResult.proxy) {
          newProxyId = selectionResult.proxy.proxyId;
          break;
        } else {
          error = selectionResult.reason || 'No suitable proxy found';
        }
      } catch (err) {
        error = err.message;
        this.logger.error(
          `Failover attempt ${retries + 1} failed: ${error}`,
          err.stack,
        );
      }

      retries++;
      if (retries < this.config.maxRetries) {
        await this.sleep(this.config.retryDelayMs);
      }
    }

    // 记录故障转移结果
    const record: FailoverRecord = {
      deviceId: device.id,
      deviceName: device.name,
      oldProxyId,
      newProxyId: newProxyId || '',
      reason,
      timestamp: new Date(),
      success: !!newProxyId,
      retries,
      error,
    };

    this.failoverHistory.push(record);

    // 如果找到新代理，执行切换
    if (newProxyId) {
      await this.switchDeviceProxy(device, oldProxyId, newProxyId);

      // 将旧代理加入黑名单
      this.proxyPool.addToBlacklist(
        oldProxyId,
        this.config.blacklistDurationMs,
      );

      this.logger.log(
        `Failover successful: device ${deviceId} switched from ${oldProxyId} to ${newProxyId}`,
      );
    } else {
      this.logger.error(
        `Failover failed for device ${deviceId}: ${error}`,
      );
    }

    return record;
  }

  /**
   * 切换设备代理
   */
  private async switchDeviceProxy(
    device: Device,
    oldProxyId: string,
    newProxyId: string,
  ): Promise<void> {
    try {
      // 1. 释放旧代理
      await this.proxyClient.releaseProxy(oldProxyId);
      this.proxySelection.releaseProxy(oldProxyId);

      // 2. 分配新代理（使用指定的代理ID）
      const proxySession = await this.proxyClient.assignProxy({
        proxyId: newProxyId,
        validate: true, // 验证代理可用性
      });

      const newProxy = proxySession.proxy;

      // 3. 更新设备代理配置
      await this.deviceRepository.update(device.id, {
        proxyId: newProxy.id,
        proxyHost: newProxy.host,
        proxyPort: newProxy.port,
        proxyType: newProxy.protocol.toUpperCase(),
        proxyCountry: newProxy.location.countryCode,
      });

      // 4. 记录统计
      await this.proxyStats.recordProxyRelease(
        device.id,
        oldProxyId,
        ProxyReleaseReason.HEALTH_CHECK_FAILED,
      );

      await this.proxyStats.recordProxyAssignment({
        deviceId: device.id,
        deviceName: device.name,
        userId: device.userId || undefined,
        proxyId: newProxy.id,
        proxyHost: newProxy.host,
        proxyPort: newProxy.port,
        proxyType: newProxy.protocol.toUpperCase(),
        proxyCountry: newProxy.location.countryCode,
      });

      // 6. 触发新代理健康检查
      this.proxyHealth
        .checkDeviceProxyHealth(device.id, newProxyId)
        .catch((error) => {
          this.logger.warn(
            `Failed to check health for new proxy ${newProxyId}`,
            error,
          );
        });
    } catch (error) {
      this.logger.error(
        `Failed to switch device proxy: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 检查是否应触发故障转移
   */
  shouldTriggerFailover(
    deviceId: string,
    proxyId: string,
    context: {
      consecutiveFailures?: number;
      healthStatus?: ProxyHealthStatus;
      latencyMs?: number;
    },
  ): boolean {
    if (!this.config.enabled) return false;

    // 1. 连续失败次数检查
    if (
      context.consecutiveFailures !== undefined &&
      context.consecutiveFailures >= this.config.triggers.consecutiveFailures
    ) {
      this.logger.warn(
        `Device ${deviceId} reached consecutive failures threshold (${context.consecutiveFailures})`,
      );
      return true;
    }

    // 2. 健康状态检查
    if (context.healthStatus === ProxyHealthStatus.UNHEALTHY) {
      this.logger.warn(
        `Device ${deviceId} proxy ${proxyId} is unhealthy`,
      );
      return true;
    }

    // 3. 延迟阈值检查
    if (
      context.latencyMs !== undefined &&
      context.latencyMs >= this.config.triggers.latencyThreshold
    ) {
      this.logger.warn(
        `Device ${deviceId} proxy ${proxyId} latency too high (${context.latencyMs}ms)`,
      );
      return true;
    }

    // 4. 代理在黑名单中
    if (this.proxyPool.isBlacklisted(proxyId)) {
      this.logger.warn(`Device ${deviceId} proxy ${proxyId} is blacklisted`);
      return true;
    }

    return false;
  }

  /**
   * 记录设备故障
   */
  recordDeviceFailure(deviceId: string): number {
    const current = this.deviceFailureCounts.get(deviceId) || 0;
    const newCount = current + 1;
    this.deviceFailureCounts.set(deviceId, newCount);
    return newCount;
  }

  /**
   * 重置设备故障计数
   */
  resetDeviceFailureCount(deviceId: string): void {
    this.deviceFailureCounts.delete(deviceId);
  }

  /**
   * 获取设备故障计数
   */
  getDeviceFailureCount(deviceId: string): number {
    return this.deviceFailureCounts.get(deviceId) || 0;
  }

  /**
   * 批量故障转移（用于代理服务器故障时）
   */
  async batchFailover(
    proxyId: string,
    reason: string,
  ): Promise<FailoverRecord[]> {
    this.logger.warn(
      `Initiating batch failover for proxy ${proxyId}: ${reason}`,
    );

    // 1. 查找所有使用该代理的设备
    const devicesWithProxy = await this.deviceRepository.find({
      where: { proxyId },
    });

    if (devicesWithProxy.length === 0) {
      this.logger.log(`No devices using proxy ${proxyId}`);
      return [];
    }

    this.logger.log(
      `Found ${devicesWithProxy.length} devices using proxy ${proxyId}`,
    );

    // 2. 立即将该代理加入黑名单
    this.proxyPool.addToBlacklist(proxyId, this.config.blacklistDurationMs);

    // 3. 并行执行故障转移
    const failoverPromises = devicesWithProxy.map((device) =>
      this.performFailover(device.id, reason).catch((error) => ({
        deviceId: device.id,
        deviceName: device.name,
        oldProxyId: proxyId,
        newProxyId: '',
        reason,
        timestamp: new Date(),
        success: false,
        retries: 0,
        error: error.message,
      })),
    );

    const results = await Promise.all(failoverPromises);

    const successCount = results.filter((r) => r.success).length;
    this.logger.log(
      `Batch failover completed: ${successCount}/${results.length} successful`,
    );

    return results;
  }

  /**
   * 获取故障转移历史
   */
  getFailoverHistory(
    limit: number = 50,
    deviceId?: string,
  ): FailoverRecord[] {
    let history = [...this.failoverHistory];

    if (deviceId) {
      history = history.filter((record) => record.deviceId === deviceId);
    }

    // 按时间倒序排序
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return history.slice(0, limit);
  }

  /**
   * 获取故障转移统计
   */
  getFailoverStatistics(): {
    totalFailovers: number;
    successfulFailovers: number;
    failedFailovers: number;
    successRate: number;
    averageRetries: number;
    recentFailovers: number; // 最近1小时
    topFailedProxies: Array<{ proxyId: string; count: number }>;
  } {
    const total = this.failoverHistory.length;
    const successful = this.failoverHistory.filter((r) => r.success).length;
    const failed = total - successful;

    const avgRetries =
      total > 0
        ? this.failoverHistory.reduce((sum, r) => sum + r.retries, 0) / total
        : 0;

    // 最近1小时的故障转移
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = this.failoverHistory.filter(
      (r) => r.timestamp >= oneHourAgo,
    ).length;

    // 统计失败最多的代理
    const proxyFailureCounts = new Map<string, number>();
    for (const record of this.failoverHistory) {
      const count = proxyFailureCounts.get(record.oldProxyId) || 0;
      proxyFailureCounts.set(record.oldProxyId, count + 1);
    }

    const topFailed = Array.from(proxyFailureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([proxyId, count]) => ({ proxyId, count }));

    return {
      totalFailovers: total,
      successfulFailovers: successful,
      failedFailovers: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageRetries: Math.round(avgRetries * 100) / 100,
      recentFailovers: recent,
      topFailedProxies: topFailed,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FailoverConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('ProxyFailoverService configuration updated', config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): FailoverConfig {
    return { ...this.config };
  }

  /**
   * 清理故障转移历史（保留最近N条）
   */
  cleanupHistory(keepLast: number = 1000): void {
    if (this.failoverHistory.length > keepLast) {
      this.failoverHistory.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      this.failoverHistory = this.failoverHistory.slice(0, keepLast);
      this.logger.debug(
        `Cleaned up failover history, kept last ${keepLast} records`,
      );
    }
  }

  /**
   * 启用/禁用自动故障转移
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.logger.log(`Auto failover ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 工具函数: 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
