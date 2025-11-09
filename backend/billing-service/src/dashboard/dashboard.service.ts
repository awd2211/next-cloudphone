import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { UserBalance } from '../balance/entities/user-balance.entity';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

/**
 * 使用量预测数据点
 */
export interface UsageForecastDataPoint {
  date: string;
  predictedCost: number;
  predictedDuration: number; // 小时
  confidence: number; // 0-1，预测置信度
  isActual: boolean; // 是否为实际数据
}

/**
 * 使用量预测响应
 */
export interface UsageForecastResponse {
  userId: string;
  forecastPeriodDays: number;
  historicalDays: number;
  currentDailyCost: number;
  predictedDailyCost: number;
  predictedTotalCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  dataPoints: UsageForecastDataPoint[];
  generatedAt: string;
}

/**
 * 成本预警响应
 */
export interface CostWarningResponse {
  userId: string;
  currentBalance: number;
  predictedSpending7Days: number;
  predictedSpending30Days: number;
  balanceRunoutDays: number | null; // 余额预计耗尽天数，null 表示不会耗尽
  warningLevel: 'normal' | 'info' | 'warning' | 'critical';
  warnings: Array<{
    level: 'normal' | 'info' | 'warning' | 'critical';
    message: string;
    recommendation: string;
  }>;
  timestamp: string;
}

/**
 * 预警配置
 */
