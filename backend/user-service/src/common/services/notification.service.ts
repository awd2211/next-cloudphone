import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';

export interface CreateNotificationDto {
  title: string;
  content: string;
  type: NotificationType;
  userIds?: string[];
  sendToAll?: boolean;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 获取用户通知列表（分页）
   */
  async findAllByUser(
    userId: string,
    params: PaginationParams = {},
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      isRead,
      type,
    } = params;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    // 过滤条件
    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 创建通知
   */
  async create(dto: CreateNotificationDto): Promise<Notification[]> {
    const notifications: Notification[] = [];

    if (dto.sendToAll) {
      // TODO: 实现给所有用户发送通知的逻辑
      // 这里需要查询所有用户ID，但为了性能考虑，应该使用队列异步处理
      throw new Error('发送给所有用户的功能需要使用队列实现');
    } else if (dto.userIds && dto.userIds.length > 0) {
      // 为指定用户创建通知
      for (const userId of dto.userIds) {
        const notification = this.notificationRepository.create({
          title: dto.title,
          content: dto.content,
          type: dto.type,
          userId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          actionUrl: dto.actionUrl,
          metadata: dto.metadata,
        });
        notifications.push(notification);
      }

      await this.notificationRepository.save(notifications);
    }

    return notifications;
  }

  /**
   * 标记为已读
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  /**
   * 全部标记为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();
  }

  /**
   * 删除通知
   */
  async remove(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    await this.notificationRepository.remove(notification);
  }

  /**
   * 批量删除通知
   */
  async batchRemove(userId: string, notificationIds: string[]): Promise<void> {
    await this.notificationRepository.delete({
      id: In(notificationIds),
      userId,
    });
  }
}
