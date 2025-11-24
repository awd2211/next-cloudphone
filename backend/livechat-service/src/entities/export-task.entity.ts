import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 导出任务状态
 */
export enum ExportTaskStatus {
  /**
   * 等待中
   */
  PENDING = 'pending',

  /**
   * 处理中
   */
  PROCESSING = 'processing',

  /**
   * 已完成
   */
  COMPLETED = 'completed',

  /**
   * 失败
   */
  FAILED = 'failed',

  /**
   * 已过期（文件已删除）
   */
  EXPIRED = 'expired',
}

/**
 * 报表类型
 */
export enum ReportType {
  /**
   * 会话报表
   */
  CONVERSATIONS = 'conversations',

  /**
   * 客服绩效报表
   */
  AGENT_PERFORMANCE = 'agent_performance',

  /**
   * 满意度报表
   */
  SATISFACTION = 'satisfaction',

  /**
   * 质检报表
   */
  QUALITY_REVIEW = 'quality_review',

  /**
   * 排队报表
   */
  QUEUE_STATS = 'queue_stats',

  /**
   * 培训报表
   */
  TRAINING = 'training',

  /**
   * 排班报表
   */
  SCHEDULING = 'scheduling',

  /**
   * 访客分析报表
   */
  VISITOR_ANALYTICS = 'visitor_analytics',

  /**
   * SLA 报表
   */
  SLA = 'sla',

  /**
   * 知识库使用报表
   */
  KNOWLEDGE_USAGE = 'knowledge_usage',

  /**
   * 机器人会话报表
   */
  BOT_CONVERSATIONS = 'bot_conversations',

  /**
   * 自定义报表
   */
  CUSTOM = 'custom',
}

/**
 * 导出格式
 */
export enum ExportFormat {
  /**
   * Excel 格式
   */
  XLSX = 'xlsx',

  /**
   * CSV 格式
   */
  CSV = 'csv',

  /**
   * PDF 格式
   */
  PDF = 'pdf',

  /**
   * JSON 格式
   */
  JSON = 'json',
}

/**
 * 导出任务实体
 */
@Entity('export_tasks')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdBy'])
@Index(['tenantId', 'reportType'])
export class ExportTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 任务名称
   */
  @Column()
  name: string;

  /**
   * 报表类型
   */
  @Column({
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType;

  /**
   * 导出格式
   */
  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.XLSX,
  })
  format: ExportFormat;

  /**
   * 任务状态
   */
  @Column({
    type: 'enum',
    enum: ExportTaskStatus,
    default: ExportTaskStatus.PENDING,
  })
  status: ExportTaskStatus;

  /**
   * 查询参数
   */
  @Column({ type: 'jsonb' })
  queryParams: {
    startDate?: string;
    endDate?: string;
    agentIds?: string[];
    groupIds?: string[];
    status?: string[];
    tags?: string[];
    [key: string]: any;
  };

  /**
   * 导出字段（空表示全部）
   */
  @Column({ type: 'jsonb', default: [] })
  fields: string[];

  /**
   * 进度（0-100）
   */
  @Column({ default: 0 })
  progress: number;

  /**
   * 总记录数
   */
  @Column({ nullable: true })
  totalRecords: number;

  /**
   * 已处理记录数
   */
  @Column({ default: 0 })
  processedRecords: number;

  /**
   * 文件路径（MinIO）
   */
  @Column({ nullable: true })
  filePath: string;

  /**
   * 文件大小（字节）
   */
  @Column({ nullable: true })
  fileSize: number;

  /**
   * 下载URL（临时）
   */
  @Column({ nullable: true })
  downloadUrl: string;

  /**
   * URL过期时间
   */
  @Column({ type: 'timestamp', nullable: true })
  urlExpiresAt: Date;

  /**
   * 文件过期时间（自动删除）
   */
  @Column({ type: 'timestamp', nullable: true })
  fileExpiresAt: Date;

  /**
   * 错误信息
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /**
   * 开始处理时间
   */
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  /**
   * 完成时间
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * 处理耗时（秒）
   */
  @Column({ nullable: true })
  duration: number;

  /**
   * 创建者
   */
  @Column()
  createdBy: string;

  /**
   * 是否定时任务
   */
  @Column({ default: false })
  isScheduled: boolean;

  /**
   * 定时规则（Cron 表达式）
   */
  @Column({ nullable: true })
  scheduleRule: string;

  /**
   * 通知设置
   */
  @Column({ type: 'jsonb', nullable: true })
  notificationSettings: {
    sendEmail?: boolean;
    emailRecipients?: string[];
    sendWebSocket?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
