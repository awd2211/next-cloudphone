/**
 * 知识库文章实体
 *
 * 存储知识库文章内容，支持富文本、标签、版本控制
 */
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
import { KnowledgeCategory } from './knowledge-category.entity';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ArticleVisibility {
  PUBLIC = 'public', // 客服和访客都可见
  INTERNAL = 'internal', // 仅客服可见
  PRIVATE = 'private', // 仅管理员可见
}

@Entity('knowledge_articles')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'categoryId'])
@Index(['tenantId', 'visibility'])
@Index('idx_articles_fulltext', { synchronize: false }) // 全文搜索索引，手动创建
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'content_html', type: 'text', nullable: true })
  contentHtml: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string;

  @ManyToOne(() => KnowledgeCategory, (category) => category.articles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: KnowledgeCategory;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column({
    type: 'enum',
    enum: ArticleVisibility,
    default: ArticleVisibility.INTERNAL,
  })
  visibility: ArticleVisibility;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
  keywords: string[];

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ name: 'not_helpful_count', type: 'int', default: 0 })
  notHelpfulCount: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'jsonb', nullable: true })
  attachments: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  relatedArticleIds: string[];

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string;

  @Column({ name: 'author_name', length: 100, nullable: true })
  authorName: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
