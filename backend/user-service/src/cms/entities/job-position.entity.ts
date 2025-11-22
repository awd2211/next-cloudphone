import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EmploymentType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  REMOTE = 'remote',
}

@Entity('job_positions')
@Index('idx_job_positions_active_sort', ['isActive', 'sortOrder'])
export class JobPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  department: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  salaryRange: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, nullable: true })
  requirements: string[];

  @Column({ type: 'text', array: true, nullable: true })
  responsibilities: string[];

  @Column({ type: 'varchar', length: 50, array: true, nullable: true })
  tags: string[];

  @Column({
    type: 'varchar',
    length: 50,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

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
