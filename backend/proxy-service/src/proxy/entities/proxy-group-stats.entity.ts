import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理组统计实体
 *
 * 存储设备组的汇总统计数据
 */
@Entity('proxy_group_stats')
@Index(['groupId'], { unique: true })
export class ProxyGroupStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'varchar', length: 50, unique: true })
  @Index()
  groupId: string;

  // 资源统计
  @Column({ name: 'total_devices', type: 'integer', default: 0 })
  totalDevices: number;

  @Column({ name: 'active_devices', type: 'integer', default: 0 })
  activeDevices: number;

  @Column({ name: 'inactive_devices', type: 'integer', default: 0 })
  inactiveDevices: number;

  @Column({ name: 'total_proxies', type: 'integer', default: 0 })
  totalProxies: number;

  @Column({ name: 'active_proxies', type: 'integer', default: 0 })
  activeProxies: number;

  @Column({ name: 'assigned_proxies', type: 'integer', default: 0 })
  assignedProxies: number;

  @Column({ name: 'available_proxies', type: 'integer', default: 0 })
  availableProxies: number;

  @Column({ name: 'failed_proxies', type: 'integer', default: 0 })
  failedProxies: number;

  // 资源利用率
  @Column({ name: 'proxy_utilization_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  proxyUtilizationRate: number; // 百分比

  @Column({ name: 'device_to_proxy_ratio', type: 'decimal', precision: 5, scale: 2, default: 0 })
  deviceToProxyRatio: number;

  // 使用统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  @Column({ name: 'total_usage_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalUsageHours: number;

  // 性能指标
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'min_latency', type: 'integer', default: 0 })
  minLatency: number;

  @Column({ name: 'max_latency', type: 'integer', default: 0 })
  maxLatency: number;

  @Column({ name: 'p50_latency', type: 'integer', default: 0 })
  p50Latency: number;

  @Column({ name: 'p95_latency', type: 'integer', default: 0 })
  p95Latency: number;

  @Column({ name: 'p99_latency', type: 'integer', default: 0 })
  p99Latency: number;

  // 质量分布
  @Column({ name: 'avg_quality_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgQualityScore: number;

  @Column({ name: 'quality_distribution', type: 'jsonb', nullable: true })
  qualityDistribution: {
    s_grade: number; // >= 90
    a_grade: number; // 80-89
    b_grade: number; // 70-79
    c_grade: number; // 60-69
    d_grade: number; // < 60
  };

  // 成本统计
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'daily_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  dailyCost: number;

  @Column({ name: 'monthly_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyCost: number;

  @Column({ name: 'avg_cost_per_device', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerDevice: number;

  @Column({ name: 'avg_cost_per_request', type: 'decimal', precision: 10, scale: 6, default: 0 })
  avgCostPerRequest: number;

  @Column({ name: 'avg_cost_per_gb', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerGb: number;

  // Provider分布
  @Column({ name: 'providers_used', type: 'simple-array', nullable: true })
  providersUsed: string[];

  @Column({ name: 'provider_distribution', type: 'jsonb', nullable: true })
  providerDistribution: Record<string, number>; // { "BrightData": 35, "IPRoyal": 25 }

  @Column({ name: 'provider_costs', type: 'jsonb', nullable: true })
  providerCosts: Record<string, number>;

  // 地理分布
  @Column({ name: 'countries_used', type: 'simple-array', nullable: true })
  countriesUsed: string[];

  @Column({ name: 'country_distribution', type: 'jsonb', nullable: true })
  countryDistribution: Record<string, number>;

  @Column({ name: 'country_costs', type: 'jsonb', nullable: true })
  countryCosts: Record<string, number>;

  // 故障统计
  @Column({ name: 'total_failovers', type: 'integer', default: 0 })
  totalFailovers: number;

  @Column({ name: 'successful_failovers', type: 'integer', default: 0 })
  successfulFailovers: number;

  @Column({ name: 'failed_failovers', type: 'integer', default: 0 })
  failedFailovers: number;

  @Column({ name: 'avg_failover_duration', type: 'integer', default: 0 })
  avgFailoverDuration: number; // 毫秒

  @Column({ name: 'last_failover_at', type: 'timestamp', nullable: true })
  lastFailoverAt: Date;

  // 健康状态
  @Column({ name: 'overall_health', type: 'varchar', length: 20, default: 'healthy' })
  overallHealth: string; // healthy, degraded, unhealthy

  @Column({ name: 'healthy_devices', type: 'integer', default: 0 })
  healthyDevices: number;

  @Column({ name: 'degraded_devices', type: 'integer', default: 0 })
  degradedDevices: number;

  @Column({ name: 'unhealthy_devices', type: 'integer', default: 0 })
  unhealthyDevices: number;

  @Column({ name: 'healthy_proxies', type: 'integer', default: 0 })
  healthyProxies: number;

  @Column({ name: 'degraded_proxies', type: 'integer', default: 0 })
  degradedProxies: number;

  @Column({ name: 'unhealthy_proxies', type: 'integer', default: 0 })
  unhealthyProxies: number;

  // 趋势分析
  @Column({ name: 'success_rate_trend', type: 'varchar', length: 20, nullable: true })
  successRateTrend: string; // improving, stable, declining

  @Column({ name: 'latency_trend', type: 'varchar', length: 20, nullable: true })
  latencyTrend: string;

  @Column({ name: 'cost_trend', type: 'varchar', length: 20, nullable: true })
  costTrend: string;

  @Column({ name: 'success_rate_change_24h', type: 'decimal', precision: 5, scale: 2, nullable: true })
  successRateChange24h: number;

  @Column({ name: 'latency_change_24h', type: 'integer', nullable: true })
  latencyChange24h: number;

  @Column({ name: 'cost_change_24h', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costChange24h: number;

  // 时间信息
  @Column({ name: 'last_updated', type: 'timestamp' })
  lastUpdated: Date;

  @Column({ name: 'last_device_activity_at', type: 'timestamp', nullable: true })
  lastDeviceActivityAt: Date;

  @Column({ name: 'last_proxy_activity_at', type: 'timestamp', nullable: true })
  lastProxyActivityAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
