import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BotIntent } from './bot-intent.entity';

/**
 * 机器人配置实体
 * 每个租户可以配置多个机器人，支持不同场景
 */
@Entity('bots')
export class Bot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 欢迎语 - 用户首次发起会话时的自动回复
   */
  @Column({ type: 'text' })
  welcomeMessage: string;

  /**
   * 兜底回复 - 无法识别用户意图时的回复
   */
  @Column({ type: 'text' })
  fallbackMessage: string;

  /**
   * 转人工提示语
   */
  @Column({ type: 'text', default: '正在为您转接人工客服，请稍候...' })
  transferMessage: string;

  /**
   * 离线提示语 - 无客服在线时的提示
   */
  @Column({ type: 'text', default: '当前客服不在线，请留言或稍后再试。' })
  offlineMessage: string;

  /**
   * 是否启用
   */
  @Column({ default: true })
  isEnabled: boolean;

  /**
   * 是否为默认机器人
   */
  @Column({ default: false })
  isDefault: boolean;

  /**
   * 最大机器人回复轮数 - 超过后自动转人工
   */
  @Column({ default: 5 })
  maxBotRounds: number;

  /**
   * 无响应超时时间（秒）- 用户无响应后的提醒
   */
  @Column({ default: 300 })
  idleTimeout: number;

  /**
   * 工作时间配置 JSON
   * 格式: { "monday": { "start": "09:00", "end": "18:00" }, ... }
   */
  @Column({ type: 'jsonb', nullable: true })
  workingHours: Record<string, { start: string; end: string }>;

  /**
   * 关联的意图列表
   */
  @OneToMany(() => BotIntent, (intent) => intent.bot, { cascade: true })
  intents: BotIntent[];

  /**
   * 扩展配置
   */
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    enableTypingIndicator?: boolean;
    typingDelayMs?: number;
    enableQuickReplies?: boolean;
    enableFeedback?: boolean;
    aiEnabled?: boolean;
    aiModel?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;
}
