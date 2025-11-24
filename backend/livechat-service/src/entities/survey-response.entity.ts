import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SurveyTemplate } from './survey-template.entity';
import { Conversation } from './conversation.entity';

/**
 * 调查响应状态
 */
export enum SurveyResponseStatus {
  PENDING = 'pending',       // 待填写
  COMPLETED = 'completed',   // 已完成
  EXPIRED = 'expired',       // 已过期
  SKIPPED = 'skipped',       // 用户跳过
}

/**
 * 问题答案
 */
export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  type: string;
  value: any;          // 评分为数字，选择为字符串/数组，文本为字符串
  category?: string;   // 分类（用于分类评分）
}

/**
 * 调查响应实体
 * 记录用户对调查的回答
 */
@Entity('survey_responses')
@Index(['tenantId', 'createdAt'])
@Index(['conversationId'])
@Index(['agentId', 'createdAt'])
@Index(['templateId', 'status'])
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  templateId: string;

  @ManyToOne(() => SurveyTemplate)
  @JoinColumn({ name: 'templateId' })
  template: SurveyTemplate;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  userId: string;

  @Column()
  agentId: string;

  /**
   * 响应状态
   */
  @Column({
    type: 'enum',
    enum: SurveyResponseStatus,
    default: SurveyResponseStatus.PENDING,
  })
  status: SurveyResponseStatus;

  /**
   * 问题答案列表
   */
  @Column({ type: 'jsonb', nullable: true })
  answers: QuestionAnswer[];

  /**
   * 整体评分 (1-5)
   */
  @Column({ type: 'float', nullable: true })
  overallRating: number;

  /**
   * NPS 评分 (0-10)
   */
  @Column({ type: 'smallint', nullable: true })
  npsScore: number;

  /**
   * 分类评分
   */
  @Column({ type: 'jsonb', nullable: true })
  categoryRatings: {
    responseSpeed?: number;      // 响应速度
    professionalism?: number;    // 专业程度
    problemSolving?: number;     // 问题解决
    attitude?: number;           // 服务态度
    overall?: number;            // 综合评价
  };

  /**
   * 选择的标签
   */
  @Column({ type: 'jsonb', nullable: true })
  selectedTags: string[];

  /**
   * 用户评论
   */
  @Column({ type: 'text', nullable: true })
  comment: string;

  /**
   * 调查发送时间
   */
  @Column({ type: 'timestamp' })
  sentAt: Date;

  /**
   * 调查完成时间
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * 调查过期时间
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /**
   * 填写耗时（秒）
   */
  @Column({ nullable: true })
  completionTimeSeconds: number;

  /**
   * 客户端信息
   */
  @Column({ type: 'jsonb', nullable: true })
  clientInfo: {
    userAgent?: string;
    ip?: string;
    device?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
