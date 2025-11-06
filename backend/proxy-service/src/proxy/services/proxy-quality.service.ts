import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { ProxyQualityScore, ProxyQualityHistory } from '../entities';
import { QualityScoreResponseDto } from '../dto';
import { ProxyPoolManager } from '../../pool/pool-manager.service';

/**
 * 代理质量评分服务
 *
 * 评分维度：
 * 1. 成功率 (40%)
 * 2. 可用性 (25%)
 * 3. 延迟 (20%)
 * 4. 稳定性 (10%)
 * 5. 匿名度 (5%)
 */
@Injectable()
export class ProxyQualityService {
  private readonly logger = new Logger(ProxyQualityService.name);

  constructor(
    @InjectRepository(ProxyQualityScore)
    private qualityRepo: Repository<ProxyQualityScore>,
    @InjectRepository(ProxyQualityHistory)
    private historyRepo: Repository<ProxyQualityHistory>,
    private poolManager: ProxyPoolManager,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety: Required for @ClusterSafeCron
  ) {}

  /**
   * 获取代理质量评分
   */
  async getQualityScore(proxyId: string): Promise<QualityScoreResponseDto> {
    let qualityScore = await this.qualityRepo.findOne({
      where: { proxyId },
    });

    if (!qualityScore) {
      // 首次查询，计算质量分
      qualityScore = await this.calculateQualityScore(proxyId);
    }

    // 获取趋势
    const trend = await this.calculateTrend(proxyId);

    // 获取代理详细信息
    const proxy = this.poolManager.getProxyByIdFromPool(proxyId);

    return {
      proxyId,
      qualityScore: qualityScore.qualityScore,
      rating: qualityScore.rating,
      metrics: {
        successRate: qualityScore.successRate,
        avgLatency: qualityScore.avgLatency,
        availability: qualityScore.availabilityRate,
        consistency: qualityScore.consistencyScore,
        anonymity: qualityScore.anonymityLevel,
      },
      statistics: {
        totalRequests: qualityScore.totalRequests,
        successfulRequests: qualityScore.successfulRequests,
        failedRequests: qualityScore.failedRequests,
        avgResponseTime: qualityScore.avgLatency,
        uptime: `${qualityScore.availabilityRate}%`,
        lastChecked: qualityScore.lastCalculatedAt,
      },
      trend,
      healthStatus: qualityScore.healthStatus,
    };
  }

  /**
   * 批量查询质量评分
   */
  async getQualityScoreBatch(
    proxyIds: string[],
  ): Promise<QualityScoreResponseDto[]> {
    return Promise.all(proxyIds.map((id) => this.getQualityScore(id)));
  }

  /**
   * 获取质量分布
   */
  async getQualityDistribution(): Promise<{
    distribution: Record<string, number>;
    avgScore: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  }> {
    const scores = await this.qualityRepo.find();

    const distribution = {
      S: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    let totalScore = 0;
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const score of scores) {
      distribution[score.rating]++;
      totalScore += score.qualityScore;

      if (score.healthStatus === 'healthy') healthy++;
      else if (score.healthStatus === 'degraded') degraded++;
      else unhealthy++;
    }

    return {
      distribution,
      avgScore: scores.length > 0 ? totalScore / scores.length : 0,
      healthy,
      degraded,
      unhealthy,
    };
  }

  /**
   * 计算质量评分
   */
  async calculateQualityScore(
    proxyId: string,
  ): Promise<ProxyQualityScore> {
    const proxy = this.poolManager.getProxyByIdFromPool(proxyId);

    if (!proxy) {
      throw new Error(`Proxy ${proxyId} not found`);
    }

    // 1. 成功率评分 (40%)
    const successRateScore = proxy.successRate || 80;

    // 2. 可用性评分 (25%)
    const availabilityScore = await this.calculateAvailability(proxy);

    // 3. 延迟评分 (20%)
    const latencyScore = this.calculateLatencyScore(proxy.latency);

    // 4. 稳定性评分 (10%)
    const consistencyScore = await this.calculateConsistency(proxyId);

    // 5. 匿名度评分 (5%)
    const anonymityScore = this.getAnonymityScore(proxy.anonymityLevel);

    // 综合评分
    const qualityScore =
      successRateScore * 0.4 +
      availabilityScore * 0.25 +
      latencyScore * 0.2 +
      consistencyScore * 0.1 +
      anonymityScore * 0.05;

    // 评级
    const rating = this.getRating(qualityScore);

    // 健康状态
    const healthStatus = this.getHealthStatus(
      successRateScore,
      availabilityScore,
      latencyScore,
    );

    // 保存或更新
    let qualityRecord = await this.qualityRepo.findOne({
      where: { proxyId },
    });

    if (qualityRecord) {
      Object.assign(qualityRecord, {
        qualityScore,
        rating,
        successRate: proxy.successRate,
        avgLatency: proxy.latency,
        availabilityRate: availabilityScore,
        consistencyScore,
        anonymityLevel: proxy.anonymityLevel || 'anonymous',
        totalRequests: proxy.totalRequests || 0,
        successfulRequests: proxy.successfulRequests || 0,
        failedRequests: proxy.failedRequests || 0,
        healthStatus,
        lastCalculatedAt: new Date(),
      });
    } else {
      qualityRecord = this.qualityRepo.create({
        proxyId,
        qualityScore,
        rating,
        successRate: proxy.successRate,
        avgLatency: proxy.latency,
        availabilityRate: availabilityScore,
        consistencyScore,
        anonymityLevel: proxy.anonymityLevel || 'anonymous',
        totalRequests: proxy.totalRequests || 0,
        successfulRequests: proxy.successfulRequests || 0,
        failedRequests: proxy.failedRequests || 0,
        healthStatus,
        lastCalculatedAt: new Date(),
      });
    }

    await this.qualityRepo.save(qualityRecord);

    // 保存历史
    await this.saveHistory(proxyId, qualityScore, successRateScore, proxy.latency);

    return qualityRecord;
  }

