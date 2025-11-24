import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/**
 * 内部消息类型
 */
export enum InternalMessageType {
  /**
   * 普通内部消息
   */
  TEXT = 'text',

  /**
   * 建议/提示
   */
  SUGGESTION = 'suggestion',

  /**
   * 系统通知（如加入/退出协同）
   */
  SYSTEM = 'system',

  /**
   * 知识库推荐
   */
  KNOWLEDGE = 'knowledge',

  /**
   * 快捷回复推荐
   */
  CANNED_RESPONSE = 'canned_response',
}

/**
 * 内部消息实体
 * 客服之间的私密消息，用户不可见
 */
@Entity('internal_messages')
@Index(['conversationId', 'createdAt'])
@Index(['tenantId', 'senderId'])
export class InternalMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  /**
   * 发送者ID（客服）
   */
  @Column()
  senderId: string;

  /**
   * 发送者名称
   */
  @Column()
  senderName: string;

  /**
   * 接收者ID列表（空表示所有协同者）
   */
  @Column({ type: 'jsonb', default: [] })
  recipientIds: string[];

  /**
   * 消息类型
   */
  @Column({
    type: 'enum',
    enum: InternalMessageType,
    default: InternalMessageType.TEXT,
  })
  type: InternalMessageType;

  /**
   * 消息内容
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * 附加数据
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    knowledgeArticleId?: string;
    cannedResponseId?: string;
    suggestedReply?: string;
    priority?: 'low' | 'normal' | 'high';
  };

  /**
   * 已读的客服ID列表
   */
  @Column({ type: 'jsonb', default: [] })
  readBy: string[];

  @CreateDateColumn()
  createdAt: Date;
}
