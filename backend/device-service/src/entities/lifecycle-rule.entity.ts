import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LifecycleRuleType {
  CLEANUP = 'cleanup',
  AUTOSCALING = 'autoscaling',
  BACKUP = 'backup',
  EXPIRATION_WARNING = 'expiration-warning',
}

@Entity('lifecycle_rules')
export class LifecycleRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LifecycleRuleType,
    default: LifecycleRuleType.CLEANUP,
  })
  type: LifecycleRuleType;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  schedule: string; // Cron 表达式

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextExecutionAt: Date | null;

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
