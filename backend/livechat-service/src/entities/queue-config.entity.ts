import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AgentGroup } from './agent-group.entity';

export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin', // 轮询
  LEAST_BUSY = 'least_busy', // 最空闲
  SKILL_BASED = 'skill_based', // 基于技能
  PRIORITY = 'priority', // 优先级
  RANDOM = 'random', // 随机
}

@Entity('queue_configs')
@Index(['tenantId', 'isActive'])
export class QueueConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => AgentGroup, (group) => group.queueConfigs, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: AgentGroup;

  @Column({
    name: 'routing_strategy',
    type: 'enum',
    enum: RoutingStrategy,
    default: RoutingStrategy.LEAST_BUSY,
  })
  routingStrategy: RoutingStrategy;

  @Column({ name: 'max_queue_size', default: 50 })
  maxQueueSize: number;

  @Column({ name: 'max_wait_time', default: 300 })
  maxWaitTime: number;

  @Column({ name: 'overflow_action', default: 'bot' })
  overflowAction: 'bot' | 'voicemail' | 'callback' | 'reject';

  @Column({ name: 'vip_priority_boost', default: 2 })
  vipPriorityBoost: number;

  @Column({ name: 'skill_match_required', default: false })
  skillMatchRequired: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions: QueueCondition[];

  @Column({ name: 'welcome_message', type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ name: 'queue_message', type: 'text', nullable: true })
  queueMessage: string;

  @Column({ name: 'offline_message', type: 'text', nullable: true })
  offlineMessage: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface QueueCondition {
  field: string; // 'user.vip', 'device.type', 'time.hour'
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}
