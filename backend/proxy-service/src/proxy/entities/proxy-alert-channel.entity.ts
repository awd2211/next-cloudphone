import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理告警通道实体
 *
 * 配置多渠道告警通知（Email, SMS, Webhook, DingTalk, WeChat, Slack）
 */
@Entity('proxy_alert_channels')
@Index(['userId', 'channelType'])
@Index(['isActive'])
export class ProxyAlertChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'channel_name', type: 'varchar', length: 200 })
  channelName: string;

  @Column({ name: 'channel_type', type: 'varchar', length: 50 })
  @Index()
  channelType: string; // email, sms, webhook, dingtalk, wechat, slack

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10

  // Email配置
  @Column({ name: 'email_addresses', type: 'simple-array', nullable: true })
  emailAddresses: string[];

  @Column({ name: 'email_subject_template', type: 'varchar', length: 500, nullable: true })
  emailSubjectTemplate: string;

  @Column({ name: 'email_body_template', type: 'text', nullable: true })
  emailBodyTemplate: string;

  // SMS配置
  @Column({ name: 'phone_numbers', type: 'simple-array', nullable: true })
  phoneNumbers: string[];

  @Column({ name: 'sms_template', type: 'varchar', length: 500, nullable: true })
  smsTemplate: string;

  // Webhook配置
  @Column({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true })
  webhookUrl: string;

  @Column({ name: 'webhook_method', type: 'varchar', length: 10, nullable: true })
  webhookMethod: string; // GET, POST, PUT

  @Column({ name: 'webhook_headers', type: 'jsonb', nullable: true })
  webhookHeaders: Record<string, string>;

  @Column({ name: 'webhook_payload_template', type: 'text', nullable: true })
  webhookPayloadTemplate: string;

  @Column({ name: 'webhook_auth_type', type: 'varchar', length: 50, nullable: true })
  webhookAuthType: string; // none, basic, bearer, custom

  @Column({ name: 'webhook_auth_token', type: 'varchar', length: 500, nullable: true })
  webhookAuthToken: string;

  // DingTalk配置
  @Column({ name: 'dingtalk_webhook_url', type: 'varchar', length: 500, nullable: true })
  dingtalkWebhookUrl: string;

  @Column({ name: 'dingtalk_secret', type: 'varchar', length: 200, nullable: true })
  dingtalkSecret: string;

  @Column({ name: 'dingtalk_at_mobiles', type: 'simple-array', nullable: true })
  dingtalkAtMobiles: string[];

  @Column({ name: 'dingtalk_at_all', type: 'boolean', default: false })
  dingtalkAtAll: boolean;

  // WeChat Work配置
  @Column({ name: 'wechat_webhook_url', type: 'varchar', length: 500, nullable: true })
  wechatWebhookUrl: string;

  @Column({ name: 'wechat_mentioned_list', type: 'simple-array', nullable: true })
  wechatMentionedList: string[];

  @Column({ name: 'wechat_mentioned_mobile_list', type: 'simple-array', nullable: true })
  wechatMentionedMobileList: string[];

  // Slack配置
  @Column({ name: 'slack_webhook_url', type: 'varchar', length: 500, nullable: true })
  slackWebhookUrl: string;

  @Column({ name: 'slack_channel', type: 'varchar', length: 100, nullable: true })
  slackChannel: string;

  @Column({ name: 'slack_username', type: 'varchar', length: 100, nullable: true })
  slackUsername: string;

  @Column({ name: 'slack_icon_emoji', type: 'varchar', length: 50, nullable: true })
  slackIconEmoji: string;

  // 告警级别过滤
  @Column({ name: 'alert_levels', type: 'simple-array' })
  alertLevels: string[]; // ['info', 'warning', 'critical']

  @Column({ name: 'alert_types', type: 'simple-array', nullable: true })
  alertTypes: string[]; // 允许的告警类型

  // 时间限制
  @Column({ name: 'active_hours_start', type: 'varchar', length: 5, nullable: true })
  activeHoursStart: string; // HH:MM

  @Column({ name: 'active_hours_end', type: 'varchar', length: 5, nullable: true })
  activeHoursEnd: string; // HH:MM

  @Column({ name: 'active_days', type: 'simple-array', nullable: true })
  activeDays: string[]; // ['monday', 'tuesday', ...]

  @Column({ name: 'timezone', type: 'varchar', length: 50, nullable: true })
  timezone: string;

  // 频率限制
  @Column({ name: 'rate_limit_enabled', type: 'boolean', default: true })
  rateLimitEnabled: boolean;

  @Column({ name: 'max_alerts_per_hour', type: 'integer', default: 10 })
  maxAlertsPerHour: number;

  @Column({ name: 'max_alerts_per_day', type: 'integer', default: 50 })
  maxAlertsPerDay: number;

  @Column({ name: 'cooldown_period', type: 'integer', default: 300 })
  cooldownPeriod: number; // 秒，相同告警的冷却时间

  // 重试配置
  @Column({ name: 'retry_enabled', type: 'boolean', default: true })
  retryEnabled: boolean;

  @Column({ name: 'max_retries', type: 'integer', default: 3 })
  maxRetries: number;

  @Column({ name: 'retry_delay', type: 'integer', default: 60 })
  retryDelay: number; // 秒

  // 统计信息
  @Column({ name: 'total_sent', type: 'integer', default: 0 })
  totalSent: number;

  @Column({ name: 'successful_sent', type: 'integer', default: 0 })
  successfulSent: number;

  @Column({ name: 'failed_sent', type: 'integer', default: 0 })
  failedSent: number;

  @Column({ name: 'last_sent_at', type: 'timestamp', nullable: true })
  lastSentAt: Date;

  @Column({ name: 'last_success_at', type: 'timestamp', nullable: true })
  lastSuccessAt: Date;

  @Column({ name: 'last_failure_at', type: 'timestamp', nullable: true })
  lastFailureAt: Date;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage: string;

  // 健康检查
  @Column({ name: 'health_check_enabled', type: 'boolean', default: false })
  healthCheckEnabled: boolean;

  @Column({ name: 'last_health_check_at', type: 'timestamp', nullable: true })
  lastHealthCheckAt: Date;

  @Column({ name: 'health_status', type: 'varchar', length: 20, default: 'unknown' })
  healthStatus: string; // healthy, degraded, unhealthy, unknown

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
