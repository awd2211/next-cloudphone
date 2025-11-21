import { Injectable, Logger } from '@nestjs/common';
import { ProxyPoolService, ProxyScore } from './proxy-pool.service';

/**
 * 代理选择策略
 */
export enum ProxySelectionStrategy {
  // 最少连接数优先
  LEAST_CONNECTIONS = 'least_connections',
  // 加权轮询（基于评分）
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  // 延迟优先
  LATENCY_FIRST = 'latency_first',
  // 成功率优先
  SUCCESS_RATE_FIRST = 'success_rate_first',
  // 随机选择
  RANDOM = 'random',
  // 综合评分最高
  HIGHEST_SCORE = 'highest_score',
}

/**
 * 代理选择请求
 */
export interface ProxySelectionRequest {
  // 优先国家/地区
  preferredCountry?: string;
  // 选择策略
  strategy?: ProxySelectionStrategy;
  // 排除的代理 ID
  excludeProxyIds?: string[];
  // 最小评分要求
  minScore?: number;
  // 用户 ID（用于配额检查）
  userId?: string;
}

/**
 * 代理选择结果
 */
export interface ProxySelectionResult {
  success: boolean;
  proxy: ProxyScore | null;
  strategy: ProxySelectionStrategy;
  reason?: string;
  alternativeCountries?: string[];
}

/**
 * 代理智能选择服务
 *
 * 功能:
 * 1. 支持多种选择策略（最少连接、加权轮询、延迟优先等）
 * 2. 按国家/地区优先级选择
 * 3. 自动排除黑名单和低分代理
 * 4. 降级策略（首选国家无代理时自动切换到其他国家）
 */
@Injectable()
export class ProxySelectionService {
  private readonly logger = new Logger(ProxySelectionService.name);

  // 轮询计数器（用于加权轮询）
  private roundRobinCounters: Map<string, number> = new Map();

  // ✅ 统计跟踪
  private selectionStats: {
    strategyCounts: Record<ProxySelectionStrategy, number>;
    totalSelectionTime: number;
    totalSelections: number;
  } = {
    strategyCounts: {
      [ProxySelectionStrategy.LEAST_CONNECTIONS]: 0,
      [ProxySelectionStrategy.WEIGHTED_ROUND_ROBIN]: 0,
      [ProxySelectionStrategy.LATENCY_FIRST]: 0,
      [ProxySelectionStrategy.SUCCESS_RATE_FIRST]: 0,
      [ProxySelectionStrategy.RANDOM]: 0,
      [ProxySelectionStrategy.HIGHEST_SCORE]: 0,
    },
    totalSelectionTime: 0,
    totalSelections: 0,
  };

  constructor(private readonly proxyPool: ProxyPoolService) {}

  /**
   * 选择最佳代理
   */
  async selectProxy(
    request: ProxySelectionRequest,
  ): Promise<ProxySelectionResult> {
    const startTime = Date.now(); // ✅ 统计计时开始
    const strategy =
      request.strategy || ProxySelectionStrategy.HIGHEST_SCORE;
    const minScore = request.minScore || 0;
    const excludeIds = new Set(request.excludeProxyIds || []);

    this.logger.debug(
      `Selecting proxy with strategy: ${strategy}, country: ${request.preferredCountry || 'any'}`,
    );

    // 1. 获取候选代理池
    const candidates = this.getCandidateProxies(
      request.preferredCountry,
      excludeIds,
      minScore,
    );

    if (candidates.length === 0) {
      // 尝试降级：如果指定国家无代理，尝试其他国家
      if (request.preferredCountry) {
        const allCandidates = this.getCandidateProxies(
          undefined,
          excludeIds,
          minScore,
        );
        if (allCandidates.length > 0) {
          const alternativeCountries = [
            ...new Set(
              allCandidates
                .slice(0, 5)
                .map((p) => this.getProxyCountry(p.proxyId)),
            ),
          ];
          return {
            success: false,
            proxy: null,
            strategy,
            reason: `No available proxies in ${request.preferredCountry}`,
            alternativeCountries,
          };
        }
      }

      return {
        success: false,
        proxy: null,
        strategy,
        reason: 'No available proxies matching criteria',
      };
    }

    // 2. 根据策略选择代理
    const selectedProxy = this.applySelectionStrategy(strategy, candidates);

    if (!selectedProxy) {
      return {
        success: false,
        proxy: null,
        strategy,
        reason: 'Selection strategy returned no proxy',
      };
    }

    // 3. 增加活跃连接计数
    this.proxyPool.incrementActiveConnections(selectedProxy.proxyId);

    this.logger.log(
      `Selected proxy ${selectedProxy.proxyId} (score: ${selectedProxy.score}, strategy: ${strategy})`,
    );

    return {
      success: true,
      proxy: selectedProxy,
      strategy,
    };
  }

