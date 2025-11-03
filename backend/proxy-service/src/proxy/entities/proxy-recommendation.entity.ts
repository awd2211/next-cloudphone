import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理推荐记录实体
 *
 * 存储智能推荐算法的推荐结果和决策依据
 */
@Entity('proxy_recommendations')
@Index(['userId', 'createdAt'])
@Index(['deviceId', 'createdAt'])
@Index(['targetUrl'])
export class ProxyRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'target_url', type: 'varchar', length: 500, nullable: true })
  targetUrl: string;

  @Column({ name: 'target_country', type: 'varchar', length: 10, nullable: true })
  targetCountry: string;

  @Column({ name: 'target_city', type: 'varchar', length: 100, nullable: true })
  targetCity: string;

  // 推荐代理信息
  @Column({ name: 'recommended_proxy_id', type: 'varchar', length: 50 })
  @Index()
  recommendedProxyId: string;

  @Column({ name: 'recommended_provider', type: 'varchar', length: 50 })
  recommendedProvider: string;

  @Column({ name: 'recommendation_score', type: 'decimal', precision: 5, scale: 2 })
  recommendationScore: number;

  // 评分细节
  @Column({ name: 'success_rate_score', type: 'decimal', precision: 5, scale: 2 })
  successRateScore: number;

  @Column({ name: 'latency_score', type: 'decimal', precision: 5, scale: 2 })
  latencyScore: number;

  @Column({ name: 'cost_score', type: 'decimal', precision: 5, scale: 2 })
  costScore: number;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2 })
  qualityScore: number;

  @Column({ name: 'affinity_score', type: 'decimal', precision: 5, scale: 2 })
  affinityScore: number;

  // 备选方案
  @Column({ name: 'alternatives', type: 'jsonb', nullable: true })
  alternatives: Array<{
    proxyId: string;
    provider: string;
    score: number;
    reason: string;
  }>;

  // 简化字段（兼容Service使用）
  @Column({ name: 'recommended_proxies', type: 'jsonb', nullable: true })
  recommendedProxies: Array<{
    proxyId: string;
    provider: string;
    score: number;
    reason: string;
  }>;

  // 推荐原因
  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string;

  // 使用情况
  @Column({ name: 'is_accepted', type: 'boolean', default: false })
  isAccepted: boolean;

  @Column({ name: 'actual_proxy_id', type: 'varchar', length: 50, nullable: true })
  actualProxyId: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'selected_proxy_id', type: 'varchar', length: 50, nullable: true })
  selectedProxyId: string;

  @Column({ name: 'success', type: 'boolean', nullable: true })
  success: boolean;

  @Column({ name: 'feedback_score', type: 'integer', nullable: true })
  feedbackScore: number; // 1-5分

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment: string;

  // 性能数据
  @Column({ name: 'actual_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  actualSuccessRate: number;

  @Column({ name: 'actual_latency', type: 'integer', nullable: true })
  actualLatency: number;

  @Column({ name: 'usage_duration', type: 'integer', nullable: true })
  usageDuration: number; // 秒

  @Column({ name: 'data_transferred', type: 'bigint', nullable: true })
  dataTransferred: number; // 字节

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
