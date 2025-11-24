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

/**
 * 意图匹配类型
 */
export enum IntentMatchType {
  /**
   * 关键词匹配 - 包含任意一个关键词即匹配
   */
  KEYWORD = 'keyword',

  /**
   * 正则表达式匹配
   */
  REGEX = 'regex',

  /**
   * 精确匹配 - 完全一致
   */
  EXACT = 'exact',

  /**
   * 相似度匹配 - 基于字符串相似度
   */
  SIMILARITY = 'similarity',
}

/**
 * 意图回复类型
 */
export enum IntentResponseType {
  /**
   * 纯文本回复
   */
  TEXT = 'text',

  /**
   * 富文本/Markdown
   */
  RICH_TEXT = 'rich_text',

  /**
   * 带快捷回复按钮
   */
  QUICK_REPLIES = 'quick_replies',

  /**
   * 卡片消息
   */
  CARD = 'card',

  /**
   * 转人工
   */
  TRANSFER = 'transfer',

  /**
   * 知识库查询
   */
  KNOWLEDGE_BASE = 'knowledge_base',
}

/**
 * 机器人意图实体
 * 定义机器人可以识别的用户意图及其回复
 */
@Entity('bot_intents')
export class BotIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  botId: string;

  @ManyToOne(() => Bot, (bot) => bot.intents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  /**
   * 意图名称（内部标识）
   */
  @Column()
  name: string;

  /**
   * 意图显示名称
   */
  @Column()
  displayName: string;

  /**
   * 意图描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 匹配类型
   */
  @Column({
    type: 'enum',
    enum: IntentMatchType,
    default: IntentMatchType.KEYWORD,
  })
  matchType: IntentMatchType;

  /**
   * 匹配规则
   * - KEYWORD: 关键词数组 ["价格", "多少钱", "费用"]
   * - REGEX: 正则表达式字符串 "\\d+元"
   * - EXACT: 精确匹配字符串数组
   * - SIMILARITY: 示例句子数组（用于相似度计算）
   */
  @Column({ type: 'jsonb' })
  matchRules: string[];

  /**
   * 相似度阈值（仅 SIMILARITY 类型使用）
   */
  @Column({ type: 'float', default: 0.7 })
  similarityThreshold: number;

  /**
   * 回复类型
   */
  @Column({
    type: 'enum',
    enum: IntentResponseType,
    default: IntentResponseType.TEXT,
  })
  responseType: IntentResponseType;

  /**
   * 回复内容
   * - TEXT: 纯文本字符串
   * - QUICK_REPLIES: { text: string, quickReplies: string[] }
   * - CARD: { title, description, image, buttons }
   * - TRANSFER: { message: string, skillGroup?: string }
   * - KNOWLEDGE_BASE: { categoryId?: string, searchQuery?: string }
   */
  @Column({ type: 'jsonb' })
  responseContent: any;

  /**
   * 多个回复时随机选择（支持多样化回复）
   */
  @Column({ type: 'jsonb', nullable: true })
  alternativeResponses: any[];

  /**
   * 优先级 - 数字越大优先级越高
   */
  @Column({ default: 0 })
  priority: number;

  /**
   * 是否启用
   */
  @Column({ default: true })
  isEnabled: boolean;

  /**
   * 命中次数统计
   */
  @Column({ default: 0 })
  hitCount: number;

  /**
   * 上下文条件 - 仅在特定上下文下才匹配
   */
  @Column({ type: 'jsonb', nullable: true })
  contextConditions: {
    previousIntent?: string;
    sessionTags?: string[];
    userTags?: string[];
  };

  /**
   * 后置动作
   */
  @Column({ type: 'jsonb', nullable: true })
  postActions: {
    setSessionTags?: string[];
    setUserTags?: string[];
    triggerEvent?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
