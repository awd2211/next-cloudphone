import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, ProviderError } from '../providers/provider.interface';
import { SmsActivateAdapter } from '../providers/sms-activate.adapter';
import { FiveSimAdapter } from '../providers/5sim.adapter';
import { ProviderConfig } from '../entities/provider-config.entity';

/**
 * 平台选择结果
 */
export interface PlatformSelectionResult {
  provider: ISmsProvider;
  providerName: string;
  score: number;
  reason: string;
  fallbackLevel: number; // 0=主平台, 1=第一降级, 2=第二降级...
}

/**
 * 平台评分权重
 */
interface ScoringWeights {
  cost: number; // 成本权重 (0-1)
  speed: number; // 速度权重 (0-1)
  successRate: number; // 成功率权重 (0-1)
}

/**
 * 平台性能统计
 */
interface ProviderPerformance {
  providerName: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number; // 毫秒
  averageCost: number; // 美元
  successRate: number; // 百分比 0-100
  lastFailureTime?: Date;
  consecutiveFailures: number;
  isHealthy: boolean;
}

/**
 * 平台选择器服务
 *
 * 功能:
 * 1. 智能平台选择（基于成本/速度/成功率）
 * 2. 自动降级机制（主平台失败时切换）
 * 3. 性能监控和统计
 * 4. 平台健康检查
 */
@Injectable()
export class PlatformSelectorService {
  private readonly logger = new Logger(PlatformSelectorService.name);

  // 所有可用平台
  private readonly providers: Map<string, ISmsProvider> = new Map();

  // 平台性能统计（内存缓存）
  private readonly performanceStats: Map<string, ProviderPerformance> = new Map();

