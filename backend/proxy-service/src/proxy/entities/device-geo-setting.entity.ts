import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 设备地理位置设置实体
 *
 * 存储设备的地理位置偏好配置
 */
@Entity('device_geo_settings')
@Index(['deviceId'], { unique: true })
@Index(['userId'])
export class DeviceGeoSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, unique: true })
  @Index()
  deviceId: string;

  // 首选地理位置
  @Column({ name: 'preferred_country', type: 'varchar', length: 10, nullable: true })
  preferredCountry: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'target_country', type: 'varchar', length: 10, nullable: true })
  targetCountry: string;

  @Column({ name: 'preferred_city', type: 'varchar', length: 100, nullable: true })
  preferredCity: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'target_city', type: 'varchar', length: 100, nullable: true })
  targetCity: string;

  @Column({ name: 'preferred_region', type: 'varchar', length: 100, nullable: true })
  preferredRegion: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'target_region', type: 'varchar', length: 100, nullable: true })
  targetRegion: string;

  // 备选地理位置
  @Column({ name: 'alternative_countries', type: 'simple-array', nullable: true })
  alternativeCountries: string[];

  @Column({ name: 'alternative_cities', type: 'simple-array', nullable: true })
  alternativeCities: string[];

  // ISP类型偏好
  @Column({ name: 'preferred_isp_type', type: 'varchar', length: 50, nullable: true })
  preferredIspType: string; // residential, datacenter, mobile

  // 简化字段（兼容Service使用）
  @Column({ name: 'isp_type', type: 'varchar', length: 50, nullable: true })
  ispType: string;

  @Column({ name: 'allow_isp_types', type: 'simple-array', nullable: true })
  allowIspTypes: string[];

  // 运营商偏好
  @Column({ name: 'preferred_carriers', type: 'simple-array', nullable: true })
  preferredCarriers: string[];

  @Column({ name: 'excluded_carriers', type: 'simple-array', nullable: true })
  excludedCarriers: string[];

  // 代理提供商偏好
  @Column({ name: 'preferred_providers', type: 'simple-array', nullable: true })
  preferredProviders: string[];

  // 匹配优先级
  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10, 优先级越高越先匹配

  // 地理匹配策略
  @Column({ name: 'match_strategy', type: 'varchar', length: 50, default: 'auto' })
  matchStrategy: string; // auto, strict_match, flexible, custom

  @Column({ name: 'city_level_matching', type: 'boolean', default: false })
  cityLevelMatching: boolean;

  @Column({ name: 'allow_nearby_cities', type: 'boolean', default: true })
  allowNearbyCities: boolean;

  @Column({ name: 'max_distance_km', type: 'integer', nullable: true })
  maxDistanceKm: number;

  // 时区配置
  @Column({ name: 'timezone', type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @Column({ name: 'match_timezone', type: 'boolean', default: false })
  matchTimezone: boolean;

  // 语言和区域设置
  @Column({ name: 'language', type: 'varchar', length: 10, nullable: true })
  language: string;

  @Column({ name: 'locale', type: 'varchar', length: 20, nullable: true })
  locale: string;

  // 目标应用配置
  @Column({ name: 'target_applications', type: 'jsonb', nullable: true })
  targetApplications: Array<{
    domain: string;
    requiredCountry?: string;
    requiredCity?: string;
    requiredIspType?: string;
  }>;

  // 自动优化
  @Column({ name: 'auto_optimize', type: 'boolean', default: true })
  autoOptimize: boolean;

  // 简化字段（兼容Service使用）
  @Column({ name: 'auto_match', type: 'boolean', default: true })
  autoMatch: boolean;

  @Column({ name: 'learning_enabled', type: 'boolean', default: true })
  learningEnabled: boolean; // 根据使用历史学习最佳配置

  // 统计信息
  @Column({ name: 'total_matches', type: 'integer', default: 0 })
  totalMatches: number;

  @Column({ name: 'successful_matches', type: 'integer', default: 0 })
  successfulMatches: number;

  @Column({ name: 'avg_match_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgMatchScore: number;

  @Column({ name: 'last_matched_at', type: 'timestamp', nullable: true })
  lastMatchedAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
