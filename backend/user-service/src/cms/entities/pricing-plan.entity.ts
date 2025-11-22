import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PricingFeature {
  name: string;
  included: boolean;
  limit?: string;
}

@Entity('pricing_plans')
@Index('idx_pricing_plans_active_sort', ['isActive', 'sortOrder'])
export class PricingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice: number;

  @Column({ default: false })
  isCustomPrice: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tag: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  features: PricingFeature[];

  @Column({ type: 'text', array: true, nullable: true })
  highlightFeatures: string[];

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
