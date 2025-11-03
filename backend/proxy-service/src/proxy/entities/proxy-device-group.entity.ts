import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理设备组实体
 *
 * 管理设备分组和专属代理池分配
 */
@Entity('proxy_device_groups')
@Index(['userId'])
@Index(['status'])
export class ProxyDeviceGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  // 设备容量
  @Column({ name: 'max_devices', type: 'integer', default: 100 })
  maxDevices: number;

  @Column({ name: 'current_devices', type: 'integer', default: 0 })
  currentDevices: number;

  // 代理池配置
  @Column({ name: 'dedicated_proxies', type: 'boolean', default: true })
  dedicatedProxies: boolean; // 是否使用专属代理池

  @Column({ name: 'min_proxies', type: 'integer', default: 10 })
  minProxies: number; // 最小代理数量

  @Column({ name: 'max_proxies', type: 'integer', default: 100 })
  maxProxies: number; // 最大代理数量

  @Column({ name: 'current_proxies', type: 'integer', default: 0 })
  currentProxies: number;

  // 自动扩展
  @Column({ name: 'auto_scaling', type: 'boolean', default: false })
  autoScaling: boolean;

  @Column({ name: 'scaling_ratio', type: 'decimal', precision: 3, scale: 1, default: 2.0 })
  scalingRatio: number; // 每个设备分配的代理数量

  @Column({ name: 'scale_up_threshold', type: 'decimal', precision: 5, scale: 2, default: 80 })
  scaleUpThreshold: number; // 使用率达到此值时扩展

  @Column({ name: 'scale_down_threshold', type: 'decimal', precision: 5, scale: 2, default: 30 })
  scaleDownThreshold: number; // 使用率低于此值时缩容

  @Column({ name: 'last_scaled_at', type: 'timestamp', nullable: true })
  lastScaledAt: Date;

  // 代理选择策略
  @Column({ name: 'proxy_selection_strategy', type: 'varchar', length: 50, default: 'quality_based' })
  proxySelectionStrategy: string; // quality_based, cost_based, round_robin, random

  @Column({ name: 'preferred_providers', type: 'simple-array', nullable: true })
  preferredProviders: string[];

  @Column({ name: 'excluded_providers', type: 'simple-array', nullable: true })
  excludedProviders: string[];

  @Column({ name: 'preferred_countries', type: 'simple-array', nullable: true })
  preferredCountries: string[];

  // 地理位置配置
  @Column({ name: 'geo_restriction', type: 'boolean', default: false })
  geoRestriction: boolean;

  @Column({ name: 'allowed_countries', type: 'simple-array', nullable: true })
  allowedCountries: string[];

  @Column({ name: 'require_same_country', type: 'boolean', default: false })
  requireSameCountry: boolean; // 所有设备使用相同国家的代理

  // 成本控制
  @Column({ name: 'cost_limit_enabled', type: 'boolean', default: false })
  costLimitEnabled: boolean;

  @Column({ name: 'daily_cost_limit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dailyCostLimit: number;

  @Column({ name: 'monthly_cost_limit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyCostLimit: number;

  @Column({ name: 'current_daily_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentDailyCost: number;

  @Column({ name: 'current_monthly_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentMonthlyCost: number;

  // 质量要求
  @Column({ name: 'min_quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minQualityScore: number; // 0-100

  @Column({ name: 'min_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minSuccessRate: number; // 百分比

  @Column({ name: 'max_latency', type: 'integer', nullable: true })
  maxLatency: number; // 毫秒

  // 故障切换配置
  @Column({ name: 'failover_enabled', type: 'boolean', default: true })
  failoverEnabled: boolean;

  @Column({ name: 'auto_replace_failed', type: 'boolean', default: true })
  autoReplaceFailedProxy: boolean;

  @Column({ name: 'health_check_interval', type: 'integer', default: 300 })
  healthCheckInterval: number; // 秒

  // 状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, paused, suspended, archived

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10

  // 使用统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 标签和分类
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'category', type: 'varchar', length: 50, nullable: true })
  category: string;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
