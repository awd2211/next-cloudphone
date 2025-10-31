import {
  NotificationCategory,
  NotificationStatus,
  NotificationChannel,
} from '../entities/notification.entity';

export { NotificationCategory, NotificationStatus, NotificationChannel };

export interface CreateNotificationDto {
  userId: string;
  type?: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
  channels?: NotificationChannel[];
}
