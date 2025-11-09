import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { VirtualNumber, SmsMessage, ProviderConfig } from '../entities';
import { PlatformSelectorService } from '../services/platform-selector.service';

/**
 * 统计响应DTO
 */
interface StatisticsResponse {
  timeRange: {
    start: Date;
    end: Date;
  };
  overview: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number; // 百分比
    averageCost: number; // USD
    totalCost: number; // USD
  };
  providerStats: Array<{
    provider: string;
    requests: number;
    successes: number;
    failures: number;
    successRate: number;
    averageResponseTime: number; // 秒
    averageCost: number; // USD
    totalCost: number;
    healthStatus: string;
  }>;
  serviceStats: Array<{
    service: string;
    requests: number;
    averageSmsReceiveTime: number; // 秒
    averageCost: number;
  }>;
}

/**
 * 实时监控响应DTO
 */
interface RealtimeMonitorResponse {
  timestamp: Date;
  activeNumbers: {
    total: number;
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
  };
  recentActivity: {
    last5Minutes: {
      requests: number;
      successes: number;
      failures: number;
    };
    last15Minutes: {
      requests: number;
      successes: number;
      failures: number;
    };
    lastHour: {
      requests: number;
      successes: number;
      failures: number;
    };
  };
  providerHealth: Record<string, {
    status: string;
    successRate: number;
    avgResponseTime: number;
    consecutiveFailures: number;
  }>;
}

