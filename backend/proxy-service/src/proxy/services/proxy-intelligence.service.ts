import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProxyRecommendation,
  ProxyTargetMapping,
} from '../entities';
import { ProxyInfo } from '../../common/interfaces';
import { RecommendProxyDto, ProxyRecommendationResponseDto } from '../dto';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import { ProxyQualityService } from './proxy-quality.service';

/**
 * 代理智能推荐服务
 *
 * 核心算法：
 * 1. 基于目标网站的历史成功率
 * 2. 考虑代理质量评分
 * 3. 综合成本因素
 * 4. 设备-代理亲和性
 * 5. 地理位置匹配度
 */
@Injectable()
export class ProxyIntelligenceService {
  private readonly logger = new Logger(ProxyIntelligenceService.name);

  constructor(
    @InjectRepository(ProxyRecommendation)
    private recommendationRepo: Repository<ProxyRecommendation>,
    @InjectRepository(ProxyTargetMapping)
    private mappingRepo: Repository<ProxyTargetMapping>,
    private poolManager: ProxyPoolManager,
    private qualityService: ProxyQualityService,
  ) {}

  /**
   * 智能推荐代理
   */
  async recommendProxy(
    dto: RecommendProxyDto,
  ): Promise<ProxyRecommendationResponseDto> {
    this.logger.log(
      `Recommending proxy for device ${dto.deviceId}, target: ${dto.targetUrl}`,
    );

    // 1. 从代理池获取候选代理
    const candidates = await this.getCandidateProxies(dto);

    if (candidates.length === 0) {
      throw new Error('No available proxies match the criteria');
    }

    // 2. 为每个候选代理计算推荐分数
    const scoredProxies = await Promise.all(
      candidates.map((proxy) => this.calculateRecommendationScore(proxy, dto)),
    );

    // 3. 按分数排序
    scoredProxies.sort((a, b) => b.score - a.score);

    // 4. 选择top 3作为推荐
    const recommendations = scoredProxies.slice(0, 3);
    const alternatives = scoredProxies.slice(3, 8);

    // 5. 生成推荐理由
    const topRecommendation = recommendations[0];
    const reasons = this.generateReasons(topRecommendation, dto);

    // 6. 保存推荐记录
    await this.saveRecommendation(dto, recommendations);

    return {
      recommendations: recommendations.map((r) => ({
        proxyId: r.proxy.id,
        score: r.score,
        reasons: this.generateReasons(r, dto),
        proxy: this.mapProxyInfo(r.proxy),
      })),
      alternatives: alternatives.map((r) => ({
        proxyId: r.proxy.id,
        score: r.score,
        proxy: this.mapProxyInfo(r.proxy),
      })),
      blacklisted: dto.history?.recentFailures || [],
    };
  }

  /**
   * 批量推荐
   */
  async recommendBatch(
    devices: RecommendProxyDto[],
  ): Promise<ProxyRecommendationResponseDto[]> {
    return Promise.all(devices.map((dto) => this.recommendProxy(dto)));
  }

