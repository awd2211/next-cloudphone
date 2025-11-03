import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { ProxyHealthStatus } from '../entities/proxy-usage.entity';
import { ProxyClientService } from '@cloudphone/shared';

/**
 * 代理性能评分
 */
export interface ProxyScore {
  proxyId: string;
  score: number; // 0-100，越高越好
  latencyMs: number;
  successRate: number;
  healthStatus: ProxyHealthStatus;
  activeConnections: number;
  lastUsedAt: Date | null;
  isBlacklisted: boolean;
}

/**
 * 代理池分组（按国家）
 */
export interface ProxyPoolGroup {
  country: string;
  proxies: ProxyScore[];
  totalProxies: number;
  availableProxies: number;
}

/**
 * 代理池配置
 */
export interface ProxyPoolConfig {
  // 黑名单持续时间（毫秒）
  blacklistDurationMs: number;
  // 性能评分权重
  weights: {
    latency: number; // 延迟权重
    successRate: number; // 成功率权重
    health: number; // 健康状态权重
    connections: number; // 活跃连接数权重
  };
  // 刷新间隔（毫秒）
  refreshIntervalMs: number;
  // 最大活跃连接数（超过后降低分数）
  maxActiveConnections: number;
}

/**
 * 代理池管理服务
 *
 * 功能:
 * 1. 按国家/地区分组管理代理
 * 2. 性能评分系统（综合延迟、成功率、健康状态）
 * 3. 动态黑名单管理
 * 4. 连接数跟踪
 * 5. 定期刷新代理池状态
 */
@Injectable()
export class ProxyPoolService implements OnModuleInit {
  private readonly logger = new Logger(ProxyPoolService.name);

  // 代理池缓存（按国家分组）
  private proxyPoolCache: Map<string, ProxyPoolGroup> = new Map();

  // 黑名单（proxyId -> 解除时间）
  private blacklist: Map<string, Date> = new Map();

  // 活跃连接计数（proxyId -> count）
  private activeConnections: Map<string, number> = new Map();

  // 配置
  private config: ProxyPoolConfig = {
    blacklistDurationMs: 5 * 60 * 1000, // 5分钟
    weights: {
      latency: 0.3,
      successRate: 0.4,
      health: 0.2,
      connections: 0.1,
    },
    refreshIntervalMs: 2 * 60 * 1000, // 2分钟
    maxActiveConnections: 10,
  };

  constructor(
    @InjectRepository(ProxyUsage)
    private readonly proxyUsageRepository: Repository<ProxyUsage>,
    private readonly proxyClient: ProxyClientService,
  ) {}

  async onModuleInit() {
    this.logger.log('ProxyPoolService initializing...');

    // 初始化代理池
    await this.refreshProxyPool();

    // 启动定期刷新
    setInterval(() => this.refreshProxyPool(), this.config.refreshIntervalMs);

    this.logger.log(
      `ProxyPoolService initialized - refresh interval: ${this.config.refreshIntervalMs / 1000}s`,
    );
  }

