import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理成本每日汇总实体
 *
 * 预计算的每日成本汇总数据，优化查询性能
 */
@Entity('proxy_cost_daily_summaries')
@Index(['userId', 'summaryDate'], { unique: true })
@Index(['deviceId', 'summaryDate'])
@Index(['provider', 'summaryDate'])
@Index(['summaryDate'])
export class ProxyCostDailySummary {
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

  @Column({ name: 'summary_date', type: 'date' })
  @Index()
  summaryDate: Date;

  // 使用量统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  @Column({ name: 'total_usage_duration', type: 'integer', default: 0 })
  totalUsageDuration: number; // 秒

  @Column({ name: 'total_bandwidth_used', type: 'bigint', default: 0 })
  totalBandwidthUsed: number; // 字节/秒

  // 成本统计
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'data_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  dataCost: number;

  @Column({ name: 'request_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  requestCost: number;

  @Column({ name: 'time_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  timeCost: number;

  @Column({ name: 'premium_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  premiumCost: number;

  // 按类型分组的成本（兼容Service使用）
  @Column({ name: 'cost_by_type', type: 'jsonb', nullable: true })
  costByType: Record<string, number>; // { "time": 10.50, "bandwidth": 15.30, "request": 8.20 }

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // 平均成本
  @Column({ name: 'avg_cost_per_request', type: 'decimal', precision: 10, scale: 6, default: 0 })
  avgCostPerRequest: number;

  @Column({ name: 'avg_cost_per_gb', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerGb: number;

  @Column({ name: 'avg_cost_per_hour', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerHour: number;

  // 性能指标
  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  // Provider分布
  @Column({ name: 'providers_used', type: 'simple-array', nullable: true })
  providersUsed: string[];

  @Column({ name: 'provider_costs', type: 'jsonb', nullable: true })
  providerCosts: Record<string, number>; // { "BrightData": 15.50, "IPRoyal": 8.30 }

  // 简化字段（兼容Service使用）
  @Column({ name: 'cost_by_provider', type: 'jsonb', nullable: true })
  costByProvider: Record<string, number>;

  // 地理分布
  @Column({ name: 'countries_used', type: 'simple-array', nullable: true })
  countriesUsed: string[];

  @Column({ name: 'country_costs', type: 'jsonb', nullable: true })
  countryCosts: Record<string, number>;

  // 会话统计
  @Column({ name: 'total_sessions', type: 'integer', default: 0 })
  totalSessions: number;

  @Column({ name: 'sticky_sessions', type: 'integer', default: 0 })
  stickySessions: number;

  @Column({ name: 'failover_count', type: 'integer', default: 0 })
  failoverCount: number;

  // 对比数据
  @Column({ name: 'cost_vs_yesterday', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costVsYesterday: number; // 正数表示增加，负数表示减少

  @Column({ name: 'cost_vs_yesterday_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  costVsYesterdayPct: number; // 百分比

  @Column({ name: 'cost_vs_last_week', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costVsLastWeek: number;

  @Column({ name: 'cost_vs_last_week_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  costVsLastWeekPct: number;

  // 趋势分析
  @Column({ name: 'trend', type: 'varchar', length: 20, nullable: true })
  trend: string; // increasing, stable, decreasing

  @Column({ name: 'is_anomaly', type: 'boolean', default: false })
  isAnomaly: boolean; // 异常检测

  @Column({ name: 'anomaly_reason', type: 'text', nullable: true })
  anomalyReason: string;

  // 汇总时间
  @Column({ name: 'summarized_at', type: 'timestamp' })
  summarizedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
