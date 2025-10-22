import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  CreateNotificationDto,
  NotificationStatus,
} from './notification.interface';
import { NotificationGateway } from '../gateway/notification.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notifications: Map<string, Notification> = new Map();
  private userNotifications: Map<string, Set<string>> = new Map();

  constructor(private readonly gateway: NotificationGateway) {}

  /**
   * 创建并发送通知
   */
  async createAndSend(dto: CreateNotificationDto): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId: dto.userId,
      type: dto.type,
      status: NotificationStatus.PENDING,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      createdAt: new Date(),
      expiresAt: dto.expiresAt,
    };

    // 存储通知
    this.notifications.set(notification.id, notification);

    // 添加到用户通知索引
    if (!this.userNotifications.has(dto.userId)) {
      this.userNotifications.set(dto.userId, new Set());
    }
    this.userNotifications.get(dto.userId).add(notification.id);

    // 通过 WebSocket 发送
    try {
      this.gateway.sendToUser(dto.userId, notification);
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      this.logger.log(`通知已发送: ${notification.id} -> 用户: ${dto.userId}`);
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      this.logger.error(`通知发送失败: ${notification.id}`, error);
    }

    return notification;
  }

  /**
   * 广播通知到所有用户
   */
  async broadcast(title: string, message: string, data?: any): Promise<void> {
    this.logger.log(`广播通知: ${title}`);
    this.gateway.broadcast({
      type: 'system',
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 标记通知为已读
   */
  markAsRead(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return null;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    this.logger.log(`通知已标记为已读: ${notificationId}`);

    return notification;
  }

  /**
   * 获取用户的所有通知
   */
  getUserNotifications(userId: string): Notification[] {
    const notificationIds = this.userNotifications.get(userId);
    if (!notificationIds) {
      return [];
    }

    const notifications: Notification[] = [];
    notificationIds.forEach(id => {
      const notification = this.notifications.get(id);
      if (notification) {
        notifications.push(notification);
      }
    });

    // 按创建时间倒序排列
    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 获取用户未读通知
   */
  getUnreadNotifications(userId: string): Notification[] {
    return this.getUserNotifications(userId).filter(
      n => n.status !== NotificationStatus.READ,
    );
  }

  /**
   * 删除通知
   */
  deleteNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    // 从用户通知索引中删除
    const userNotifs = this.userNotifications.get(notification.userId);
    if (userNotifs) {
      userNotifs.delete(notificationId);
    }

    // 删除通知
    this.notifications.delete(notificationId);
    this.logger.log(`通知已删除: ${notificationId}`);

    return true;
  }

  /**
   * 清理过期通知
   */
  cleanupExpiredNotifications(): number {
    const now = new Date();
    let count = 0;

    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.deleteNotification(id);
        count++;
      }
    });

    if (count > 0) {
      this.logger.log(`已清理 ${count} 条过期通知`);
    }

    return count;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalNotifications: this.notifications.size,
      totalUsers: this.userNotifications.size,
      connectedClients: this.gateway.getConnectedClientsCount(),
      byStatus: {
        pending: Array.from(this.notifications.values()).filter(
          n => n.status === NotificationStatus.PENDING,
        ).length,
        sent: Array.from(this.notifications.values()).filter(
          n => n.status === NotificationStatus.SENT,
        ).length,
        read: Array.from(this.notifications.values()).filter(
          n => n.status === NotificationStatus.READ,
        ).length,
        failed: Array.from(this.notifications.values()).filter(
          n => n.status === NotificationStatus.FAILED,
        ).length,
      },
    };
  }
}
