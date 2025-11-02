import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import {
  ProxyInfo,
  ProxyCriteria,
  PoolStats,
  LoadBalancingStrategy,
  IProxyProvider,
} from '../common/interfaces';
import { ProxyUsage } from '../entities/proxy-usage.entity';

/**
 * 代理池管理器
 *
 * 职责：
 * 1. 维护内存中的代理池（1000-5000个代理）
 * 2. 从多个供应商获取和分配代理
 * 3. 实现多种负载均衡策略
 * 4. 管理代理的生命周期（获取、使用、释放）
 * 5. 跟踪代理使用统计
 */
@Injectable()
export class ProxyPoolManager {
  private readonly logger = new Logger(ProxyPoolManager.name);

  // 内存代理池
  private proxyPool: Map<string, ProxyInfo> = new Map();

  // 供应商适配器列表
  private providers: IProxyProvider[] = [];

  // 负载均衡策略
  private loadBalancingStrategy: LoadBalancingStrategy;

  // 配置
  private readonly poolMinSize: number;
  private readonly poolTargetSize: number;
  private readonly poolMaxSize: number;

  // 轮询索引（用于round-robin策略）
  private roundRobinIndex = 0;

  constructor(
    @Inject('PROXY_PROVIDERS') providers: IProxyProvider[],
    @Inject(CACHE_MANAGER) private cache: Cache,
    @InjectRepository(ProxyUsage)
    private usageRepository: Repository<ProxyUsage>,
    private configService: ConfigService,
  ) {
    this.providers = providers;
    this.poolMinSize = this.configService.get('POOL_MIN_SIZE', 1000);
    this.poolTargetSize = this.configService.get('POOL_TARGET_SIZE', 2000);
    this.poolMaxSize = this.configService.get('POOL_MAX_SIZE', 5000);
    this.loadBalancingStrategy = LoadBalancingStrategy.QUALITY_BASED;

    this.logger.log(
      `ProxyPoolManager initialized with ${this.providers.length} provider(s)`,
    );
    this.logger.log(
      `Pool size: min=${this.poolMinSize}, target=${this.poolTargetSize}, max=${this.poolMaxSize}`,
    );
  }

  /**
   * 获取代理
   * 根据筛选条件和负载均衡策略选择最佳代理
   */
  async getProxy(criteria?: ProxyCriteria): Promise<ProxyInfo> {
    // 1. 尝试从池中获取符合条件的可用代理
    const availableProxies = this.getAvailableProxies(criteria);

    if (availableProxies.length > 0) {
      const selectedProxy = this.selectProxyByStrategy(availableProxies);
      selectedProxy.inUse = true;
      selectedProxy.lastUsed = new Date();

      this.logger.debug(
        `Proxy acquired from pool: ${selectedProxy.id} (${selectedProxy.provider})`,
      );

      return selectedProxy;
    }

    // 2. 池中没有可用代理，从供应商获取新代理
    this.logger.debug('No available proxy in pool, fetching from providers');
    const newProxy = await this.fetchProxyFromProvider(criteria);

    if (!newProxy) {
      throw new Error('Failed to acquire proxy: no providers available');
    }

    // 3. 添加到池中并标记为使用中
    newProxy.inUse = true;
    newProxy.lastUsed = new Date();
    this.proxyPool.set(newProxy.id, newProxy);

    this.logger.log(
      `Proxy acquired from provider: ${newProxy.id} (${newProxy.provider})`,
    );

    return newProxy;
  }

