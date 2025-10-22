import { NotificationType, NotificationStatus, NotificationChannel } from '../entities/notification.entity';

export { NotificationType, NotificationStatus, NotificationChannel };

export interface CreateNotificationDto {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  data?: any;
  expiresAt?: Date;
  channels?: NotificationChannel[];
}