  /**
   * 计算推荐分数
   *
   * 评分算法：
   * score = successRate * 0.35 + latencyScore * 0.25 + costScore * 0.20 +
   *         qualityScore * 0.15 + affinityScore * 0.05
   */
  private async calculateRecommendationScore(
    proxy: ProxyInfo,
    dto: RecommendProxyDto,
  ): Promise<{ proxy: ProxyInfo; score: number; breakdown: any }> {
    // 1. 成功率评分 (35%)
    const successRateScore = await this.calculateSuccessRateScore(
      proxy,
      dto.targetUrl,
    );

    // 2. 延迟评分 (25%)
    const latencyScore = this.calculateLatencyScore(
      proxy.latency,
      dto.requirements?.maxLatency,
    );

    // 3. 成本评分 (20%)
    const costScore = this.calculateCostScore(
      proxy.costPerGB,
      dto.requirements?.maxCostPerGB,
    );

    // 4. 质量评分 (15%)
    const qualityScore = await this.getProxyQualityScore(proxy.id);

    // 5. 亲和性评分 (5%)
    const affinityScore = await this.calculateAffinityScore(
      proxy.id,
      dto.deviceId,
    );

    // 综合评分
    const totalScore =
      successRateScore * 0.35 +
      latencyScore * 0.25 +
      costScore * 0.2 +
      qualityScore * 0.15 +
      affinityScore * 0.05;

    return {
      proxy,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        successRate: successRateScore,
        latency: latencyScore,
        cost: costScore,
        quality: qualityScore,
        affinity: affinityScore,
      },
    };
  }

  /**
   * 计算成功率评分
   */
  private async calculateSuccessRateScore(
    proxy: ProxyInfo,
    targetUrl?: string,
  ): Promise<number> {
    if (!targetUrl) {
      // 没有目标URL，使用代理的全局成功率
      return proxy.successRate || 80;
    }

    // 提取域名
    const domain = this.extractDomain(targetUrl);

    // 查询该代理对该目标网站的历史表现
    const mapping = await this.mappingRepo.findOne({
      where: {
        proxyId: proxy.id,
        targetDomain: domain,
      },
    });

    if (mapping && mapping.successRate) {
      // 有历史数据，使用针对性的成功率
      return mapping.successRate;
    }

    // 没有历史数据，使用全局成功率打折
    return (proxy.successRate || 80) * 0.9;
  }

  /**
   * 计算延迟评分
   */
  private calculateLatencyScore(
    actualLatency: number,
    maxLatency?: number,
  ): number {
    if (!maxLatency) {
      maxLatency = 200; // 默认最大延迟200ms
    }

    if (actualLatency <= maxLatency * 0.5) {
      return 100; // 延迟非常低
    } else if (actualLatency <= maxLatency) {
      return 100 - ((actualLatency - maxLatency * 0.5) / (maxLatency * 0.5)) * 30;
    } else {
      return Math.max(0, 70 - ((actualLatency - maxLatency) / maxLatency) * 50);
    }
  }

  /**
   * 计算成本评分
   */
  private calculateCostScore(
    actualCost: number,
    maxCost?: number,
  ): number {
    if (!maxCost) {
      maxCost = 1.0; // 默认最大1$/GB
    }

    if (actualCost <= maxCost * 0.5) {
      return 100; // 成本非常低
    } else if (actualCost <= maxCost) {
      return 100 - ((actualCost - maxCost * 0.5) / (maxCost * 0.5)) * 30;
    } else {
      return Math.max(0, 70 - ((actualCost - maxCost) / maxCost) * 50);
    }
  }

  /**
   * 获取代理质量评分
   */
  private async getProxyQualityScore(proxyId: string): Promise<number> {
    try {
      const qualityScore = await this.qualityService.getQualityScore(proxyId);
      return qualityScore.qualityScore;
    } catch (error) {
      this.logger.warn(
        `Failed to get quality score for proxy ${proxyId}: ${error.message}`,
      );
      return 80; // 默认分数
    }
  }

  /**
   * 计算设备-代理亲和性评分
   */
  private async calculateAffinityScore(
    proxyId: string,
    deviceId: string,
  ): Promise<number> {
    // 查询该设备使用该代理的历史记录
    const history = await this.recommendationRepo.find({
      where: {
        deviceId,
        selectedProxyId: proxyId,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (history.length === 0) {
      return 50; // 无历史，中等分数
    }

    // 计算该代理的成功率
    const successCount = history.filter((h) => h.success).length;
    const successRate = (successCount / history.length) * 100;

    // 考虑使用频率
    const frequencyBonus = Math.min(history.length * 5, 20);

    return Math.min(100, successRate * 0.8 + frequencyBonus);
  }

  /**
   * 生成推荐理由
   */
  private generateReasons(
    scoredProxy: { proxy: ProxyInfo; score: number; breakdown: any },
    dto: RecommendProxyDto,
  ): string[] {
    const reasons: string[] = [];
    const { proxy, breakdown } = scoredProxy;

    // 成功率
    if (breakdown.successRate >= 95) {
      if (dto.targetUrl) {
        const domain = this.extractDomain(dto.targetUrl);
        reasons.push(`${breakdown.successRate}% success rate for ${domain}`);
      } else {
        reasons.push(`High success rate: ${breakdown.successRate}%`);
      }
    }

    // 延迟
    if (breakdown.latency >= 90) {
      reasons.push(`Low latency: ${proxy.latency}ms`);
    }

    // 成本
    if (breakdown.cost >= 90) {
      reasons.push(`Cost-effective: $${proxy.costPerGB}/GB`);
    }

    // ISP类型
    if (proxy.ispType === 'residential') {
      reasons.push('Residential IP, high anonymity');
    }

    // 地理位置
    if (dto.targetCountry && proxy.country === dto.targetCountry) {
      reasons.push(`Matched target country: ${proxy.country}`);
    }

    // 质量评分
    if (breakdown.quality >= 85) {
      reasons.push(`High quality score: ${breakdown.quality}`);
    }

    return reasons;
  }

  /**
   * 获取候选代理
   */
  private async getCandidateProxies(
    dto: RecommendProxyDto,
  ): Promise<ProxyInfo[]> {
    const criteria: any = {};

    if (dto.targetCountry) {
      criteria.country = dto.targetCountry;
    }

    if (dto.requirements) {
      if (dto.requirements.minQuality) {
        criteria.minQuality = dto.requirements.minQuality;
      }
      if (dto.requirements.maxLatency) {
        criteria.maxLatency = dto.requirements.maxLatency;
      }
      if (dto.requirements.maxCostPerGB) {
        criteria.maxCostPerGB = dto.requirements.maxCostPerGB;
      }
      if (dto.requirements.ispType) {
        criteria.ispType = dto.requirements.ispType;
      }
    }

    // 排除黑名单
    const blacklist = dto.history?.recentFailures || [];

    // 从代理池获取
    const proxies = this.poolManager.listProxies(
      criteria,
      true, // 仅可用代理
      50, // 最多50个候选
    );

    // 过滤黑名单
    return proxies.filter((p) => !blacklist.includes(p.id));
  }

  /**
   * 保存推荐记录
   */
  private async saveRecommendation(
    dto: RecommendProxyDto,
    recommendations: any[],
  ): Promise<void> {
    const record = this.recommendationRepo.create({
      deviceId: dto.deviceId,
      targetUrl: dto.targetUrl,
      targetCountry: dto.targetCountry,
      recommendedProxies: recommendations.map((r) => ({
        proxyId: r.proxy.id,
        score: r.score,
        breakdown: r.breakdown,
      })),
      recommendationScore: recommendations[0]?.score || 0,
    });

    await this.recommendationRepo.save(record);
  }

  /**
   * 查询目标网站的代理映射
   */
  async getWebsiteMapping(domain: string): Promise<any> {
    const mappings = await this.mappingRepo.find({
      where: { targetDomain: domain },
      order: { successRate: 'DESC' },
      take: 10,
    });

    const bestProxies = await Promise.all(
      mappings.map(async (mapping) => {
        const proxy = this.poolManager.getProxyByIdFromPool(mapping.proxyId);
        return {
          proxyId: mapping.proxyId,
          proxy: proxy ? this.mapProxyInfo(proxy) : null,
          successRate: mapping.successRate,
          avgLatency: mapping.avgLatency,
          totalRequests: mapping.successCount + mapping.failureCount,
        };
      }),
    );

    const avgSuccessRate =
      mappings.reduce((sum, m) => sum + m.successRate, 0) / mappings.length;
    const avgLatency =
      mappings.reduce((sum, m) => sum + m.avgLatency, 0) / mappings.length;

    return {
      domain,
      bestProxies,
      successRate: avgSuccessRate,
      avgLatency,
    };
  }

  /**
   * 查询设备代理亲和性
   */
  async getDeviceAffinity(deviceId: string): Promise<any> {
    const history = await this.recommendationRepo.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    // 统计每个代理的使用情况
    const proxyStats = new Map<string, { count: number; success: number }>();

    for (const record of history) {
      if (!record.selectedProxyId) continue;

      const stats = proxyStats.get(record.selectedProxyId) || {
        count: 0,
        success: 0,
      };
      stats.count++;
      if (record.success) stats.success++;
      proxyStats.set(record.selectedProxyId, stats);
    }

    // 转换为数组并排序
    const preferredProxies = Array.from(proxyStats.entries())
      .map(([proxyId, stats]) => ({
        proxyId,
        usageCount: stats.count,
        successRate: (stats.success / stats.count) * 100,
        proxy: this.poolManager.getProxyByIdFromPool(proxyId),
      }))
      .filter((p) => p.proxy)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    const totalUsage = history.length;
    const avgSuccessRate =
      (history.filter((h) => h.success).length / totalUsage) * 100;

    return {
      deviceId,
      preferredProxies,
      totalUsage,
      avgSuccessRate,
    };
  }

  /**
   * 提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * 映射代理信息
   */
  private mapProxyInfo(proxy: ProxyInfo): any {
    return {
      host: proxy.host,
      port: proxy.port,
      country: proxy.country,
      city: proxy.city,
      ispType: proxy.ispType,
      quality: proxy.quality,
      avgLatency: proxy.latency,
      costPerGB: proxy.costPerGB,
      protocol: proxy.protocol,
    };
  }
}
