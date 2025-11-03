import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理故障切换配置实体
 *
 * 支持全局、用户、设备、会话四个层级的配置继承
 */
@Entity('proxy_failover_configs')
@Index(['level', 'entityId'], { unique: true })
@Index(['userId'])
@Index(['deviceId'])
export class ProxyFailoverConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 配置层级
  @Column({ name: 'level', type: 'varchar', length: 20 })
  @Index()
  level: string; // global, user, device, session

  @Column({ name: 'entity_id', type: 'varchar', length: 50, nullable: true })
  entityId: string; // 对应层级的ID

  @Column({ name: 'user_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  sessionId: string;

  // 故障切换策略
  @Column({ name: 'strategy', type: 'varchar', length: 50, default: 'quality_based' })
  strategy: string; // immediate, retry_first, quality_based, round_robin

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  // 重试配置
  @Column({ name: 'max_retries', type: 'integer', default: 3 })
  maxRetries: number; // 0-10

  @Column({ name: 'retry_delay', type: 'integer', default: 1000 })
  retryDelay: number; // 毫秒，100-10000

  // 简化字段（兼容Service使用）
  @Column({ name: 'retry_delay_ms', type: 'integer', default: 1000 })
  retryDelayMs: number;

  @Column({ name: 'retry_backoff_multiplier', type: 'decimal', precision: 3, scale: 1, default: 1.5 })
  retryBackoffMultiplier: number;

  // 自动切换阈值
  @Column({ name: 'auto_switch_on_failure', type: 'boolean', default: true })
  autoSwitchOnFailure: boolean;

  @Column({ name: 'failure_threshold', type: 'integer', default: 3 })
  failureThreshold: number; // 连续失败次数

  @Column({ name: 'timeout_threshold', type: 'integer', default: 10000 })
  timeoutThreshold: number; // 毫秒

  @Column({ name: 'latency_threshold', type: 'integer', default: 5000 })
  latencyThreshold: number; // 毫秒

  @Column({ name: 'success_rate_threshold', type: 'decimal', precision: 5, scale: 2, default: 80 })
  successRateThreshold: number; // 百分比

  // 简化字段（兼容Service使用）
  @Column({ name: 'success_threshold', type: 'decimal', precision: 5, scale: 2, default: 80 })
  successThreshold: number;

  @Column({ name: 'check_interval_ms', type: 'integer', default: 60000 })
  checkIntervalMs: number; // 毫秒

  @Column({ name: 'auto_recover', type: 'boolean', default: true })
  autoRecover: boolean;

  // 切换冷却时间
  @Column({ name: 'cooldown_period', type: 'integer', default: 300 })
  cooldownPeriod: number; // 秒，避免频繁切换

  @Column({ name: 'last_switched_at', type: 'timestamp', nullable: true })
  lastSwitchedAt: Date;

  // 备选代理池
  @Column({ name: 'fallback_proxy_ids', type: 'simple-array', nullable: true })
  fallbackProxyIds: string[]; // 预设的备选代理列表

  @Column({ name: 'exclude_proxy_ids', type: 'simple-array', nullable: true })
  excludeProxyIds: string[]; // 排除的代理列表

  @Column({ name: 'prefer_same_provider', type: 'boolean', default: false })
  preferSameProvider: boolean;

  @Column({ name: 'prefer_same_country', type: 'boolean', default: true })
  preferSameCountry: boolean;

  // 通知配置
  @Column({ name: 'notify_on_failover', type: 'boolean', default: false })
  notifyOnFailover: boolean;

  @Column({ name: 'notification_channels', type: 'simple-array', nullable: true })
  notificationChannels: string[]; // email, sms, webhook

  @Column({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true })
  webhookUrl: string;

  // 健康检查
  @Column({ name: 'health_check_enabled', type: 'boolean', default: true })
  healthCheckEnabled: boolean;

  @Column({ name: 'health_check_interval', type: 'integer', default: 60 })
  healthCheckInterval: number; // 秒

  @Column({ name: 'health_check_url', type: 'varchar', length: 500, nullable: true })
  healthCheckUrl: string;

  // 统计信息
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

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
