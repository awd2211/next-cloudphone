import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { ProxyProviderScore, ProxyProviderScoreHistory } from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';

/**
 * 代理提供商排名服务
 *
 * 功能：
 * 1. 多维度评分（成功率、延迟、成本、稳定性）
 * 2. 动态排名更新
 * 3. 历史趋势分析
 * 4. 提供商对比
 */
@Injectable()
export class ProxyProviderRankingService {
  private readonly logger = new Logger(ProxyProviderRankingService.name);

  constructor(
    @InjectRepository(ProxyProviderScore)
    private scoreRepo: Repository<ProxyProviderScore>,
    @InjectRepository(ProxyProviderScoreHistory)
    private historyRepo: Repository<ProxyProviderScoreHistory>,
    private poolManager: ProxyPoolManager,
    @Optional() private readonly lockService: DistributedLockService, // ✅ Optional: proxy-service 暂未配置 Redis 分布式锁模块
  ) {}

  /**
   * 计算提供商评分
   *
   * 评分维度：
   * - 成功率 (35%)
   * - 平均延迟 (25%)
   * - 成本效益 (20%)
   * - 稳定性 (15%)
   * - 可用性 (5%)
   */
  async calculateProviderScore(provider: string): Promise<ProxyProviderScore> {
    this.logger.log(`Calculating score for provider: ${provider}`);

    // 从代理池获取该提供商的所有代理（使用 provider 过滤条件）
    const { proxies: providerProxies, total } = this.poolManager.listProxies(
      { provider }, // 直接按提供商过滤
      false,
      10000, // 增加限制以获取所有该提供商的代理
    );

    this.logger.log(`Found ${providerProxies.length} proxies for provider: ${provider} (total: ${total})`);

    if (providerProxies.length === 0) {
      throw new Error(`No proxies found for provider: ${provider}`);
    }

    // 1. 成功率评分 (35%)
    const successRateScore = this.calculateSuccessRateScore(providerProxies);

    // 2. 延迟评分 (25%)
    const latencyScore = this.calculateLatencyScore(providerProxies);

    // 3. 成本效益评分 (20%)
    const costScore = this.calculateCostScore(providerProxies);

    // 4. 稳定性评分 (15%)
    const stabilityScore = this.calculateStabilityScore(providerProxies);

    // 5. 可用性评分 (5%)
    const availabilityScore = this.calculateAvailabilityScore(providerProxies);

    // 综合评分
    const totalScore =
      successRateScore * 0.35 +
      latencyScore * 0.25 +
      costScore * 0.2 +
      stabilityScore * 0.15 +
      availabilityScore * 0.05;

    // 统计信息
    const stats = this.calculateProviderStats(providerProxies);

    // 保存或更新评分
    let scoreRecord = await this.scoreRepo.findOne({
      where: { provider },
    });

    if (scoreRecord) {
      // 更新现有评分
      Object.assign(scoreRecord, {
        totalScore,
        successRateScore,
        latencyScore,
        costScore,
        stabilityScore,
        availabilityScore,
        totalProxies: stats.totalProxies,
        activeProxies: stats.activeProxies,
        avgSuccessRate: stats.avgSuccessRate,
        avgLatency: stats.avgLatency,
        avgCostPerGB: stats.avgCostPerGB,
        lastCalculated: new Date(),
      });
    } else {
      // 创建新评分
      scoreRecord = this.scoreRepo.create({
        provider,
        totalScore,
        successRateScore,
        latencyScore,
        costScore,
        stabilityScore,
        availabilityScore,
        totalProxies: stats.totalProxies,
        activeProxies: stats.activeProxies,
        avgSuccessRate: stats.avgSuccessRate,
        avgLatency: stats.avgLatency,
        avgCostPerGB: stats.avgCostPerGB,
      });
    }

    await this.scoreRepo.save(scoreRecord);

    // 保存历史记录（包含评分详情）
    await this.saveScoreHistory(provider, totalScore, stats, {
      successRateScore,
      latencyScore,
      costScore,
      stabilityScore,
      availabilityScore,
    });

    this.logger.log(
      `Provider ${provider} score: ${totalScore.toFixed(2)} (Success: ${successRateScore.toFixed(1)}, Latency: ${latencyScore.toFixed(1)}, Cost: ${costScore.toFixed(1)})`,
    );

    return scoreRecord;
  }

  /**
   * 计算成功率评分
   */
  private calculateSuccessRateScore(proxies: any[]): number {
    const avgSuccessRate =
      proxies.reduce((sum, p) => sum + (p.successRate || 0), 0) /
      proxies.length;

    // 转换为0-100分
    return avgSuccessRate;
  }

