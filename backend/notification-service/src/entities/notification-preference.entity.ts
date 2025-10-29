import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  WEBSOCKET = 'websocket', // 网页实时通知（站内信）
  EMAIL = 'email', // 邮件通知
  SMS = 'sms', // 短信通知
}

/**
 * 通知类型枚举
 *
 * 涵盖系统中所有可能的通知场景
 */
export enum NotificationType {
  // ========== 设备相关 ==========
  DEVICE_CREATED = 'device.created', // 设备创建成功
  DEVICE_CREATION_FAILED = 'device.creation_failed', // 设备创建失败
  DEVICE_STARTED = 'device.started', // 设备启动
  DEVICE_STOPPED = 'device.stopped', // 设备停止
  DEVICE_ERROR = 'device.error', // 设备故障
  DEVICE_CONNECTION_LOST = 'device.connection_lost', // 设备连接丢失
  DEVICE_DELETED = 'device.deleted', // 设备删除
  DEVICE_EXPIRING_SOON = 'device.expiring_soon', // 设备即将过期（提前通知）
  DEVICE_EXPIRED = 'device.expired', // 设备已过期

  // ========== 应用相关 ==========
  APP_INSTALLED = 'app.installed', // 应用安装成功
  APP_UNINSTALLED = 'app.uninstalled', // 应用卸载成功
  APP_INSTALL_FAILED = 'app.install_failed', // 应用安装失败
  APP_APPROVED = 'app.approved', // 应用审核通过
  APP_REJECTED = 'app.rejected', // 应用审核被拒

  // ========== 计费相关 ==========
  BILLING_LOW_BALANCE = 'billing.low_balance', // 余额不足预警
  BILLING_PAYMENT_SUCCESS = 'billing.payment_success', // 充值成功
  BILLING_PAYMENT_FAILED = 'billing.payment_failed', // 充值失败
  BILLING_INVOICE_GENERATED = 'billing.invoice_generated', // 账单生成
  BILLING_SUBSCRIPTION_EXPIRING = 'billing.subscription_expiring', // 套餐即将到期
  BILLING_SUBSCRIPTION_EXPIRED = 'billing.subscription_expired', // 套餐已到期

  // ========== 用户相关 ==========
  USER_REGISTERED = 'user.registered', // 用户注册成功
  USER_LOGIN = 'user.login', // 用户登录（可选）
  USER_PASSWORD_CHANGED = 'user.password_changed', // 密码修改
  USER_PROFILE_UPDATED = 'user.profile_updated', // 个人信息更新

  // ========== 系统相关 ==========
  SYSTEM_MAINTENANCE = 'system.maintenance', // 系统维护通知
  SYSTEM_ANNOUNCEMENT = 'system.announcement', // 系统公告
  SYSTEM_UPDATE = 'system.update', // 系统更新
  SYSTEM_SECURITY_ALERT = 'system.security_alert', // 安全警报
}

/**
 * 通知偏好实体
 *
 * 存储用户对每种通知类型的偏好设置
 */
@Entity('notification_preferences')
@Index(['userId', 'notificationType'], { unique: true })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 用户ID（来自 user-service）
   */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  /**
   * 通知类型
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  notificationType: NotificationType;

  /**
   * 是否启用该类型通知
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * 启用的通知渠道
   *
   * 用户可以选择通过哪些渠道接收此类通知
   * 例如: ['websocket', 'email'] - 只接收网页和邮件通知，不接收短信
   */
  @Column({
    type: 'simple-array',
    default: '',
  })
  enabledChannels: NotificationChannel[];

  /**
   * 自定义设置（JSON）
   *
   * 支持扩展配置，例如:
   * {
   *   "quietHours": {
   *     "enabled": true,
   *     "start": "22:00",
   *     "end": "08:00",
   *     "timezone": "Asia/Shanghai"
   *   },
   *   "frequency": {
   *     "limit": 5,
   *     "period": "hour"
   *   }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  customSettings?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
