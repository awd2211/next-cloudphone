import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProxyUsage,
  ProxyUsageSummary,
  ActiveProxyStats,
  ProxyReleaseReason,
  ProxyHealthStatus,
} from '../entities/proxy-usage.entity';

/**
 * 代理性能统计数据
 */
export interface ProxyPerformanceStats {
  successRate?: number;
  avgLatencyMs?: number;
  totalRequests?: number;
  failedRequests?: number;
}

/**
 * 代理统计服务
 * 负责记录代理分配/释放历史，提供统计查询功能
 */
@Injectable()
export class ProxyStatsService {
  private readonly logger = new Logger(ProxyStatsService.name);

  constructor(
    @InjectRepository(ProxyUsage)
    private readonly proxyUsageRepository: Repository<ProxyUsage>,
  ) {}

  /**
   * 记录代理分配
   */
  async recordProxyAssignment(data: {
    deviceId: string;
    deviceName?: string;
    userId?: string;
    userName?: string;
    proxyId: string;
    proxyHost: string;
    proxyPort: number;
    proxyType?: string;
    proxyCountry?: string;
  }): Promise<ProxyUsage> {
    this.logger.log(
      `Recording proxy assignment: device=${data.deviceId}, proxy=${data.proxyId}`,
    );

    const usage = this.proxyUsageRepository.create({
      deviceId: data.deviceId,
      deviceName: data.deviceName || null,
      userId: data.userId || null,
      userName: data.userName || null,
      proxyId: data.proxyId,
      proxyHost: data.proxyHost,
      proxyPort: data.proxyPort,
      proxyType: data.proxyType || null,
      proxyCountry: data.proxyCountry || null,
      assignedAt: new Date(),
      healthStatus: ProxyHealthStatus.HEALTHY, // 初始健康状态
      metadata: {},
    });

    return this.proxyUsageRepository.save(usage);
  }

  /**
   * 记录代理释放
   */
  async recordProxyRelease(
    deviceId: string,
    proxyId: string,
    reason: ProxyReleaseReason,
    stats?: ProxyPerformanceStats,
  ): Promise<ProxyUsage | null> {
    this.logger.log(
      `Recording proxy release: device=${deviceId}, proxy=${proxyId}, reason=${reason}`,
    );

    // 查找活跃的代理使用记录
    const usage = await this.proxyUsageRepository.findOne({
      where: {
        deviceId,
        proxyId,
        releasedAt: null as any, // TypeORM null 类型问题workaround
      },
    });

    if (!usage) {
      this.logger.warn(
        `No active proxy usage found for device=${deviceId}, proxy=${proxyId}`,
      );
      return null;
    }

    // 更新释放信息
    usage.releasedAt = new Date();
    usage.releaseReason = reason;

    // 更新性能统计
    if (stats) {
      usage.successRate = stats.successRate ?? null;
      usage.avgLatencyMs = stats.avgLatencyMs ?? null;
      usage.totalRequests = stats.totalRequests ?? null;
      usage.failedRequests = stats.failedRequests ?? null;
    }

    // duration_minutes 由数据库触发器自动计算
    return this.proxyUsageRepository.save(usage);
  }

  /**
   * 更新代理健康检查结果
   */
  async updateProxyHealth(
    deviceId: string,
    proxyId: string,
    healthStatus: ProxyHealthStatus,
    passed: boolean,
  ): Promise<void> {
    const usage = await this.proxyUsageRepository.findOne({
      where: {
        deviceId,
        proxyId,
        releasedAt: null as any,
      },
    });

    if (!usage) {
      this.logger.warn(
        `No active proxy usage found for health update: device=${deviceId}, proxy=${proxyId}`,
      );
      return;
    }

    usage.healthStatus = healthStatus;
    usage.lastHealthCheck = new Date();

    if (passed) {
      usage.healthChecksPassed += 1;
    } else {
      usage.healthChecksFailed += 1;
    }

    await this.proxyUsageRepository.save(usage);

    this.logger.debug(
      `Updated proxy health: proxy=${proxyId}, status=${healthStatus}, passed=${passed}`,
    );
  }

  /**
   * 获取设备当前使用的代理
   */
  async getCurrentProxyUsage(deviceId: string): Promise<ProxyUsage | null> {
    return this.proxyUsageRepository.findOne({
      where: {
        deviceId,
        releasedAt: null as any,
      },
      order: {
        assignedAt: 'DESC',
      },
    });
  }

