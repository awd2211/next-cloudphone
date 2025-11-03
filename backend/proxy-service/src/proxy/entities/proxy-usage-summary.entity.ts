import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理使用汇总实体
 *
 * 预计算的周期性使用汇总数据（每小时、每日、每周、每月）
 */
@Entity('proxy_usage_summaries')
@Index(['userId', 'periodType', 'periodStart'])
@Index(['deviceId', 'periodType', 'periodStart'])
@Index(['provider', 'periodType', 'periodStart'])
@Index(['periodStart'])
export class ProxyUsageSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
  @Index()
  provider: string;

  // 汇总周期
  @Column({ name: 'period_type', type: 'varchar', length: 20 })
  @Index()
  periodType: string; // hourly, daily, weekly, monthly

  @Column({ name: 'period_start', type: 'timestamp' })
  @Index()
  periodStart: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'date', type: 'timestamp' })
  date: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  // 使用统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  @Column({ name: 'total_usage_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalUsageHours: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'total_usage', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalUsage: number;

  // 性能指标
  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'p95_latency', type: 'integer', default: 0 })
  p95Latency: number;

  // 成本统计
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // 资源使用
  @Column({ name: 'unique_proxies_used', type: 'integer', default: 0 })
  uniqueProxiesUsed: number;

  @Column({ name: 'active_sessions', type: 'integer', default: 0 })
  activeSessions: number;

  // Provider分布
  @Column({ name: 'provider_costs', type: 'jsonb', nullable: true })
  providerCosts: Record<string, number>;

  // 故障切换统计
  @Column({ name: 'total_failovers', type: 'integer', default: 0 })
  totalFailovers: number;

  // 质量评分
  @Column({ name: 'avg_quality_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgQualityScore: number;

  // 汇总时间
  @Column({ name: 'summarized_at', type: 'timestamp' })
  summarizedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
