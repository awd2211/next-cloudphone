import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  TICKET_REPLY = 'ticket_reply',           // 工单回复
  TICKET_ASSIGNED = 'ticket_assigned',     // 工单分配
  TICKET_RESOLVED = 'ticket_resolved',     // 工单已解决
  BALANCE_LOW = 'balance_low',             // 余额不足
  BALANCE_RECHARGED = 'balance_recharged', // 余额充值
  BALANCE_CONSUMED = 'balance_consumed',   // 余额消费
  QUOTA_EXCEEDED = 'quota_exceeded',       // 配额超限
  QUOTA_WARNING = 'quota_warning',         // 配额预警
  INVOICE_GENERATED = 'invoice_generated', // 账单生成
  INVOICE_DUE = 'invoice_due',             // 账单到期
  INVOICE_OVERDUE = 'invoice_overdue',     // 账单逾期
  DEVICE_STARTED = 'device_started',       // 设备启动
  DEVICE_STOPPED = 'device_stopped',       // 设备停止
  DEVICE_ERROR = 'device_error',           // 设备错误
  SYSTEM_MAINTENANCE = 'system_maintenance', // 系统维护
  SYSTEM_UPDATE = 'system_update',         // 系统更新
}

export enum NotificationChannel {
  WEBSOCKET = 'websocket', // WebSocket 实时通知
  EMAIL = 'email',         // 邮件通知
  SMS = 'sms',             // 短信通知
  IN_APP = 'in_app',       // 应用内通知
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',     // 待发送
  SENT = 'sent',           // 已发送
  DELIVERED = 'delivered', // 已送达
  READ = 'read',           // 已读
  FAILED = 'failed',       // 发送失败
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: ['in_app'],
  })
  channels: NotificationChannel[];

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  @Index()
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>; // 附加数据

  @Column({ type: 'varchar', nullable: true })
  @Index()
  resourceType: string; // 关联资源类型 (ticket, device, invoice)

  @Column({ type: 'varchar', nullable: true })
  @Index()
  resourceId: string; // 关联资源 ID

  @Column({ type: 'varchar', nullable: true })
  actionUrl: string; // 点击后的跳转链接

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 过期时间

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isRead(): boolean {
    return this.status === NotificationStatus.READ;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  markAsRead(): void {
    if (this.status !== NotificationStatus.READ) {
      this.status = NotificationStatus.READ;
      this.readAt = new Date();
    }
  }

  markAsSent(): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  markAsFailed(): void {
    this.status = NotificationStatus.FAILED;
  }
}
