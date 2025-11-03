import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ISP运营商信息实体
 *
 * 存储真实ISP运营商的信息，用于模拟真实用户网络环境
 */
@Entity('isp_providers')
@Index(['country', 'ispType'])
@Index(['ispName'])
export class IspProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'isp_name', type: 'varchar', length: 200 })
  @Index()
  ispName: string;

  @Column({ name: 'isp_code', type: 'varchar', length: 50, nullable: true })
  ispCode: string;

  @Column({ name: 'country', type: 'varchar', length: 10 })
  @Index()
  country: string;

  @Column({ name: 'country_name', type: 'varchar', length: 100 })
  countryName: string;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ name: 'region', type: 'varchar', length: 100, nullable: true })
  region: string;

  // ISP类型
  @Column({ name: 'isp_type', type: 'varchar', length: 50 })
  @Index()
  ispType: string; // residential, datacenter, mobile, business, education, government

  @Column({ name: 'carrier_type', type: 'varchar', length: 50, nullable: true })
  carrierType: string; // cable, dsl, fiber, 4g, 5g, satellite

  // 网络特征
  @Column({ name: 'asn', type: 'varchar', length: 20, nullable: true })
  asn: string; // Autonomous System Number

  @Column({ name: 'as_name', type: 'varchar', length: 200, nullable: true })
  asName: string;

  @Column({ name: 'ip_ranges', type: 'simple-array', nullable: true })
  ipRanges: string[]; // CIDR格式

  // 性能特征
  @Column({ name: 'typical_download_speed', type: 'integer', nullable: true })
  typicalDownloadSpeed: number; // Mbps

  @Column({ name: 'typical_upload_speed', type: 'integer', nullable: true })
  typicalUploadSpeed: number; // Mbps

  @Column({ name: 'typical_latency', type: 'integer', nullable: true })
  typicalLatency: number; // 毫秒

  @Column({ name: 'typical_jitter', type: 'integer', nullable: true })
  typicalJitter: number; // 毫秒

  // 市场信息
  @Column({ name: 'market_share', type: 'decimal', precision: 5, scale: 2, nullable: true })
  marketShare: number; // 百分比

  @Column({ name: 'popularity_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
  popularityScore: number; // 0-100

  @Column({ name: 'is_major_provider', type: 'boolean', default: false })
  isMajorProvider: boolean;

  // 可用性
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'available_proxy_count', type: 'integer', default: 0 })
  availableProxyCount: number;

  @Column({ name: 'total_proxy_count', type: 'integer', default: 0 })
  totalProxyCount: number;

  // 简化字段（兼容Service使用）
  @Column({ name: 'proxy_count', type: 'integer', default: 0 })
  proxyCount: number;

  // 特性标签
  @Column({ name: 'features', type: 'simple-array', nullable: true })
  features: string[]; // ['ipv6', 'static_ip', 'dynamic_ip', 'cgnat']

  @Column({ name: 'restrictions', type: 'simple-array', nullable: true })
  restrictions: string[]; // ['port_blocking', 'vpn_blocked', 'throttling']

  // 适用场景
  @Column({ name: 'recommended_for', type: 'simple-array', nullable: true })
  recommendedFor: string[]; // ['social_media', 'e-commerce', 'streaming', 'gaming']

  @Column({ name: 'not_recommended_for', type: 'simple-array', nullable: true })
  notRecommendedFor: string[];

  // 成本信息
  @Column({ name: 'avg_cost_per_gb', type: 'decimal', precision: 10, scale: 4, nullable: true })
  avgCostPerGb: number;

  @Column({ name: 'avg_cost_per_hour', type: 'decimal', precision: 10, scale: 4, nullable: true })
  avgCostPerHour: number;

  // 质量评级
  @Column({ name: 'quality_rating', type: 'decimal', precision: 3, scale: 1, nullable: true })
  qualityRating: number; // 0-5星

  @Column({ name: 'reliability_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  reliabilityScore: number; // 0-100

  @Column({ name: 'anonymity_level', type: 'varchar', length: 20, nullable: true })
  anonymityLevel: string; // elite, anonymous, transparent

  // 联系信息
  @Column({ name: 'website', type: 'varchar', length: 500, nullable: true })
  website: string;

  @Column({ name: 'support_email', type: 'varchar', length: 200, nullable: true })
  supportEmail: string;

  // 统计信息
  @Column({ name: 'total_usage_count', type: 'integer', default: 0 })
  totalUsageCount: number;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 简化字段（兼容Service使用）
  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}
