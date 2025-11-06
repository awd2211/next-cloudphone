import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import {
  ProxyCostRecord,
  ProxyCostBudget,
  ProxyCostAlert,
  ProxyCostDailySummary,
} from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';

/**
 * 代理成本监控服务
 *
 * 功能：
 * 1. 实时成本跟踪
 * 2. 预算管理和告警
 * 3. 成本统计和分析
 * 4. 成本优化建议
 */
@Injectable()
export class ProxyCostMonitoringService {
  private readonly logger = new Logger(ProxyCostMonitoringService.name);

  constructor(
    @InjectRepository(ProxyCostRecord)
    private costRecordRepo: Repository<ProxyCostRecord>,
    @InjectRepository(ProxyCostBudget)
    private budgetRepo: Repository<ProxyCostBudget>,
    @InjectRepository(ProxyCostAlert)
    private alertRepo: Repository<ProxyCostAlert>,
    @InjectRepository(ProxyCostDailySummary)
    private summaryRepo: Repository<ProxyCostDailySummary>,
    private poolManager: ProxyPoolManager,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety: Required for @ClusterSafeCron
  ) {}

  /**
   * 记录代理使用成本
   */
  async recordCost(params: {
    userId: string;
    deviceId?: string;
    sessionId?: string;
    proxyId: string;
    provider: string;
    costType: 'bandwidth' | 'request' | 'time';
    dataTransferred?: number; // bytes
    requestCount?: number;
    durationSeconds?: number;
    unitCost: number; // 单位成本
    totalCost: number;
    metadata?: Record<string, any>;
  }): Promise<ProxyCostRecord> {
    const record = this.costRecordRepo.create({
      userId: params.userId,
      deviceId: params.deviceId,
      sessionId: params.sessionId,
      proxyId: params.proxyId,
      provider: params.provider,
      costType: params.costType,
      dataTransferred: params.dataTransferred || 0,
      requestCount: params.requestCount || 0,
      durationSeconds: params.durationSeconds || 0,
      unitCost: params.unitCost,
      totalCost: params.totalCost,
      metadata: params.metadata || {},
    });

    await this.costRecordRepo.save(record);

    // 检查预算并触发告警
    await this.checkBudgetAndAlert(params.userId, params.deviceId);

    return record;
  }

  /**
   * 配置预算
   */
  async configureBudget(params: {
    userId: string;
    deviceId?: string;
    budgetType: 'daily' | 'weekly' | 'monthly';
    budgetAmount: number;
    currency: string;
    alertThresholds: number[]; // [50, 80, 95, 100]
    autoStop?: boolean; // 超出预算后自动停止使用代理
  }): Promise<ProxyCostBudget> {
    // 查找现有预算配置
    let budget = await this.budgetRepo.findOne({
      where: {
        userId: params.userId,
        deviceId: params.deviceId,
        budgetType: params.budgetType,
      },
    });

    if (budget) {
      // 更新现有预算
      Object.assign(budget, {
        budgetAmount: params.budgetAmount,
        currency: params.currency,
        alertThresholds: params.alertThresholds,
        autoStop: params.autoStop ?? budget.autoStop,
        updatedAt: new Date(),
      });
    } else {
      // 创建新预算
      budget = this.budgetRepo.create({
        userId: params.userId,
        deviceId: params.deviceId,
        budgetType: params.budgetType,
        budgetAmount: params.budgetAmount,
        spentAmount: 0,
        currency: params.currency,
        alertThresholds: params.alertThresholds,
        autoStop: params.autoStop ?? false,
        periodStart: this.getPeriodStart(params.budgetType),
        periodEnd: this.getPeriodEnd(params.budgetType),
      });
    }

    await this.budgetRepo.save(budget);

    this.logger.log(
      `Configured ${params.budgetType} budget for user ${params.userId}: ${params.budgetAmount} ${params.currency}`,
    );

    return budget;
  }

  /**
   * 检查预算并触发告警
   */
  private async checkBudgetAndAlert(
    userId: string,
    deviceId?: string,
  ): Promise<void> {
    const budgets = await this.budgetRepo.find({
      where: { userId, deviceId },
    });

    for (const budget of budgets) {
      // 计算当前周期的花费
      const spent = await this.calculatePeriodSpending(
        userId,
        deviceId,
        budget.periodStart,
        budget.periodEnd,
      );

      // 更新预算花费
      budget.spentAmount = spent;
      await this.budgetRepo.save(budget);

      // 计算使用百分比
      const percentage = (spent / budget.budgetAmount) * 100;

      // 检查是否需要触发告警
      for (const threshold of budget.alertThresholds) {
        if (percentage >= threshold) {
          // 检查是否已经发送过该阈值的告警
          const existingAlert = await this.alertRepo.findOne({
            where: {
              budgetId: budget.id,
              threshold,
              periodStart: budget.periodStart,
              acknowledged: false,
            },
          });

          if (!existingAlert) {
            // 创建新告警
            await this.createCostAlert({
              budgetId: budget.id,
              userId,
              deviceId,
              threshold,
              currentSpending: spent,
              budgetAmount: budget.budgetAmount,
              percentage,
              periodStart: budget.periodStart,
              periodEnd: budget.periodEnd,
            });

            // 如果超出100%且启用了自动停止，则停止代理使用
            if (threshold >= 100 && budget.autoStop) {
              await this.autoStopProxyUsage(userId, deviceId);
            }
          }
        }
      }
    }
  }

