import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理提供商评分实体
 *
 * 存储代理提供商的多维度评分数据
 */
@Entity('proxy_provider_scores')
@Index(['provider'], { unique: true })
@Index(['totalScore'])
export class ProxyProviderScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider', type: 'varchar', length: 50, unique: true })
  @Index()
  provider: string;

  // 总分和排名
  @Column({ name: 'total_score', type: 'decimal', precision: 5, scale: 2 })
  @Index()
  totalScore: number; // 0-100

  @Column({ name: 'ranking', type: 'integer', nullable: true })
  ranking: number;

  @Column({ name: 'ranking_change', type: 'integer', nullable: true })
  rankingChange: number; // 相比上次的排名变化

  // 各维度评分（0-100）
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

  // 权重配置
  @Column({ name: 'success_rate_weight', type: 'decimal', precision: 3, scale: 2, default: 0.35 })
  successRateWeight: number;

  @Column({ name: 'latency_weight', type: 'decimal', precision: 3, scale: 2, default: 0.25 })
  latencyWeight: number;

  @Column({ name: 'cost_weight', type: 'decimal', precision: 3, scale: 2, default: 0.20 })
  costWeight: number;

  @Column({ name: 'stability_weight', type: 'decimal', precision: 3, scale: 2, default: 0.15 })
  stabilityWeight: number;

  @Column({ name: 'availability_weight', type: 'decimal', precision: 3, scale: 2, default: 0.05 })
  availabilityWeight: number;

  // 资源统计
  @Column({ name: 'total_proxies', type: 'integer', default: 0 })
  totalProxies: number;

  @Column({ name: 'active_proxies', type: 'integer', default: 0 })
  activeProxies: number;

  @Column({ name: 'healthy_proxies', type: 'integer', default: 0 })
  healthyProxies: number;

  @Column({ name: 'failed_proxies', type: 'integer', default: 0 })
  failedProxies: number;

  @Column({ name: 'proxy_availability_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  proxyAvailabilityRate: number; // 百分比

  // 性能统计
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer' })
  avgLatency: number;

  @Column({ name: 'p50_latency', type: 'integer' })
  p50Latency: number;

  @Column({ name: 'p95_latency', type: 'integer' })
  p95Latency: number;

  @Column({ name: 'p99_latency', type: 'integer' })
  p99Latency: number;

  @Column({ name: 'latency_std_dev', type: 'decimal', precision: 10, scale: 2 })
  latencyStdDev: number; // 延迟标准差（稳定性指标）

  // 成本信息
  @Column({ name: 'avg_cost_per_gb', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerGb: number;

  // 简化字段（兼容Service使用 - GB大写）
  @Column({ name: 'avg_cost_per_GB', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerGB: number;

  @Column({ name: 'avg_cost_per_request', type: 'decimal', precision: 10, scale: 6 })
  avgCostPerRequest: number;

  @Column({ name: 'avg_cost_per_hour', type: 'decimal', precision: 10, scale: 4 })
  avgCostPerHour: number;

  @Column({ name: 'cost_competitiveness', type: 'decimal', precision: 5, scale: 2 })
  costCompetitiveness: number; // 相对市场平均价格的竞争力

  // 使用统计
  @Column({ name: 'total_requests', type: 'bigint', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'bigint', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'bigint', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  @Column({ name: 'total_usage_hours', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalUsageHours: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  // 可靠性统计
  @Column({ name: 'uptime_percentage_24h', type: 'decimal', precision: 5, scale: 2 })
  uptimePercentage24h: number;

  @Column({ name: 'uptime_percentage_7d', type: 'decimal', precision: 5, scale: 2 })
  uptimePercentage7d: number;

  @Column({ name: 'uptime_percentage_30d', type: 'decimal', precision: 5, scale: 2 })
  uptimePercentage30d: number;

  @Column({ name: 'mtbf', type: 'decimal', precision: 10, scale: 2, nullable: true })
  mtbf: number; // Mean Time Between Failures (小时)

  @Column({ name: 'mttr', type: 'decimal', precision: 10, scale: 2, nullable: true })
  mttr: number; // Mean Time To Recover (分钟)

  // 质量分布
  @Column({ name: 'quality_distribution', type: 'jsonb', nullable: true })
  qualityDistribution: {
    s_grade: number; // >= 90
    a_grade: number; // 80-89
    b_grade: number; // 70-79
    c_grade: number; // 60-69
    d_grade: number; // < 60
  };

  // 地理覆盖
  @Column({ name: 'countries_covered', type: 'simple-array', nullable: true })
  countriesCovered: string[];

  @Column({ name: 'cities_covered', type: 'simple-array', nullable: true })
  citiesCovered: string[];

  @Column({ name: 'total_locations', type: 'integer', default: 0 })
  totalLocations: number;

  // 特性支持
  @Column({ name: 'supported_types', type: 'simple-array' })
  supportedTypes: string[]; // http, https, socks5

  @Column({ name: 'supports_residential', type: 'boolean', default: false })
  supportsResidential: boolean;

  @Column({ name: 'supports_datacenter', type: 'boolean', default: false })
  supportsDatacenter: boolean;

  @Column({ name: 'supports_mobile', type: 'boolean', default: false })
  supportsMobile: boolean;

  @Column({ name: 'supports_rotating', type: 'boolean', default: false })
  supportsRotating: boolean;

  @Column({ name: 'supports_sticky', type: 'boolean', default: false })
  supportsSticky: boolean;

  // 市场信息
  @Column({ name: 'market_share', type: 'decimal', precision: 5, scale: 2, nullable: true })
  marketShare: number; // 百分比

  @Column({ name: 'popularity_rank', type: 'integer', nullable: true })
  popularityRank: number;

  @Column({ name: 'user_rating', type: 'decimal', precision: 3, scale: 1, nullable: true })
  userRating: number; // 0-5星

  // 趋势分析
  @Column({ name: 'trend', type: 'varchar', length: 20 })
  trend: string; // improving, stable, declining

  @Column({ name: 'score_change_24h', type: 'decimal', precision: 5, scale: 2 })
  scoreChange24h: number;

  @Column({ name: 'score_change_7d', type: 'decimal', precision: 5, scale: 2 })
  scoreChange7d: number;

  @Column({ name: 'score_change_30d', type: 'decimal', precision: 5, scale: 2 })
  scoreChange30d: number;

  // 推荐信息
  @Column({ name: 'is_recommended', type: 'boolean', default: true })
  isRecommended: boolean;

  @Column({ name: 'recommendation_reasons', type: 'simple-array', nullable: true })
  recommendationReasons: string[];

  @Column({ name: 'warnings', type: 'simple-array', nullable: true })
  warnings: string[];

  // 计算信息
  @Column({ name: 'last_calculated_at', type: 'timestamp' })
  lastCalculatedAt: Date;

  @Column({ name: 'calculation_duration', type: 'integer', nullable: true })
  calculationDuration: number; // 毫秒

  @Column({ name: 'sample_size', type: 'integer' })
  sampleSize: number; // 计算时使用的样本数量

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
