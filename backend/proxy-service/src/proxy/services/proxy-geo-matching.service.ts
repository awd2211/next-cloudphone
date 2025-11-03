import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGeoSetting, IspProvider } from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';

/**
 * 代理地理匹配服务
 *
 * 功能：
 * 1. 设备地理位置配置
 * 2. ISP类型模拟（住宅/数据中心/移动）
 * 3. 城市级精度匹配
 * 4. 自动地理智能推荐
 */
@Injectable()
export class ProxyGeoMatchingService {
  private readonly logger = new Logger(ProxyGeoMatchingService.name);

  constructor(
    @InjectRepository(DeviceGeoSetting)
    private geoSettingRepo: Repository<DeviceGeoSetting>,
    @InjectRepository(IspProvider)
    private ispProviderRepo: Repository<IspProvider>,
    private poolManager: ProxyPoolManager,
  ) {}

  /**
   * 配置设备地理位置
   */
  async configureDeviceGeo(params: {
    deviceId: string;
    userId: string;
    targetCountry: string;
    targetCity?: string;
    targetRegion?: string;
    ispType?: string; // residential, datacenter, mobile
    preferredProviders?: string[];
    autoMatch?: boolean;
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<DeviceGeoSetting> {
    // 查找现有配置
    let geoSetting = await this.geoSettingRepo.findOne({
      where: { deviceId: params.deviceId },
    });

    if (geoSetting) {
      // 更新现有配置
      Object.assign(geoSetting, {
        targetCountry: params.targetCountry,
        targetCity: params.targetCity,
        targetRegion: params.targetRegion,
        ispType: params.ispType,
        preferredProviders: params.preferredProviders || [],
        autoMatch: params.autoMatch ?? true,
        priority: params.priority ?? 5,
        metadata: params.metadata || {},
        updatedAt: new Date(),
      });
    } else {
      // 创建新配置
      geoSetting = this.geoSettingRepo.create({
        deviceId: params.deviceId,
        userId: params.userId,
        targetCountry: params.targetCountry,
        targetCity: params.targetCity,
        targetRegion: params.targetRegion,
        ispType: params.ispType,
        preferredProviders: params.preferredProviders || [],
        autoMatch: params.autoMatch ?? true,
        priority: params.priority ?? 5,
        metadata: params.metadata || {},
      });
    }

    await this.geoSettingRepo.save(geoSetting);

    this.logger.log(
      `Configured geo settings for device ${params.deviceId}: ${params.targetCountry}${params.targetCity ? `, ${params.targetCity}` : ''}`,
    );

    return geoSetting;
  }

  /**
   * 获取设备地理配置
   */
  async getDeviceGeoSetting(deviceId: string): Promise<DeviceGeoSetting | null> {
    return this.geoSettingRepo.findOne({
      where: { deviceId },
    });
  }

  /**
   * 基于地理位置匹配代理
   */
  async matchProxiesByGeo(params: {
    deviceId?: string;
    targetCountry: string;
    targetCity?: string;
    ispType?: string;
    limit?: number;
  }): Promise<Array<{
    proxy: any;
    matchScore: number;
    matchReasons: string[];
  }>> {
    const { targetCountry, targetCity, ispType, limit = 10 } = params;

    // 从代理池获取候选代理
    const allProxies = this.poolManager.listProxies({}, true, 100);

    // 计算匹配分数
    const scoredProxies = allProxies
      .map((proxy) => {
        const score = this.calculateGeoMatchScore(proxy, {
          targetCountry,
          targetCity,
          ispType,
        });

        return {
          proxy,
          matchScore: score.totalScore,
          matchReasons: score.reasons,
        };
      })
      .filter((item) => item.matchScore > 0) // 过滤掉完全不匹配的
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return scoredProxies;
  }

  /**
   * 计算地理匹配分数
   *
   * 评分维度：
   * - 国家匹配：50分
   * - 城市匹配：30分
   * - ISP类型匹配：20分
   */
  private calculateGeoMatchScore(
    proxy: any,
    criteria: {
      targetCountry: string;
      targetCity?: string;
      ispType?: string;
    },
  ): { totalScore: number; reasons: string[] } {
    let totalScore = 0;
    const reasons: string[] = [];

    // 1. 国家匹配（50分）
    if (proxy.country === criteria.targetCountry) {
      totalScore += 50;
      reasons.push(`Country match: ${proxy.country}`);
    } else {
      // 国家不匹配，直接返回0分
      return { totalScore: 0, reasons: ['Country mismatch'] };
    }

    // 2. 城市匹配（30分）
    if (criteria.targetCity) {
      if (proxy.city === criteria.targetCity) {
        totalScore += 30;
        reasons.push(`City match: ${proxy.city}`);
      } else if (proxy.region && criteria.targetCity) {
        // 如果城市不匹配，但在同一地区，给部分分数
        totalScore += 10;
        reasons.push(`Same region as target city`);
      }
    } else {
      // 没有城市要求，给默认分
      totalScore += 15;
    }

    // 3. ISP类型匹配（20分）
    if (criteria.ispType) {
      if (proxy.ispType === criteria.ispType) {
        totalScore += 20;
        reasons.push(`ISP type match: ${proxy.ispType}`);
      } else {
        // ISP类型不匹配，扣5分
        totalScore -= 5;
        reasons.push(`ISP type mismatch: ${proxy.ispType} vs ${criteria.ispType}`);
      }
    } else {
      // 没有ISP类型要求，给默认分
      totalScore += 10;
    }

    return { totalScore, reasons };
  }

  /**
   * 智能推荐地理位置
   *
   * 基于目标URL分析推荐最佳地理位置
   */
  async recommendGeoLocation(params: {
    targetUrl: string;
    userId: string;
  }): Promise<{
    recommendedCountry: string;
    recommendedCity?: string;
    reason: string;
    alternatives: Array<{ country: string; city?: string; reason: string }>;
  }> {
    const { targetUrl } = params;

    // 提取域名
    const domain = this.extractDomain(targetUrl);

    // 内置的网站地理位置推荐规则
    const geoRecommendations = this.getWebsiteGeoRecommendations(domain);

    if (geoRecommendations) {
      return geoRecommendations;
    }

    // 如果没有匹配的规则，返回默认推荐
    return {
      recommendedCountry: 'US',
      recommendedCity: 'New York',
      reason: 'Default recommendation: US is commonly used for international access',
      alternatives: [
        { country: 'GB', city: 'London', reason: 'European alternative' },
        { country: 'SG', reason: 'Asia-Pacific alternative' },
        { country: 'DE', city: 'Frankfurt', reason: 'Central European hub' },
      ],
    };
  }

  /**
   * 获取网站地理位置推荐
   */
  private getWebsiteGeoRecommendations(domain: string): any | null {
    const rules: Record<string, any> = {
      // 社交媒体平台
      'instagram.com': {
        recommendedCountry: 'US',
        recommendedCity: 'Los Angeles',
        reason: 'Instagram headquarters in California, US proxies recommended',
        alternatives: [
          { country: 'GB', city: 'London', reason: 'European users' },
          { country: 'BR', city: 'São Paulo', reason: 'Latin American users' },
        ],
      },
      'facebook.com': {
        recommendedCountry: 'US',
        recommendedCity: 'Menlo Park',
        reason: 'Facebook HQ location, US proxies recommended',
        alternatives: [
          { country: 'IE', city: 'Dublin', reason: 'European headquarters' },
          { country: 'SG', reason: 'Asia-Pacific headquarters' },
        ],
      },
      'twitter.com': {
        recommendedCountry: 'US',
        recommendedCity: 'San Francisco',
        reason: 'Twitter HQ in San Francisco',
        alternatives: [
          { country: 'JP', city: 'Tokyo', reason: 'Large Japanese user base' },
          { country: 'GB', city: 'London', reason: 'European users' },
        ],
      },
      'tiktok.com': {
        recommendedCountry: 'US',
        recommendedCity: 'Los Angeles',
        reason: 'TikTok popular in US, especially California',
        alternatives: [
          { country: 'GB', city: 'London', reason: 'Large UK user base' },
          { country: 'ID', city: 'Jakarta', reason: 'Largest Southeast Asian market' },
        ],
      },

      // 电商平台
      'amazon.com': {
        recommendedCountry: 'US',
        recommendedCity: 'Seattle',
        reason: 'Amazon HQ in Seattle',
        alternatives: [
          { country: 'DE', city: 'Frankfurt', reason: 'Amazon Europe' },
          { country: 'JP', city: 'Tokyo', reason: 'Amazon Japan' },
        ],
      },
      'ebay.com': {
        recommendedCountry: 'US',
        recommendedCity: 'San Jose',
        reason: 'eBay HQ in California',
        alternatives: [
          { country: 'DE', city: 'Berlin', reason: 'Large European market' },
          { country: 'AU', city: 'Sydney', reason: 'Australian market' },
        ],
      },

      // 搜索引擎
      'google.com': {
        recommendedCountry: 'US',
        recommendedCity: 'Mountain View',
        reason: 'Google HQ location',
        alternatives: [
          { country: 'IE', city: 'Dublin', reason: 'Google European HQ' },
          { country: 'SG', reason: 'Google Asia-Pacific HQ' },
        ],
      },

      // 中国电商
      'taobao.com': {
        recommendedCountry: 'CN',
        recommendedCity: 'Hangzhou',
        reason: 'Taobao HQ in Hangzhou, China',
        alternatives: [
          { country: 'CN', city: 'Shanghai', reason: 'Major Chinese city' },
          { country: 'CN', city: 'Beijing', reason: 'Capital city' },
        ],
      },
      'jd.com': {
        recommendedCountry: 'CN',
        recommendedCity: 'Beijing',
        reason: 'JD.com HQ in Beijing',
        alternatives: [
          { country: 'CN', city: 'Shanghai', reason: 'Major Chinese city' },
        ],
      },
    };

    // 尝试精确匹配
    if (rules[domain]) {
      return rules[domain];
    }

    // 尝试部分匹配
    for (const [key, value] of Object.entries(rules)) {
      if (domain.includes(key) || key.includes(domain)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 查询ISP提供商信息
   */
  async getIspProviders(params: {
    country?: string;
    ispType?: string;
    limit?: number;
  }): Promise<IspProvider[]> {
    const queryBuilder = this.ispProviderRepo.createQueryBuilder('isp');

    if (params.country) {
      queryBuilder.andWhere('isp.country = :country', {
        country: params.country,
      });
    }

    if (params.ispType) {
      queryBuilder.andWhere('isp.ispType = :ispType', {
        ispType: params.ispType,
      });
    }

    queryBuilder.orderBy('isp.proxyCount', 'DESC');

    if (params.limit) {
      queryBuilder.limit(params.limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * 更新ISP提供商统计
   */
  async updateIspProviderStats(
    country: string,
    ispName: string,
    ispType: string,
  ): Promise<void> {
    let provider = await this.ispProviderRepo.findOne({
      where: { country, ispName },
    });

    if (provider) {
      provider.proxyCount += 1;
      provider.lastUpdated = new Date();
    } else {
      provider = this.ispProviderRepo.create({
        country,
        ispName,
        ispType,
        proxyCount: 1,
      });
    }

    await this.ispProviderRepo.save(provider);
  }

  /**
   * 获取地理位置统计
   */
  async getGeoStatistics(userId?: string): Promise<{
    totalDevices: number;
    devicesByCountry: Record<string, number>;
    devicesByIspType: Record<string, number>;
    topCities: Array<{ city: string; count: number }>;
  }> {
    const queryBuilder = this.geoSettingRepo.createQueryBuilder('geo');

    if (userId) {
      queryBuilder.where('geo.userId = :userId', { userId });
    }

    const settings = await queryBuilder.getMany();

    // 统计
    const devicesByCountry = settings.reduce((acc, s) => {
      acc[s.targetCountry] = (acc[s.targetCountry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const devicesByIspType = settings.reduce((acc, s) => {
      if (s.ispType) {
        acc[s.ispType] = (acc[s.ispType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const cityCounts = settings
      .filter((s) => s.targetCity)
      .reduce((acc, s) => {
        acc[s.targetCity!] = (acc[s.targetCity!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topCities = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDevices: settings.length,
      devicesByCountry,
      devicesByIspType,
      topCities,
    };
  }

  /**
   * 批量配置设备地理位置
   */
  async batchConfigureDeviceGeo(
    configs: Array<{
      deviceId: string;
      userId: string;
      targetCountry: string;
      targetCity?: string;
      ispType?: string;
    }>,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const config of configs) {
      try {
        await this.configureDeviceGeo(config);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          deviceId: config.deviceId,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Batch geo configuration completed: ${success} success, ${failed} failed`,
    );

    return { success, failed, errors };
  }

  /**
   * 提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}