  /**
   * 创建成本告警
   */
  private async createCostAlert(params: {
    budgetId: string;
    userId: string;
    deviceId?: string;
    threshold: number;
    currentSpending: number;
    budgetAmount: number;
    percentage: number;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<ProxyCostAlert> {
    const alert = this.alertRepo.create({
      budgetId: params.budgetId,
      userId: params.userId,
      deviceId: params.deviceId,
      threshold: params.threshold,
      currentSpending: params.currentSpending,
      budgetAmount: params.budgetAmount,
      percentage: params.percentage,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      acknowledged: false,
    });

    await this.alertRepo.save(alert);

    this.logger.warn(
      `Cost alert triggered for user ${params.userId}: ${params.percentage.toFixed(2)}% of budget used`,
    );

    // TODO: 发送告警通知
    // await this.notificationService.sendCostAlert(alert);

    return alert;
  }

  /**
   * 自动停止代理使用
   */
  private async autoStopProxyUsage(
    userId: string,
    deviceId?: string,
  ): Promise<void> {
    this.logger.warn(
      `Auto-stopping proxy usage for user ${userId}, device ${deviceId}`,
    );

    // TODO: 实现自动停止逻辑
    // 1. 终止该用户/设备的所有活跃会话
    // 2. 阻止新的代理分配请求
    // 3. 发送通知
  }

  /**
   * 计算周期内的花费
   */
  private async calculatePeriodSpending(
    userId: string,
    deviceId: string | undefined,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const queryBuilder = this.costRecordRepo
      .createQueryBuilder('cost')
      .select('SUM(cost.totalCost)', 'total')
      .where('cost.userId = :userId', { userId })
      .andWhere('cost.recordedAt BETWEEN :start AND :end', {
        start: periodStart,
        end: periodEnd,
      });

    if (deviceId) {
      queryBuilder.andWhere('cost.deviceId = :deviceId', { deviceId });
    }

    const result = await queryBuilder.getRawOne();
    return parseFloat(result?.total || '0');
  }

  /**
   * 获取预算周期开始时间
   */
  private getPeriodStart(budgetType: string): Date {
    const now = new Date();
    switch (budgetType) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一开始
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - diff,
        );
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return now;
    }
  }