  /**
   * 计算延迟评分
   */
  private calculateLatencyScore(proxies: any[]): number {
    const avgLatency =
      proxies.reduce((sum, p) => sum + (p.latency || 200), 0) / proxies.length;

    // 延迟越低，分数越高
    if (avgLatency <= 50) return 100;
    if (avgLatency <= 100) return 90;
    if (avgLatency <= 150) return 75;
    if (avgLatency <= 200) return 60;
    if (avgLatency <= 300) return 40;
    return 20;
  }

  /**
   * 计算成本效益评分
   */
  private calculateCostScore(proxies: any[]): number {
    const avgCost =
      proxies.reduce((sum, p) => sum + (p.costPerGB || 1.0), 0) /
      proxies.length;

    // 成本越低，分数越高
    if (avgCost <= 0.3) return 100;
    if (avgCost <= 0.5) return 85;
    if (avgCost <= 0.7) return 70;
    if (avgCost <= 1.0) return 50;
    if (avgCost <= 1.5) return 30;
    return 10;
  }

  /**
   * 计算稳定性评分
   */
  private calculateStabilityScore(proxies: any[]): number {
    // 基于代理质量的标准差
    const qualities = proxies.map((p) => p.quality || 50);
    const avgQuality =
      qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance =
      qualities.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) /
      qualities.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，稳定性越高
    if (stdDev <= 5) return 100;
    if (stdDev <= 10) return 85;
    if (stdDev <= 15) return 70;
    if (stdDev <= 20) return 55;
    return 40;
  }

  /**
   * 计算可用性评分
   */
  private calculateAvailabilityScore(proxies: any[]): number {
    const activeCount = proxies.filter((p) => !p.inUse).length;
    const availabilityRate = (activeCount / proxies.length) * 100;

    return availabilityRate;
  }

  /**
   * 计算提供商统计信息
   */
  private calculateProviderStats(proxies: any[]): {
    totalProxies: number;
    activeProxies: number;
    avgSuccessRate: number;
    avgLatency: number;
    avgCostPerGB: number;
  } {
    return {
      totalProxies: proxies.length,
      activeProxies: proxies.filter((p) => !p.inUse).length,
      avgSuccessRate:
        proxies.reduce((sum, p) => sum + (p.successRate || 0), 0) /
        proxies.length,
      avgLatency:
        proxies.reduce((sum, p) => sum + (p.latency || 200), 0) /
        proxies.length,
      avgCostPerGB:
        proxies.reduce((sum, p) => sum + (p.costPerGB || 1.0), 0) /
        proxies.length,
    };
  }

  /**
   * 保存评分历史
   */
  private async saveScoreHistory(
    provider: string,
    score: number,
    stats: any,
    scoreDetails?: {
      successRateScore?: number;
      latencyScore?: number;
      costScore?: number;
      stabilityScore?: number;
      availabilityScore?: number;
    },
  ): Promise<void> {
    const history = this.historyRepo.create({
      provider,
      score,
      totalScore: score,
      // 评分详情
      successRateScore: scoreDetails?.successRateScore || 0,
      latencyScore: scoreDetails?.latencyScore || 0,
      costScore: scoreDetails?.costScore || 0,
      stabilityScore: scoreDetails?.stabilityScore || 0,
      availabilityScore: scoreDetails?.availabilityScore || 0,
      // 资源快照
      totalProxies: stats.totalProxies,
      activeProxies: stats.activeProxies,
      healthyProxies: stats.activeProxies, // 使用 activeProxies 作为 healthyProxies
      proxyAvailabilityRate: stats.totalProxies > 0
        ? (stats.activeProxies / stats.totalProxies) * 100
        : 0,
      // 性能快照
      avgSuccessRate: stats.avgSuccessRate,
      avgLatency: stats.avgLatency,
      latencyStdDev: 0, // 默认值
      // 成本快照
      avgCostPerGb: stats.avgCostPerGB,
      avgCostPerGB: stats.avgCostPerGB,
      avgCostPerRequest: 0,
      avgCostPerHour: 0,
      // 使用统计快照
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDataTransferred: 0,
      totalUsageHours: 0,
      totalCost: 0,
      // 可靠性快照
      uptimePercentage: 100,
      // 地理覆盖快照
      totalLocations: 1,
      countriesCount: 1,
      // 趋势和记录信息
      trend: 'stable',
      recordedAt: new Date(),
      recordType: 'scheduled',
      sampleSize: stats.totalProxies,
    });

    await this.historyRepo.save(history);

    // 清理90天前的历史数据
    await this.historyRepo
      .createQueryBuilder()
      .delete()
      .where('provider = :provider', { provider })
      .andWhere('recordedAt < DATE_SUB(NOW(), INTERVAL 90 DAY)')
      .execute();
  }

  /**
   * 获取提供商排名
   */
  async getProviderRankings(limit?: number): Promise<ProxyProviderScore[]> {
    this.logger.log('[DEBUG] getProviderRankings called, limit=' + limit);

    try {
      const queryBuilder = this.scoreRepo
        .createQueryBuilder('score')
        .orderBy('score.totalScore', 'DESC');

      if (limit) {
        queryBuilder.limit(limit);
      }

      const query = queryBuilder.getQuery();
      this.logger.log('[DEBUG] Generated SQL: ' + query);

      const results = await queryBuilder.getMany();
      this.logger.log('[DEBUG] Results count: ' + results.length);

      if (results.length > 0) {
        this.logger.log('[DEBUG] First result provider: ' + results[0].provider);
      }

      return results;
    } catch (error) {
      this.logger.error('[DEBUG] Error in getProviderRankings: ' + error.message);
      this.logger.error('[DEBUG] Stack: ' + error.stack);
      throw error;
    }
  }

  /**
   * 获取提供商详细评分
   */
  async getProviderDetails(provider: string): Promise<{
    score: ProxyProviderScore;
    history: ProxyProviderScoreHistory[];
    trend: 'improving' | 'stable' | 'declining';
    ranking: number;
  }> {
    const score = await this.scoreRepo.findOne({
      where: { provider },
    });

    if (!score) {
      throw new Error(`Provider ${provider} not found`);
    }

    // 获取历史记录
    const history = await this.historyRepo.find({
      where: { provider },
      order: { recordedAt: 'DESC' },
      take: 30,
    });

    // 计算趋势
    const trend = this.calculateTrend(history);

    // 获取排名
    const allScores = await this.getProviderRankings();
    const ranking = allScores.findIndex((s) => s.provider === provider) + 1;

    return {
      score,
      history,
      trend,
      ranking,
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrend(
    history: ProxyProviderScoreHistory[],
  ): 'improving' | 'stable' | 'declining' {
    if (history.length < 5) {
      return 'stable';
    }

    // 最近5个记录的平均分
    const recentAvg =
      history.slice(0, 5).reduce((sum, h) => sum + h.score, 0) / 5;

    // 全部记录的平均分
    const overallAvg =
      history.reduce((sum, h) => sum + h.score, 0) / history.length;

    const diff = recentAvg - overallAvg;

    if (diff > 3) return 'improving';
    if (diff < -3) return 'declining';
    return 'stable';
  }

  /**
   * 对比提供商
   */
  async compareProviders(
    providers: string[],
  ): Promise<{
    comparison: Array<{
      provider: string;
      score: ProxyProviderScore;
      ranking: number;
    }>;
    winner: {
      overall: string;
      bestSuccessRate: string;
      bestLatency: string;
      bestCost: string;
    };
  }> {
    // 获取所有提供商的评分
    const allScores = await this.getProviderRankings();

    const comparison = providers.map((provider) => {
      const score = allScores.find((s) => s.provider === provider);
      const ranking = allScores.findIndex((s) => s.provider === provider) + 1;

      return {
        provider,
        score: score!,
        ranking,
      };
    });

    // 找出各项最优
    const winner = {
      overall: comparison.sort(
        (a, b) => b.score.totalScore - a.score.totalScore,
      )[0].provider,
      bestSuccessRate: comparison.sort(
        (a, b) => b.score.avgSuccessRate - a.score.avgSuccessRate,
      )[0].provider,
      bestLatency: comparison.sort(
        (a, b) => a.score.avgLatency - b.score.avgLatency,
      )[0].provider,
      bestCost: comparison.sort(
        (a, b) => a.score.avgCostPerGB - b.score.avgCostPerGB,
      )[0].provider,
    };

    return { comparison, winner };
  }

  /**
   * 定时任务：更新所有提供商评分
   * 每小时执行一次
   */
  @ClusterSafeCron(CronExpression.EVERY_HOUR)
  async updateAllProviderScores() {
    this.logger.log('Starting provider score update');

    // 获取所有提供商
    const { proxies: allProxies } = this.poolManager.listProxies({}, false, 10000);
    const providers = [...new Set(allProxies.map((p) => p.provider))];

    let successCount = 0;
    let failureCount = 0;

    for (const provider of providers) {
      try {
        await this.calculateProviderScore(provider);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate score for provider ${provider}: ${error.message}`,
        );
        failureCount++;
      }
    }

    this.logger.log(
      `Provider score update completed: ${successCount} success, ${failureCount} failed`,
    );
  }
}
