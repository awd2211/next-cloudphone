import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateNotificationDto } from './notification.interface';
import { Notification, NotificationStatus, NotificationType } from '../entities/notification.entity';
import { NotificationGateway } from '../gateway/notification.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly gateway: NotificationGateway,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * 创建并发送通知
   */
  async createAndSend(dto: CreateNotificationDto): Promise<Notification> {
    // 创建通知记录
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type as NotificationType || NotificationType.SYSTEM,
      status: NotificationStatus.PENDING,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      expiresAt: dto.expiresAt,
      channels: dto.channels || ['websocket'],
    });

    // 保存到数据库
    const savedNotification = await this.notificationRepository.save(notification);

    // 通过 WebSocket 发送
    try {
      this.gateway.sendToUser(dto.userId, savedNotification);
      savedNotification.status = NotificationStatus.SENT;
      savedNotification.sentAt = new Date();
      await this.notificationRepository.save(savedNotification);
      
      this.logger.log(`通知已发送: ${savedNotification.id} -> 用户: ${dto.userId}`);
    } catch (error) {
      savedNotification.status = NotificationStatus.FAILED;
      savedNotification.errorMessage = error.message;
      await this.notificationRepository.save(savedNotification);
      
      this.logger.error(`通知发送失败: ${savedNotification.id}`, error.stack);
    }

    // 清除用户通知缓存
    await this.cacheManager.del(`user:${dto.userId}:notifications`);

    return savedNotification;
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
  async markAsRead(notificationId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    
    const updated = await this.notificationRepository.save(notification);
    this.logger.log(`通知已标记为已读: ${notificationId}`);

    // 清除缓存
    await this.cacheManager.del(`user:${notification.userId}:notifications`);

    return updated;
  }

  /**
   * 获取用户的所有通知（分页）
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Notification[]; total: number }> {
    // 尝试从缓存获取
    const cacheKey = `user:${userId}:notifications:${page}:${limit}`;
    const cached = await this.cacheManager.get<{ data: Notification[]; total: number }>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const [data, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = { data, total };

    // 缓存结果（1分钟）
    await this.cacheManager.set(cacheKey, result, 60);

    return result;
  }

  /**
   * 获取用户未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
    });
  }

  /**
   * 获取用户未读通知
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
      order: { createdAt: 'DESC' },
      take: 50, // 最多返回50条未读
    });
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete(notificationId);
    
    if (result.affected > 0) {
      this.logger.log(`通知已删除: ${notificationId}`);
      return true;
    }

    return false;
  }

  /**
   * 清理过期通知（定时任务调用）
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const now = new Date();
    
    const result = await this.notificationRepository.delete({
      expiresAt: LessThan(now),
    });

    const count = result.affected || 0;

    if (count > 0) {
      this.logger.log(`已清理 ${count} 条过期通知`);
    }

    return count;
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const total = await this.notificationRepository.count();
    const byStatus = await Promise.all([
      this.notificationRepository.count({ where: { status: NotificationStatus.PENDING } }),
      this.notificationRepository.count({ where: { status: NotificationStatus.SENT } }),
      this.notificationRepository.count({ where: { status: NotificationStatus.READ } }),
      this.notificationRepository.count({ where: { status: NotificationStatus.FAILED } }),
    ]);

    // 统计最近活跃的用户
    const activeUsers = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('COUNT(DISTINCT notification.userId)', 'count')
      .where('notification.createdAt > NOW() - INTERVAL \'7 days\'')
      .getRawOne();

    return {
      totalNotifications: total,
      activeUsers: parseInt(activeUsers.count || 0),
      connectedClients: this.gateway.getConnectedClientsCount(),
      byStatus: {
        pending: byStatus[0],
        sent: byStatus[1],
        read: byStatus[2],
        failed: byStatus[3],
      },
    };
  }
}
