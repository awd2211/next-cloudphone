/**
 * 知识库使用记录实体
 *
 * 记录客服使用知识库文章的情况，用于统计和推荐
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UsageType {
  VIEW = 'view', // 查看
  COPY = 'copy', // 复制
  SEND = 'send', // 发送给客户
  HELPFUL = 'helpful', // 标记有用
  NOT_HELPFUL = 'not_helpful', // 标记无用
  SEARCH = 'search', // 搜索命中
  AI_RECOMMEND = 'ai_recommend', // AI 推荐
}

@Entity('knowledge_usage')
@Index(['tenantId', 'articleId'])
@Index(['tenantId', 'agentId'])
@Index(['tenantId', 'conversationId'])
@Index(['tenantId', 'createdAt'])
export class KnowledgeUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string;

  @Column({
    type: 'enum',
    enum: UsageType,
    default: UsageType.VIEW,
  })
  type: UsageType;

  @Column({ name: 'search_query', length: 500, nullable: true })
  searchQuery: string;

  @Column({ name: 'search_score', type: 'float', nullable: true })
  searchScore: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