  /**
   * 获取设备的代理使用历史
   */
  async getDeviceProxyHistory(
    deviceId: string,
    limit: number = 10,
  ): Promise<ProxyUsage[]> {
    return this.proxyUsageRepository.find({
      where: { deviceId },
      order: { assignedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 获取代理的详细统计信息
   */
  async getProxyStats(proxyId: string): Promise<ProxyUsageSummary | null> {
    const result = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.proxy_id', 'proxyId')
      .addSelect('COUNT(*)', 'totalAssignments')
      .addSelect(
        'COUNT(CASE WHEN usage.released_at IS NULL THEN 1 END)',
        'activeAssignments',
      )
      .addSelect('AVG(usage.duration_minutes)', 'averageDurationMinutes')
      .addSelect('AVG(usage.success_rate)', 'averageSuccessRate')
      .addSelect('AVG(usage.avg_latency_ms)', 'averageLatencyMs')
      .addSelect('SUM(usage.total_requests)', 'totalRequests')
      .addSelect('SUM(usage.failed_requests)', 'totalFailedRequests')
      .addSelect(
        'AVG(usage.health_checks_passed::DECIMAL / NULLIF(usage.health_checks_passed + usage.health_checks_failed, 0)) * 100',
        'overallHealthRate',
      )
      .addSelect('MAX(usage.assigned_at)', 'lastUsedAt')
      .where('usage.proxy_id = :proxyId', { proxyId })
      .groupBy('usage.proxy_id')
      .getRawOne();

    if (!result) return null;

    return {
      proxyId: result.proxyId,
      totalAssignments: parseInt(result.totalAssignments, 10),
      activeAssignments: parseInt(result.activeAssignments, 10),
      averageDurationMinutes: parseFloat(result.averageDurationMinutes) || 0,
      averageSuccessRate: parseFloat(result.averageSuccessRate) || 0,
      averageLatencyMs: parseInt(result.averageLatencyMs, 10) || 0,
      totalRequests: parseInt(result.totalRequests, 10) || 0,
      totalFailedRequests: parseInt(result.totalFailedRequests, 10) || 0,
      overallHealthRate: parseFloat(result.overallHealthRate) || 0,
      lastUsedAt: result.lastUsedAt ? new Date(result.lastUsedAt) : null,
    };
  }

  /**
   * 获取所有活跃代理的统计信息
   */
  async getActiveProxyStats(): Promise<ActiveProxyStats[]> {
    const results = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.proxy_id', 'proxyId')
      .addSelect('usage.proxy_host', 'proxyHost')
      .addSelect('usage.proxy_port', 'proxyPort')
      .addSelect('usage.proxy_country', 'proxyCountry')
      .addSelect('COUNT(*)', 'activeDevices')
      .addSelect('MIN(usage.assigned_at)', 'earliestAssignment')
      .addSelect('MAX(usage.assigned_at)', 'latestAssignment')
      .addSelect(
        'AVG(usage.health_checks_passed::DECIMAL / NULLIF(usage.health_checks_passed + usage.health_checks_failed, 0)) * 100',
        'avgHealthRate',
      )
      .where('usage.released_at IS NULL')
      .groupBy('usage.proxy_id')
      .addGroupBy('usage.proxy_host')
      .addGroupBy('usage.proxy_port')
      .addGroupBy('usage.proxy_country')
      .getRawMany();

    return results.map((r) => ({
      proxyId: r.proxyId,
      proxyHost: r.proxyHost,
      proxyPort: parseInt(r.proxyPort, 10),
      proxyCountry: r.proxyCountry,
      activeDevices: parseInt(r.activeDevices, 10),
      earliestAssignment: new Date(r.earliestAssignment),
      latestAssignment: new Date(r.latestAssignment),
      avgHealthRate: parseFloat(r.avgHealthRate) || 0,
    }));
  }

  /**
   * 获取代理使用总览
   */
  async getProxyUsageOverview(days: number = 7): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    uniqueProxies: number;
    avgDurationMinutes: number;
    avgSuccessRate: number;
  }> {
    const query = this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('COUNT(*)', 'totalAssignments')
      .addSelect(
        'COUNT(CASE WHEN usage.released_at IS NULL THEN 1 END)',
        'activeAssignments',
      )
      .addSelect('COUNT(DISTINCT usage.proxy_id)', 'uniqueProxies')
      .addSelect('AVG(usage.duration_minutes)', 'avgDurationMinutes')
      .addSelect('AVG(usage.success_rate)', 'avgSuccessRate');

    // 如果指定了天数，添加时间范围过滤
    if (days > 0) {
      query.where('usage.assigned_at >= NOW() - INTERVAL :days DAY', { days });
    }

    const result = await query.getRawOne();

    return {
      totalAssignments: parseInt(result.totalAssignments, 10),
      activeAssignments: parseInt(result.activeAssignments, 10),
      uniqueProxies: parseInt(result.uniqueProxies, 10),
      avgDurationMinutes: parseFloat(result.avgDurationMinutes) || 0,
      avgSuccessRate: parseFloat(result.avgSuccessRate) || 0,
    };
  }

  /**
   * 获取代理性能统计（按国家/类型分组）
   */
  async getProxyPerformanceStats(): Promise<
    Array<{
      proxyCountry: string | null;
      proxyType: string | null;
      totalAssignments: number;
      avgSuccessRate: number;
      avgLatencyMs: number;
      avgDurationMinutes: number;
      healthyCount: number;
      degradedCount: number;
      unhealthyCount: number;
    }>
  > {
    const results = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.proxy_country', 'proxyCountry')
      .addSelect('usage.proxy_type', 'proxyType')
      .addSelect('COUNT(*)', 'totalAssignments')
      .addSelect('AVG(usage.success_rate)', 'avgSuccessRate')
      .addSelect('AVG(usage.avg_latency_ms)', 'avgLatencyMs')
      .addSelect('AVG(usage.duration_minutes)', 'avgDurationMinutes')
      .addSelect(
        `COUNT(CASE WHEN usage.health_status = 'healthy' THEN 1 END)`,
        'healthyCount',
      )
      .addSelect(
        `COUNT(CASE WHEN usage.health_status = 'degraded' THEN 1 END)`,
        'degradedCount',
      )
      .addSelect(
        `COUNT(CASE WHEN usage.health_status = 'unhealthy' THEN 1 END)`,
        'unhealthyCount',
      )
      .where('usage.released_at IS NOT NULL') // 只统计已释放的记录
      .groupBy('usage.proxy_country')
      .addGroupBy('usage.proxy_type')
      .orderBy('totalAssignments', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      proxyCountry: r.proxyCountry || 'Unknown',
      proxyType: r.proxyType || 'Unknown',
      totalAssignments: parseInt(r.totalAssignments, 10),
      avgSuccessRate: parseFloat(r.avgSuccessRate) || 0,
      avgLatencyMs: parseFloat(r.avgLatencyMs) || 0,
      avgDurationMinutes: parseFloat(r.avgDurationMinutes) || 0,
      healthyCount: parseInt(r.healthyCount, 10),
      degradedCount: parseInt(r.degradedCount, 10),
      unhealthyCount: parseInt(r.unhealthyCount, 10),
    }));
  }

  /**
   * 获取代理详细信息（别名方法，便于控制器调用）
   */
  async getProxyUsageDetails(
    proxyId: string,
  ): Promise<ProxyUsageSummary | null> {
    return this.getProxyStats(proxyId);
  }

  /**
   * 获取用户的代理使用汇总
   */
  async getUserProxySummary(userId: string): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    totalDurationMinutes: number;
    avgSuccessRate: number;
    uniqueProxiesUsed: number;
    mostUsedProxy: string | null;
    mostUsedProxyCount: number;
  }> {
    // 基本统计
    const basicStats = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('COUNT(*)', 'totalAssignments')
      .addSelect(
        'COUNT(CASE WHEN usage.released_at IS NULL THEN 1 END)',
        'activeAssignments',
      )
      .addSelect('SUM(usage.duration_minutes)', 'totalDurationMinutes')
      .addSelect('AVG(usage.success_rate)', 'avgSuccessRate')
      .addSelect('COUNT(DISTINCT usage.proxy_id)', 'uniqueProxiesUsed')
      .where('usage.user_id = :userId', { userId })
      .getRawOne();

    // 最常用的代理
    const mostUsedProxy = await this.proxyUsageRepository
      .createQueryBuilder('usage')
      .select('usage.proxy_id', 'proxyId')
      .addSelect('COUNT(*)', 'usageCount')
      .where('usage.user_id = :userId', { userId })
      .groupBy('usage.proxy_id')
      .orderBy('usageCount', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      totalAssignments: parseInt(basicStats.totalAssignments, 10),
      activeAssignments: parseInt(basicStats.activeAssignments, 10),
      totalDurationMinutes: parseFloat(basicStats.totalDurationMinutes) || 0,
      avgSuccessRate: parseFloat(basicStats.avgSuccessRate) || 0,
      uniqueProxiesUsed: parseInt(basicStats.uniqueProxiesUsed, 10),
      mostUsedProxy: mostUsedProxy?.proxyId || null,
      mostUsedProxyCount: mostUsedProxy
        ? parseInt(mostUsedProxy.usageCount, 10)
        : 0,
    };
  }

  /**
   * 清理旧记录（保留最近 90 天）
   */
  async cleanupOldRecords(): Promise<number> {
    const result = await this.proxyUsageRepository
      .createQueryBuilder()
      .delete()
      .where('released_at IS NOT NULL')
      .andWhere("released_at < NOW() - INTERVAL '90 days'")
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old proxy usage records`);
    return result.affected || 0;
  }

  /**
   * 获取当前不健康的代理列表
   * 用于健康检查服务获取需要关注的代理
   */
  async getCurrentUnhealthyProxies(): Promise<ProxyUsage[]> {
    return this.proxyUsageRepository.find({
      where: [
        {
          releasedAt: null as any,
          healthStatus: ProxyHealthStatus.UNHEALTHY,
        },
        {
          releasedAt: null as any,
          healthStatus: ProxyHealthStatus.DEGRADED,
        },
      ],
      select: [
        'id',
        'deviceId',
        'proxyId',
        'proxyHost',
        'proxyPort',
        'healthStatus',
        'lastHealthCheck',
        'healthChecksPassed',
        'healthChecksFailed',
      ],
      order: {
        lastHealthCheck: 'ASC', // 优先返回最久未检查的
      },
    });
  }
}
