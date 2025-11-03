import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理成本预算实体
 *
 * 管理用户和设备级别的成本预算限制
 */
@Entity('proxy_cost_budgets')
@Index(['userId', 'deviceId', 'periodType'])
@Index(['userId', 'periodStart', 'periodEnd'])
export class ProxyCostBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'budget_name', type: 'varchar', length: 200 })
  budgetName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  // 预算周期
  @Column({ name: 'period_type', type: 'varchar', length: 20 })
  periodType: string; // daily, weekly, monthly, quarterly, yearly, custom

  // 简化字段（兼容Service使用）
  @Column({ name: 'budget_type', type: 'varchar', length: 20 })
  budgetType: string; // daily, weekly, monthly

  @Column({ name: 'period_start', type: 'timestamp' })
  @Index()
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  @Index()
  periodEnd: Date;

  // 预算金额
  @Column({ name: 'budget_amount', type: 'decimal', precision: 10, scale: 2 })
  budgetAmount: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // 当前使用情况
  @Column({ name: 'amount_spent', type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountSpent: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'spent_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ name: 'amount_remaining', type: 'decimal', precision: 10, scale: 2 })
  amountRemaining: number;

  @Column({ name: 'usage_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  usagePercentage: number;

  // 告警阈值
  @Column({ name: 'alert_thresholds', type: 'simple-array' })
  alertThresholds: number[]; // [50, 80, 95, 100]

  @Column({ name: 'alert_channels', type: 'simple-array' })
  alertChannels: string[]; // ['email', 'sms', 'webhook']

  @Column({ name: 'alerts_triggered', type: 'simple-array', nullable: true })
  alertsTriggered: number[]; // 已触发的阈值

  @Column({ name: 'last_alert_at', type: 'timestamp', nullable: true })
  lastAlertAt: Date;

  // 自动操作
  @Column({ name: 'auto_stop', type: 'boolean', default: false })
  autoStop: boolean; // 达到100%时自动停止使用

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean; // 周期结束时自动续期

  @Column({ name: 'is_stopped', type: 'boolean', default: false })
  isStopped: boolean;

  @Column({ name: 'stopped_at', type: 'timestamp', nullable: true })
  stoppedAt: Date;

  @Column({ name: 'stop_reason', type: 'text', nullable: true })
  stopReason: string;

  // 预测分析
  @Column({ name: 'forecasted_spend', type: 'decimal', precision: 10, scale: 2, nullable: true })
  forecastedSpend: number;

  @Column({ name: 'forecasted_exceed_date', type: 'timestamp', nullable: true })
  forecastedExceedDate: Date;

  @Column({ name: 'daily_avg_spend', type: 'decimal', precision: 10, scale: 4, nullable: true })
  dailyAvgSpend: number;

  // 限制条件
  @Column({ name: 'max_cost_per_request', type: 'decimal', precision: 10, scale: 6, nullable: true })
  maxCostPerRequest: number;

  @Column({ name: 'max_cost_per_gb', type: 'decimal', precision: 10, scale: 4, nullable: true })
  maxCostPerGb: number;

  @Column({ name: 'allowed_providers', type: 'simple-array', nullable: true })
  allowedProviders: string[];

  @Column({ name: 'excluded_providers', type: 'simple-array', nullable: true })
  excludedProviders: string[];

  @Column({ name: 'allowed_countries', type: 'simple-array', nullable: true })
  allowedCountries: string[];

  // 状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string; // active, exhausted, expired, paused

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10

  // 统计信息
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number;

  @Column({ name: 'total_usage_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalUsageHours: number;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
