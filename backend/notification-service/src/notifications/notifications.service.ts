import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationChannel, NotificationStatus } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationGateway } from '../websocket/websocket.gateway';
import { EmailService } from '../email/email.service';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    private websocketGateway: NotificationGateway,
    private emailService: EmailService,
  ) {}

  async sendNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(dto);
    const savedNotification = await this.notificationRepository.save(notification);

    const channels = dto.channels || [NotificationChannel.IN_APP];

    for (const channel of channels) {
      try {
        switch (channel) {
          case NotificationChannel.WEBSOCKET:
          case NotificationChannel.IN_APP:
            this.websocketGateway.sendToUser(dto.userId, 'notification', savedNotification);
            break;
          case NotificationChannel.EMAIL:
            // Email 发送逻辑
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send via ${channel}:`, error);
      }
    }

    savedNotification.markAsSent();
    await this.notificationRepository.save(savedNotification);

    return savedNotification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const where: any = { userId };
    if (unreadOnly) {
      where.status = NotificationStatus.SENT;
    }
    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });
    if (notification) {
      notification.markAsRead();
      await this.notificationRepository.save(notification);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.SENT },
    });
  }
}
