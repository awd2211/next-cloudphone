import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CaseStudyIndustry {
  GAME = 'game',
  TESTING = 'testing',
  ECOMMERCE = 'ecommerce',
  SOCIAL = 'social',
  OTHER = 'other',
}

export interface CaseStudyResult {
  metric: string;
  value: string;
  description?: string;
}

export interface CaseStudyTestimonial {
  name: string;
  role: string;
  content: string;
  avatar?: string;
}

@Entity('case_studies')
@Index('idx_case_studies_active_sort', ['isActive', 'sortOrder'])
export class CaseStudy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  companyName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  industry: CaseStudyIndustry;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  challenge: string;

  @Column({ type: 'text', nullable: true })
  solution: string;

  @Column({ type: 'jsonb', nullable: true })
  results: CaseStudyResult[];

  @Column({ type: 'jsonb', nullable: true })
  testimonial: CaseStudyTestimonial;

  @Column({ default: false })
  @Index()
  isFeatured: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
