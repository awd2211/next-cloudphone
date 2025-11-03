import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import {
  ProxyInfo,
  ProxyCriteria,
  PoolStats,
  LoadBalancingStrategy,
} from '../../common/interfaces';
import {
  AcquireProxyDto,
  ReportSuccessDto,
  ReportFailureDto,
  ProxyResponseDto,
  PoolStatsResponseDto,
  HealthResponseDto,
  ApiResponse,
} from '../dto';

/**
 * 代理服务
 *
 * 职责：
 * 1. 提供高层次的代理业务逻辑
 * 2. 整合代理池管理器
 * 3. 提供健康检查聚合
 * 4. 定时维护任务
 * 5. 统计信息聚合
 */
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly startTime = Date.now();

  // 缓存活跃代理（用于快速查找）
  private activeProxies: Map<string, ProxyInfo> = new Map();

  constructor(
    private readonly poolManager: ProxyPoolManager,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('ProxyService initialized');
  }

  /**
   * 获取代理
   */
  async acquireProxy(dto: AcquireProxyDto): Promise<ApiResponse<ProxyResponseDto>> {
    try {
      this.logger.log(`Acquiring proxy with criteria: ${JSON.stringify(dto)}`);

      // 构建筛选条件
      const criteria: ProxyCriteria = {
        country: dto.country,
        city: dto.city,
        state: dto.state,
        protocol: dto.protocol,
        minQuality: dto.minQuality,
        maxLatency: dto.maxLatency,
        sessionSticky: dto.sessionSticky,
        provider: dto.provider,
        maxCostPerGB: dto.maxCostPerGB,
      };

      // 从池中获取代理
      const proxy = await this.poolManager.getProxy(criteria);

      // 缓存到活跃代理列表
      this.activeProxies.set(proxy.id, proxy);

      // 转换为响应DTO
      const response = ProxyResponseDto.fromProxyInfo(proxy);

      this.logger.log(`Proxy acquired successfully: ${proxy.id} (${proxy.provider})`);

      return ApiResponse.success(response);
    } catch (error) {
      this.logger.error(`Failed to acquire proxy: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'ACQUIRE_PROXY_FAILED');
    }
  }

  /**
   * 释放代理
   */
  async releaseProxy(proxyId: string): Promise<ApiResponse<{ released: boolean }>> {
    try {
      this.logger.log(`Releasing proxy: ${proxyId}`);

      await this.poolManager.releaseProxy(proxyId);

      // 从活跃列表移除
      this.activeProxies.delete(proxyId);

      this.logger.log(`Proxy released successfully: ${proxyId}`);

      return ApiResponse.success({ released: true });
    } catch (error) {
      this.logger.error(`Failed to release proxy: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'RELEASE_PROXY_FAILED');
    }
  }

  /**
   * 报告代理使用成功
   */
  async reportSuccess(
    proxyId: string,
    dto: ReportSuccessDto,
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    try {
      this.logger.log(`Reporting success for proxy: ${proxyId}, bandwidth: ${dto.bandwidthMB}MB`);

      await this.poolManager.reportProxySuccess(proxyId, dto.bandwidthMB);

      this.logger.log(`Success reported for proxy: ${proxyId}`);

      return ApiResponse.success({ recorded: true });
    } catch (error) {
      this.logger.error(`Failed to report success: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'REPORT_SUCCESS_FAILED');
    }
  }

  /**
   * 报告代理使用失败
   */
  async reportFailure(
    proxyId: string,
    dto: ReportFailureDto,
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    try {
      this.logger.log(`Reporting failure for proxy: ${proxyId}, error: ${dto.message}`);

      const error = new Error(dto.message);
      if (dto.code) {
        (error as any).code = dto.code;
      }

      await this.poolManager.markProxyFailed(proxyId, error, dto.bandwidthMB);

      // 从活跃列表移除
      this.activeProxies.delete(proxyId);

      this.logger.log(`Failure reported for proxy: ${proxyId}`);

      return ApiResponse.success({ recorded: true });
    } catch (error) {
      this.logger.error(`Failed to report failure: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'REPORT_FAILURE_FAILED');
    }
  }

  /**
   * 获取池统计信息
   */
  async getPoolStats(): Promise<ApiResponse<PoolStatsResponseDto>> {
    try {
      const stats: PoolStats = this.poolManager.getPoolStats();
      const response = PoolStatsResponseDto.fromPoolStats(stats);

      return ApiResponse.success(response);
    } catch (error) {
      this.logger.error(`Failed to get pool stats: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'GET_STATS_FAILED');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthResponseDto> {
    const stats = this.poolManager.getPoolStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // 判断服务状态
    let status: 'ok' | 'degraded' | 'down' = 'ok';

    // 如果可用代理少于最小要求，状态降级
    const minSize = this.configService.get('POOL_MIN_SIZE', 1000);
    if (stats.available < minSize * 0.5) {
      status = 'degraded';
    }

    // 如果没有可用代理，服务不可用
    if (stats.available === 0) {
      status = 'down';
    }

    return {
      status,
      service: 'proxy-service',
      version: '1.0.0',
      uptime,
      timestamp: new Date(),
      details: {
        pool: {
          sizeOk: stats.total >= minSize,
          currentSize: stats.total,
          targetSize: this.configService.get('POOL_TARGET_SIZE', 2000),
          healthyRatio: stats.total > 0
            ? (stats.total - stats.unhealthy) / stats.total
            : 0,
          lastRefresh: stats.lastRefresh,
        },
      },
    };
  }

  /**
   * 设置负载均衡策略
   */
  async setLoadBalancingStrategy(
    strategy: LoadBalancingStrategy,
  ): Promise<ApiResponse<{ strategy: string }>> {
    try {
      this.poolManager.setLoadBalancingStrategy(strategy);

      this.logger.log(`Load balancing strategy changed to: ${strategy}`);

      return ApiResponse.success({ strategy });
    } catch (error) {
      this.logger.error(`Failed to set load balancing strategy: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'SET_STRATEGY_FAILED');
    }
  }

  /**
   * 定时任务：刷新代理池
   * 每10分钟执行一次
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async schedulePoolRefresh() {
    try {
      this.logger.log('Scheduled pool refresh started');

      const added = await this.poolManager.refreshPool();

      this.logger.log(`Scheduled pool refresh completed, added ${added} proxies`);
    } catch (error) {
      this.logger.error(`Scheduled pool refresh failed: ${error.message}`, error.stack);
    }
  }

  /**
   * 定时任务：清理不健康代理
   * 每30分钟执行一次
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduleCleanup() {
    try {
      this.logger.log('Scheduled cleanup started');

      const removed = this.poolManager.cleanupUnhealthyProxies();

      this.logger.log(`Scheduled cleanup completed, removed ${removed} proxies`);

      // 清理后如果池大小不足，触发刷新
      const stats = this.poolManager.getPoolStats();
      const minSize = this.configService.get('POOL_MIN_SIZE', 1000);

      if (stats.total < minSize) {
        this.logger.log('Pool size below minimum, triggering refresh');
        await this.poolManager.refreshPool();
      }
    } catch (error) {
      this.logger.error(`Scheduled cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * 定时任务：清理过期的活跃代理缓存
   * 每小时执行一次
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleActiveProxiesCleanup() {
    try {
      this.logger.log('Cleaning up active proxies cache');

      const before = this.activeProxies.size;
      const now = Date.now();
      const maxAge = 3600000; // 1小时

      // 移除超过1小时未更新的代理
      for (const [id, proxy] of this.activeProxies.entries()) {
        const age = now - (proxy.lastUsed?.getTime() || proxy.createdAt.getTime());
        if (age > maxAge) {
          this.activeProxies.delete(id);
        }
      }

      const removed = before - this.activeProxies.size;
      this.logger.log(`Active proxies cleanup completed, removed ${removed} entries`);
    } catch (error) {
      this.logger.error(`Active proxies cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取活跃代理数量
   */
  getActiveProxiesCount(): number {
    return this.activeProxies.size;
  }

  /**
   * 强制刷新代理池（管理员操作）
   */
  async forceRefreshPool(): Promise<ApiResponse<{ added: number }>> {
    try {
      this.logger.log('Force refresh pool requested');

      const added = await this.poolManager.refreshPool();

      this.logger.log(`Force refresh completed, added ${added} proxies`);

      return ApiResponse.success({ added });
    } catch (error) {
      this.logger.error(`Force refresh failed: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'FORCE_REFRESH_FAILED');
    }
  }

  /**
   * 获取代理详情（通过ID）
   * Phase 3.1: 改进为从代理池获取
   */
  async getProxyById(proxyId: string): Promise<ApiResponse<ProxyResponseDto>> {
    try {
      // Phase 3.1: 优先从代理池获取（包含所有代理）
      const proxy = this.poolManager.getProxyByIdFromPool(proxyId);

      if (!proxy) {
        // Fallback: 从活跃缓存查找
        const activeProxy = this.activeProxies.get(proxyId);
        if (!activeProxy) {
          throw new NotFoundException(`Proxy not found: ${proxyId}`);
        }

        const response = ProxyResponseDto.fromProxyInfo(activeProxy);
        return ApiResponse.success(response);
      }

      const response = ProxyResponseDto.fromProxyInfo(proxy);

      return ApiResponse.success(response);
    } catch (error) {
      this.logger.error(`Failed to get proxy: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'GET_PROXY_FAILED');
    }
  }

  /**
   * 列出所有代理（用于 Phase 3.1 智能选择）
   * @param criteria - 筛选条件
   * @param availableOnly - 是否只返回可用代理
   * @param limit - 返回数量限制
   * @param offset - 偏移量
   */
  async listProxies(
    criteria?: ProxyCriteria,
    availableOnly: boolean = false,
    limit?: number,
    offset: number = 0,
  ): Promise<ApiResponse<ProxyResponseDto[]>> {
    try {
      this.logger.debug(
        `Listing proxies - availableOnly: ${availableOnly}, limit: ${limit}, offset: ${offset}`,
      );

      const proxies = this.poolManager.listProxies(
        criteria,
        availableOnly,
        limit,
        offset,
      );

      const responses = proxies.map((proxy) =>
        ProxyResponseDto.fromProxyInfo(proxy),
      );

      this.logger.log(`Listed ${responses.length} proxies`);

      return ApiResponse.success(responses);
    } catch (error) {
      this.logger.error(`Failed to list proxies: ${error.message}`, error.stack);
      return ApiResponse.error(error.message, 'LIST_PROXIES_FAILED');
    }
  }

  /**
   * 分配指定的代理（用于 Phase 3.1 智能选择）
   * @param proxyId - 代理ID
   * @param validate - 是否验证代理可用性
   */
  async assignSpecificProxy(
    proxyId: string,
    validate: boolean = true,
  ): Promise<ApiResponse<ProxyResponseDto>> {
    try {
      this.logger.log(
        `Assigning specific proxy: ${proxyId}, validate: ${validate}`,
      );

      // 从池中分配指定代理
      const proxy = await this.poolManager.assignSpecificProxy(proxyId, validate);

      // 添加到活跃代理列表
      this.activeProxies.set(proxy.id, proxy);

      // 转换为响应DTO
      const response = ProxyResponseDto.fromProxyInfo(proxy);

      this.logger.log(
        `Specific proxy assigned successfully: ${proxy.id} (${proxy.provider})`,
      );

      return ApiResponse.success(response);
    } catch (error) {
      this.logger.error(
        `Failed to assign specific proxy: ${error.message}`,
        error.stack,
      );
      return ApiResponse.error(error.message, 'ASSIGN_PROXY_FAILED');
    }
  }
}
