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

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('quality_reviews')
@Index(['conversationId'])
@Index(['agentId', 'status'])
@Index(['reviewerId', 'status'])
export class QualityReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.qualityReviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'agent_id' })
  agentId: string;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'reviewer_name', nullable: true })
  reviewerName: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ name: 'overall_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  overallScore: number;

  @Column({ type: 'jsonb', nullable: true })
  scores: QualityScores;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'jsonb', nullable: true })
  highlights: ReviewHighlight[];

  @Column({ type: 'jsonb', nullable: true })
  issues: ReviewIssue[];

  @Column({ name: 'sensitive_word_count', default: 0 })
  sensitiveWordCount: number;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface QualityScores {
  professionalism: number; // 专业度 0-100
  responseSpeed: number; // 响应速度 0-100
  problemSolving: number; // 问题解决 0-100
  communication: number; // 沟通能力 0-100
  attitude: number; // 服务态度 0-100
}

export interface ReviewHighlight {
  messageId: string;
  type: 'positive' | 'negative';
  comment: string;
}

export interface ReviewIssue {
  type: 'sensitive_word' | 'slow_response' | 'inappropriate' | 'unresolved' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  messageId?: string;
}
