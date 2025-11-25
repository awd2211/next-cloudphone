import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Message } from './message.entity';
import { Agent } from './agent.entity';
import { SatisfactionRating } from './satisfaction-rating.entity';
import { QualityReview } from './quality-review.entity';
import { VisitorProfile } from './visitor-profile.entity';

export enum ConversationStatus {
  WAITING = 'waiting', // 等待分配
  ACTIVE = 'active', // 进行中
  RESOLVED = 'resolved', // 已解决
  CLOSED = 'closed', // 已关闭
  TRANSFERRED = 'transferred', // 已转接
}

export enum ConversationChannel {
  WEB = 'web', // 网页聊天
  MOBILE = 'mobile', // 移动端
  API = 'api', // API 接入
}

export enum ConversationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('conversations')
@Index(['userId', 'status'])
@Index(['agentId', 'status'])
@Index(['status', 'createdAt'])
@Index(['tenantId', 'status'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'user_name', nullable: true })
  userName: string;

  @Column({ name: 'user_email', nullable: true })
  userEmail: string;

  @Column({ name: 'user_avatar', nullable: true })
  userAvatar: string;

  @Column({ name: 'visitor_id', nullable: true })
  @Index()
  visitorId: string;

  // 注意：visitor 关系不使用外键约束，因为 visitorId 在 visitor_profiles 表中
  // 只在组合索引 (tenantId, visitorId) 中唯一
  // 查询时需要同时使用 tenantId 和 visitorId
  @ManyToOne(() => VisitorProfile, (visitor) => visitor.conversations, {
    nullable: true,
    createForeignKeyConstraints: false, // 禁用外键约束
  })
  @JoinColumn({ name: 'visitor_id', referencedColumnName: 'visitorId' })
  visitor: VisitorProfile;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'agent_group_id', nullable: true })
  agentGroupId: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.WAITING,
  })
  status: ConversationStatus;

  @Column({
    type: 'enum',
    enum: ConversationChannel,
    default: ConversationChannel.WEB,
  })
  channel: ConversationChannel;

  @Column({
    type: 'enum',
    enum: ConversationPriority,
    default: ConversationPriority.NORMAL,
  })
  priority: ConversationPriority;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true })
  firstResponseAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'message_count', default: 0 })
  messageCount: number;

  @Column({ name: 'user_message_count', default: 0 })
  userMessageCount: number;

  @Column({ name: 'agent_message_count', default: 0 })
  agentMessageCount: number;

  @Column({ name: 'is_bot_handled', default: false })
  isBotHandled: boolean;

  @Column({ name: 'transferred_from', nullable: true })
  transferredFrom: string;

  @Column({ name: 'transfer_reason', nullable: true })
  transferReason: string;

  @Column({ name: 'ticket_id', nullable: true })
  ticketId: string;

  @Column({ name: 'client_ip', nullable: true })
  clientIp: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => SatisfactionRating, (rating) => rating.conversation)
  ratings: SatisfactionRating[];

  @OneToMany(() => QualityReview, (review) => review.conversation)
  qualityReviews: QualityReview[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
