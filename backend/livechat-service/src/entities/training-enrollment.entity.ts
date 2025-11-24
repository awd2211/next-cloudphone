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
import { Agent } from './agent.entity';
import { TrainingCourse } from './training-course.entity';

/**
 * 学习状态
 */
export enum EnrollmentStatus {
  /**
   * 已报名
   */
  ENROLLED = 'enrolled',

  /**
   * 学习中
   */
  IN_PROGRESS = 'in_progress',

  /**
   * 已完成
   */
  COMPLETED = 'completed',

  /**
   * 已过期
   */
  EXPIRED = 'expired',

  /**
   * 已放弃
   */
  DROPPED = 'dropped',
}

/**
 * 培训报名/学习进度实体
 */
@Entity('training_enrollments')
@Index(['tenantId', 'agentId', 'courseId'], { unique: true })
@Index(['tenantId', 'agentId', 'status'])
@Index(['tenantId', 'courseId'])
export class TrainingEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column()
  courseId: string;

  @ManyToOne(() => TrainingCourse)
  @JoinColumn({ name: 'courseId' })
  course: TrainingCourse;

  /**
   * 学习状态
   */
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
  })
  status: EnrollmentStatus;

  /**
   * 学习进度（百分比）
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;

  /**
   * 已完成的课时
   */
  @Column({ type: 'jsonb', default: [] })
  completedLessons: {
    chapterId: string;
    lessonId: string;
    completedAt: string;
    duration?: number; // 实际学习时长
  }[];

  /**
   * 总学习时长（分钟）
   */
  @Column({ default: 0 })
  totalStudyTime: number;

  /**
   * 最后学习时间
   */
  @Column({ type: 'timestamp', nullable: true })
  lastStudyAt: Date;

  /**
   * 当前学习位置
   */
  @Column({ type: 'jsonb', nullable: true })
  currentPosition: {
    chapterId: string;
    lessonId: string;
    progress?: number; // 视频播放进度等
  };

  /**
   * 考试成绩
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  examScore: number;

  /**
   * 考试尝试次数
   */
  @Column({ default: 0 })
  examAttempts: number;

  /**
   * 是否通过
   */
  @Column({ default: false })
  isPassed: boolean;

  /**
   * 通过时间
   */
  @Column({ type: 'timestamp', nullable: true })
  passedAt: Date;

  /**
   * 证书ID
   */
  @Column({ nullable: true })
  certificateId: string;

  /**
   * 证书颁发时间
   */
  @Column({ type: 'timestamp', nullable: true })
  certificateIssuedAt: Date;

  /**
   * 证书过期时间
   */
  @Column({ type: 'timestamp', nullable: true })
  certificateExpiresAt: Date;

  /**
   * 截止日期
   */
  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  /**
   * 报名来源
   */
  @Column({ default: 'self' })
  enrollmentSource: 'self' | 'assigned' | 'mandatory';

  /**
   * 指派人
   */
  @Column({ nullable: true })
  assignedBy: string;

  /**
   * 学习笔记
   */
  @Column({ type: 'jsonb', default: [] })
  notes: {
    lessonId: string;
    content: string;
    createdAt: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