export interface WarningConfig {
  userId: string;
  dailyBudget?: number; // 每日预算（CNY）
  monthlyBudget?: number; // 每月预算（CNY）
  lowBalanceThreshold?: number; // 低余额阈值（CNY）
  criticalBalanceThreshold?: number; // 严重低余额阈值（CNY）
  enableEmailNotification?: boolean;
  enableSmsNotification?: boolean;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(UsageRecord)
    private usageRecordRepository: Repository<UsageRecord>,
    @InjectRepository(UserBalance)
    private balanceRepository: Repository<UserBalance>,
    private readonly cacheService: CacheService, // ✅ 注入缓存服务
  ) {}

  /**
   * 获取使用量预测
   * ✅ 已添加缓存 (TTL: 300秒 = 5分钟) - 计算密集型操作，缓存效果显著
   *
   * 使用线性回归分析历史数据，预测未来趋势
   */
  async getUsageForecast(
    userId: string,
    forecastDays: number = 7,
    historicalDays: number = 30
  ): Promise<UsageForecastResponse> {
    return this.cacheService.wrap(
      CacheKeys.usageForecast(userId, forecastDays, historicalDays),
      async () => {
        this.logger.log(`Generating usage forecast for user ${userId}`);

        // 1. 获取历史使用记录
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - historicalDays);

        const records = await this.usageRecordRepository.find({
          where: {
            userId,
            startTime: MoreThan(startDate),
          },
          order: {
            startTime: 'ASC',
          },
        });

        if (records.length === 0) {
          return this.getEmptyForecast(userId, forecastDays, historicalDays);
        }

        // 2. 按天聚合数据
        const dailyStats = this.aggregateByDay(records);

        // 3. 计算趋势
        const trend = this.calculateTrend(dailyStats);

        // 4. 预测未来数据
        const predictions = this.predictFutureCosts(dailyStats, forecastDays);

        // 5. 计算平均每日成本
        const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
        const currentDailyCost = totalCost / historicalDays;

        const predictedTotalCost = predictions.reduce((sum, p) => sum + p.predictedCost, 0);
        const predictedDailyCost = predictedTotalCost / forecastDays;

        // 6. 组合历史数据和预测数据
        const dataPoints: UsageForecastDataPoint[] = [
          ...this.convertToDataPoints(dailyStats, true),
          ...predictions,
        ];

        return {
          userId,
          forecastPeriodDays: forecastDays,
          historicalDays,
          currentDailyCost,
          predictedDailyCost,
          predictedTotalCost,
          trend,
          dataPoints,
          generatedAt: new Date().toISOString(),
        };
      },
      CacheTTL.USAGE_FORECAST,
    );
  }

  /**
   * 获取成本预警
   * ✅ 已添加缓存 (TTL: 180秒 = 3分钟)
   */
  async getCostWarning(userId: string, config?: WarningConfig): Promise<CostWarningResponse> {
    return this.cacheService.wrap(
      CacheKeys.costWarning(userId),
      async () => {
        this.logger.log(`Generating cost warning for user ${userId}`);

        // 1. 获取用户余额
        const balance = await this.balanceRepository.findOne({
          where: { userId },
        });

        const currentBalance = balance ? Number(balance.balance) : 0;

        // 2. 获取预测数据
        const forecast7Days = await this.getUsageForecast(userId, 7, 30);
        const forecast30Days = await this.getUsageForecast(userId, 30, 30);

        const predictedSpending7Days = forecast7Days.predictedTotalCost;
        const predictedSpending30Days = forecast30Days.predictedTotalCost;

        // 3. 计算余额耗尽天数
        const dailySpending = forecast7Days.predictedDailyCost;
        const balanceRunoutDays = dailySpending > 0 ? Math.floor(currentBalance / dailySpending) : null;

        // 4. 确定预警级别和生成预警信息
        const { warningLevel, warnings } = this.generateWarnings(
          currentBalance,
          predictedSpending7Days,
          predictedSpending30Days,
          balanceRunoutDays,
          config
        );

        return {
          userId,
          currentBalance,
          predictedSpending7Days,
          predictedSpending30Days,
          balanceRunoutDays,
          warningLevel,
          warnings,
          timestamp: new Date().toISOString(),
        };
      },
      CacheTTL.COST_WARNING,
    );
  }

  /**
   * 获取预警配置
   * ✅ 已添加缓存 (TTL: 600秒 = 10分钟) - 配置很少变动
   */
  async getWarningConfig(userId: string): Promise<WarningConfig> {
    return this.cacheService.wrap(
      CacheKeys.warningConfig(userId),
      async () => {
        // TODO: 从数据库读取配置
        // 目前返回默认配置
        return {
          userId,
          dailyBudget: 100,
          monthlyBudget: 3000,
          lowBalanceThreshold: 50,
          criticalBalanceThreshold: 20,
          enableEmailNotification: true,
          enableSmsNotification: false,
        };
      },
      CacheTTL.WARNING_CONFIG,
    );
  }

  /**
   * 更新预警配置
   * ✅ 添加缓存失效逻辑
   */
  async updateWarningConfig(
    userId: string,
    config: Partial<WarningConfig>
  ): Promise<WarningConfig> {
    // TODO: 保存到数据库
    this.logger.log(`Updating warning config for user ${userId}`);

    const result = {
      userId,
      ...config,
    } as WarningConfig;

    // ✅ 清除相关缓存
    await this.cacheService.del(CacheKeys.warningConfig(userId));
    await this.cacheService.del(CacheKeys.costWarning(userId));

    return result;
  }

  /**
   * 按天聚合使用记录
   */
  private aggregateByDay(records: UsageRecord[]): Map<string, { cost: number; duration: number }> {
    const dailyStats = new Map<string, { cost: number; duration: number }>();

    records.forEach((record) => {
      const date = record.startTime.toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { cost: 0, duration: 0 };

      dailyStats.set(date, {
        cost: existing.cost + record.cost,
        duration: existing.duration + (record.durationSeconds || 0),
      });
    });

    return dailyStats;
  }

  /**
   * 计算趋势（简单线性回归）
   */
  private calculateTrend(
    dailyStats: Map<string, { cost: number; duration: number }>
  ): 'increasing' | 'decreasing' | 'stable' {
    const values = Array.from(dailyStats.values()).map((v) => v.cost);

    if (values.length < 2) {
      return 'stable';
    }

    // 计算线性回归斜率
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, y) => sum + y, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // 判断趋势
    if (Math.abs(slope) < 0.1) {
      return 'stable';
    } else if (slope > 0) {
      return 'increasing';
    } else {
      return 'decreasing';
    }
  }

  /**
   * 预测未来成本（简单线性外推）
   */
  private predictFutureCosts(
    dailyStats: Map<string, { cost: number; duration: number }>,
    forecastDays: number
  ): UsageForecastDataPoint[] {
    const values = Array.from(dailyStats.values());
    const dates = Array.from(dailyStats.keys());

    if (values.length === 0) {
      return [];
    }

    // 计算平均每日成本作为基准
    const avgCost = values.reduce((sum, v) => sum + v.cost, 0) / values.length;
    const avgDuration = values.reduce((sum, v) => sum + v.duration, 0) / values.length;

    // 计算趋势斜率
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v.cost, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i].cost - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // 生成预测数据点
    const predictions: UsageForecastDataPoint[] = [];
    const lastDate = new Date(dates[dates.length - 1]);

    for (let i = 1; i <= forecastDays; i++) {
      const predictedDate = new Date(lastDate);
      predictedDate.setDate(predictedDate.getDate() + i);

      const predictedCost = Math.max(0, avgCost + slope * (n + i - 1));
      const confidence = Math.max(0.3, 1 - (i / forecastDays) * 0.5); // 置信度随时间递减

      predictions.push({
        date: predictedDate.toISOString().split('T')[0],
        predictedCost,
        predictedDuration: avgDuration / 3600, // 转换为小时
        confidence,
        isActual: false,
      });
    }

    return predictions;
  }

  /**
   * 转换为数据点格式
   */
  private convertToDataPoints(
    dailyStats: Map<string, { cost: number; duration: number }>,
    isActual: boolean
  ): UsageForecastDataPoint[] {
    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      predictedCost: stats.cost,
      predictedDuration: stats.duration / 3600, // 转换为小时
      confidence: 1.0, // 历史数据置信度为 1
      isActual,
    }));
  }

  /**
   * 生成空预测（无历史数据时）
   */
  private getEmptyForecast(
    userId: string,
    forecastDays: number,
    historicalDays: number
  ): UsageForecastResponse {
    return {
      userId,
      forecastPeriodDays: forecastDays,
      historicalDays,
      currentDailyCost: 0,
      predictedDailyCost: 0,
      predictedTotalCost: 0,
      trend: 'stable',
      dataPoints: [],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成预警信息
   */
  private generateWarnings(
    currentBalance: number,
    predictedSpending7Days: number,
    predictedSpending30Days: number,
    balanceRunoutDays: number | null,
    config?: WarningConfig
  ): {
    warningLevel: 'normal' | 'info' | 'warning' | 'critical';
    warnings: Array<{
      level: 'normal' | 'info' | 'warning' | 'critical';
      message: string;
      recommendation: string;
    }>;
  } {
    const warnings: Array<{
      level: 'normal' | 'info' | 'warning' | 'critical';
      message: string;
      recommendation: string;
    }> = [];

    // 使用数值来跟踪警告级别，最后再转换
    // 0 = normal, 1 = info, 2 = warning, 3 = critical
    let warningLevelValue = 0;

    // 1. 检查余额耗尽
    if (balanceRunoutDays !== null) {
      if (balanceRunoutDays <= 3) {
        warningLevelValue = Math.max(warningLevelValue, 3); // critical
        warnings.push({
          level: 'critical',
          message: `余额预计在 ${balanceRunoutDays} 天内耗尽`,
          recommendation: '请立即充值以避免服务中断',
        });
      } else if (balanceRunoutDays <= 7) {
        warningLevelValue = Math.max(warningLevelValue, 2); // warning
        warnings.push({
          level: 'warning',
          message: `余额预计在 ${balanceRunoutDays} 天内耗尽`,
          recommendation: '建议尽快充值',
        });
      } else if (balanceRunoutDays <= 14) {
        warningLevelValue = Math.max(warningLevelValue, 1); // info
        warnings.push({
          level: 'info',
          message: `余额预计在 ${balanceRunoutDays} 天内耗尽`,
          recommendation: '建议及时关注余额变化',
        });
      }
    }

    // 2. 检查低余额阈值
    const criticalThreshold = config?.criticalBalanceThreshold || 20;
    const lowThreshold = config?.lowBalanceThreshold || 50;

    if (currentBalance <= criticalThreshold) {
      warningLevelValue = Math.max(warningLevelValue, 3); // critical
      warnings.push({
        level: 'critical',
        message: `当前余额 ¥${currentBalance.toFixed(2)} 低于严重阈值 ¥${criticalThreshold}`,
        recommendation: '请立即充值',
      });
    } else if (currentBalance <= lowThreshold) {
      warningLevelValue = Math.max(warningLevelValue, 2); // warning
      warnings.push({
        level: 'warning',
        message: `当前余额 ¥${currentBalance.toFixed(2)} 低于预警阈值 ¥${lowThreshold}`,
        recommendation: '建议充值',
      });
    }

    // 3. 检查每日预算
    if (config?.dailyBudget) {
      const dailySpending = predictedSpending7Days / 7;
      if (dailySpending > config.dailyBudget) {
        warningLevelValue = Math.max(warningLevelValue, 2); // warning
        warnings.push({
          level: 'warning',
          message: `预计每日支出 ¥${dailySpending.toFixed(2)} 超过预算 ¥${config.dailyBudget}`,
          recommendation: '建议优化资源使用或调整预算',
        });
      }
    }

    // 4. 检查每月预算
    if (config?.monthlyBudget) {
      if (predictedSpending30Days > config.monthlyBudget) {
        warningLevelValue = Math.max(warningLevelValue, 1); // info
        warnings.push({
          level: 'info',
          message: `预计30天支出 ¥${predictedSpending30Days.toFixed(2)} 超过月度预算 ¥${config.monthlyBudget}`,
          recommendation: '建议调整使用计划或增加预算',
        });
      }
    }

    // 5. 无预警情况
    if (warnings.length === 0) {
      warnings.push({
        level: 'normal',
        message: '当前消费状况正常',
        recommendation: '继续保持合理使用资源',
      });
    }

    // 转换数值为警告级别
    const warningLevel: 'normal' | 'info' | 'warning' | 'critical' =
      warningLevelValue === 3
        ? 'critical'
        : warningLevelValue === 2
          ? 'warning'
          : warningLevelValue === 1
            ? 'info'
            : 'normal';

    return { warningLevel, warnings };
  }
}
