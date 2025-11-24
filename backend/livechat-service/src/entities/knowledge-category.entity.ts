/**
 * 知识库分类实体
 *
 * 用于组织和管理知识库文章的层级分类结构
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { KnowledgeArticle } from './knowledge-article.entity';

@Entity('knowledge_categories')
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'parentId'])
export class KnowledgeCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => KnowledgeCategory, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: KnowledgeCategory;

  @OneToMany(() => KnowledgeCategory, (category) => category.parent)
  children: KnowledgeCategory[];

  @OneToMany(() => KnowledgeArticle, (article) => article.category)
  articles: KnowledgeArticle[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'article_count', type: 'int', default: 0 })
  articleCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
