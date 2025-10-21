import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { TicketReply } from './ticket-reply.entity';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

@Entity('tickets')
// 复合索引 - 优化常见查询场景
@Index('idx_tickets_status_priority', ['status', 'priority', 'createdAt'])
@Index('idx_tickets_assigned', ['assignedTo', 'status'])
@Index('idx_tickets_user_status', ['userId', 'status', 'createdAt'])
@Index('idx_tickets_category_status', ['category', 'status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  ticketNumber: string; // 工单编号，如 TKT-20241020-000001

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.OTHER,
  })
  @Index()
  category: TicketCategory;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  @Index()
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  @Index()
  status: TicketStatus;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  assignedTo: string; // 分配给的客服 ID

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastReplyAt: Date;

  @Column({ type: 'text', nullable: true })
  internalNotes: string; // 内部备注（客户不可见）

  @Column({ type: 'int', nullable: true })
  rating: number; // 客户评分 (1-5)

  @Column({ type: 'text', nullable: true })
  feedback: string; // 客户反馈

  @OneToMany(() => TicketReply, (reply) => reply.ticket)
  replies: TicketReply[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isOpen(): boolean {
    return [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING].includes(
      this.status,
    );
  }

  isClosed(): boolean {
    return [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(this.status);
  }

  canReply(): boolean {
    return this.status !== TicketStatus.CLOSED;
  }

  getResponseTime(): number | null {
    if (!this.firstResponseAt) return null;
    return this.firstResponseAt.getTime() - this.createdAt.getTime();
  }

  getResolutionTime(): number | null {
    if (!this.resolvedAt) return null;
    return this.resolvedAt.getTime() - this.createdAt.getTime();
  }
}
