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

@Entity('satisfaction_ratings')
@Index(['conversationId'])
@Index(['agentId', 'createdAt'])
@Index(['tenantId', 'rating'])
export class SatisfactionRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @Column({ type: 'smallint' })
  rating: number; // 1-5 星

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[]; // 预设标签：'快速响应', '专业', '耐心' 等

  @Column({ name: 'response_time', nullable: true })
  responseTime: number; // 首次响应时间（秒）

  @Column({ name: 'resolution_time', nullable: true })
  resolutionTime: number; // 解决时间（秒）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
