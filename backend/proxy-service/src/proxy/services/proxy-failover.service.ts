import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyFailoverConfig, ProxyFailoverHistory } from '../entities';
import { FailoverConfigDto } from '../dto';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import { ProxyIntelligenceService } from './proxy-intelligence.service';

/**
 * 代理故障切换服务
 *
 * 功能：
 * 1. 配置故障切换策略
 * 2. 自动检测代理故障
 * 3. 执行故障切换
 * 4. 记录切换历史
 */
@Injectable()
export class ProxyFailoverService {
  private readonly logger = new Logger(ProxyFailoverService.name);

  constructor(
    @InjectRepository(ProxyFailoverConfig)
    private configRepo: Repository<ProxyFailoverConfig>,
    @InjectRepository(ProxyFailoverHistory)
    private historyRepo: Repository<ProxyFailoverHistory>,
    private poolManager: ProxyPoolManager,
    private intelligenceService: ProxyIntelligenceService,
  ) {}

  /**
   * 配置故障切换策略
   */
  async configureFailover(dto: FailoverConfigDto): Promise<void> {
    const config = await this.configRepo.findOne({
      where: {
        userId: dto.userId,
        deviceId: dto.deviceId,
      },
    });

    if (config) {
      // 更新现有配置
      Object.assign(config, {
        enabled: dto.enabled ?? config.enabled,
        strategy: dto.strategy ?? config.strategy,
        maxRetries: dto.maxRetries ?? config.maxRetries,
        retryDelayMs: dto.retryDelayMs ?? config.retryDelayMs,
        failureThreshold: dto.failureThreshold ?? config.failureThreshold,
        successThreshold: dto.successThreshold ?? config.successThreshold,
        checkIntervalMs: dto.checkIntervalMs ?? config.checkIntervalMs,
        autoRecover: dto.autoRecover ?? config.autoRecover,
        notifyOnFailover: dto.notifyOnFailover ?? config.notifyOnFailover,
        updatedAt: new Date(),
      });

      await this.configRepo.save(config);
      this.logger.log(`Updated failover config for user ${dto.userId}`);
    } else {
      // 创建新配置
      const newConfig = this.configRepo.create({
        userId: dto.userId,
        deviceId: dto.deviceId,
        enabled: dto.enabled ?? true,
        strategy: dto.strategy ?? 'quality_based',
        maxRetries: dto.maxRetries ?? 3,
        retryDelayMs: dto.retryDelayMs ?? 1000,
        failureThreshold: dto.failureThreshold ?? 3,
        successThreshold: dto.successThreshold ?? 2,
        checkIntervalMs: dto.checkIntervalMs ?? 30000,
        autoRecover: dto.autoRecover ?? true,
        notifyOnFailover: dto.notifyOnFailover ?? true,
      });

      await this.configRepo.save(newConfig);
      this.logger.log(`Created failover config for user ${dto.userId}`);
    }
  }

  /**
   * 获取故障切换配置
   * 优先级：会话级 > 设备级 > 用户级 > 全局默认
   */
  async getFailoverConfig(
    userId?: string,
    deviceId?: string,
  ): Promise<FailoverConfigDto> {
    // 尝试获取最具体的配置
    let config: ProxyFailoverConfig | null = null;

    if (deviceId) {
      config = await this.configRepo.findOne({
        where: { userId, deviceId },
      });
    }

    if (!config && userId) {
      config = await this.configRepo.findOne({
        where: { userId, deviceId: null },
      });
    }

    if (!config) {
      // 返回全局默认配置
      return {
        enabled: true,
        strategy: 'quality_based',
        maxRetries: 3,
        retryDelayMs: 1000,
        failureThreshold: 3,
        successThreshold: 2,
        checkIntervalMs: 30000,
        autoRecover: true,
        notifyOnFailover: true,
      };
    }

    return {
      userId: config.userId,
      deviceId: config.deviceId,
      enabled: config.enabled,
      strategy: config.strategy,
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      checkIntervalMs: config.checkIntervalMs,
      autoRecover: config.autoRecover,
      notifyOnFailover: config.notifyOnFailover,
    };
  }

  /**
   * 执行故障切换
   */
  async executeFailover(
    sessionId: string,
    reason?: string,
  ): Promise<{
    switched: boolean;
    oldProxyId: string;
    newProxyId: string;
    duration: number;
  }> {
    const startTime = Date.now();

    // 获取当前会话的代理
    const session = this.poolManager.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const oldProxyId = session.proxyId;
    const oldProxy = this.poolManager.getProxyByIdFromPool(oldProxyId);

    this.logger.warn(
      `Failover triggered for session ${sessionId}, proxy ${oldProxyId}, reason: ${reason || 'manual'}`,
    );

    // 获取故障切换配置
    const config = await this.getFailoverConfig(
      session.userId,
      session.deviceId,
    );

    if (!config.enabled) {
      this.logger.warn(`Failover disabled for session ${sessionId}`);
      throw new Error('Failover is disabled for this session');
    }

    // 根据策略选择新代理
    const newProxy = await this.selectFailoverProxy(
      session,
      oldProxyId,
      config.strategy,
    );

    if (!newProxy) {
      throw new Error('No available proxy for failover');
    }

    // 执行切换
    await this.poolManager.switchSessionProxy(sessionId, newProxy.id);

    const duration = Date.now() - startTime;

    // 记录故障切换历史
    await this.recordFailoverHistory({
      sessionId,
      deviceId: session.deviceId,
      oldProxyId,
      newProxyId: newProxy.id,
      reason: reason || 'manual_trigger',
      strategy: config.strategy,
      duration,
      success: true,
    });

    this.logger.log(
      `Failover completed: ${oldProxyId} -> ${newProxy.id} (${duration}ms)`,
    );

    return {
      switched: true,
      oldProxyId,
      newProxyId: newProxy.id,
      duration,
    };
  }

