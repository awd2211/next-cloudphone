import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 目标网站-代理映射实体
 *
 * 存储特定网站的最佳代理配置和历史性能
 */
@Entity('proxy_target_mappings')
@Index(['targetDomain', 'targetCountry'])
@Index(['proxyId'])
@Index(['avgSuccessRate'])
export class ProxyTargetMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_domain', type: 'varchar', length: 200 })
  @Index()
  targetDomain: string;

  @Column({ name: 'target_country', type: 'varchar', length: 10, nullable: true })
  targetCountry: string;

  @Column({ name: 'target_city', type: 'varchar', length: 100, nullable: true })
  targetCity: string;

  @Column({ name: 'target_category', type: 'varchar', length: 50, nullable: true })
  targetCategory: string; // social_media, e-commerce, streaming, etc.

  @Column({ name: 'proxy_id', type: 'varchar', length: 50 })
  @Index()
  proxyId: string;

  @Column({ name: 'proxy_provider', type: 'varchar', length: 50 })
  proxyProvider: string;

  @Column({ name: 'proxy_country', type: 'varchar', length: 10 })
  proxyCountry: string;

  @Column({ name: 'proxy_city', type: 'varchar', length: 100, nullable: true })
  proxyCity: string;

  // 性能统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'failure_count', type: 'integer', default: 0 })
  failureCount: number;

  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @Index()
  avgSuccessRate: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number;

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number; // 毫秒

  @Column({ name: 'min_latency', type: 'integer', default: 0 })
  minLatency: number;

  @Column({ name: 'max_latency', type: 'integer', default: 0 })
  maxLatency: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  // 成本信息
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column({ name: 'avg_cost_per_request', type: 'decimal', precision: 10, scale: 6, default: 0 })
  avgCostPerRequest: number;

  // 时间统计
  @Column({ name: 'total_usage_duration', type: 'integer', default: 0 })
  totalUsageDuration: number; // 秒

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 错误统计
  @Column({ name: 'error_types', type: 'jsonb', nullable: true })
  errorTypes: Record<string, number>; // { "timeout": 5, "connection_refused": 3 }

  // 推荐权重
  @Column({ name: 'recommendation_weight', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  recommendationWeight: number; // 基于历史表现的权重系数

  @Column({ name: 'is_recommended', type: 'boolean', default: true })
  isRecommended: boolean;

  @Column({ name: 'blacklist_reason', type: 'text', nullable: true })
  blacklistReason: string;

  @Column({ name: 'blacklist_until', type: 'timestamp', nullable: true })
  blacklistUntil: Date;

  // 地理匹配信息
  @Column({ name: 'geo_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  geoMatchScore: number;

  @Column({ name: 'isp_type', type: 'varchar', length: 50, nullable: true })
  ispType: string; // residential, datacenter, mobile

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
