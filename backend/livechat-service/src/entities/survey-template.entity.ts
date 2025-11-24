import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 调查问题类型
 */
export enum SurveyQuestionType {
  RATING = 'rating',           // 评分 (1-5 或 1-10)
  NPS = 'nps',                 // NPS 评分 (0-10)
  SINGLE_CHOICE = 'single',    // 单选
  MULTI_CHOICE = 'multi',      // 多选
  TEXT = 'text',               // 文本
  TAGS = 'tags',               // 标签选择
}

/**
 * 调查触发条件
 */
export enum SurveyTrigger {
  CONVERSATION_RESOLVED = 'conversation_resolved',  // 会话解决时
  CONVERSATION_CLOSED = 'conversation_closed',      // 会话关闭时
  AGENT_REQUEST = 'agent_request',                  // 客服主动发起
  SCHEDULED = 'scheduled',                          // 定时发送
  BOT_TRANSFER = 'bot_transfer',                    // 机器人转人工后
}

/**
 * 调查问题定义
 */
export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  required: boolean;
  options?: string[];       // 单选/多选的选项
  minValue?: number;        // 评分最小值
  maxValue?: number;        // 评分最大值
  minLabel?: string;        // 最小值标签
  maxLabel?: string;        // 最大值标签
  category?: string;        // 分类 (用于分类评分)
  weight?: number;          // 权重 (用于综合评分计算)
}

/**
 * 调查模板实体
 * 支持自定义调查问题和触发条件
 */
@Entity('survey_templates')
export class SurveyTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 调查标题（显示给用户）
   */
  @Column({ default: '请对本次服务进行评价' })
  title: string;

  /**
   * 调查说明
   */
  @Column({ type: 'text', nullable: true })
  instruction: string;

  /**
   * 感谢语
   */
  @Column({ type: 'text', default: '感谢您的反馈！' })
  thankYouMessage: string;

  /**
   * 调查问题列表
   */
  @Column({ type: 'jsonb' })
  questions: SurveyQuestion[];

  /**
   * 触发条件
   */
  @Column({
    type: 'enum',
    enum: SurveyTrigger,
    default: SurveyTrigger.CONVERSATION_RESOLVED,
  })
  trigger: SurveyTrigger;

  /**
   * 延迟发送时间（秒）- 触发后延迟多久发送
   */
  @Column({ default: 0 })
  delaySeconds: number;

  /**
   * 调查有效期（小时）- 超过后不再接受提交
   */
  @Column({ default: 24 })
  expiresInHours: number;

  /**
   * 是否启用
   */
  @Column({ default: true })
  isEnabled: boolean;

  /**
   * 是否为默认模板
   */
  @Column({ default: false })
  isDefault: boolean;

  /**
   * 适用的客服组ID列表（空表示全部适用）
   */
  @Column({ type: 'jsonb', default: [] })
  applicableGroupIds: string[];

  /**
   * 发送次数
   */
  @Column({ default: 0 })
  sentCount: number;

  /**
   * 完成次数
   */
  @Column({ default: 0 })
  completedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;
}
