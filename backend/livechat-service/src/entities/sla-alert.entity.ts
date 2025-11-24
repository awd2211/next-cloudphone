/**
 * SLA 告警记录实体
 *
 * 记录触发的 SLA 告警
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SlaRule, SlaSeverity, SlaMetricType } from './sla-rule.entity';

export enum SlaAlertStatus {
  ACTIVE = 'active', // 告警中
  ACKNOWLEDGED = 'acknowledged', // 已确认
  RESOLVED = 'resolved', // 已解决
  EXPIRED = 'expired', // 已过期
}

@Entity('sla_alerts')
@Index(['tenantId', 'status', 'createdAt'])
@Index(['conversationId', 'createdAt'])
export class SlaAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => SlaRule, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rule_id' })
  rule: SlaRule;

  @Column({ name: 'conversation_id', nullable: true })
  conversationId: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @Column({
    type: 'enum',
    enum: SlaMetricType,
    name: 'metric_type',
  })
  metricType: SlaMetricType;

  @Column({
    type: 'enum',
    enum: SlaSeverity,
  })
  severity: SlaSeverity;

  @Column({ name: 'current_value', type: 'decimal', precision: 10, scale: 2 })
  currentValue: number;

  @Column({ name: 'threshold_value', type: 'decimal', precision: 10, scale: 2 })
  thresholdValue: number;

  @Column({
    type: 'enum',
    enum: SlaAlertStatus,
    default: SlaAlertStatus.ACTIVE,
  })
  status: SlaAlertStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
