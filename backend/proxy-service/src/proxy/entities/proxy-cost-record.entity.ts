import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理成本记录实体
 *
 * 记录每次代理使用的详细成本信息
 */
@Entity('proxy_cost_records')
@Index(['userId', 'recordedAt'])
@Index(['deviceId', 'recordedAt'])
@Index(['proxyId', 'recordedAt'])
@Index(['provider', 'recordedAt'])
@Index(['recordedAt'])
export class ProxyCostRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  sessionId: string;

  // 代理信息
  @Column({ name: 'proxy_id', type: 'varchar', length: 50 })
  @Index()
  proxyId: string;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  @Index()
  provider: string;

  @Column({ name: 'proxy_type', type: 'varchar', length: 50 })
  proxyType: string;

  @Column({ name: 'proxy_country', type: 'varchar', length: 10 })
  proxyCountry: string;

  // 使用量
  @Column({ name: 'requests_count', type: 'integer' })
  requestsCount: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'request_count', type: 'integer' })
  requestCount: number;

  @Column({ name: 'data_transferred', type: 'bigint' })
  dataTransferred: number; // 字节

  @Column({ name: 'usage_duration', type: 'integer' })
  usageDuration: number; // 秒

  // 简化字段（兼容Service使用）
  @Column({ name: 'duration_seconds', type: 'integer' })
  durationSeconds: number;

  @Column({ name: 'bandwidth_used', type: 'bigint' })
  bandwidthUsed: number; // 字节/秒

  // 成本计算
  @Column({ name: 'cost_model', type: 'varchar', length: 50 })
  costModel: string; // per_request, per_gb, per_hour, per_bandwidth, tiered

  // 成本类型（简化Service使用）
  @Column({ name: 'cost_type', type: 'varchar', length: 20 })
  costType: string; // time, bandwidth, request

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 6 })
  unitPrice: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 6 })
  unitCost: number;

  @Column({ name: 'base_cost', type: 'decimal', precision: 10, scale: 4 })
  baseCost: number;

  @Column({ name: 'data_cost', type: 'decimal', precision: 10, scale: 4 })
  dataCost: number;

  @Column({ name: 'request_cost', type: 'decimal', precision: 10, scale: 4 })
  requestCost: number;

  @Column({ name: 'time_cost', type: 'decimal', precision: 10, scale: 4 })
  timeCost: number;

  @Column({ name: 'premium_cost', type: 'decimal', precision: 10, scale: 4, default: 0 })
  premiumCost: number; // 特殊位置、高质量代理的额外费用

  @Column({ name: 'discount', type: 'decimal', precision: 10, scale: 4, default: 0 })
  discount: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 4 })
  @Index()
  totalCost: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // 成本归因
  @Column({ name: 'cost_category', type: 'varchar', length: 50 })
  costCategory: string; // operational, development, testing, production

  @Column({ name: 'cost_center', type: 'varchar', length: 100, nullable: true })
  costCenter: string;

  @Column({ name: 'project_id', type: 'varchar', length: 50, nullable: true })
  projectId: string;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  // 性能指标
  @Column({ name: 'avg_latency', type: 'integer' })
  avgLatency: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2 })
  successRate: number;

  @Column({ name: 'cost_per_request', type: 'decimal', precision: 10, scale: 6 })
  costPerRequest: number;

  @Column({ name: 'cost_per_gb', type: 'decimal', precision: 10, scale: 4 })
  costPerGb: number;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 4 })
  costPerHour: number;

  // 时间信息
  @Column({ name: 'usage_start_at', type: 'timestamp' })
  usageStartAt: Date;

  @Column({ name: 'usage_end_at', type: 'timestamp' })
  usageEndAt: Date;

  @Column({ name: 'recorded_at', type: 'timestamp' })
  @Index()
  recordedAt: Date;

  // 账单信息
  @Column({ name: 'billing_period', type: 'varchar', length: 20 })
  billingPeriod: string; // YYYY-MM

  @Column({ name: 'invoice_id', type: 'varchar', length: 50, nullable: true })
  invoiceId: string;

  @Column({ name: 'is_billed', type: 'boolean', default: false })
  isBilled: boolean;

  @Column({ name: 'billed_at', type: 'timestamp', nullable: true })
  billedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
