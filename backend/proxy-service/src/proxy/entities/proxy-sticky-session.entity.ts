import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理粘性会话实体
 *
 * 管理长期IP绑定会话，支持最长30天
 */
@Entity('proxy_sticky_sessions')
@Index(['userId', 'status'])
@Index(['deviceId', 'status'])
@Index(['proxyId'])
@Index(['expiresAt'])
export class ProxyStickySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'session_name', type: 'varchar', length: 200 })
  sessionName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  // 绑定的代理
  @Column({ name: 'proxy_id', type: 'varchar', length: 50 })
  @Index()
  proxyId: string;

  @Column({ name: 'proxy_provider', type: 'varchar', length: 50 })
  proxyProvider: string;

  @Column({ name: 'proxy_ip', type: 'varchar', length: 50 })
  proxyIp: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'proxy_host', type: 'varchar', length: 50 })
  proxyHost: string;

  @Column({ name: 'proxy_port', type: 'integer' })
  proxyPort: number;

  @Column({ name: 'proxy_type', type: 'varchar', length: 20 })
  proxyType: string;

  @Column({ name: 'proxy_country', type: 'varchar', length: 10 })
  proxyCountry: string;

  @Column({ name: 'proxy_city', type: 'varchar', length: 100, nullable: true })
  proxyCity: string;

  // 会话状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, paused, expired, terminated

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10, 高优先级会话在资源紧张时优先保留

  // 时间管理
  @Column({ name: 'duration', type: 'integer' })
  duration: number; // 秒

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp' })
  lastUsedAt: Date;

  @Column({ name: 'last_active_at', type: 'timestamp' })
  lastActiveAt: Date;

  // 自动续期
  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @Column({ name: 'auto_renew_duration', type: 'integer', nullable: true })
  autoRenewDuration: number; // 秒

  @Column({ name: 'max_renewals', type: 'integer', nullable: true })
  maxRenewals: number;

  @Column({ name: 'renewal_count', type: 'integer', default: 0 })
  renewalCount: number;

  @Column({ name: 'last_renewed_at', type: 'timestamp', nullable: true })
  lastRenewedAt: Date;

  // 使用统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number; // 字节

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number; // 毫秒

  // 成本信息
  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 4 })
  costPerHour: number;

  @Column({ name: 'estimated_total_cost', type: 'decimal', precision: 10, scale: 4 })
  estimatedTotalCost: number;

  // 健康监控
  @Column({ name: 'health_status', type: 'varchar', length: 20, default: 'healthy' })
  healthStatus: string; // healthy, degraded, unhealthy

  @Column({ name: 'last_health_check_at', type: 'timestamp', nullable: true })
  lastHealthCheckAt: Date;

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number;

  // 告警配置
  @Column({ name: 'alert_on_failure', type: 'boolean', default: false })
  alertOnFailure: boolean;

  @Column({ name: 'alert_on_expiry', type: 'boolean', default: true })
  alertOnExpiry: boolean;

  @Column({ name: 'expiry_alert_hours', type: 'integer', default: 24 })
  expiryAlertHours: number; // 过期前多少小时提醒

  @Column({ name: 'last_alerted_at', type: 'timestamp', nullable: true })
  lastAlertedAt: Date;

  // 目标网站
  @Column({ name: 'target_domains', type: 'simple-array', nullable: true })
  targetDomains: string[];

  @Column({ name: 'allowed_ips', type: 'simple-array', nullable: true })
  allowedIps: string[]; // 允许使用此会话的IP白名单

  // 标签和分类
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'category', type: 'varchar', length: 50, nullable: true })
  category: string; // social_media, e-commerce, streaming, etc.

  // 终止信息
  @Column({ name: 'terminated_at', type: 'timestamp', nullable: true })
  terminatedAt: Date;

  @Column({ name: 'termination_reason', type: 'text', nullable: true })
  terminationReason: string;

  @Column({ name: 'terminated_by', type: 'varchar', length: 50, nullable: true })
  terminatedBy: string; // user, system, admin

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
