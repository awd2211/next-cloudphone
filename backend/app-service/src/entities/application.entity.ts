import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AppStatus {
  UPLOADING = 'uploading',
  PENDING_REVIEW = 'pending_review', // 待审核
  APPROVED = 'approved', // 已批准（等同于 available）
  REJECTED = 'rejected', // 已拒绝
  AVAILABLE = 'available', // 可用（向后兼容）
  UNAVAILABLE = 'unavailable',
  DELETED = 'deleted',
}

export enum AppCategory {
  SOCIAL = 'social',
  GAME = 'game',
  TOOL = 'tool',
  ENTERTAINMENT = 'entertainment',
  PRODUCTIVITY = 'productivity',
  BUSINESS = 'business',
  EDUCATION = 'education',
  OTHER = 'other',
}

@Entity('applications')
@Index(['packageName', 'versionCode'], { unique: true })
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  @Index()
  packageName: string;

  @Column()
  versionName: string;

  @Column({ type: 'bigint' })
  @Index()
  versionCode: number;

  // 标记是否为最新版本
  @Column({ type: 'boolean', default: false })
  @Index()
  isLatest: boolean;

  @Column({
    type: 'enum',
    enum: AppStatus,
    default: AppStatus.UPLOADING,
  })
  @Index()
  status: AppStatus;

  @Column({
    type: 'enum',
    enum: AppCategory,
    default: AppCategory.OTHER,
  })
  category: AppCategory;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  minSdkVersion: number;

  @Column({ nullable: true })
  targetSdkVersion: number;

  @Column({ nullable: true })
  @Index()
  tenantId: string;

  @Column({ nullable: true })
  @Index()
  uploaderId: string;

  // MinIO 存储信息
  @Column()
  bucketName: string;

  @Column()
  objectKey: string;

  @Column({ nullable: true })
  downloadUrl: string;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  // 统计信息
  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'int', default: 0 })
  installCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
