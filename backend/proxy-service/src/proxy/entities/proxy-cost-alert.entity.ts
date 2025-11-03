import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理成本告警实体
 *
 * 记录成本预算告警历史
 */
@Entity('proxy_cost_alerts')
@Index(['budgetId', 'triggeredAt'])
@Index(['userId', 'triggeredAt'])
@Index(['alertLevel'])
@Index(['triggeredAt'])
export class ProxyCostAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'budget_id', type: 'varchar', length: 50 })
  @Index()
  budgetId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  deviceId: string;

  // 告警信息
  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  alertType: string; // threshold_reached, budget_exceeded, overspending_forecast

  @Column({ name: 'alert_level', type: 'varchar', length: 20 })
  @Index()
  alertLevel: string; // info, warning, critical

  @Column({ name: 'threshold_percentage', type: 'decimal', precision: 5, scale: 2 })
  thresholdPercentage: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'threshold', type: 'decimal', precision: 5, scale: 2 })
  threshold: number;

  @Column({ name: 'percentage', type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({ name: 'current_percentage', type: 'decimal', precision: 5, scale: 2 })
  currentPercentage: number;

  // 预算状态
  @Column({ name: 'budget_amount', type: 'decimal', precision: 10, scale: 2 })
  budgetAmount: number;

  @Column({ name: 'amount_spent', type: 'decimal', precision: 10, scale: 2 })
  amountSpent: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'current_spending', type: 'decimal', precision: 10, scale: 2 })
  currentSpending: number;

  @Column({ name: 'amount_remaining', type: 'decimal', precision: 10, scale: 2 })
  amountRemaining: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency: string;

  // 告警消息
  @Column({ name: 'alert_title', type: 'varchar', length: 200 })
  alertTitle: string;

  @Column({ name: 'alert_message', type: 'text' })
  alertMessage: string;

  @Column({ name: 'recommended_actions', type: 'simple-array', nullable: true })
  recommendedActions: string[];

  // 预测信息
  @Column({ name: 'forecasted_exceed_date', type: 'timestamp', nullable: true })
  forecastedExceedDate: Date;

  @Column({ name: 'forecasted_total_spend', type: 'decimal', precision: 10, scale: 2, nullable: true })
  forecastedTotalSpend: number;

  @Column({ name: 'days_until_exceeded', type: 'integer', nullable: true })
  daysUntilExceeded: number;

  // 通知状态
  @Column({ name: 'notification_channels', type: 'simple-array' })
  notificationChannels: string[];

  @Column({ name: 'is_sent', type: 'boolean', default: false })
  isSent: boolean;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'send_attempts', type: 'integer', default: 0 })
  sendAttempts: number;

  @Column({ name: 'last_send_error', type: 'text', nullable: true })
  lastSendError: string;

  // 用户响应
  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged: boolean;

  // 简化字段（兼容Service使用）
  @Column({ name: 'acknowledged', type: 'boolean', default: false })
  acknowledged: boolean;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'acknowledged_by', type: 'varchar', length: 50, nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string;

  // 自动操作
  @Column({ name: 'auto_action_triggered', type: 'boolean', default: false })
  autoActionTriggered: boolean;

  @Column({ name: 'auto_action_type', type: 'varchar', length: 50, nullable: true })
  autoActionType: string; // stop_usage, reduce_quota, switch_provider

  @Column({ name: 'auto_action_result', type: 'text', nullable: true })
  autoActionResult: string;

  // 时间信息
  @Column({ name: 'triggered_at', type: 'timestamp' })
  @Index()
  triggeredAt: Date;

  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