  /**
   * 计算所有代理的质量评分
   */
  async calculateAllQualityScores(): Promise<number> {
    const proxies = this.poolManager.listProxies();
    let count = 0;

    for (const proxy of proxies) {
      try {
        await this.calculateQualityScore(proxy.id);
        count++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate quality score for ${proxy.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Calculated quality scores for ${count} proxies`);
    return count;
  }

  /**
   * 定时任务：计算质量评分
   * 每10分钟执行一次
   */
  @ClusterSafeCron(CronExpression.EVERY_10_MINUTES)
  async scheduleQualityCalculation() {
    this.logger.log('Scheduled quality calculation started');
    const count = await this.calculateAllQualityScores();
    this.logger.log(`Scheduled quality calculation completed: ${count} proxies`);
  }

  /**
   * 计算可用性评分
   */
  private async calculateAvailability(proxy: any): Promise<number> {
    // 简化实现：基于代理的可用状态和最近的健康检查
    if (!proxy.inUse && proxy.quality > 0) {
      return Math.min(100, proxy.quality + 10);
    }
    return proxy.quality || 85;
  }

  /**
   * 计算延迟评分
   */
  private calculateLatencyScore(latency: number): number {
    if (latency <= 50) return 100;
    if (latency <= 100) return 90;
    if (latency <= 200) return 75;
    if (latency <= 500) return 50;
    return 20;
  }

  /**
   * 计算稳定性评分
   */
  private async calculateConsistency(proxyId: string): Promise<number> {
    // 查询最近的质量历史
    const history = await this.historyRepo.find({
      where: { proxyId },
      order: { recordedAt: 'DESC' },
      take: 10,
    });

    if (history.length < 3) {
      return 80; // 历史数据不足，给默认分
    }

    // 计算质量分的标准差
    const scores = history.map((h) => h.qualityScore);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，稳定性越高
    if (stdDev <= 5) return 100;
    if (stdDev <= 10) return 85;
    if (stdDev <= 15) return 70;
    if (stdDev <= 20) return 55;
    return 40;
  }

  /**
   * 获取匿名度评分
   */
  private getAnonymityScore(level: string): number {
    switch (level) {
      case 'high':
        return 100;
      case 'anonymous':
        return 80;
      case 'transparent':
        return 50;
      default:
        return 70;
    }
  }

  /**
   * 获取评级
   */
  private getRating(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  /**
   * 获取健康状态
   */
  private getHealthStatus(
    successRate: number,
    availability: number,
    latencyScore: number,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (successRate >= 90 && availability >= 95 && latencyScore >= 75) {
      return 'healthy';
    }
    if (successRate >= 75 && availability >= 80 && latencyScore >= 50) {
      return 'degraded';
    }
    return 'unhealthy';
  }

  /**
   * 计算趋势
   */
  private async calculateTrend(
    proxyId: string,
  ): Promise<'improving' | 'stable' | 'declining'> {
    const history = await this.historyRepo.find({
      where: { proxyId },
      order: { recordedAt: 'DESC' },
      take: 5,
    });

    if (history.length < 3) {
      return 'stable';
    }

    // 最近3个记录的平均分
    const recentAvg =
      history.slice(0, 3).reduce((sum, h) => sum + h.qualityScore, 0) / 3;

    // 全部记录的平均分
    const overallAvg =
      history.reduce((sum, h) => sum + h.qualityScore, 0) / history.length;

    const diff = recentAvg - overallAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * 保存历史记录
   */
  private async saveHistory(
    proxyId: string,
    qualityScore: number,
    successRate: number,
    avgLatency: number,
  ): Promise<void> {
    const history = this.historyRepo.create({
      proxyId,
      qualityScore,
      successRate,
      avgLatency,
    });

    await this.historyRepo.save(history);

    // 清理30天前的历史数据
    await this.historyRepo
      .createQueryBuilder()
      .delete()
      .where('proxyId = :proxyId', { proxyId })
      .andWhere('recordedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .execute();
  }
}
