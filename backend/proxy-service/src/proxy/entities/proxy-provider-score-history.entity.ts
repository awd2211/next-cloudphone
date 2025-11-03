import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理提供商评分历史实体
 *
 * 记录提供商评分的历史变化，用于趋势分析
 */
@Entity('proxy_provider_score_history')
@Index(['provider', 'recordedAt'])
@Index(['recordedAt'])
export class ProxyProviderScoreHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  @Index()
  provider: string;

  // 评分快照
  @Column({ name: 'total_score', type: 'decimal', precision: 5, scale: 2 })
  totalScore: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'score', type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ name: 'ranking', type: 'integer', nullable: true })
  ranking: number;

  @Column({ name: 'success_rate_score', type: 'decimal', precision: 5, scale: 2 })
  successRateScore: number;

  @Column({ name: 'latency_score', type: 'decimal', precision: 5, scale: 2 })
  latencyScore: number;

  @Column({ name: 'cost_score', type: 'decimal', precision: 5, scale: 2 })
  costScore: number;

  @Column({ name: 'stability_score', type: 'decimal', precision: 5, scale: 2 })
  stabilityScore: number;

  @Column({ name: 'availability_score', type: 'decimal', precision: 5, scale: 2 })
  availabilityScore: number;

  // 资源快照
  @Column({ name: 'total_proxies', type: 'integer' })
  totalProxies: number;

  @Column({ name: 'active_proxies', type: 'integer' })
  activeProxies: number;

  @Column({ name: 'healthy_proxies', type: 'integer' })
  healthyProxies: number;

  @Column({ name: 'proxy_availability_rate', type: 'decimal', precision: 5, scale: 2 })
  proxyAvailabilityRate: number;

  // 性能快照
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer' })
  avgLatency: number;

  @Column({ name: 'latency_std_dev', type: 'decimal', precision: 10, scale: 2 })
  latencyStdDev: number;

  // 成本快照
  @Column({ name: 'avg_cost_per_gb', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerGb: number;

  // 简化字段（兼容Service使用 - GB大写）
  @Column({ name: 'avg_cost_per_GB', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerGB: number;

  @Column({ name: 'avg_cost_per_request', type: 'decimal', precision: 10, scale: 6 })
  avgCostPerRequest: number;

  @Column({ name: 'avg_cost_per_hour', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerHour: number;

  // 使用统计快照
  @Column({ name: 'total_requests', type: 'bigint' })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'bigint' })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'bigint' })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint' })
  totalDataTransferred: number;

  @Column({ name: 'total_usage_hours', type: 'decimal', precision: 12, scale: 2 })
  totalUsageHours: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2 })
  totalCost: number;

  // 可靠性快照
  @Column({ name: 'uptime_percentage', type: 'decimal', precision: 5, scale: 2 })
  uptimePercentage: number;

  // 质量分布快照
  @Column({ name: 'quality_distribution', type: 'jsonb', nullable: true })
  qualityDistribution: {
    s_grade: number;
    a_grade: number;
    b_grade: number;
    c_grade: number;
    d_grade: number;
  };

  // 地理覆盖快照
  @Column({ name: 'total_locations', type: 'integer' })
  totalLocations: number;

  @Column({ name: 'countries_count', type: 'integer' })
  countriesCount: number;

  // 市场信息快照
  @Column({ name: 'market_share', type: 'decimal', precision: 5, scale: 2, nullable: true })
  marketShare: number;

  @Column({ name: 'popularity_rank', type: 'integer', nullable: true })
  popularityRank: number;

  // 评分变化
  @Column({ name: 'score_change_from_previous', type: 'decimal', precision: 5, scale: 2, nullable: true })
  scoreChangeFromPrevious: number;

  @Column({ name: 'ranking_change_from_previous', type: 'integer', nullable: true })
  rankingChangeFromPrevious: number;

  // 趋势标记
  @Column({ name: 'trend', type: 'varchar', length: 20 })
  trend: string;

  // 异常检测
  @Column({ name: 'is_anomaly', type: 'boolean', default: false })
  isAnomaly: boolean;

  @Column({ name: 'anomaly_type', type: 'varchar', length: 50, nullable: true })
  anomalyType: string; // sudden_drop, sudden_spike, prolonged_decline

  @Column({ name: 'anomaly_details', type: 'text', nullable: true })
  anomalyDetails: string;

  // 记录信息
  @Column({ name: 'recorded_at', type: 'timestamp' })
  @Index()
  recordedAt: Date;

  @Column({ name: 'record_type', type: 'varchar', length: 20, default: 'scheduled' })
  recordType: string; // scheduled, manual, alert_triggered, on_demand

  @Column({ name: 'sample_size', type: 'integer' })
  sampleSize: number;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
