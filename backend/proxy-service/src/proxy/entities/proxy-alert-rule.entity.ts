import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理告警规则实体
 *
 * 定义自动告警触发条件和规则
 */
@Entity('proxy_alert_rules')
@Index(['userId'])
@Index(['ruleType', 'isEnabled'])
export class ProxyAlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  deviceId: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 200 })
  ruleName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  @Index()
  ruleType: string; // quality_degradation, cost_overrun, failover_frequent, session_expiring, provider_down

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  @Index()
  isEnabled: boolean;

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10

  // 监控目标
  @Column({ name: 'monitor_scope', type: 'varchar', length: 50 })
  monitorScope: string; // all, user, device, group, proxy, provider

  @Column({ name: 'monitor_targets', type: 'simple-array', nullable: true })
  monitorTargets: string[]; // 具体的ID列表

  // 触发条件
  @Column({ name: 'condition_type', type: 'varchar', length: 50 })
  conditionType: string; // threshold, change_rate, anomaly, pattern

  @Column({ name: 'metric_name', type: 'varchar', length: 100 })
  metricName: string; // success_rate, latency, cost, quality_score, etc.

  @Column({ name: 'operator', type: 'varchar', length: 20 })
  operator: string; // gt, gte, lt, lte, eq, ne, between

  @Column({ name: 'threshold_value', type: 'decimal', precision: 15, scale: 4, nullable: true })
  thresholdValue: number;

  @Column({ name: 'threshold_min', type: 'decimal', precision: 15, scale: 4, nullable: true })
  thresholdMin: number;

  @Column({ name: 'threshold_max', type: 'decimal', precision: 15, scale: 4, nullable: true })
  thresholdMax: number;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds: number; // 持续时间，用于避免误报

  @Column({ name: 'evaluation_window', type: 'integer', default: 300 })
  evaluationWindow: number; // 秒，评估窗口

  // 多条件组合
  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: Array<{
    metric: string;
    operator: string;
    value: number;
    duration?: number;
  }>;

  @Column({ name: 'condition_logic', type: 'varchar', length: 10, default: 'AND' })
  conditionLogic: string; // AND, OR

  // 告警级别
  @Column({ name: 'alert_level', type: 'varchar', length: 20 })
  alertLevel: string; // info, warning, critical

  @Column({ name: 'auto_escalate', type: 'boolean', default: false })
  autoEscalate: boolean; // 自动升级告警级别

  @Column({ name: 'escalation_time', type: 'integer', nullable: true })
  escalationTime: number; // 秒，未处理时自动升级

  // 通知配置
  @Column({ name: 'notification_channels', type: 'simple-array' })
  notificationChannels: string[]; // channel IDs

  @Column({ name: 'notification_template', type: 'text', nullable: true })
  notificationTemplate: string;

  @Column({ name: 'include_details', type: 'boolean', default: true })
  includeDetails: boolean;

  @Column({ name: 'include_recommendations', type: 'boolean', default: true })
  includeRecommendations: boolean;

  // 自动处理
  @Column({ name: 'auto_action_enabled', type: 'boolean', default: false })
  autoActionEnabled: boolean;

  @Column({ name: 'auto_action_type', type: 'varchar', length: 50, nullable: true })
  autoActionType: string; // failover, stop_usage, switch_provider, adjust_budget

  @Column({ name: 'auto_action_params', type: 'jsonb', nullable: true })
  autoActionParams: Record<string, any>;

  @Column({ name: 'require_confirmation', type: 'boolean', default: true })
  requireConfirmation: boolean; // 自动操作是否需要确认

  // 频率限制
  @Column({ name: 'cooldown_period', type: 'integer', default: 600 })
  cooldownPeriod: number; // 秒

  @Column({ name: 'max_alerts_per_hour', type: 'integer', default: 5 })
  maxAlertsPerHour: number;

  @Column({ name: 'max_alerts_per_day', type: 'integer', default: 20 })
  maxAlertsPerDay: number;

  // 时间限制
  @Column({ name: 'active_hours_start', type: 'varchar', length: 5, nullable: true })
  activeHoursStart: string;

  @Column({ name: 'active_hours_end', type: 'varchar', length: 5, nullable: true })
  activeHoursEnd: string;

  @Column({ name: 'active_days', type: 'simple-array', nullable: true })
  activeDays: string[];

  @Column({ name: 'timezone', type: 'varchar', length: 50, nullable: true })
  timezone: string;

  // 静默配置
  @Column({ name: 'mute_until', type: 'timestamp', nullable: true })
  muteUntil: Date;

  @Column({ name: 'mute_reason', type: 'text', nullable: true })
  muteReason: string;

  // 统计信息
  @Column({ name: 'total_triggered', type: 'integer', default: 0 })
  totalTriggered: number;

  @Column({ name: 'alerts_sent', type: 'integer', default: 0 })
  alertsSent: number;

  @Column({ name: 'auto_actions_executed', type: 'integer', default: 0 })
  autoActionsExecuted: number;

  @Column({ name: 'last_triggered_at', type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @Column({ name: 'last_alert_sent_at', type: 'timestamp', nullable: true })
  lastAlertSentAt: Date;

  @Column({ name: 'last_evaluation_at', type: 'timestamp', nullable: true })
  lastEvaluationAt: Date;

  // 性能统计
  @Column({ name: 'false_positive_count', type: 'integer', default: 0 })
  falsePositiveCount: number;

  @Column({ name: 'true_positive_count', type: 'integer', default: 0 })
  truePositiveCount: number;

  @Column({ name: 'accuracy_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracyRate: number; // 百分比

  // 标签
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
