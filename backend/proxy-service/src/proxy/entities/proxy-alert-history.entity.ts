import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理告警历史实体
 *
 * 记录所有触发的告警历史
 */
@Entity('proxy_alert_history')
@Index(['ruleId', 'triggeredAt'])
@Index(['userId', 'triggeredAt'])
@Index(['alertLevel', 'status'])
@Index(['triggeredAt'])
export class ProxyAlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id', type: 'varchar', length: 50 })
  @Index()
  ruleId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  deviceId: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 200 })
  ruleName: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  ruleType: string;

  // 告警信息
  @Column({ name: 'alert_level', type: 'varchar', length: 20 })
  @Index()
  alertLevel: string; // info, warning, critical

  @Column({ name: 'alert_title', type: 'varchar', length: 500 })
  alertTitle: string;

  @Column({ name: 'alert_message', type: 'text' })
  alertMessage: string;

  @Column({ name: 'alert_details', type: 'jsonb', nullable: true })
  alertDetails: Record<string, any>;

  // 触发条件
  @Column({ name: 'trigger_metric', type: 'varchar', length: 100 })
  triggerMetric: string;

  @Column({ name: 'trigger_condition', type: 'varchar', length: 200 })
  triggerCondition: string;

  @Column({ name: 'trigger_value', type: 'decimal', precision: 15, scale: 4 })
  triggerValue: number;

  @Column({ name: 'threshold_value', type: 'decimal', precision: 15, scale: 4 })
  thresholdValue: number;

  @Column({ name: 'deviation_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  deviationPercentage: number; // 偏离阈值的百分比

  // 受影响的资源
  @Column({ name: 'affected_resource_type', type: 'varchar', length: 50, nullable: true })
  affectedResourceType: string; // proxy, device, group, provider

  @Column({ name: 'affected_resource_ids', type: 'simple-array', nullable: true })
  affectedResourceIds: string[];

  @Column({ name: 'affected_count', type: 'integer', default: 1 })
  affectedCount: number;

  // 推荐操作
  @Column({ name: 'recommended_actions', type: 'simple-array', nullable: true })
  recommendedActions: string[];

  @Column({ name: 'action_priority', type: 'varchar', length: 20, nullable: true })
  actionPriority: string; // immediate, high, medium, low

  // 通知状态
  @Column({ name: 'notification_channels', type: 'simple-array' })
  notificationChannels: string[];

  @Column({ name: 'notifications_sent', type: 'integer', default: 0 })
  notificationsSent: number;

  @Column({ name: 'notifications_failed', type: 'integer', default: 0 })
  notificationsFailed: number;

  @Column({ name: 'notification_status', type: 'jsonb', nullable: true })
  notificationStatus: Record<string, {
    channel: string;
    status: string;
    sentAt?: Date;
    error?: string;
  }>;

  @Column({ name: 'first_notification_at', type: 'timestamp', nullable: true })
  firstNotificationAt: Date;

  @Column({ name: 'last_notification_at', type: 'timestamp', nullable: true })
  lastNotificationAt: Date;

  // 自动操作
  @Column({ name: 'auto_action_triggered', type: 'boolean', default: false })
  autoActionTriggered: boolean;

  @Column({ name: 'auto_action_type', type: 'varchar', length: 50, nullable: true })
  autoActionType: string;

  @Column({ name: 'auto_action_status', type: 'varchar', length: 50, nullable: true })
  autoActionStatus: string; // success, failed, pending_confirmation, skipped

  @Column({ name: 'auto_action_result', type: 'text', nullable: true })
  autoActionResult: string;

  @Column({ name: 'auto_action_executed_at', type: 'timestamp', nullable: true })
  autoActionExecutedAt: Date;

  // 告警状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, acknowledged, resolved, dismissed, expired

  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged: boolean;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'acknowledged_by', type: 'varchar', length: 50, nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'acknowledgement_note', type: 'text', nullable: true })
  acknowledgementNote: string;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', type: 'varchar', length: 50, nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string;

  @Column({ name: 'resolution_duration', type: 'integer', nullable: true })
  resolutionDuration: number; // 秒

  // 升级信息
  @Column({ name: 'is_escalated', type: 'boolean', default: false })
  isEscalated: boolean;

  @Column({ name: 'escalated_from_level', type: 'varchar', length: 20, nullable: true })
  escalatedFromLevel: string;

  @Column({ name: 'escalated_at', type: 'timestamp', nullable: true })
  escalatedAt: Date;

  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason: string;

  // 相关告警
  @Column({ name: 'parent_alert_id', type: 'varchar', length: 50, nullable: true })
  parentAlertId: string; // 如果是升级或关联告警

  @Column({ name: 'related_alert_ids', type: 'simple-array', nullable: true })
  relatedAlertIds: string[];

  @Column({ name: 'is_duplicate', type: 'boolean', default: false })
  isDuplicate: boolean;

  @Column({ name: 'duplicate_of_id', type: 'varchar', length: 50, nullable: true })
  duplicateOfId: string;

  // 时间信息
  @Column({ name: 'triggered_at', type: 'timestamp' })
  @Index()
  triggeredAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // 性能数据
  @Column({ name: 'detection_latency', type: 'integer', nullable: true })
  detectionLatency: number; // 毫秒，从条件满足到触发的延迟

  @Column({ name: 'notification_latency', type: 'integer', nullable: true })
  notificationLatency: number; // 毫秒，从触发到通知的延迟

  // 标记
  @Column({ name: 'is_false_positive', type: 'boolean', nullable: true })
  isFalsePositive: boolean;

  @Column({ name: 'false_positive_reason', type: 'text', nullable: true })
  falsePositiveReason: string;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
