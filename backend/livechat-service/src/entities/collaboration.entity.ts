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
import { Conversation } from './conversation.entity';
import { Agent } from './agent.entity';

/**
 * 协同参与者角色
 */
export enum CollaboratorRole {
  /**
   * 主客服 - 拥有完整权限
   */
  PRIMARY = 'primary',

  /**
   * 协助客服 - 可以发消息和查看
   */
  ASSISTANT = 'assistant',

  /**
   * 观察者 - 只能查看，不能发消息
   */
  OBSERVER = 'observer',

  /**
   * 顾问 - 可以发内部消息给主客服
   */
  ADVISOR = 'advisor',
}

/**
 * 协同状态
 */
export enum CollaborationStatus {
  /**
   * 邀请中
   */
  INVITED = 'invited',

  /**
   * 已加入
   */
  JOINED = 'joined',

  /**
   * 已拒绝
   */
  DECLINED = 'declined',

  /**
   * 已退出
   */
  LEFT = 'left',
}

/**
 * 会话协同实体
 * 支持多客服同时服务同一会话
 */
@Entity('conversation_collaborations')
@Index(['conversationId', 'agentId'], { unique: true })
@Index(['tenantId', 'agentId', 'status'])
export class ConversationCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  /**
   * 参与者角色
   */
  @Column({
    type: 'enum',
    enum: CollaboratorRole,
    default: CollaboratorRole.ASSISTANT,
  })
  role: CollaboratorRole;

  /**
   * 协同状态
   */
  @Column({
    type: 'enum',
    enum: CollaborationStatus,
    default: CollaborationStatus.INVITED,
  })
  status: CollaborationStatus;

  /**
   * 邀请人ID
   */
  @Column({ nullable: true })
  invitedBy: string;

  /**
   * 邀请原因/备注
   */
  @Column({ type: 'text', nullable: true })
  inviteReason: string;

  /**
   * 加入时间
   */
  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  /**
   * 退出时间
   */
  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  /**
   * 退出原因
   */
  @Column({ nullable: true })
  leftReason: string;

  /**
   * 发送消息数
   */
  @Column({ default: 0 })
  messageCount: number;

  /**
   * 发送内部消息数
   */
  @Column({ default: 0 })
  internalMessageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
