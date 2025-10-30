import { NotificationType, NotificationStatus, NotificationChannel } from '../entities/notification.entity';

export { NotificationType, NotificationStatus, NotificationChannel };

export interface CreateNotificationDto {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
  channels?: NotificationChannel[];
}