  // 默认评分权重
  private readonly defaultWeights: ScoringWeights = {
    cost: 0.4, // 40% 成本
    speed: 0.3, // 30% 速度
    successRate: 0.3, // 30% 成功率
  };

  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providerConfigRepo: Repository<ProviderConfig>,
    private readonly smsActivateAdapter: SmsActivateAdapter,
    private readonly fiveSimAdapter: FiveSimAdapter,
    private readonly configService: ConfigService,
  ) {
    this.initializeProviders();
  }

  /**
   * 初始化所有平台适配器
   */
  private initializeProviders() {
    this.providers.set('sms-activate', this.smsActivateAdapter);
    this.providers.set('5sim', this.fiveSimAdapter);

    // 初始化性能统计
    for (const [name] of this.providers) {
      this.performanceStats.set(name, {
        providerName: name,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        averageResponseTime: 0,
        averageCost: 0,
        successRate: 100, // 初始假设100%
        consecutiveFailures: 0,
        isHealthy: true,
      });
    }

    this.logger.log(`Initialized ${this.providers.size} SMS providers`);
  }

  /**
   * 选择最优平台
   * @param service 服务代码
   * @param country 国家代码
   * @returns 选择的平台
   */
  async selectBestPlatform(
    service: string,
    country: string,
  ): Promise<PlatformSelectionResult> {
    try {
      // 获取所有可用的配置
      const configs = await this.providerConfigRepo.find({
        where: { enabled: true },
        order: { priority: 'ASC' },
      });

      if (configs.length === 0) {
        throw new Error('No enabled SMS providers found');
      }

      // 过滤出健康的平台
      const healthyProviders = configs.filter((config) => {
        const stats = this.performanceStats.get(config.provider);
        return stats?.isHealthy !== false;
      });

      if (healthyProviders.length === 0) {
        // 所有平台都不健康，强制使用优先级最高的
        this.logger.warn('All providers unhealthy, using highest priority provider');
        const fallbackConfig = configs[0];
        return this.createSelectionResult(
          fallbackConfig.provider,
          0,
          'All providers unhealthy, using fallback',
          configs.length,
        );
      }

      // 智能评分选择
      if (this.configService.get('ENABLE_SMART_ROUTING') === 'true') {
        return await this.selectByScore(healthyProviders);
      }

      // 使用默认优先级
      const defaultProvider = healthyProviders[0];
      return this.createSelectionResult(
        defaultProvider.provider,
        0,
        'Using default priority provider',
        0,
      );
    } catch (error) {
      this.logger.error(`Platform selection failed: ${error.message}`, error.stack);

      // 降级到默认平台
      const defaultProvider = this.configService.get('DEFAULT_PROVIDER') || 'sms-activate';
      return this.createSelectionResult(defaultProvider, 0, 'Emergency fallback', 99);
    }
  }

  /**
   * 基于评分选择平台
   * @param configs 可用配置列表
   * @returns 选择结果
   */
  private async selectByScore(configs: ProviderConfig[]): Promise<PlatformSelectionResult> {
    const scores: Array<{
      provider: string;
      score: number;
      details: { cost: number; speed: number; successRate: number };
    }> = [];

    for (const config of configs) {
      const stats = this.performanceStats.get(config.provider);
      if (!stats) continue;

      // 获取权重（使用配置或默认值）
      const weights: ScoringWeights = {
        cost: config.costWeight || this.defaultWeights.cost,
        speed: config.speedWeight || this.defaultWeights.speed,
        successRate: config.successRateWeight || this.defaultWeights.successRate,
      };

      // 计算各项得分 (0-100)
      const costScore = this.calculateCostScore(stats.averageCost);
      const speedScore = this.calculateSpeedScore(stats.averageResponseTime);
      const successRateScore = stats.successRate;

      // 加权总分
      const totalScore =
        costScore * weights.cost +
        speedScore * weights.speed +
        successRateScore * weights.successRate;

      scores.push({
        provider: config.provider,
        score: totalScore,
        details: {
          cost: costScore,
          speed: speedScore,
          successRate: successRateScore,
        },
      });

      this.logger.debug(
        `Provider ${config.provider} score: ${totalScore.toFixed(2)} ` +
          `(cost=${costScore.toFixed(1)}, speed=${speedScore.toFixed(1)}, ` +
          `success=${successRateScore.toFixed(1)})`,
      );
    }

    // 选择得分最高的
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    return this.createSelectionResult(
      best.provider,
      best.score,
      `Selected by score: ${JSON.stringify(best.details)}`,
      0,
    );
  }

  /**
   * 计算成本得分 (成本越低得分越高)
   * 假设成本范围: $0.05 - $0.20
   */
  private calculateCostScore(avgCost: number): number {
    if (avgCost === 0) return 50; // 无数据，默认中等

    const minCost = 0.05;
    const maxCost = 0.2;

    // 归一化到0-100，成本越低得分越高
    const normalized = Math.max(0, Math.min(1, (maxCost - avgCost) / (maxCost - minCost)));
    return normalized * 100;
  }

  /**
   * 计算速度得分 (速度越快得分越高)
   * 假设响应时间范围: 1s - 60s
   */
  private calculateSpeedScore(avgResponseTime: number): number {
    if (avgResponseTime === 0) return 50; // 无数据，默认中等

    const minTime = 1000; // 1秒
    const maxTime = 60000; // 60秒

    // 归一化到0-100，时间越短得分越高
    const normalized = Math.max(0, Math.min(1, (maxTime - avgResponseTime) / (maxTime - minTime)));
    return normalized * 100;
  }

  /**
   * 创建选择结果
   */
  private createSelectionResult(
    providerName: string,
    score: number,
    reason: string,
    fallbackLevel: number,
  ): PlatformSelectionResult {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return {
      provider,
      providerName,
      score,
      reason,
      fallbackLevel,
    };
  }

  /**
   * 记录请求成功
   */
  async recordSuccess(
    providerName: string,
    responseTime: number,
    cost: number,
  ): Promise<void> {
    const stats = this.performanceStats.get(providerName);
    if (!stats) return;

    stats.totalRequests++;
    stats.successCount++;
    stats.consecutiveFailures = 0;
    stats.isHealthy = true;

    // 更新平均响应时间（移动平均）
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) /
      stats.totalRequests;

    // 更新平均成本
    stats.averageCost =
      (stats.averageCost * (stats.totalRequests - 1) + cost) / stats.totalRequests;

    // 更新成功率
    stats.successRate = (stats.successCount / stats.totalRequests) * 100;

    // 异步更新数据库
    this.updateProviderStatsInDb(providerName, stats).catch((err) => {
      this.logger.error(`Failed to update stats in DB: ${err.message}`);
    });
  }

  /**
   * 记录请求失败
   */
  async recordFailure(providerName: string, error: Error): Promise<void> {
    const stats = this.performanceStats.get(providerName);
    if (!stats) return;

    stats.totalRequests++;
    stats.failureCount++;
    stats.consecutiveFailures++;
    stats.lastFailureTime = new Date();

    // 连续失败3次标记为不健康
    if (stats.consecutiveFailures >= 3) {
      stats.isHealthy = false;
      this.logger.warn(`Provider ${providerName} marked as unhealthy after 3 failures`);
    }

    // 更新成功率
    if (stats.totalRequests > 0) {
      stats.successRate = (stats.successCount / stats.totalRequests) * 100;
    }

    // 异步更新数据库
    this.updateProviderStatsInDb(providerName, stats).catch((err) => {
      this.logger.error(`Failed to update stats in DB: ${err.message}`);
    });
  }

  /**
   * 更新数据库中的统计信息
   */
  private async updateProviderStatsInDb(
    providerName: string,
    stats: ProviderPerformance,
  ): Promise<void> {
    await this.providerConfigRepo.update(
      { provider: providerName },
      {
        totalRequests: stats.totalRequests,
        totalSuccess: stats.successCount,
        totalFailures: stats.failureCount,
        avgSmsReceiveTime: Math.round(stats.averageResponseTime / 1000), // 转换为秒
        lastSuccessRate: stats.successRate,
        healthStatus: stats.isHealthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date(),
      },
    );
  }

  /**
   * 获取所有平台统计
   */
  getProviderStats(): ProviderPerformance[] {
    return Array.from(this.performanceStats.values());
  }

  /**
   * 获取特定平台统计
   */
  getProviderStat(providerName: string): ProviderPerformance | undefined {
    return this.performanceStats.get(providerName);
  }

  /**
   * 重置平台健康状态（手动恢复）
   */
  async resetProviderHealth(providerName: string): Promise<void> {
    const stats = this.performanceStats.get(providerName);
    if (stats) {
      stats.isHealthy = true;
      stats.consecutiveFailures = 0;
      this.logger.log(`Provider ${providerName} health status reset`);

      await this.providerConfigRepo.update(
        { provider: providerName },
        { healthStatus: 'healthy' },
      );
    }
  }

  /**
   * 执行健康检查（所有平台）
   */
  async performHealthChecks(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        results.set(name, isHealthy);

        const stats = this.performanceStats.get(name);
        if (stats) {
          stats.isHealthy = isHealthy;
          if (isHealthy) {
            stats.consecutiveFailures = 0; // 健康检查通过，重置失败计数
          }
        }

        this.logger.log(`Health check for ${name}: ${isHealthy ? 'OK' : 'FAILED'}`);
      } catch (error) {
        this.logger.error(`Health check failed for ${name}: ${error.message}`);
        results.set(name, false);
      }
    }

    return results;
  }
}
