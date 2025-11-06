import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 调度策略类型
 */
export enum StrategyType {
  ROUND_ROBIN = 'round-robin',
  LEAST_LOADED = 'least-loaded',
  RANDOM = 'random',
  PRIORITY = 'priority',
  CUSTOM = 'custom',
}

/**
 * 调度策略实体
 * 用于管理不同的设备调度策略
 */
@Entity('scheduling_strategies')
export class SchedulingStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: StrategyType,
    default: StrategyType.ROUND_ROBIN,
  })
  type: StrategyType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
