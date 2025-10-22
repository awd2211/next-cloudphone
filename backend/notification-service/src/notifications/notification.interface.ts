export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SYSTEM = 'system',
}

export enum NotificationStatus {
  PENDING = 'pending',   // 待发送
  SENT = 'sent',         // 已发送
  READ = 'read',         // 已读
  FAILED = 'failed',     // 失败
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: any;           // 额外数据
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;     // 过期时间
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  expiresAt?: Date;
}
