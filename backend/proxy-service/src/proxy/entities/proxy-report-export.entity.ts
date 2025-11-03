import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理报告导出实体
 *
 * 管理用户生成的报告导出任务和文件
 */
@Entity('proxy_report_exports')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class ProxyReportExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'report_name', type: 'varchar', length: 200 })
  reportName: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType: string; // usage, cost, performance, provider_comparison, custom

  @Column({ name: 'export_format', type: 'varchar', length: 20 })
  exportFormat: string; // pdf, excel, csv, json

  // 报告周期和范围
  @Column({ name: 'report_period', type: 'varchar', length: 50, nullable: true })
  reportPeriod: string; // daily, weekly, monthly, quarterly, yearly, custom

  @Column({ name: 'data_scope', type: 'jsonb', nullable: true })
  dataScope: {
    deviceIds?: string[];
    providers?: string[];
    countries?: string[];
  };

  // 报告参数
  @Column({ name: 'date_range_start', type: 'timestamp' })
  dateRangeStart: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'date_range_end', type: 'timestamp' })
  dateRangeEnd: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'filters', type: 'jsonb', nullable: true })
  filters: {
    deviceIds?: string[];
    providerIds?: string[];
    countries?: string[];
    minCost?: number;
    maxCost?: number;
  };

  @Column({ name: 'metrics', type: 'simple-array', nullable: true })
  metrics: string[]; // 包含的指标

  @Column({ name: 'group_by', type: 'varchar', length: 50, nullable: true })
  groupBy: string; // device, provider, country, date

  // 生成状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string; // pending, processing, completed, failed, expired

  @Column({ name: 'progress', type: 'integer', default: 0 })
  progress: number; // 0-100

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // 文件信息
  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'download_url', type: 'varchar', length: 500, nullable: true })
  downloadUrl: string;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize: number; // 字节

  @Column({ name: 'file_hash', type: 'varchar', length: 64, nullable: true })
  fileHash: string; // SHA-256

  // 过期设置
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'auto_delete', type: 'boolean', default: true })
  autoDelete: boolean;

  // 下载统计
  @Column({ name: 'download_count', type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'last_downloaded_at', type: 'timestamp', nullable: true })
  lastDownloadedAt: Date;

  // 生成信息
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'generation_started_at', type: 'timestamp', nullable: true })
  generationStartedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'generation_completed_at', type: 'timestamp', nullable: true })
  generationCompletedAt: Date;

  @Column({ name: 'generation_duration', type: 'integer', nullable: true })
  generationDuration: number; // 秒

  // 报告统计
  @Column({ name: 'total_records', type: 'integer', nullable: true })
  totalRecords: number;

  @Column({ name: 'data_points', type: 'integer', nullable: true })
  dataPoints: number;

  @Column({ name: 'data_summary', type: 'jsonb', nullable: true })
  dataSummary: {
    totalCost?: number;
    totalRequests?: number;
    avgSuccessRate?: number;
    topProviders?: Array<{ provider: string; usage: number }>;
  };

  // 定时任务配置
  @Column({ name: 'is_scheduled', type: 'boolean', default: false })
  isScheduled: boolean;

  @Column({ name: 'cron_expression', type: 'varchar', length: 100, nullable: true })
  cronExpression: string;

  @Column({ name: 'next_execution_time', type: 'timestamp', nullable: true })
  nextExecutionTime: Date;

  @Column({ name: 'last_execution_time', type: 'timestamp', nullable: true })
  lastExecutionTime: Date;

  @Column({ name: 'execution_count', type: 'integer', default: 0 })
  executionCount: number;

  // 自动发送配置
  @Column({ name: 'auto_send', type: 'boolean', default: false })
  autoSend: boolean;

  @Column({ name: 'recipients', type: 'simple-array', nullable: true })
  recipients: string[]; // Email addresses

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
