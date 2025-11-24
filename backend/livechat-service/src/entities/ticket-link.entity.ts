import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

// 关联类型
export enum TicketLinkType {
  CONVERTED = 'converted',      // 会话转工单
  REFERENCED = 'referenced',    // 会话引用工单
  FOLLOW_UP = 'follow_up',      // 后续工单
  RELATED = 'related',          // 相关工单
}

// 关联状态
export enum TicketLinkStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('ticket_links')
@Index(['tenantId', 'conversationId'])
@Index(['tenantId', 'ticketId'])
export class TicketLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  // 关联的会话
  @Column()
  @Index()
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  // 关联的工单ID（来自 user-service）
  @Column()
  @Index()
  ticketId: string;

  // 工单编号
  @Column({ nullable: true })
  ticketNumber: string;

  // 关联类型
  @Column({
    type: 'enum',
    enum: TicketLinkType,
    default: TicketLinkType.CONVERTED,
  })
  linkType: TicketLinkType;

  // 关联状态
  @Column({
    type: 'enum',
    enum: TicketLinkStatus,
    default: TicketLinkStatus.ACTIVE,
  })
  status: TicketLinkStatus;

  // 工单信息缓存
  @Column({ type: 'jsonb', nullable: true })
  ticketInfo: {
    subject?: string;
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: string;
    assigneeName?: string;
    lastUpdatedAt?: Date;
  };

  // 同步设置
  @Column({ type: 'jsonb', nullable: true })
  syncSettings: {
    syncComments?: boolean;        // 同步评论
    syncStatusChanges?: boolean;   // 同步状态变更
    syncPriorityChanges?: boolean; // 同步优先级变更
    notifyOnUpdate?: boolean;      // 更新时通知
  };

  // 创建者
  @Column({ nullable: true })
  createdBy: string;

  // 备注
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
