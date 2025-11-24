/**
 * SLA 规则实体
 *
 * 定义 SLA 指标和阈值
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SlaMetricType {
  FIRST_RESPONSE_TIME = 'first_response_time', // 首次响应时间
  AVERAGE_RESPONSE_TIME = 'avg_response_time', // 平均响应时间
  RESOLUTION_TIME = 'resolution_time', // 解决时间
  WAIT_TIME = 'wait_time', // 等待时间
  QUEUE_LENGTH = 'queue_length', // 排队数量
  SATISFACTION_RATE = 'satisfaction_rate', // 满意度
  RESOLUTION_RATE = 'resolution_rate', // 解决率
}

export enum SlaSeverity {
  WARNING = 'warning', // 警告（黄色）
  CRITICAL = 'critical', // 严重（红色）
}

export enum SlaActionType {
  NOTIFICATION = 'notification', // 发送通知
  EMAIL = 'email', // 发送邮件
  ESCALATE = 'escalate', // 升级
  AUTO_ASSIGN = 'auto_assign', // 自动分配
}

@Entity('sla_rules')
@Index(['tenantId', 'isActive'])
export class SlaRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold: number;

  @Column({ name: 'threshold_unit', default: 'seconds' })
  thresholdUnit: string; // seconds, minutes, count, percent

  @Column({ type: 'simple-array', nullable: true })
  actions: SlaActionType[];

  @Column({ type: 'jsonb', name: 'action_config', nullable: true })
  actionConfig: {
    notifyRoles?: string[]; // 通知的角色
    emailRecipients?: string[]; // 邮件接收者
    escalateTo?: string; // 升级给谁
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'priority_filter', type: 'simple-array', nullable: true })
  priorityFilter: string[]; // 仅针对特定优先级生效

  @Column({ name: 'group_filter', type: 'simple-array', nullable: true })
  groupFilter: string[]; // 仅针对特定分组生效

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