  /**
   * 释放代理
   * 将代理标记为可用状态
   */
  async releaseProxy(proxyId: string): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      this.logger.warn(`Proxy not found in pool: ${proxyId}`);
      return;
    }

    proxy.inUse = false;
    this.logger.debug(`Proxy released: ${proxyId}`);
  }

  /**
   * 标记代理失败
   * 增加失败计数，降低质量分数，严重时移除代理
   */
  async markProxyFailed(
    proxyId: string,
    error: Error,
    bandwidthMB?: number,
  ): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      this.logger.warn(`Proxy not found in pool: ${proxyId}`);
      return;
    }

    // 增加失败计数
    proxy.failureCount = (proxy.failureCount || 0) + 1;

    // 降低质量分数
    proxy.quality = Math.max(0, proxy.quality - 20);

    // 标记为可用（以便下次可以重试或被健康检查移除）
    proxy.inUse = false;

    // 记录使用失败
    await this.recordUsage(proxy, false, bandwidthMB);

    // 如果失败次数过多，从池中移除
    if (proxy.failureCount >= 5) {
      this.proxyPool.delete(proxyId);
      this.logger.warn(
        `Proxy removed due to repeated failures: ${proxyId} (${proxy.failureCount} failures)`,
      );
    }

    this.logger.debug(
      `Proxy marked as failed: ${proxyId}, failures=${proxy.failureCount}, quality=${proxy.quality}`,
    );
  }

  /**
   * 报告代理使用成功
   */
  async reportProxySuccess(proxyId: string, bandwidthMB: number): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      this.logger.warn(`Proxy not found in pool: ${proxyId}`);
      return;
    }

    // 重置失败计数
    proxy.failureCount = 0;

    // 提升质量分数
    proxy.quality = Math.min(100, proxy.quality + 5);

    // 记录使用成功
    await this.recordUsage(proxy, true, bandwidthMB);

    this.logger.debug(
      `Proxy usage reported: ${proxyId}, quality=${proxy.quality}`,
    );
  }

  /**
   * 刷新代理池
   * 确保池中代理数量达到目标大小
   */
  async refreshPool(): Promise<number> {
    const currentSize = this.proxyPool.size;

    if (currentSize >= this.poolTargetSize) {
      this.logger.debug(
        `Pool size (${currentSize}) meets target (${this.poolTargetSize}), skipping refresh`,
      );
      return 0;
    }

    const needed = this.poolTargetSize - currentSize;
    this.logger.log(`Refreshing pool, need ${needed} more proxies`);

    let added = 0;
    const perProvider = Math.ceil(needed / this.providers.length);

    for (const provider of this.providers) {
      try {
        const proxies = await provider.getProxyList({ limit: perProvider });

        proxies.forEach((proxy) => {
          if (this.proxyPool.size < this.poolMaxSize) {
            this.proxyPool.set(proxy.id, proxy);
            added++;
          }
        });

        this.logger.log(
          `Added ${proxies.length} proxies from ${provider.getName()}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to refresh pool from ${provider.getName()}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Pool refreshed: added ${added} proxies, total=${this.proxyPool.size}`);

    return added;
  }

  /**
   * 获取池统计信息
   */
  getPoolStats(): PoolStats {
    const proxies = Array.from(this.proxyPool.values());
    const inUseProxies = proxies.filter((p) => p.inUse);
    const availableProxies = proxies.filter((p) => !p.inUse);
    const unhealthyProxies = proxies.filter((p) => (p.failureCount || 0) >= 3);

    // 按供应商分组
    const providerBreakdown: Record<string, number> = {};
    proxies.forEach((proxy) => {
      providerBreakdown[proxy.provider] =
        (providerBreakdown[proxy.provider] || 0) + 1;
    });

    // 按国家分组
    const countryBreakdown: Record<string, number> = {};
    proxies.forEach((proxy) => {
      countryBreakdown[proxy.location.country] =
        (countryBreakdown[proxy.location.country] || 0) + 1;
    });

    // 计算平均质量和延迟
    const avgQuality =
      proxies.length > 0
        ? proxies.reduce((sum, p) => sum + p.quality, 0) / proxies.length
        : 0;
    const avgLatency =
      proxies.length > 0
        ? proxies.reduce((sum, p) => sum + p.latency, 0) / proxies.length
        : 0;

    return {
      total: proxies.length,
      inUse: inUseProxies.length,
      available: availableProxies.length,
      unhealthy: unhealthyProxies.length,
      providerBreakdown,
      countryBreakdown,
      averageQuality: Math.round(avgQuality),
      averageLatency: Math.round(avgLatency),
      lastRefresh: new Date(),
    };
  }

  /**
   * 设置负载均衡策略
   */
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy;
    this.logger.log(`Load balancing strategy changed to: ${strategy}`);
  }

  /**
   * 清理池中的不健康代理
   */
  cleanupUnhealthyProxies(): number {
    const before = this.proxyPool.size;
    const toRemove: string[] = [];

    this.proxyPool.forEach((proxy, id) => {
      // 移除失败次数过多的代理
      if ((proxy.failureCount || 0) >= 5) {
        toRemove.push(id);
      }
      // 移除质量分数过低的代理
      else if (proxy.quality < 20) {
        toRemove.push(id);
      }
      // 移除过期的代理
      else if (proxy.expiresAt && proxy.expiresAt < new Date()) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.proxyPool.delete(id));

    const removed = before - this.proxyPool.size;
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} unhealthy proxies`);
    }

    return removed;
  }

  /**
   * 获取符合条件的可用代理列表
   */
  private getAvailableProxies(criteria?: ProxyCriteria): ProxyInfo[] {
    const proxies = Array.from(this.proxyPool.values());

    return proxies.filter((proxy) => {
      // 必须未被使用
      if (proxy.inUse) return false;

      // 必须健康
      if ((proxy.failureCount || 0) >= 3) return false;

      // 应用筛选条件
      if (!this.matchesCriteria(proxy, criteria)) return false;

      return true;
    });
  }

  /**
   * 检查代理是否符合筛选条件
   */
  private matchesCriteria(
    proxy: ProxyInfo,
    criteria?: ProxyCriteria,
  ): boolean {
    if (!criteria) return true;

    // 国家匹配
    if (criteria.country && proxy.location.country !== criteria.country) {
      return false;
    }

    // 城市匹配
    if (criteria.city && proxy.location.city !== criteria.city) {
      return false;
    }

    // 协议匹配
    if (criteria.protocol && proxy.protocol !== criteria.protocol) {
      return false;
    }

    // 质量分数
    if (criteria.minQuality && proxy.quality < criteria.minQuality) {
      return false;
    }

    // 延迟
    if (criteria.maxLatency && proxy.latency > criteria.maxLatency) {
      return false;
    }

    // 成本
    if (criteria.maxCostPerGB && proxy.costPerGB > criteria.maxCostPerGB) {
      return false;
    }

    // 指定供应商
    if (criteria.provider && proxy.provider !== criteria.provider) {
      return false;
    }

    return true;
  }

  /**
   * 根据负载均衡策略选择代理
   */
  private selectProxyByStrategy(proxies: ProxyInfo[]): ProxyInfo {
    switch (this.loadBalancingStrategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.selectByRoundRobin(proxies);

      case LoadBalancingStrategy.QUALITY_BASED:
        return this.selectByQuality(proxies);

      case LoadBalancingStrategy.COST_OPTIMIZED:
        return this.selectByCost(proxies);

      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.selectByLeastConnections(proxies);

      case LoadBalancingStrategy.RANDOM:
      default:
        return proxies[Math.floor(Math.random() * proxies.length)];
    }
  }

  /**
   * 轮询选择
   */
  private selectByRoundRobin(proxies: ProxyInfo[]): ProxyInfo {
    const selected = proxies[this.roundRobinIndex % proxies.length];
    this.roundRobinIndex++;
    return selected;
  }

  /**
   * 基于质量分数选择
   */
  private selectByQuality(proxies: ProxyInfo[]): ProxyInfo {
    return proxies.reduce((best, current) =>
      current.quality > best.quality ? current : best,
    );
  }

  /**
   * 基于成本选择（选择最便宜的）
   */
  private selectByCost(proxies: ProxyInfo[]): ProxyInfo {
    return proxies.reduce((best, current) =>
      current.costPerGB < best.costPerGB ? current : best,
    );
  }

  /**
   * 基于最少连接选择（选择最少使用的）
   */
  private selectByLeastConnections(proxies: ProxyInfo[]): ProxyInfo {
    // 简化实现：选择最近最少使用的
    return proxies.reduce((best, current) => {
      const bestLastUsed = best.lastUsed?.getTime() || 0;
      const currentLastUsed = current.lastUsed?.getTime() || 0;
      return currentLastUsed < bestLastUsed ? current : best;
    });
  }

  /**
   * 从供应商获取新代理
   */
  private async fetchProxyFromProvider(
    criteria?: ProxyCriteria,
  ): Promise<ProxyInfo | null> {
    // 根据优先级和可用性选择供应商
    const sortedProviders = [...this.providers].sort((a, b) => {
      // TODO: 可以基于供应商的成功率、成本等进行排序
      return 0;
    });

    for (const provider of sortedProviders) {
      try {
        const proxies = await provider.getProxyList({
          country: criteria?.country,
          city: criteria?.city,
          protocol: criteria?.protocol,
          limit: 1,
        });

        if (proxies.length > 0) {
          return proxies[0];
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch proxy from ${provider.getName()}: ${error.message}`,
        );
      }
    }

    return null;
  }

  /**
   * 记录代理使用
   */
  private async recordUsage(
    proxy: ProxyInfo,
    success: boolean,
    bandwidthMB?: number,
  ): Promise<void> {
    try {
      const usage = this.usageRepository.create({
        proxyId: proxy.id,
        provider: proxy.provider,
        country: proxy.location.country,
        bandwidthMB: bandwidthMB || 0,
        cost: bandwidthMB ? (bandwidthMB / 1024) * proxy.costPerGB : 0,
        success,
        usedAt: new Date(),
      });

      await this.usageRepository.save(usage);
    } catch (error) {
      this.logger.error(`Failed to record usage: ${error.message}`);
    }
  }
}
