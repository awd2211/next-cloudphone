import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bot } from './bot.entity';
import { Conversation } from './conversation.entity';

/**
 * 机器人会话状态
 */
export enum BotConversationStatus {
  /**
   * 机器人处理中
   */
  BOT_HANDLING = 'bot_handling',

  /**
   * 已转人工
   */
  TRANSFERRED = 'transferred',

  /**
   * 用户主动结束
   */
  USER_ENDED = 'user_ended',

  /**
   * 超时结束
   */
  TIMEOUT = 'timeout',

  /**
   * 机器人解决
   */
  BOT_RESOLVED = 'bot_resolved',
}

/**
 * 机器人会话实体
 * 跟踪机器人与用户的交互过程
 */
@Entity('bot_conversations')
export class BotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  botId: string;

  @ManyToOne(() => Bot)
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  userId: string;

  /**
   * 会话状态
   */
  @Column({
    type: 'enum',
    enum: BotConversationStatus,
    default: BotConversationStatus.BOT_HANDLING,
  })
  status: BotConversationStatus;

  /**
   * 机器人回复轮数
   */
  @Column({ default: 0 })
  botRounds: number;

  /**
   * 用户消息数
   */
  @Column({ default: 0 })
  userMessageCount: number;

  /**
   * 命中的意图列表
   */
  @Column({ type: 'jsonb', default: [] })
  matchedIntents: {
    intentId: string;
    intentName: string;
    userMessage: string;
    matchedAt: Date;
    confidence?: number;
  }[];

  /**
   * 会话标签
   */
  @Column({ type: 'jsonb', default: [] })
  sessionTags: string[];

  /**
   * 转人工原因
   */
  @Column({ type: 'text', nullable: true })
  transferReason: string;

  /**
   * 转人工时间
   */
  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date;

  /**
   * 接手的客服ID
   */
  @Column({ nullable: true })
  transferredToAgentId: string;

  /**
   * 用户满意度评分（1-5）
   */
  @Column({ type: 'int', nullable: true })
  satisfactionScore: number;

  /**
   * 用户反馈
   */
  @Column({ type: 'text', nullable: true })
  userFeedback: string;

  /**
   * 是否机器人成功解决
   */
  @Column({ default: false })
  resolvedByBot: boolean;

  /**
   * 最后活动时间
   */
  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  /**
   * 会话元数据
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    deviceInfo?: any;
    location?: string;
    entryPoint?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
