import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理质量历史记录实体
 *
 * 存储代理质量评分的历史变化，用于趋势分析
 */
@Entity('proxy_quality_history')
@Index(['proxyId', 'recordedAt'])
@Index(['provider', 'recordedAt'])
@Index(['recordedAt'])
export class ProxyQualityHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proxy_id', type: 'varchar', length: 50 })
  @Index()
  proxyId: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  @Index()
  provider: string;

  // 评分快照
  @Column({ name: 'total_score', type: 'decimal', precision: 5, scale: 2 })
  totalScore: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2 })
  qualityScore: number;

  @Column({ name: 'rating', type: 'varchar', length: 1 })
  rating: string;

  @Column({ name: 'success_rate_score', type: 'decimal', precision: 5, scale: 2 })
  successRateScore: number;

  @Column({ name: 'availability_score', type: 'decimal', precision: 5, scale: 2 })
  availabilityScore: number;

  @Column({ name: 'latency_score', type: 'decimal', precision: 5, scale: 2 })
  latencyScore: number;

  @Column({ name: 'consistency_score', type: 'decimal', precision: 5, scale: 2 })
  consistencyScore: number;

  @Column({ name: 'anonymity_score', type: 'decimal', precision: 5, scale: 2 })
  anonymityScore: number;

  // 统计快照
  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2 })
  successRate: number;

  @Column({ name: 'avg_latency', type: 'integer' })
  avgLatency: number;

  @Column({ name: 'availability_rate', type: 'decimal', precision: 5, scale: 2 })
  availabilityRate: number;

  @Column({ name: 'total_requests', type: 'integer' })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer' })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer' })
  failedRequests: number;

  // 健康状态
  @Column({ name: 'health_status', type: 'varchar', length: 20 })
  healthStatus: string;

  // 记录时间（用于时序分析）
  @Column({ name: 'recorded_at', type: 'timestamp' })
  @Index()
  recordedAt: Date;

  // 记录类型
  @Column({ name: 'record_type', type: 'varchar', length: 20, default: 'scheduled' })
  recordType: string; // scheduled, manual, alert_triggered

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
