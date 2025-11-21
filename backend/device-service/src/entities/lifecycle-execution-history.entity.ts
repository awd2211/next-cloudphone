import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LifecycleRule, LifecycleRuleType } from './lifecycle-rule.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum TriggerType {
  SCHEDULED = 'scheduled', // 定时任务触发
  MANUAL = 'manual', // 手动触发
  EVENT = 'event', // 事件触发
  API = 'api', // API 调用触发
}

@Entity('lifecycle_execution_history')
export class LifecycleExecutionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  ruleId: string;

  @ManyToOne(() => LifecycleRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule: LifecycleRule;

  @Column({ type: 'varchar', length: 255 })
  ruleName: string;

  @Column({
    type: 'enum',
    enum: LifecycleRuleType,
  })
  ruleType: LifecycleRuleType;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  @Index()
  status: ExecutionStatus;

  @Column({
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.SCHEDULED,
  })
  triggerType: TriggerType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  triggeredBy: string; // 触发者（用户ID或系统）

  @Column({ type: 'timestamp' })
  @Index()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  durationMs: number; // 执行时长（毫秒）

  @Column({ type: 'int', default: 0 })
  affectedDevices: number; // 影响的设备数量

  @Column({ type: 'int', default: 0 })
  successCount: number; // 成功处理的设备数

  @Column({ type: 'int', default: 0 })
  failedCount: number; // 失败的设备数

  @Column({ type: 'jsonb', nullable: true })
  summary: {
    processedDeviceIds?: string[];
    failedDeviceIds?: string[];
    actions?: string[];
    metrics?: Record<string, number>;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: {
    code?: string;
    stack?: string;
    context?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>; // 执行时的配置快照

  @CreateDateColumn()
  createdAt: Date;
}