  /**
   * 刷新代理池（从 proxy-service 获取最新代理列表并计算评分）
   */
  async refreshProxyPool(): Promise<void> {
    try {
      this.logger.debug('Refreshing proxy pool...');

      // 1. 从 proxy-service 获取所有可用代理
      const proxies = await this.proxyClient.listProxies({
        availableOnly: true, // 只获取可用代理
      });

      // 2. 获取使用统计
      const usageStats = await this.getProxyUsageStats();

      // 3. 清理过期黑名单
      this.cleanupBlacklist();

      // 4. 按国家分组并计算评分
      const groupedProxies = new Map<string, ProxyScore[]>();

      for (const proxy of proxies) {
        const country = proxy.location?.countryCode || 'unknown';
        const proxyId = proxy.id;
        const stats = usageStats.get(proxyId) || {
          avgLatencyMs: proxy.latency || 0,
          successRate: 100,
          healthStatus: ProxyHealthStatus.HEALTHY,
          lastUsedAt: proxy.lastUsed || null,
        };

        // 计算性能评分
        const score = this.calculateProxyScore({
          proxyId,
          score: 0, // 初始分数，将被 calculateProxyScore 重新计算
          latencyMs: stats.avgLatencyMs,
          successRate: stats.successRate,
          healthStatus: stats.healthStatus,
          activeConnections: this.activeConnections.get(proxyId) || 0,
          lastUsedAt: stats.lastUsedAt,
          isBlacklisted: this.blacklist.has(proxyId),
        });

        if (!groupedProxies.has(country)) {
          groupedProxies.set(country, []);
        }
        groupedProxies.get(country)!.push(score);
      }

      // 5. 更新缓存（每组按评分排序）
      this.proxyPoolCache.clear();
      for (const [country, proxies] of groupedProxies.entries()) {
        // 按评分降序排序
        proxies.sort((a, b) => b.score - a.score);

        const availableCount = proxies.filter(
          (p) => !p.isBlacklisted && p.score > 0,
        ).length;

        this.proxyPoolCache.set(country, {
          country,
          proxies,
          totalProxies: proxies.length,
          availableProxies: availableCount,
        });
      }

      this.logger.debug(
        `Proxy pool refreshed - ${this.proxyPoolCache.size} countries, ${proxies.length} total proxies`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh proxy pool', error.stack);
    }
  }

  /**
   * 计算代理性能评分（0-100）
   */
  private calculateProxyScore(proxy: ProxyScore): ProxyScore {
    // 如果在黑名单中，评分为 0
    if (proxy.isBlacklisted) {
      return { ...proxy, score: 0 };
    }

    let score = 0;

    // 1. 延迟评分（0-100）
    // 延迟越低越好: 0ms=100分, 500ms=50分, 1000ms+=0分
    const latencyScore = Math.max(
      0,
      100 - (proxy.latencyMs / 1000) * 100,
    );
    score += latencyScore * this.config.weights.latency;

    // 2. 成功率评分（0-100）
    score += proxy.successRate * this.config.weights.successRate;

    // 3. 健康状态评分（0-100）
    const healthScore = {
      [ProxyHealthStatus.HEALTHY]: 100,
      [ProxyHealthStatus.DEGRADED]: 50,
      [ProxyHealthStatus.UNHEALTHY]: 0,
    }[proxy.healthStatus] || 0;
    score += healthScore * this.config.weights.health;

    // 4. 活跃连接数评分（0-100）
    // 连接数越少越好: 0连接=100分, maxActiveConnections+=0分
    const connectionScore = Math.max(
      0,
      100 -
        (proxy.activeConnections / this.config.maxActiveConnections) * 100,
    );
    score += connectionScore * this.config.weights.connections;

    return { ...proxy, score: Math.round(score) };
  }

  /**
   * 获取代理使用统计
   */
  private async getProxyUsageStats(): Promise<
    Map<
      string,
      {
        avgLatencyMs: number;
        successRate: number;
        healthStatus: ProxyHealthStatus;
        lastUsedAt: Date | null;
      }
    >
  > {
    const stats = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.proxy_id', 'proxyId')
      .addSelect('AVG(usage.avg_latency_ms)', 'avgLatencyMs')
      .addSelect('AVG(usage.success_rate)', 'successRate')
      .addSelect('usage.health_status', 'healthStatus')
      .addSelect('MAX(usage.assigned_at)', 'lastUsedAt')
      .where('usage.assigned_at >= NOW() - INTERVAL :hours HOUR', { hours: 24 })
      .groupBy('usage.proxy_id')
      .addGroupBy('usage.health_status')
      .getRawMany();

    const statsMap = new Map<
      string,
      {
        avgLatencyMs: number;
        successRate: number;
        healthStatus: ProxyHealthStatus;
        lastUsedAt: Date | null;
      }
    >();

    for (const stat of stats) {
      statsMap.set(stat.proxyId, {
        avgLatencyMs: parseFloat(stat.avgLatencyMs) || 0,
        successRate: parseFloat(stat.successRate) || 100,
        healthStatus: stat.healthStatus || ProxyHealthStatus.HEALTHY,
        lastUsedAt: stat.lastUsedAt ? new Date(stat.lastUsedAt) : null,
      });
    }

    return statsMap;
  }

  /**
   * 获取指定国家的代理池
   */
  getProxyPoolByCountry(country: string): ProxyPoolGroup | null {
    return this.proxyPoolCache.get(country) || null;
  }

  /**
   * 获取所有代理池分组
   */
  getAllProxyPools(): ProxyPoolGroup[] {
    return Array.from(this.proxyPoolCache.values());
  }

  /**
   * 获取代理评分
   */
  getProxyScore(proxyId: string): ProxyScore | null {
    for (const pool of this.proxyPoolCache.values()) {
      const proxy = pool.proxies.find((p) => p.proxyId === proxyId);
      if (proxy) return proxy;
    }
    return null;
  }

  /**
   * 添加代理到黑名单
   */
  addToBlacklist(proxyId: string, durationMs?: number): void {
    const duration = durationMs || this.config.blacklistDurationMs;
    const unblockTime = new Date(Date.now() + duration);
    this.blacklist.set(proxyId, unblockTime);

    this.logger.warn(
      `Proxy ${proxyId} added to blacklist until ${unblockTime.toISOString()}`,
    );

    // 更新缓存中的黑名单状态
    for (const pool of this.proxyPoolCache.values()) {
      const proxy = pool.proxies.find((p) => p.proxyId === proxyId);
      if (proxy) {
        proxy.isBlacklisted = true;
        proxy.score = 0;
      }
    }
  }

  /**
   * 从黑名单移除代理
   */
  removeFromBlacklist(proxyId: string): void {
    this.blacklist.delete(proxyId);
    this.logger.log(`Proxy ${proxyId} removed from blacklist`);

    // 触发重新计算评分
    this.refreshProxyPool().catch((error) => {
      this.logger.error('Failed to refresh pool after unblacklist', error);
    });
  }

  /**
   * 清理过期的黑名单
   */
  private cleanupBlacklist(): void {
    const now = new Date();
    const expiredProxies: string[] = [];

    for (const [proxyId, unblockTime] of this.blacklist.entries()) {
      if (now >= unblockTime) {
        expiredProxies.push(proxyId);
      }
    }

    for (const proxyId of expiredProxies) {
      this.blacklist.delete(proxyId);
      this.logger.debug(`Proxy ${proxyId} removed from blacklist (expired)`);
    }
  }

  /**
   * 检查代理是否在黑名单中
   */
  isBlacklisted(proxyId: string): boolean {
    return this.blacklist.has(proxyId);
  }

  /**
   * 增加代理活跃连接数
   */
  incrementActiveConnections(proxyId: string): void {
    const current = this.activeConnections.get(proxyId) || 0;
    this.activeConnections.set(proxyId, current + 1);
  }

  /**
   * 减少代理活跃连接数
   */
  decrementActiveConnections(proxyId: string): void {
    const current = this.activeConnections.get(proxyId) || 0;
    this.activeConnections.set(proxyId, Math.max(0, current - 1));
  }

  /**
   * 获取代理活跃连接数
   */
  getActiveConnections(proxyId: string): number {
    return this.activeConnections.get(proxyId) || 0;
  }

  /**
   * 获取代理池统计信息
   */
  getPoolStatistics(): {
    totalCountries: number;
    totalProxies: number;
    availableProxies: number;
    blacklistedProxies: number;
    averageScore: number;
    poolsByCountry: Array<{
      country: string;
      total: number;
      available: number;
      avgScore: number;
    }>;
  } {
    let totalProxies = 0;
    let availableProxies = 0;
    let totalScore = 0;
    let scoreCount = 0;

    const poolsByCountry = Array.from(this.proxyPoolCache.values()).map(
      (pool) => {
        totalProxies += pool.totalProxies;
        availableProxies += pool.availableProxies;

        const availableScores = pool.proxies.filter(
          (p) => !p.isBlacklisted && p.score > 0,
        );
        const avgScore =
          availableScores.length > 0
            ? availableScores.reduce((sum, p) => sum + p.score, 0) /
              availableScores.length
            : 0;

        totalScore += availableScores.reduce((sum, p) => sum + p.score, 0);
        scoreCount += availableScores.length;

        return {
          country: pool.country,
          total: pool.totalProxies,
          available: pool.availableProxies,
          avgScore: Math.round(avgScore),
        };
      },
    );

    return {
      totalCountries: this.proxyPoolCache.size,
      totalProxies,
      availableProxies,
      blacklistedProxies: this.blacklist.size,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      poolsByCountry,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProxyPoolConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('ProxyPoolService configuration updated', config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): ProxyPoolConfig {
    return { ...this.config };
  }
}
