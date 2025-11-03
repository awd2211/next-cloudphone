import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理会话续期记录实体
 *
 * 记录粘性会话的每次续期操作
 */
@Entity('proxy_session_renewals')
@Index(['sessionId', 'renewedAt'])
@Index(['renewedAt'])
export class ProxySessionRenewal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  @Index()
  sessionId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  deviceId: string;

  // 续期信息
  @Column({ name: 'renewal_type', type: 'varchar', length: 20 })
  renewalType: string; // auto, manual

  @Column({ name: 'duration_added', type: 'integer' })
  durationAdded: number; // 秒

  // 简化字段（兼容Service使用）
  @Column({ name: 'extension_seconds', type: 'integer' })
  extensionSeconds: number;

  @Column({ name: 'old_expiry', type: 'timestamp' })
  oldExpiry: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'old_expires_at', type: 'timestamp' })
  oldExpiresAt: Date;

  @Column({ name: 'new_expiry', type: 'timestamp' })
  newExpiry: Date;

  // 简化字段（兼容Service使用）
  @Column({ name: 'new_expires_at', type: 'timestamp' })
  newExpiresAt: Date;

  // 成本信息
  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 4 })
  cost: number;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 4 })
  costPerHour: number;

  // 会话状态
  @Column({ name: 'session_health_at_renewal', type: 'varchar', length: 20 })
  sessionHealthAtRenewal: string;

  @Column({ name: 'total_requests_at_renewal', type: 'integer' })
  totalRequestsAtRenewal: number;

  @Column({ name: 'success_rate_at_renewal', type: 'decimal', precision: 5, scale: 2 })
  successRateAtRenewal: number;

  // 续期结果
  @Column({ name: 'is_successful', type: 'boolean' })
  isSuccessful: boolean;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  // 操作信息
  @Column({ name: 'renewed_by', type: 'varchar', length: 50 })
  renewedBy: string; // system, user, admin

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  // 时间信息
  @Column({ name: 'renewed_at', type: 'timestamp' })
  @Index()
  renewedAt: Date;

  // 通知
  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  notificationSent: boolean;

  @Column({ name: 'notification_sent_at', type: 'timestamp', nullable: true })
  notificationSentAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