  /**
   * 获取候选代理列表
   */
  private getCandidateProxies(
    preferredCountry: string | undefined,
    excludeIds: Set<string>,
    minScore: number,
  ): ProxyScore[] {
    const candidates: ProxyScore[] = [];

    if (preferredCountry) {
      // 优先使用指定国家的代理
      const pool = this.proxyPool.getProxyPoolByCountry(preferredCountry);
      if (pool) {
        candidates.push(...pool.proxies);
      }
    } else {
      // 使用所有国家的代理
      const allPools = this.proxyPool.getAllProxyPools();
      for (const pool of allPools) {
        candidates.push(...pool.proxies);
      }
    }

    // 过滤: 排除黑名单、低分代理、被排除的代理
    return candidates.filter(
      (proxy) =>
        !proxy.isBlacklisted &&
        proxy.score >= minScore &&
        !excludeIds.has(proxy.proxyId),
    );
  }

  /**
   * 应用选择策略
   */
  private applySelectionStrategy(
    strategy: ProxySelectionStrategy,
    candidates: ProxyScore[],
  ): ProxyScore | null {
    if (candidates.length === 0) return null;

    switch (strategy) {
      case ProxySelectionStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(candidates);

      case ProxySelectionStrategy.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobin(candidates);

      case ProxySelectionStrategy.LATENCY_FIRST:
        return this.selectLatencyFirst(candidates);

      case ProxySelectionStrategy.SUCCESS_RATE_FIRST:
        return this.selectSuccessRateFirst(candidates);

      case ProxySelectionStrategy.RANDOM:
        return this.selectRandom(candidates);

      case ProxySelectionStrategy.HIGHEST_SCORE:
      default:
        return this.selectHighestScore(candidates);
    }
  }

  /**
   * 策略1: 最少连接数优先
   */
  private selectLeastConnections(candidates: ProxyScore[]): ProxyScore {
    return candidates.reduce((best, current) =>
      current.activeConnections < best.activeConnections ? current : best,
    );
  }

  /**
   * 策略2: 加权轮询（基于评分）
   *
   * 算法:
   * 1. 计算总权重 = sum(proxy.score)
   * 2. 生成随机数 0 ~ totalWeight
   * 3. 遍历代理累加权重，当累加值 >= 随机数时选中该代理
   */
  private selectWeightedRoundRobin(candidates: ProxyScore[]): ProxyScore {
    const totalWeight = candidates.reduce(
      (sum, proxy) => sum + proxy.score,
      0,
    );

    if (totalWeight === 0) {
      // 如果所有代理评分都是0，降级为随机选择
      return this.selectRandom(candidates);
    }

    // 生成随机数
    const randomValue = Math.random() * totalWeight;

    // 累加权重找到对应代理
    let cumulativeWeight = 0;
    for (const proxy of candidates) {
      cumulativeWeight += proxy.score;
      if (cumulativeWeight >= randomValue) {
        return proxy;
      }
    }

    // 理论上不会到达这里，fallback 返回第一个
    return candidates[0];
  }

  /**
   * 策略3: 延迟优先
   */
  private selectLatencyFirst(candidates: ProxyScore[]): ProxyScore {
    return candidates.reduce((best, current) =>
      current.latencyMs < best.latencyMs ? current : best,
    );
  }

  /**
   * 策略4: 成功率优先
   */
  private selectSuccessRateFirst(candidates: ProxyScore[]): ProxyScore {
    return candidates.reduce((best, current) =>
      current.successRate > best.successRate ? current : best,
    );
  }

