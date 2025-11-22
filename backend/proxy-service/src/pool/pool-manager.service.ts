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

  // 会话管理（用于粘性会话和故障切换）
  private sessionMap: Map<
    string,
    {
      sessionId: string;
      proxyId: string;
      userId: string;
      deviceId?: string;
      createdAt: Date;
      lastUsedAt: Date;
    }
  > = new Map();

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
    // 扩展点: 可基于 provider.getMetrics() 获取成功率/成本进行智能排序
    // 当前保持注册顺序，确保稳定性
    const sortedProviders = [...this.providers];

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
   * 列出所有代理（用于 Phase 3.1 智能选择）
   * @param criteria - 筛选条件（可选）
   * @param availableOnly - 是否只返回可用代理
   * @param limit - 返回数量限制
   * @param offset - 偏移量
   * @returns 代理列表
   */
  listProxies(
    criteria?: ProxyCriteria,
    availableOnly: boolean = false,
    limit?: number,
    offset: number = 0,
  ): ProxyInfo[] {
    let proxies = Array.from(this.proxyPool.values());

    // 如果指定只返回可用代理
    if (availableOnly) {
      proxies = proxies.filter((proxy) => !proxy.inUse);
    }

    // 应用筛选条件
    if (criteria) {
      proxies = proxies.filter((proxy) => this.matchesCriteria(proxy, criteria));
    }

    // 应用偏移和限制
    if (limit !== undefined) {
      proxies = proxies.slice(offset, offset + limit);
    } else {
      proxies = proxies.slice(offset);
    }

    this.logger.debug(
      `Listed ${proxies.length} proxies (total pool: ${this.proxyPool.size}, availableOnly: ${availableOnly})`,
    );

    return proxies;
  }

  /**
   * 根据 ID 从池中获取代理（用于 Phase 3.1 智能选择）
   * @param proxyId - 代理ID
   * @returns 代理信息，如果不存在返回 null
   */
  getProxyByIdFromPool(proxyId: string): ProxyInfo | null {
    return this.proxyPool.get(proxyId) || null;
  }

  /**
   * 分配指定的代理（用于 Phase 3.1 智能选择）
   * @param proxyId - 要分配的代理ID
   * @param validate - 是否验证代理可用性
   * @returns 代理信息
   * @throws NotFoundException 如果代理不存在
   * @throws BadRequestException 如果代理不可用
   */
  async assignSpecificProxy(
    proxyId: string,
    validate: boolean = true,
  ): Promise<ProxyInfo> {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      throw new Error(`Proxy not found: ${proxyId}`);
    }

    // 检查代理是否已被使用
    if (proxy.inUse) {
      throw new Error(`Proxy is already in use: ${proxyId}`);
    }

    // 验证代理可用性（可选）
    if (validate) {
      // 检查代理质量分数
      if (proxy.quality < 30) {
        throw new Error(
          `Proxy quality too low: ${proxyId} (quality: ${proxy.quality})`,
        );
      }

      // 检查失败次数
      if ((proxy.failureCount || 0) >= 3) {
        throw new Error(
          `Proxy has too many failures: ${proxyId} (failures: ${proxy.failureCount})`,
        );
      }

      // 检查是否过期
      if (proxy.expiresAt && new Date() > proxy.expiresAt) {
        throw new Error(`Proxy has expired: ${proxyId}`);
      }
    }

    // 标记为使用中
    proxy.inUse = true;
    proxy.lastUsed = new Date();

    this.logger.log(
      `Specific proxy assigned: ${proxyId} (${proxy.provider}, quality: ${proxy.quality})`,
    );

    return proxy;
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

  /**
   * 根据会话ID获取会话信息（用于故障切换）
   * @param sessionId - 会话ID
   * @returns 会话信息，如果不存在返回 null
   */
  getSessionById(sessionId: string): {
    sessionId: string;
    proxyId: string;
    userId: string;
    deviceId?: string;
    createdAt: Date;
    lastUsedAt: Date;
  } | null {
    return this.sessionMap.get(sessionId) || null;
  }

  /**
   * 切换会话的代理（用于故障切换）
   * @param sessionId - 会话ID
   * @param newProxyId - 新代理ID
   * @throws Error 如果会话或代理不存在
   */
  async switchSessionProxy(
    sessionId: string,
    newProxyId: string,
  ): Promise<void> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const newProxy = this.proxyPool.get(newProxyId);
    if (!newProxy) {
      throw new Error(`Proxy not found: ${newProxyId}`);
    }

    // 释放旧代理
    const oldProxyId = session.proxyId;
    const oldProxy = this.proxyPool.get(oldProxyId);
    if (oldProxy) {
      oldProxy.inUse = false;
      this.logger.debug(`Released old proxy: ${oldProxyId}`);
    }

    // 标记新代理为使用中
    newProxy.inUse = true;
    newProxy.lastUsed = new Date();

    // 更新会话绑定
    session.proxyId = newProxyId;
    session.lastUsedAt = new Date();

    this.logger.log(
      `Session ${sessionId} switched from proxy ${oldProxyId} to ${newProxyId}`,
    );
  }

  /**
   * 健康检查代理（用于故障切换）
   * @param proxyId - 代理ID
   * @returns 健康检查结果
   */
  async healthCheckProxy(proxyId: string): Promise<{
    healthy: boolean;
    quality?: number;
    latency?: number;
    failureCount?: number;
    message?: string;
  }> {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      return {
        healthy: false,
        message: `Proxy not found: ${proxyId}`,
      };
    }

    // 检查代理健康状态
    const isHealthy =
      proxy.quality >= 30 && // 质量分数至少30
      (proxy.failureCount || 0) < 3 && // 失败次数少于3次
      (!proxy.expiresAt || new Date() < proxy.expiresAt); // 未过期

    return {
      healthy: isHealthy,
      quality: proxy.quality,
      latency: proxy.latency,
      failureCount: proxy.failureCount || 0,
      message: isHealthy
        ? 'Proxy is healthy'
        : this.getUnhealthyReason(proxy),
    };
  }

  /**
   * 标记代理为使用中（用于粘性会话）
   * @param proxyId - 代理ID
   * @param sessionId - 会话ID（可选，用于关联会话）
   * @param userId - 用户ID（可选）
   * @param deviceId - 设备ID（可选）
   */
  markProxyInUse(
    proxyId: string,
    sessionId: string,
    userId?: string,
    deviceId?: string,
  ): void {
    const proxy = this.proxyPool.get(proxyId);

    if (!proxy) {
      this.logger.warn(
        `Cannot mark proxy as in use: proxy not found ${proxyId}`,
      );
      return;
    }

    // 标记代理为使用中
    proxy.inUse = true;
    proxy.lastUsed = new Date();
    proxy.sessionId = sessionId;

    // 记录会话映射
    if (userId) {
      this.sessionMap.set(sessionId, {
        sessionId,
        proxyId,
        userId,
        deviceId,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      this.logger.log(
        `Proxy ${proxyId} marked as in use for session ${sessionId} (user: ${userId}, device: ${deviceId || 'N/A'})`,
      );
    } else {
      this.logger.log(`Proxy ${proxyId} marked as in use for session ${sessionId}`);
    }
  }

  /**
   * 获取代理不健康的原因
   */
  private getUnhealthyReason(proxy: ProxyInfo): string {
    const reasons: string[] = [];

    if (proxy.quality < 30) {
      reasons.push(`low quality (${proxy.quality})`);
    }

    if ((proxy.failureCount || 0) >= 3) {
      reasons.push(`high failure count (${proxy.failureCount})`);
    }

    if (proxy.expiresAt && new Date() >= proxy.expiresAt) {
      reasons.push('expired');
    }

    return reasons.join(', ') || 'unknown reason';
  }

  /**
   * 终止指定用户的所有代理会话
   * @param userId 用户ID
   * @param deviceId 可选设备ID，如果指定则只终止该设备的会话
   * @returns 终止的会话数量
   */
  async terminateUserSessions(userId: string, deviceId?: string): Promise<number> {
    let terminatedCount = 0;

    // 遍历会话Map，找出并终止匹配的会话
    for (const [sessionId, session] of this.sessionMap.entries()) {
      const isUserMatch = session.userId === userId;
      const isDeviceMatch = !deviceId || session.deviceId === deviceId;

      if (isUserMatch && isDeviceMatch) {
        // 释放代理
        const proxy = this.proxyPool.get(session.proxyId);
        if (proxy) {
          proxy.inUse = false;
        }

        // 删除会话
        this.sessionMap.delete(sessionId);
        terminatedCount++;

        this.logger.log(
          `Terminated session ${sessionId} for user ${userId}, device ${session.deviceId}`,
        );
      }
    }

    // 清除缓存中的会话数据
    if (deviceId) {
      await this.cache.del(`session:user:${userId}:device:${deviceId}`);
    } else {
      // 清除用户所有会话缓存
      const cacheKeys = await this.cache.store.keys?.(`session:user:${userId}:*`);
      if (cacheKeys && cacheKeys.length > 0) {
        for (const key of cacheKeys) {
          await this.cache.del(key);
        }
      }
    }

    this.logger.log(
      `Total ${terminatedCount} sessions terminated for user ${userId}, device ${deviceId || 'all'}`,
    );

    return terminatedCount;
  }

  /**
   * 获取用户当前活跃的会话列表
   */
  getUserActiveSessions(userId: string, deviceId?: string): Array<{
    sessionId: string;
    proxyId: string;
    deviceId?: string;
    createdAt: Date;
    lastUsedAt: Date;
  }> {
    const sessions: Array<{
      sessionId: string;
      proxyId: string;
      deviceId?: string;
      createdAt: Date;
      lastUsedAt: Date;
    }> = [];

    for (const [sessionId, session] of this.sessionMap.entries()) {
      const isUserMatch = session.userId === userId;
      const isDeviceMatch = !deviceId || session.deviceId === deviceId;

      if (isUserMatch && isDeviceMatch) {
        sessions.push({
          sessionId,
          proxyId: session.proxyId,
          deviceId: session.deviceId,
          createdAt: session.createdAt,
          lastUsedAt: session.lastUsedAt,
        });
      }
    }

    return sessions;
  }
}
