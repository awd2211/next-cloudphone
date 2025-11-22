import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';
import { QueueConfig } from './queue-config.entity';

export enum GroupType {
  SUPPORT = 'support', // 技术支持
  SALES = 'sales', // 销售咨询
  BILLING = 'billing', // 计费问题
  VIP = 'vip', // VIP 客户
  GENERAL = 'general', // 通用客服
}

@Entity('agent_groups')
@Index(['tenantId', 'type'])
export class AgentGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    default: GroupType.GENERAL,
  })
  type: GroupType;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[];

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'max_queue_size', default: 100 })
  maxQueueSize: number;

  @Column({ name: 'max_wait_time', default: 300 })
  maxWaitTime: number;

  @Column({ name: 'working_hours', type: 'jsonb', nullable: true })
  workingHours: WorkingHours;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'fallback_group_id', nullable: true })
  fallbackGroupId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => Agent, (agent) => agent.group)
  agents: Agent[];

  @OneToMany(() => QueueConfig, (config) => config.group)
  queueConfigs: QueueConfig[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface WorkingHours {
  timezone: string;
  schedule: {
    [key: string]: { // 'monday', 'tuesday', etc.
      enabled: boolean;
      start: string; // '09:00'
      end: string; // '18:00'
    };
  };
  holidays?: string[]; // ISO date strings
}
