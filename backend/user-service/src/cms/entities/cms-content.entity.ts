import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cms_contents')
@Index('idx_cms_contents_page_active', ['page', 'isActive', 'sortOrder'])
export class CmsContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  page: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  section: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string;

  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