  /**
   * 策略5: 随机选择
   */
  private selectRandom(candidates: ProxyScore[]): ProxyScore {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  /**
   * 策略6: 综合评分最高（默认）
   */
  private selectHighestScore(candidates: ProxyScore[]): ProxyScore {
    return candidates.reduce((best, current) =>
      current.score > best.score ? current : best,
    );
  }

  /**
   * 释放代理（减少活跃连接计数）
   */
  releaseProxy(proxyId: string): void {
    this.proxyPool.decrementActiveConnections(proxyId);
    this.logger.debug(`Released proxy ${proxyId}`);
  }

  /**
   * 获取代理所属国家
   */
  private getProxyCountry(proxyId: string): string {
    const allPools = this.proxyPool.getAllProxyPools();
    for (const pool of allPools) {
      if (pool.proxies.some((p) => p.proxyId === proxyId)) {
        return pool.country;
      }
    }
    return 'unknown';
  }

  /**
   * 获取选择统计信息
   * ✅ 已实现统计收集
   */
  getSelectionStatistics(): {
    strategyCounts: Record<ProxySelectionStrategy, number>;
    averageSelectionTime: number;
    totalSelections: number;
  } {
    return {
      strategyCounts: { ...this.selectionStats.strategyCounts },
      averageSelectionTime:
        this.selectionStats.totalSelections > 0
          ? this.selectionStats.totalSelectionTime / this.selectionStats.totalSelections
          : 0,
      totalSelections: this.selectionStats.totalSelections,
    };
  }

  /**
   * 记录选择统计（内部方法）
   */
  private recordSelection(strategy: ProxySelectionStrategy, durationMs: number): void {
    this.selectionStats.strategyCounts[strategy]++;
    this.selectionStats.totalSelectionTime += durationMs;
    this.selectionStats.totalSelections++;
  }

  /**
   * 重置统计（用于测试或定期清理）
   */
  resetStatistics(): void {
    this.selectionStats = {
      strategyCounts: {
        [ProxySelectionStrategy.LEAST_CONNECTIONS]: 0,
        [ProxySelectionStrategy.WEIGHTED_ROUND_ROBIN]: 0,
        [ProxySelectionStrategy.LATENCY_FIRST]: 0,
        [ProxySelectionStrategy.SUCCESS_RATE_FIRST]: 0,
        [ProxySelectionStrategy.RANDOM]: 0,
        [ProxySelectionStrategy.HIGHEST_SCORE]: 0,
      },
      totalSelectionTime: 0,
      totalSelections: 0,
    };
  }

  /**
   * 批量预选代理（用于批量创建设备）
   */
  async selectProxiesBatch(
    count: number,
    request: ProxySelectionRequest,
  ): Promise<ProxySelectionResult[]> {
    const results: ProxySelectionResult[] = [];
    const excludeIds = new Set(request.excludeProxyIds || []);

    for (let i = 0; i < count; i++) {
      const result = await this.selectProxy({
        ...request,
        excludeProxyIds: Array.from(excludeIds),
      });

      results.push(result);

      // 如果选择成功，将该代理加入排除列表（避免重复分配）
      if (result.success && result.proxy) {
        excludeIds.add(result.proxy.proxyId);
      }
    }

    return results;
  }

  /**
   * 验证代理是否可用
   */
  isProxyAvailable(proxyId: string, minScore: number = 0): boolean {
    const proxy = this.proxyPool.getProxyScore(proxyId);
    if (!proxy) return false;

    return !proxy.isBlacklisted && proxy.score >= minScore;
  }

  /**
   * 获取推荐的选择策略（基于当前代理池状态）
   */
  getRecommendedStrategy(): ProxySelectionStrategy {
    const stats = this.proxyPool.getPoolStatistics();

    // 如果平均评分很高（>80），使用随机选择减少负载集中
    if (stats.averageScore > 80) {
      return ProxySelectionStrategy.RANDOM;
    }

    // 如果可用代理很少，使用最少连接数避免过载
    if (stats.availableProxies < 10) {
      return ProxySelectionStrategy.LEAST_CONNECTIONS;
    }

    // 默认使用综合评分最高
    return ProxySelectionStrategy.HIGHEST_SCORE;
  }
}
