import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum QueueItemStatus {
  WAITING = 'waiting',
  ASSIGNED = 'assigned',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

@Entity('queue_items')
@Index(['tenantId', 'status', 'priority', 'createdAt'])
@Index(['groupId', 'status'])
export class QueueItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'user_name', nullable: true })
  userName: string;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @Column({ name: 'required_skills', type: 'jsonb', nullable: true })
  requiredSkills: string[];

  @Column({
    type: 'enum',
    enum: QueueItemStatus,
    default: QueueItemStatus.WAITING,
  })
  status: QueueItemStatus;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'position', default: 0 })
  position: number;

  @Column({ name: 'estimated_wait_time', nullable: true })
  estimatedWaitTime: number;

  @Column({ name: 'assigned_agent_id', nullable: true })
  assignedAgentId: string;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