  /**
   * 根据策略选择故障切换的新代理
   */
  private async selectFailoverProxy(
    session: any,
    excludeProxyId: string,
    strategy: string,
  ): Promise<any> {
    const candidates = this.poolManager
      .listProxies({}, true, 20)
      .filter((p) => p.id !== excludeProxyId);

    if (candidates.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'immediate':
        // 立即切换到第一个可用代理
        return candidates[0];

      case 'quality_based':
        // 选择质量最高的代理
        const scoredProxies = await Promise.all(
          candidates.map(async (proxy) => {
            const recommendation =
              await this.intelligenceService.recommendProxy({
                deviceId: session.deviceId,
                targetUrl: session.targetUrl,
                targetCountry: session.targetCountry,
              });
            const proxyScore = recommendation.recommendations.find(
              (r) => r.proxyId === proxy.id,
            );
            return {
              proxy,
              score: proxyScore?.score || 0,
            };
          }),
        );
        scoredProxies.sort((a, b) => b.score - a.score);
        return scoredProxies[0]?.proxy;

      case 'round_robin':
        // 轮询选择
        const currentIndex = candidates.findIndex(
          (p) => p.id === excludeProxyId,
        );
        const nextIndex = (currentIndex + 1) % candidates.length;
        return candidates[nextIndex];

      case 'retry_first':
        // 先尝试修复原代理，如果失败再切换
        const retrySuccess = await this.retryProxy(excludeProxyId);
        if (retrySuccess) {
          return this.poolManager.getProxyByIdFromPool(excludeProxyId);
        }
        // 如果重试失败，使用 quality_based 策略
        return this.selectFailoverProxy(session, excludeProxyId, 'quality_based');

      default:
        return candidates[0];
    }
  }

  /**
   * 重试代理连接
   */
  private async retryProxy(proxyId: string): Promise<boolean> {
    try {
      // 执行健康检查
      const proxy = this.poolManager.getProxyByIdFromPool(proxyId);
      if (!proxy) return false;

      // 简单的健康检查逻辑
      const healthCheck = await this.poolManager.healthCheckProxy(proxyId);
      return healthCheck.healthy;
    } catch (error) {
      this.logger.error(`Retry proxy ${proxyId} failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 记录故障切换历史
   */
  private async recordFailoverHistory(data: {
    sessionId: string;
    deviceId?: string;
    oldProxyId: string;
    newProxyId: string;
    reason: string;
    strategy: string;
    duration: number;
    success: boolean;
  }): Promise<void> {
    const history = this.historyRepo.create({
      sessionId: data.sessionId,
      deviceId: data.deviceId,
      oldProxyId: data.oldProxyId,
      newProxyId: data.newProxyId,
      reason: data.reason,
      strategy: data.strategy,
      switchDuration: data.duration,
      success: data.success,
    });

    await this.historyRepo.save(history);
  }

  /**
   * 查询故障切换历史
   */
  async getFailoverHistory(params: {
    sessionId?: string;
    deviceId?: string;
    limit?: number;
  }): Promise<ProxyFailoverHistory[]> {
    const queryBuilder = this.historyRepo.createQueryBuilder('history');

    if (params.sessionId) {
      queryBuilder.andWhere('history.sessionId = :sessionId', {
        sessionId: params.sessionId,
      });
    }

    if (params.deviceId) {
      queryBuilder.andWhere('history.deviceId = :deviceId', {
        deviceId: params.deviceId,
      });
    }

    queryBuilder.orderBy('history.createdAt', 'DESC');

    if (params.limit) {
      queryBuilder.limit(params.limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * 获取故障切换统计
   */
  async getFailoverStats(deviceId?: string): Promise<{
    totalFailovers: number;
    successRate: number;
    avgSwitchDuration: number;
    topReasons: { reason: string; count: number }[];
    recentFailovers: ProxyFailoverHistory[];
  }> {
    const queryBuilder = this.historyRepo.createQueryBuilder('history');

    if (deviceId) {
      queryBuilder.where('history.deviceId = :deviceId', { deviceId });
    }

    const [histories, totalFailovers] = await queryBuilder.getManyAndCount();

    const successCount = histories.filter((h) => h.success).length;
    const successRate =
      totalFailovers > 0 ? (successCount / totalFailovers) * 100 : 0;

    const avgSwitchDuration =
      histories.reduce((sum, h) => sum + h.switchDuration, 0) /
      (totalFailovers || 1);

    // 统计原因分布
    const reasonCounts = histories.reduce((acc, h) => {
      acc[h.reason] = (acc[h.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentFailovers = histories.slice(0, 10);

    return {
      totalFailovers,
      successRate,
      avgSwitchDuration,
      topReasons,
      recentFailovers,
    };
  }
}