@ApiTags('统计与监控')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StatisticsController {
  private readonly logger = new Logger(StatisticsController.name);

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    @InjectRepository(ProviderConfig)
    private readonly providerConfigRepo: Repository<ProviderConfig>,
    private readonly platformSelector: PlatformSelectorService,
  ) {}

  /**
   * 获取统计数据
   */
  @Get()
  @ApiOperation({ summary: '获取SMS服务统计数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 (ISO 8601)' })
  @RequirePermission('sms.statistics.view')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<StatisticsResponse> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    this.logger.log(`Fetching statistics from ${start.toISOString()} to ${end.toISOString()}`);

    // 查询号码请求统计
    const numbers = await this.numberRepo.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    // 计算总览数据
    const totalRequests = numbers.length;
    const successfulRequests = numbers.filter(n => n.status === 'received').length;
    const failedRequests = numbers.filter(n => ['cancelled', 'failed', 'expired'].includes(n.status)).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const totalCost = numbers.reduce((sum, n) => sum + parseFloat(n.cost.toString()), 0);
    const averageCost = totalRequests > 0 ? totalCost / totalRequests : 0;

    // 按平台统计
    const providerMap = new Map<string, any>();
    for (const num of numbers) {
      if (!providerMap.has(num.provider)) {
        providerMap.set(num.provider, {
          provider: num.provider,
          requests: 0,
          successes: 0,
          failures: 0,
          totalCost: 0,
          responseTimes: [],
        });
      }
      const stats = providerMap.get(num.provider);
      stats.requests++;
      if (num.status === 'received') {
        stats.successes++;
        // 计算接收时间
        if (num.smsReceivedAt && num.createdAt) {
          const receiveTime = (num.smsReceivedAt.getTime() - num.createdAt.getTime()) / 1000;
          stats.responseTimes.push(receiveTime);
        }
      } else if (['cancelled', 'failed', 'expired'].includes(num.status)) {
        stats.failures++;
      }
      stats.totalCost += parseFloat(num.cost.toString());
    }

    // 获取平台配置和健康状态
    const providerConfigs = await this.providerConfigRepo.find();
    const providerHealthMap = new Map<string, any>();
    for (const config of providerConfigs) {
      providerHealthMap.set(config.provider, {
        healthStatus: config.healthStatus,
      });
    }

    // 获取实时平台统计
    const platformStats = this.platformSelector.getProviderStats();
    const platformStatsMap = new Map(platformStats.map(s => [s.providerName, s]));

    const providerStats = Array.from(providerMap.values()).map(stats => {
      const successRate = stats.requests > 0 ? (stats.successes / stats.requests) * 100 : 0;
      const avgResponseTime = stats.responseTimes.length > 0
        ? stats.responseTimes.reduce((a: number, b: number) => a + b, 0) / stats.responseTimes.length
        : 0;
      const avgCost = stats.requests > 0 ? stats.totalCost / stats.requests : 0;

      const healthInfo = providerHealthMap.get(stats.provider);
      const platformStat = platformStatsMap.get(stats.provider);

      return {
        provider: stats.provider,
        requests: stats.requests,
        successes: stats.successes,
        failures: stats.failures,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        averageCost: Math.round(avgCost * 10000) / 10000,
        totalCost: Math.round(stats.totalCost * 10000) / 10000,
        healthStatus: healthInfo?.healthStatus || (platformStat?.isHealthy ? 'healthy' : 'unknown'),
      };
    });

    // 按服务统计
    const serviceMap = new Map<string, any>();
    for (const num of numbers) {
      if (!serviceMap.has(num.serviceCode)) {
        serviceMap.set(num.serviceCode, {
          service: num.serviceCode,
          requests: 0,
          totalCost: 0,
          receiveTimes: [],
        });
      }
      const stats = serviceMap.get(num.serviceCode);
      stats.requests++;
      stats.totalCost += parseFloat(num.cost.toString());

      if (num.smsReceivedAt && num.createdAt) {
        const receiveTime = (num.smsReceivedAt.getTime() - num.createdAt.getTime()) / 1000;
        stats.receiveTimes.push(receiveTime);
      }
    }

    const serviceStats = Array.from(serviceMap.values()).map(stats => ({
      service: stats.service,
      requests: stats.requests,
      averageSmsReceiveTime: stats.receiveTimes.length > 0
        ? Math.round(stats.receiveTimes.reduce((a: number, b: number) => a + b, 0) / stats.receiveTimes.length * 100) / 100
        : 0,
      averageCost: stats.requests > 0
        ? Math.round(stats.totalCost / stats.requests * 10000) / 10000
        : 0,
    }));

    return {
      timeRange: {
        start,
        end,
      },
      overview: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageCost: Math.round(averageCost * 10000) / 10000,
        totalCost: Math.round(totalCost * 10000) / 10000,
      },
      providerStats,
      serviceStats,
    };
  }

  /**
   * 获取实时监控数据
   */
  @Get('realtime')
  @ApiOperation({ summary: '获取实时监控数据' })
  @RequirePermission('sms.statistics.view')
  async getRealtimeMonitor(): Promise<RealtimeMonitorResponse> {
    const now = new Date();

    // 活跃号码统计
    const activeNumbers = await this.numberRepo.find({
      where: {
        status: 'active',
      },
    });

    const totalActive = activeNumbers.length;
    const byProvider: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    // 统计所有状态的号码
    const allActiveOrWaiting = await this.numberRepo.find({
      where: [
        { status: 'active' },
        { status: 'waiting_sms' },
        { status: 'received' },
      ],
    });

    for (const num of allActiveOrWaiting) {
      byProvider[num.provider] = (byProvider[num.provider] || 0) + 1;
      byStatus[num.status] = (byStatus[num.status] || 0) + 1;
    }

    // 最近活动统计
    const getActivityStats = async (minutesAgo: number) => {
      const since = new Date(now.getTime() - minutesAgo * 60 * 1000);
      const recentNumbers = await this.numberRepo.find({
        where: {
          createdAt: MoreThan(since),
        },
      });

      return {
        requests: recentNumbers.length,
        successes: recentNumbers.filter(n => n.status === 'received').length,
        failures: recentNumbers.filter(n => ['cancelled', 'failed', 'expired'].includes(n.status)).length,
      };
    };

    const [last5Min, last15Min, lastHour] = await Promise.all([
      getActivityStats(5),
      getActivityStats(15),
      getActivityStats(60),
    ]);

    // 平台健康状态
    const platformStats = this.platformSelector.getProviderStats();
    const providerHealth: Record<string, any> = {};

    for (const stat of platformStats) {
      providerHealth[stat.providerName] = {
        status: stat.isHealthy ? 'healthy' : 'unhealthy',
        successRate: Math.round(stat.successRate * 100) / 100,
        avgResponseTime: Math.round(stat.averageResponseTime / 1000 * 100) / 100, // 转换为秒
        consecutiveFailures: stat.consecutiveFailures,
      };
    }

    return {
      timestamp: now,
      activeNumbers: {
        total: totalActive,
        byProvider,
        byStatus,
      },
      recentActivity: {
        last5Minutes: last5Min,
        last15Minutes: last15Min,
        lastHour,
      },
      providerHealth,
    };
  }

  /**
   * 获取平台对比数据
   */
  @Get('providers/comparison')
  @ApiOperation({ summary: '获取平台对比数据' })
  @RequirePermission('sms.statistics.view')
  async getProviderComparison() {
    const platformStats = this.platformSelector.getProviderStats();
    const configs = await this.providerConfigRepo.find();

    const comparison = platformStats.map(stat => {
      const config = configs.find(c => c.provider === stat.providerName);

      return {
        provider: stat.providerName,
        enabled: config?.enabled || false,
        priority: config?.priority || 0,
        totalRequests: stat.totalRequests,
        successCount: stat.successCount,
        failureCount: stat.failureCount,
        successRate: Math.round(stat.successRate * 100) / 100,
        averageResponseTime: Math.round(stat.averageResponseTime / 1000 * 100) / 100, // 秒
        averageCost: Math.round(stat.averageCost * 10000) / 10000,
        isHealthy: stat.isHealthy,
        consecutiveFailures: stat.consecutiveFailures,
        lastFailure: stat.lastFailureTime,
        configuredWeights: {
          cost: config?.costWeight || 0,
          speed: config?.speedWeight || 0,
          successRate: config?.successRateWeight || 0,
        },
      };
    });

    // 按优先级排序
    comparison.sort((a, b) => a.priority - b.priority);

    return {
      timestamp: new Date(),
      providers: comparison,
      recommendation: this.generateProviderRecommendation(comparison),
    };
  }

  /**
   * 生成平台选择建议
   */
  private generateProviderRecommendation(comparison: any[]): string {
    const healthy = comparison.filter(p => p.isHealthy && p.enabled);

    if (healthy.length === 0) {
      return '警告：当前没有健康的平台可用，请检查平台配置和连接';
    }

    // 找出成功率最高的
    const bestSuccessRate = healthy.reduce((best, p) =>
      p.successRate > best.successRate ? p : best
    );

    // 找出成本最低的
    const bestCost = healthy.reduce((best, p) =>
      p.averageCost < best.averageCost ? p : best
    );

    // 找出速度最快的
    const bestSpeed = healthy.reduce((best, p) =>
      p.averageResponseTime < best.averageResponseTime ? p : best
    );

    let recommendation = `建议：`;

    if (bestSuccessRate.provider === bestCost.provider && bestCost.provider === bestSpeed.provider) {
      recommendation += `${bestSuccessRate.provider} 在所有指标上表现最佳`;
    } else {
      recommendation += `\n- 最高成功率: ${bestSuccessRate.provider} (${bestSuccessRate.successRate}%)`;
      recommendation += `\n- 最低成本: ${bestCost.provider} ($${bestCost.averageCost})`;
      recommendation += `\n- 最快响应: ${bestSpeed.provider} (${bestSpeed.averageResponseTime}s)`;
    }

    return recommendation;
  }
}
