import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService, EventBusService } from '@cloudphone/shared';
import {
  ProxyCostRecord,
  ProxyCostBudget,
  ProxyCostAlert,
  ProxyCostDailySummary,
} from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

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
    private readonly eventBus: EventBusService,
    @InjectRedis() private readonly redis: Redis,
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

    // 发送告警通知到 notification-service
    // 根据阈值确定告警类型
    const alertType = params.threshold >= 100 ? 'exceeded' : params.threshold >= 90 ? 'critical' : 'warning';

    await this.eventBus.publish('cloudphone.events', 'proxy.cost_alert', {
      alertId: alert.id,
      userId: params.userId,
      deviceId: params.deviceId,
      alertType,
      threshold: params.threshold,
      budgetAmount: params.budgetAmount,
      currentSpending: params.currentSpending,
      percentage: params.percentage,
      message: `成本告警：您的代理使用已达到预算的 ${params.percentage.toFixed(1)}%`,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Cost alert notification sent for alert ${alert.id}`);

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

    try {
      // 1. 终止该用户/设备的所有活跃会话
      const terminatedCount = await this.poolManager.terminateUserSessions(userId, deviceId);
      this.logger.log(`Terminated ${terminatedCount} active sessions for user ${userId}`);

      // 2. 在 Redis 中设置阻止标记，阻止新的代理分配请求
      const blockKey = deviceId
        ? `proxy:blocked:${userId}:${deviceId}`
        : `proxy:blocked:${userId}`;

      // 阻止标记有效期 24 小时（可配置）
      await this.redis.set(blockKey, JSON.stringify({
        reason: 'budget_exceeded',
        blockedAt: new Date().toISOString(),
        userId,
        deviceId,
      }), 'EX', 86400);

      this.logger.log(`Set proxy block for user ${userId}, device ${deviceId || 'all'}`);

      // 3. 发送停止通知
      await this.eventBus.publish('cloudphone.events', 'proxy.usage_stopped', {
        userId,
        deviceId,
        reason: 'budget_exceeded',
        terminatedSessions: terminatedCount,
        message: `代理使用已自动停止：超出预算限制`,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Sent proxy usage stopped notification for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to auto-stop proxy usage for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查用户是否被阻止使用代理
   */
  async isUserBlocked(userId: string, deviceId?: string): Promise<boolean> {
    // 检查用户级别的阻止
    const userBlockKey = `proxy:blocked:${userId}`;
    const userBlocked = await this.redis.get(userBlockKey);
    if (userBlocked) return true;

    // 检查设备级别的阻止
    if (deviceId) {
      const deviceBlockKey = `proxy:blocked:${userId}:${deviceId}`;
      const deviceBlocked = await this.redis.get(deviceBlockKey);
      if (deviceBlocked) return true;
    }

    return false;
  }

  /**
   * 解除用户代理阻止
   */
  async unblockUser(userId: string, deviceId?: string): Promise<void> {
    if (deviceId) {
      await this.redis.del(`proxy:blocked:${userId}:${deviceId}`);
    } else {
      // 解除用户所有设备的阻止
      const keys = await this.redis.keys(`proxy:blocked:${userId}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
    this.logger.log(`Unblocked proxy usage for user ${userId}, device ${deviceId || 'all'}`);
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
    const inefficientProxies = await this.detectInefficientProxies(userId, startDate, endDate);
    if (inefficientProxies.count > 0) {
      recommendations.push({
        type: 'inefficient_proxies',
        description: `发现 ${inefficientProxies.count} 个低效代理，平均成功率仅 ${inefficientProxies.avgSuccessRate.toFixed(1)}%`,
        potentialSavings: inefficientProxies.estimatedWaste,
        action: `建议停用这些代理或切换到质量更高的代理池`,
      });
      totalPotentialSavings += inefficientProxies.estimatedWaste;
    }

    // 建议3：闲置会话清理
    const idleSessions = this.detectIdleSessions(userId);
    if (idleSessions.count > 0) {
      const idleCost = idleSessions.count * 0.01 * 24; // 假设每会话每小时 $0.01
      recommendations.push({
        type: 'idle_sessions',
        description: `发现 ${idleSessions.count} 个闲置会话，闲置时间超过 ${idleSessions.avgIdleMinutes.toFixed(0)} 分钟`,
        potentialSavings: idleCost,
        action: `建议清理闲置会话以减少不必要的代理占用成本`,
      });
      totalPotentialSavings += idleCost;
    }

    return {
      totalPotentialSavings,
      recommendations,
    };
  }

  /**
   * 检测低效代理
   */
  private async detectInefficientProxies(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    count: number;
    avgSuccessRate: number;
    estimatedWaste: number;
    proxyIds: string[];
  }> {
    // 查询用户使用过的代理的统计数据
    const queryBuilder = this.costRecordRepo
      .createQueryBuilder('cost')
      .select('cost.proxyId', 'proxyId')
      .addSelect('COUNT(*)', 'totalRequests')
      .addSelect('SUM(cost.totalCost)', 'totalCost')
      .addSelect('AVG(CASE WHEN cost.metadata->>\'success\' = \'true\' THEN 1 ELSE 0 END)', 'successRate')
      .where('cost.userId = :userId', { userId })
      .andWhere('cost.recordedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('cost.proxyId')
      .having('COUNT(*) >= 10'); // 至少有10次请求才进行分析

    const proxyStats = await queryBuilder.getRawMany();

    // 找出成功率低于 70% 的代理
    const inefficientProxies = proxyStats.filter(
      (p) => parseFloat(p.successRate || '0') < 0.7,
    );

    const avgSuccessRate = inefficientProxies.length > 0
      ? inefficientProxies.reduce((sum, p) => sum + parseFloat(p.successRate || '0'), 0) / inefficientProxies.length * 100
      : 0;

    const estimatedWaste = inefficientProxies.reduce(
      (sum, p) => sum + parseFloat(p.totalCost || '0') * (1 - parseFloat(p.successRate || '0')),
      0,
    );

    return {
      count: inefficientProxies.length,
      avgSuccessRate,
      estimatedWaste,
      proxyIds: inefficientProxies.map((p) => p.proxyId),
    };
  }

  /**
   * 检测闲置会话
   */
  private detectIdleSessions(userId: string): {
    count: number;
    avgIdleMinutes: number;
    sessionIds: string[];
  } {
    const now = new Date();
    const idleThreshold = 15 * 60 * 1000; // 15分钟无活动视为闲置
    const idleSessions: { sessionId: string; idleMinutes: number }[] = [];

    // 获取用户的活跃会话
    const userSessions = this.poolManager.getUserActiveSessions(userId);

    for (const session of userSessions) {
      const idleTime = now.getTime() - session.lastUsedAt.getTime();
      if (idleTime > idleThreshold) {
        idleSessions.push({
          sessionId: session.sessionId,
          idleMinutes: idleTime / (60 * 1000),
        });
      }
    }

    const avgIdleMinutes = idleSessions.length > 0
      ? idleSessions.reduce((sum, s) => sum + s.idleMinutes, 0) / idleSessions.length
      : 0;

    return {
      count: idleSessions.length,
      avgIdleMinutes,
      sessionIds: idleSessions.map((s) => s.sessionId),
    };
  }

  /**
   * 获取用户预算列表
   */
  async getUserBudgets(
    userId: string,
    budgetType?: string,
  ): Promise<any[]> {
    const whereConditions: any = { userId };
    if (budgetType) {
      whereConditions.budgetType = budgetType;
    }

    const budgets = await this.budgetRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    return budgets.map((budget) => ({
      id: budget.id,
      userId: budget.userId,
      deviceId: budget.deviceId,
      budgetType: budget.budgetType,
      budgetAmount: budget.budgetAmount,
      spentAmount: budget.spentAmount,
      currency: budget.currency,
      usagePercentage: (budget.spentAmount / budget.budgetAmount) * 100,
      alertThresholds: budget.alertThresholds,
      autoStop: budget.autoStop,
      isStopped: budget.isStopped,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      createdAt: budget.createdAt,
    }));
  }

  /**
   * 获取用户告警列表
   */
  async getUserAlerts(
    userId: string,
    acknowledged?: boolean,
  ): Promise<any[]> {
    const whereConditions: any = { userId };
    if (acknowledged !== undefined) {
      whereConditions.acknowledged = acknowledged;
    }

    const alerts = await this.alertRepo.find({
      where: whereConditions,
      order: { triggeredAt: 'DESC' },
      take: 100, // 限制返回数量
    });

    return alerts.map((alert) => ({
      id: alert.id,
      budgetId: alert.budgetId,
      userId: alert.userId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      alertLevel: alert.alertLevel,
      alertTitle: alert.alertTitle,
      alertMessage: alert.alertMessage,
      thresholdPercentage: alert.thresholdPercentage,
      currentPercentage: alert.currentPercentage,
      budgetAmount: alert.budgetAmount,
      amountSpent: alert.amountSpent,
      amountRemaining: alert.amountRemaining,
      currency: alert.currency,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedBy: alert.acknowledgedBy,
      triggeredAt: alert.triggeredAt,
      recommendedActions: alert.recommendedActions,
      createdAt: alert.createdAt,
    }));
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy?: string,
    actionTaken?: string,
  ): Promise<{ success: boolean; alert?: any }> {
    const alert = await this.alertRepo.findOne({ where: { id: alertId } });
    if (!alert) {
      return { success: false };
    }

    alert.acknowledged = true;
    alert.isAcknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy || 'system';
    if (actionTaken) {
      alert.actionTaken = actionTaken;
    }

    await this.alertRepo.save(alert);

    this.logger.log(`Alert ${alertId} acknowledged by ${alert.acknowledgedBy}`);

    return {
      success: true,
      alert: {
        id: alert.id,
        acknowledged: alert.acknowledged,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
      },
    };
  }

  /**
   * 获取成本仪表盘汇总数据
   */
  async getDashboardSummary(userId: string): Promise<{
    currentMonthCost: number;
    todayCost: number;
    budgets: any[];
    recentAlerts: any[];
    topExpensiveProxies: any[];
    costTrend: any[];
  }> {
    const endDate = new Date();
    const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const startOfToday = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // 并行获取所有数据
    const [monthStats, todayStats, budgets, recentAlerts, expensiveProxies] = await Promise.all([
      this.getCostStatistics({
        userId,
        startDate: startOfMonth,
        endDate,
        groupBy: 'day',
      }),
      this.getCostStatistics({
        userId,
        startDate: startOfToday,
        endDate,
      }),
      this.getUserBudgets(userId),
      this.getUserAlerts(userId, false), // 只获取未确认的告警
      this.getTopExpensiveProxies(userId, 5),
    ]);

    return {
      currentMonthCost: monthStats.totalCost,
      todayCost: todayStats.totalCost,
      budgets: budgets.slice(0, 5), // 最多5个预算
      recentAlerts: recentAlerts.slice(0, 10), // 最近10个告警
      topExpensiveProxies: expensiveProxies,
      costTrend: monthStats.timeline || [],
    };
  }

  /**
   * 获取成本最高的代理
   */
  private async getTopExpensiveProxies(
    userId: string,
    limit: number,
  ): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 最近7天

    const result = await this.costRecordRepo
      .createQueryBuilder('record')
      .select('record.proxy_id', 'proxyId')
      .addSelect('record.provider', 'provider')
      .addSelect('SUM(record.cost)', 'totalCost')
      .addSelect('SUM(record.traffic_bytes)', 'totalTraffic')
      .addSelect('COUNT(*)', 'requestCount')
      .where('record.user_id = :userId', { userId })
      .andWhere('record.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('record.proxy_id')
      .addGroupBy('record.provider')
      .orderBy('totalCost', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      proxyId: r.proxyId,
      provider: r.provider,
      totalCost: parseFloat(r.totalCost) || 0,
      totalTraffic: parseInt(r.totalTraffic) || 0,
      requestCount: parseInt(r.requestCount) || 0,
    }));
  }
}
