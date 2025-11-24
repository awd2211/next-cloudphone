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
 * 考试状态
 */
export enum ExamStatus {
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
 * 题目类型
 */
export enum QuestionType {
  /**
   * 单选题
   */
  SINGLE_CHOICE = 'single_choice',

  /**
   * 多选题
   */
  MULTIPLE_CHOICE = 'multiple_choice',

  /**
   * 判断题
   */
  TRUE_FALSE = 'true_false',

  /**
   * 填空题
   */
  FILL_BLANK = 'fill_blank',

  /**
   * 简答题
   */
  SHORT_ANSWER = 'short_answer',
}

/**
 * 考试实体
 */
@Entity('exams')
@Index(['tenantId', 'status'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 考试标题
   */
  @Column()
  title: string;

  /**
   * 考试描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 考试状态
   */
  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  status: ExamStatus;

  /**
   * 考试时长（分钟）
   */
  @Column({ default: 60 })
  duration: number;

  /**
   * 总分
   */
  @Column({ default: 100 })
  totalScore: number;

  /**
   * 及格分数
   */
  @Column({ default: 60 })
  passingScore: number;

  /**
   * 最大尝试次数（0表示不限）
   */
  @Column({ default: 3 })
  maxAttempts: number;

  /**
   * 题目
   */
  @Column({ type: 'jsonb', default: [] })
  questions: {
    id: string;
    type: QuestionType;
    content: string;
    options?: {
      id: string;
      content: string;
      isCorrect?: boolean;
    }[];
    correctAnswer?: string | string[]; // 用于填空和简答
    score: number;
    explanation?: string; // 答案解析
    order: number;
  }[];

  /**
   * 是否随机出题
   */
  @Column({ default: false })
  randomizeQuestions: boolean;

  /**
   * 随机出题数量（0表示全部）
   */
  @Column({ default: 0 })
  randomQuestionCount: number;

  /**
   * 是否随机选项顺序
   */
  @Column({ default: false })
  randomizeOptions: boolean;

  /**
   * 是否显示答案解析
   */
  @Column({ default: true })
  showExplanation: boolean;

  /**
   * 答案解析显示时机
   */
  @Column({ default: 'after_submit' })
  explanationTiming: 'immediately' | 'after_submit' | 'after_all_attempts';

  /**
   * 关联的课程ID
   */
  @Column({ nullable: true })
  courseId: string;

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

/**
 * 考试记录实体
 */
@Entity('exam_attempts')
@Index(['tenantId', 'agentId', 'examId'])
@Index(['tenantId', 'examId'])
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

  @Column()
  examId: string;

  /**
   * 开始时间
   */
  @Column({ type: 'timestamp' })
  startedAt: Date;

  /**
   * 提交时间
   */
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  /**
   * 答题记录
   */
  @Column({ type: 'jsonb', default: [] })
  answers: {
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
    score?: number;
    answeredAt: string;
  }[];

  /**
   * 得分
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  /**
   * 是否通过
   */
  @Column({ default: false })
  isPassed: boolean;

  /**
   * 用时（秒）
   */
  @Column({ nullable: true })
  duration: number;

  /**
   * 状态
   */
  @Column({ default: 'in_progress' })
  status: 'in_progress' | 'submitted' | 'graded' | 'expired';

  /**
   * 第几次尝试
   */
  @Column({ default: 1 })
  attemptNumber: number;

  /**
   * 出题顺序（如果随机出题）
   */
  @Column({ type: 'jsonb', nullable: true })
  questionOrder: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
