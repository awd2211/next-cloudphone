import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * 课程类型
 */
export enum CourseType {
  /**
   * 入职培训
   */
  ONBOARDING = 'onboarding',

  /**
   * 技能提升
   */
  SKILL_ENHANCEMENT = 'skill_enhancement',

  /**
   * 产品知识
   */
  PRODUCT_KNOWLEDGE = 'product_knowledge',

  /**
   * 服务流程
   */
  SERVICE_PROCESS = 'service_process',

  /**
   * 沟通技巧
   */
  COMMUNICATION = 'communication',

  /**
   * 合规培训
   */
  COMPLIANCE = 'compliance',
}

/**
 * 课程状态
 */
export enum CourseStatus {
  /**
   * 草稿
   */
  DRAFT = 'draft',

  /**
   * 已发布
   */
  PUBLISHED = 'published',

  /**
   * 已归档
   */
  ARCHIVED = 'archived',
}

/**
 * 培训课程实体
 */
@Entity('training_courses')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'type'])
export class TrainingCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 课程标题
   */
  @Column()
  title: string;

  /**
   * 课程描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 课程类型
   */
  @Column({
    type: 'enum',
    enum: CourseType,
    default: CourseType.SKILL_ENHANCEMENT,
  })
  type: CourseType;

  /**
   * 课程状态
   */
  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  /**
   * 封面图片
   */
  @Column({ nullable: true })
  coverImage: string;

  /**
   * 预计学习时长（分钟）
   */
  @Column({ default: 60 })
  estimatedDuration: number;

  /**
   * 课程内容（章节结构）
   */
  @Column({ type: 'jsonb', default: [] })
  chapters: {
    id: string;
    title: string;
    description?: string;
    order: number;
    lessons: {
      id: string;
      title: string;
      type: 'video' | 'document' | 'quiz' | 'practice';
      content: string; // URL or content
      duration?: number; // minutes
      order: number;
    }[];
  }[];

  /**
   * 是否必修
   */
  @Column({ default: false })
  isMandatory: boolean;

  /**
   * 适用客服组（空表示全部）
   */
  @Column({ type: 'jsonb', default: [] })
  targetGroupIds: string[];

  /**
   * 通过条件
   */
  @Column({ type: 'jsonb', nullable: true })
  passRequirements: {
    minLessonsCompleted?: number; // 最少完成课时百分比
    requireExamPass?: boolean; // 是否需要通过考试
    minExamScore?: number; // 最低考试分数
  };

  /**
   * 关联的考试ID
   */
  @Column({ nullable: true })
  examId: string;

  /**
   * 证书模板（通过后颁发）
   */
  @Column({ type: 'jsonb', nullable: true })
  certificate: {
    enabled: boolean;
    templateName?: string;
    validityDays?: number; // 证书有效期
  };

  /**
   * 标签
   */
  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  /**
   * 创建者
   */
  @Column({ nullable: true })
  createdBy: string;

  /**
   * 发布时间
   */
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
