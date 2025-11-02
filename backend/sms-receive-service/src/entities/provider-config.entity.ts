import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('provider_configs')
@Index(['provider'], { unique: true })
export class ProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Platform Information
  @Column({ name: 'provider', length: 50, unique: true })
  provider: string; // sms-activate, 5sim, smspool

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName: string; // SMS-Activate, 5sim, SMSPool

  // API Configuration
  @Column({ name: 'api_endpoint', length: 255 })
  apiEndpoint: string;

  @Column({ name: 'api_key', type: 'text' })
  apiKey: string; // Encrypted

  @Column({ name: 'api_key_encrypted', type: 'boolean', default: true })
  apiKeyEncrypted: boolean;

  // Balance Information
  @Column({ name: 'balance', type: 'decimal', precision: 10, scale: 2, nullable: true })
  balance: number;

  @Column({ name: 'balance_threshold', type: 'decimal', precision: 10, scale: 2, default: 10.00 })
  balanceThreshold: number;

  @Column({ name: 'last_balance_check', type: 'timestamp', nullable: true })
  lastBalanceCheck: Date;

  // Priority and Rate Limiting
  @Column({ name: 'priority', type: 'int', default: 1 })
  priority: number; // 1=primary, 2=backup1, 3=backup2

  @Column({ name: 'rate_limit_per_minute', type: 'int', default: 60 })
  rateLimitPerMinute: number;

  @Column({ name: 'rate_limit_per_second', type: 'int', default: 10 })
  rateLimitPerSecond: number;

  @Column({ name: 'concurrent_requests_limit', type: 'int', default: 50 })
  concurrentRequestsLimit: number;

  // Status
  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'health_status', length: 20, default: 'healthy' })
  healthStatus: string; // healthy, degraded, down

  @Column({ name: 'last_health_check', type: 'timestamp', nullable: true })
  lastHealthCheck: Date;

  // Statistics
  @Column({ name: 'total_requests', type: 'bigint', default: 0 })
  totalRequests: number;

  @Column({ name: 'total_success', type: 'bigint', default: 0 })
  totalSuccess: number;

  @Column({ name: 'total_failures', type: 'bigint', default: 0 })
  totalFailures: number;

  // Smart Routing Weights
  @Column({ name: 'cost_weight', type: 'decimal', precision: 3, scale: 2, default: 0.4 })
  costWeight: number;

  @Column({ name: 'speed_weight', type: 'decimal', precision: 3, scale: 2, default: 0.3 })
  speedWeight: number;

  @Column({ name: 'success_rate_weight', type: 'decimal', precision: 3, scale: 2, default: 0.3 })
  successRateWeight: number;

  // Alert Configuration
  @Column({ name: 'alert_enabled', type: 'boolean', default: true })
  alertEnabled: boolean;

  @Column({ name: 'alert_channels', type: 'jsonb', nullable: true })
  alertChannels: string[]; // ["email", "sms", "dingtalk", "wechat"]

  @Column({ name: 'alert_recipients', type: 'jsonb', nullable: true })
  alertRecipients: string[]; // ["admin@example.com", "13800138000"]

  // Performance Metrics
  @Column({ name: 'avg_sms_receive_time', type: 'int', nullable: true })
  avgSmsReceiveTime: number; // seconds

  @Column({ name: 'p95_sms_receive_time', type: 'int', nullable: true })
  p95SmsReceiveTime: number;

  @Column({ name: 'last_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  lastSuccessRate: number; // 85.50%

  // WebHook Support
  @Column({ name: 'webhook_enabled', type: 'boolean', default: false })
  webhookEnabled: boolean;

  @Column({ name: 'webhook_url', length: 255, nullable: true })
  webhookUrl: string;

  @Column({ name: 'webhook_secret', length: 255, nullable: true })
  webhookSecret: string;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Metadata
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