  /**
   * 获取预算周期结束时间
   */
  private getPeriodEnd(budgetType: string): Date {
    const start = this.getPeriodStart(budgetType);
    switch (budgetType) {
      case 'daily':
        return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      case 'weekly':
        return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      case 'monthly':
        return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      default:
        return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  /**
   * 获取成本统计
   */
  async getCostStatistics(params: {
    userId: string;
    deviceId?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'provider' | 'device';
  }): Promise<{
    totalCost: number;
    totalRequests: number;
    totalDataTransferred: number;
    avgCostPerRequest: number;
    costByType: Record<string, number>;
    timeline?: any[];
    breakdown?: any[];
  }> {
    const queryBuilder = this.costRecordRepo
      .createQueryBuilder('cost')
      .where('cost.userId = :userId', { userId: params.userId })
      .andWhere('cost.recordedAt BETWEEN :start AND :end', {
        start: params.startDate,
        end: params.endDate,
      });

    if (params.deviceId) {
      queryBuilder.andWhere('cost.deviceId = :deviceId', {
        deviceId: params.deviceId,
      });
    }

    const records = await queryBuilder.getMany();

    // 计算总成本
    const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
    const totalRequests = records.reduce((sum, r) => sum + r.requestCount, 0);
    const totalDataTransferred = records.reduce(
      (sum, r) => sum + r.dataTransferred,
      0,
    );
    const avgCostPerRequest =
      totalRequests > 0 ? totalCost / totalRequests : 0;

    // 按成本类型分组
    const costByType = records.reduce((acc, r) => {
      acc[r.costType] = (acc[r.costType] || 0) + r.totalCost;
      return acc;
    }, {} as Record<string, number>);

    // 根据groupBy参数生成时间线或分解数据
    let timeline;
    let breakdown;

    if (params.groupBy === 'day') {
      timeline = this.generateDailyTimeline(records, params.startDate, params.endDate);
    } else if (params.groupBy === 'provider') {
      breakdown = this.generateProviderBreakdown(records);
    } else if (params.groupBy === 'device') {
      breakdown = this.generateDeviceBreakdown(records);
    }

    return {
      totalCost,
      totalRequests,
      totalDataTransferred,
      avgCostPerRequest,
      costByType,
      timeline,
      breakdown,
    };
  }

  /**
   * 生成每日时间线
   */
  private generateDailyTimeline(
    records: ProxyCostRecord[],
    startDate: Date,
    endDate: Date,
  ): any[] {
    const timeline = [];
    const recordsByDate = records.reduce((acc, r) => {
      const date = r.recordedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(r);
      return acc;
    }, {} as Record<string, ProxyCostRecord[]>);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecords = recordsByDate[dateStr] || [];
      const dayCost = dayRecords.reduce((sum, r) => sum + r.totalCost, 0);

      timeline.push({
        date: dateStr,
        cost: dayCost,
        requests: dayRecords.reduce((sum, r) => sum + r.requestCount, 0),
        dataTransferred: dayRecords.reduce(
          (sum, r) => sum + r.dataTransferred,
          0,
        ),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeline;
  }

  /**
   * 生成提供商分解
   */
  private generateProviderBreakdown(records: ProxyCostRecord[]): any[] {
    const providerStats = records.reduce((acc, r) => {
      if (!acc[r.provider]) {
        acc[r.provider] = {
          provider: r.provider,
          cost: 0,
          requests: 0,
          dataTransferred: 0,
        };
      }
      acc[r.provider].cost += r.totalCost;
      acc[r.provider].requests += r.requestCount;
      acc[r.provider].dataTransferred += r.dataTransferred;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(providerStats).sort((a, b) => b.cost - a.cost);
  }

  /**
   * 生成设备分解
   */
  private generateDeviceBreakdown(records: ProxyCostRecord[]): any[] {
    const deviceStats = records.reduce((acc, r) => {
      const deviceId = r.deviceId || 'unknown';
      if (!acc[deviceId]) {
        acc[deviceId] = {
          deviceId,
          cost: 0,
          requests: 0,
          dataTransferred: 0,
        };
      }
      acc[deviceId].cost += r.totalCost;
      acc[deviceId].requests += r.requestCount;
      acc[deviceId].dataTransferred += r.dataTransferred;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(deviceStats).sort((a, b) => b.cost - a.cost);
  }

  /**
   * 定时任务：每日成本汇总
   * 每天凌晨2点执行
   */
  @ClusterSafeCron('0 2 * * *')
  async generateDailySummary() {
    this.logger.log('Starting daily cost summary generation');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const summaryDate = yesterday.toISOString().split('T')[0];

    // 查找所有有成本记录的用户
    const users = await this.costRecordRepo
      .createQueryBuilder('cost')
      .select('DISTINCT cost.userId')
      .where('DATE(cost.recordedAt) = :date', { date: summaryDate })
      .getRawMany();

    for (const { userId } of users) {
      try {
        const stats = await this.getCostStatistics({
          userId,
          startDate: new Date(`${summaryDate}T00:00:00`),
          endDate: new Date(`${summaryDate}T23:59:59`),
          groupBy: 'provider',
        });

        // 创建或更新每日汇总
        const summary = this.summaryRepo.create({
          userId,
          summaryDate: new Date(summaryDate),
          totalCost: stats.totalCost,
          totalRequests: stats.totalRequests,
          totalDataTransferred: stats.totalDataTransferred,
          avgCostPerRequest: stats.avgCostPerRequest,
          costByType: stats.costByType,
          costByProvider: stats.breakdown?.reduce((acc, b) => {
            acc[b.provider] = b.cost;
            return acc;
          }, {} as Record<string, number>),
        });

        await this.summaryRepo.save(summary);

        this.logger.log(`Generated daily summary for user ${userId}: ${summaryDate}`);
      } catch (error) {
        this.logger.error(
          `Failed to generate daily summary for user ${userId}: ${error.message}`,
        );
      }
    }

    this.logger.log('Daily cost summary generation completed');
  }

  /**
   * 获取成本优化建议
   */
  async getCostOptimizationRecommendations(
    userId: string,
  ): Promise<{
    totalPotentialSavings: number;
    recommendations: Array<{
      type: string;
      description: string;
      potentialSavings: number;
      action: string;
    }>;
  }> {
    const recommendations = [];
    let totalPotentialSavings = 0;

    // 分析最近30天的成本数据
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await this.getCostStatistics({
      userId,
      startDate,
      endDate,
      groupBy: 'provider',
    });

    // 建议1：高成本提供商替代
    if (stats.breakdown && stats.breakdown.length > 1) {
      const sortedProviders = stats.breakdown.sort((a, b) => b.cost - a.cost);
      const mostExpensive = sortedProviders[0];
      const cheapest = sortedProviders[sortedProviders.length - 1];

      if (mostExpensive.cost > cheapest.cost * 1.5) {
        const potentialSavings = mostExpensive.cost - cheapest.cost;
        recommendations.push({
          type: 'provider_switch',
          description: `Provider ${mostExpensive.provider} costs 50% more than ${cheapest.provider}`,
          potentialSavings,
          action: `Consider switching traffic from ${mostExpensive.provider} to ${cheapest.provider}`,
        });
        totalPotentialSavings += potentialSavings;
      }
    }

    // 建议2：低效代理检测
    // TODO: 实现低效代理检测逻辑

    // 建议3：闲置会话清理
    // TODO: 实现闲置会话检测逻辑

    return {
      totalPotentialSavings,
      recommendations,
    };
  }
}
