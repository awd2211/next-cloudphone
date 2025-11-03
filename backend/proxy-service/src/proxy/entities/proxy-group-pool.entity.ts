import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理组专属代理池实体
 *
 * 管理分配给设备组的专属代理资源
 */
@Entity('proxy_group_pools')
@Index(['groupId', 'proxyId'], { unique: true })
@Index(['groupId', 'status'])
@Index(['proxyId'])
export class ProxyGroupPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'varchar', length: 50 })
  @Index()
  groupId: string;

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

  @Column({ name: 'proxy_city', type: 'varchar', length: 100, nullable: true })
  proxyCity: string;

  // 分配状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, reserved, in_use, failed, retired

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10

  @Column({ name: 'allocation_type', type: 'varchar', length: 50, default: 'auto' })
  allocationType: string; // auto, manual, failover

  // 使用情况
  @Column({ name: 'is_assigned', type: 'boolean', default: false })
  isAssigned: boolean;

  @Column({ name: 'assigned_device_id', type: 'varchar', length: 50, nullable: true })
  assignedDeviceId: string;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 使用统计
  @Column({ name: 'total_assignments', type: 'integer', default: 0 })
  totalAssignments: number;

  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number;

  @Column({ name: 'total_usage_duration', type: 'integer', default: 0 })
  totalUsageDuration: number; // 秒

  // 性能指标
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ name: 'last_quality_check_at', type: 'timestamp', nullable: true })
  lastQualityCheckAt: Date;

  // 成本信息
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 4, nullable: true })
  costPerHour: number;

  @Column({ name: 'cost_per_gb', type: 'decimal', precision: 10, scale: 4, nullable: true })
  costPerGb: number;

  // 健康状态
  @Column({ name: 'health_status', type: 'varchar', length: 20, default: 'healthy' })
  healthStatus: string; // healthy, degraded, unhealthy, unknown

  @Column({ name: 'last_health_check_at', type: 'timestamp', nullable: true })
  lastHealthCheckAt: Date;

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number;

  @Column({ name: 'last_failure_at', type: 'timestamp', nullable: true })
  lastFailureAt: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  // 自动替换
  @Column({ name: 'auto_replace_on_failure', type: 'boolean', default: true })
  autoReplaceOnFailure: boolean;

  @Column({ name: 'replace_threshold', type: 'integer', default: 3 })
  replaceThreshold: number; // 连续失败次数

  @Column({ name: 'replaced_at', type: 'timestamp', nullable: true })
  replacedAt: Date;

  @Column({ name: 'replacement_proxy_id', type: 'varchar', length: 50, nullable: true })
  replacementProxyId: string;

  // 生命周期
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date; // 专属分配的过期时间

  @Column({ name: 'auto_renew', type: 'boolean', default: true })
  autoRenew: boolean;

  @Column({ name: 'retired_at', type: 'timestamp', nullable: true })
  retiredAt: Date;

  @Column({ name: 'retirement_reason', type: 'text', nullable: true })
  retirementReason: string;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
