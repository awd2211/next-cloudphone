import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AgentGroup } from './agent-group.entity';
import { Conversation } from './conversation.entity';

export enum AgentStatus {
  ONLINE = 'online',
  BUSY = 'busy',
  AWAY = 'away',
  OFFLINE = 'offline',
}

export enum AgentRole {
  AGENT = 'agent',
  SENIOR_AGENT = 'senior_agent',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

@Entity('agents')
@Index(['tenantId', 'status'])
@Index(['userId'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus;

  @Column({
    type: 'enum',
    enum: AgentRole,
    default: AgentRole.AGENT,
  })
  role: AgentRole;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => AgentGroup, (group) => group.agents, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: AgentGroup;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[];

  @Column({ name: 'max_concurrent_chats', default: 5 })
  maxConcurrentChats: number;

  @Column({ name: 'current_chat_count', default: 0 })
  currentChatCount: number;

  @Column({ name: 'is_accepting_chats', default: true })
  isAcceptingChats: boolean;

  @Column({ name: 'auto_accept', default: false })
  autoAccept: boolean;

  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'total_conversations', default: 0 })
  totalConversations: number;

  @Column({ name: 'total_messages', default: 0 })
  totalMessages: number;

  @Column({ name: 'avg_response_time', type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgResponseTime: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  avgRating: number;

  @Column({ name: 'rating_count', default: 0 })
  ratingCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Conversation, (conversation) => conversation.agent)
  conversations: Conversation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
