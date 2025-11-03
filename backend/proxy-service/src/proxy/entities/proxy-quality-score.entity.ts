import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理质量评分实体
 *
 * 存储每个代理的多维度质量评分
 */
@Entity('proxy_quality_scores')
@Index(['proxyId'], { unique: true })
@Index(['provider'])
@Index(['totalScore'])
@Index(['rating'])
export class ProxyQualityScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proxy_id', type: 'varchar', length: 50, unique: true })
  @Index()
  proxyId: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  @Index()
  provider: string;

  @Column({ name: 'proxy_type', type: 'varchar', length: 50 })
  proxyType: string; // http, https, socks5

  @Column({ name: 'country', type: 'varchar', length: 10 })
  country: string;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city: string;

  // 总分和等级
  @Column({ name: 'total_score', type: 'decimal', precision: 5, scale: 2 })
  @Index()
  totalScore: number; // 0-100

  // 简化字段（兼容Service使用）
  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2 })
  qualityScore: number;

  @Column({ name: 'rating', type: 'varchar', length: 1 })
  @Index()
  rating: string; // S, A, B, C, D

  // 各维度评分（0-100）
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

  // 统计数据
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2 })
  successRate: number; // 百分比

  @Column({ name: 'avg_latency', type: 'integer' })
  avgLatency: number; // 毫秒

  @Column({ name: 'p50_latency', type: 'integer' })
  p50Latency: number;

  @Column({ name: 'p95_latency', type: 'integer' })
  p95Latency: number;

  @Column({ name: 'p99_latency', type: 'integer' })
  p99Latency: number;

  // 可用性统计
  @Column({ name: 'availability_rate', type: 'decimal', precision: 5, scale: 2 })
  availabilityRate: number; // 百分比

  @Column({ name: 'uptime_hours_24h', type: 'decimal', precision: 5, scale: 2 })
  uptimeHours24h: number;

  @Column({ name: 'downtime_count_24h', type: 'integer' })
  downtimeCount24h: number;

  // 稳定性指标
  @Column({ name: 'latency_std_dev', type: 'decimal', precision: 10, scale: 2 })
  latencyStdDev: number; // 延迟标准差

  @Column({ name: 'jitter', type: 'integer' })
  jitter: number; // 抖动（毫秒）

  @Column({ name: 'packet_loss_rate', type: 'decimal', precision: 5, scale: 2 })
  packetLossRate: number; // 百分比

  // 匿名性检测
  @Column({ name: 'anonymity_level', type: 'varchar', length: 20 })
  anonymityLevel: string; // elite, anonymous, transparent

  @Column({ name: 'is_webrtc_leak', type: 'boolean' })
  isWebrtcLeak: boolean;

  @Column({ name: 'is_dns_leak', type: 'boolean' })
  isDnsLeak: boolean;

  @Column({ name: 'detected_country', type: 'varchar', length: 10, nullable: true })
  detectedCountry: string;

  // 健康状态
  @Column({ name: 'health_status', type: 'varchar', length: 20 })
  healthStatus: string; // healthy, degraded, unhealthy, unknown

  @Column({ name: 'health_check_at', type: 'timestamp', nullable: true })
  healthCheckAt: Date;

  // 趋势分析
  @Column({ name: 'trend', type: 'varchar', length: 20 })
  trend: string; // improving, stable, declining

  @Column({ name: 'score_change_24h', type: 'decimal', precision: 5, scale: 2 })
  scoreChange24h: number; // 24小时评分变化

  @Column({ name: 'score_change_7d', type: 'decimal', precision: 5, scale: 2 })
  scoreChange7d: number; // 7天评分变化

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_calculated_at', type: 'timestamp' })
  lastCalculatedAt: Date;
}
