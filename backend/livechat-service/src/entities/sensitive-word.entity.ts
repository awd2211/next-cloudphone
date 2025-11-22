import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SensitiveWordLevel {
  LOW = 'low', // 轻微
  MEDIUM = 'medium', // 中等
  HIGH = 'high', // 严重
  CRITICAL = 'critical', // 严重违规
}

export enum SensitiveWordCategory {
  PROFANITY = 'profanity', // 脏话
  DISCRIMINATION = 'discrimination', // 歧视
  VIOLENCE = 'violence', // 暴力
  SPAM = 'spam', // 垃圾信息
  COMPETITOR = 'competitor', // 竞品
  PRIVACY = 'privacy', // 隐私信息
  OTHER = 'other',
}

@Entity('sensitive_words')
@Index(['tenantId', 'category'])
@Index(['level'])
export class SensitiveWord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column()
  word: string;

  @Column({
    type: 'enum',
    enum: SensitiveWordCategory,
    default: SensitiveWordCategory.OTHER,
  })
  category: SensitiveWordCategory;

  @Column({
    type: 'enum',
    enum: SensitiveWordLevel,
    default: SensitiveWordLevel.MEDIUM,
  })
  level: SensitiveWordLevel;

  @Column({ name: 'replacement', nullable: true })
  replacement: string;

  @Column({ name: 'is_regex', default: false })
  isRegex: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'match_count', default: 0 })
  matchCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
