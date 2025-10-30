import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateNotificationDto } from './notification.interface';
import { Notification, NotificationStatus, NotificationCategory, NotificationChannel } from '../entities/notification.entity';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationPreferencesService } from './preferences.service';
import { NotificationChannel as PrefChannel, NotificationType as PrefType, getNotificationCategory } from '@cloudphone/shared';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly gateway: NotificationGateway,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
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
      channels: dto.channels || [NotificationChannel.WEBSOCKET],
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
  async broadcast(title: string, message: string, data?: Record<string, unknown>): Promise<void> {
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

    // 缓存结果（1分钟 = 60000ms）
    await this.cacheManager.set(cacheKey, result, 60000);

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

    if (result.affected && result.affected > 0) {
      this.logger.log(`通知已删除: ${notificationId}`);
      return true;
    }

    return false;
  }

  /**
   * 标记用户所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      {
        userId,
        status: NotificationStatus.SENT,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    const updated = result.affected || 0;
    this.logger.log(`用户 ${userId} 的 ${updated} 条通知已标记为已读`);

    // 清除用户通知缓存
    await this.cacheManager.del(`user:${userId}:notifications`);

    return { updated };
  }

  /**
   * 批量删除通知
   */
  async batchDelete(ids: string[]): Promise<{ deleted: number }> {
    if (!ids || ids.length === 0) {
      return { deleted: 0 };
    }

    const result = await this.notificationRepository.delete(ids);
    const deleted = result.affected || 0;

    this.logger.log(`批量删除了 ${deleted} 条通知`);

    return { deleted };
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

  /**
   * ========== 增强的多渠道通知发送 ==========
   * 集成用户偏好过滤和多渠道支持
   */

  /**
   * 发送多渠道通知（带偏好过滤）
   *
   * @param userId - 用户ID
   * @param type - 通知类型（来自偏好枚举）
   * @param payload - 通知数据
   */
  async sendMultiChannelNotification(
    userId: string,
    type: PrefType,
    payload: {
      title: string;
      message: string;
      data?: Record<string, unknown>;
      userEmail?: string;
      userPhone?: string;
      template?: string;
      templateContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      // 获取用户偏好
      const preference = await this.preferencesService.getUserPreference(userId, type);

      // 检查是否启用
      if (!preference.enabled) {
        this.logger.log(`Notification ${type} disabled for user ${userId}`);
        return;
      }

      // 获取启用的渠道
      const channels = preference.enabledChannels;
      const promises: Promise<void>[] = [];

      // 1. WebSocket 通知（站内信）
      if (channels.includes(PrefChannel.WEBSOCKET)) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.WEBSOCKET,
        );

        if (shouldSend) {
          promises.push(this.sendWebSocketNotification(userId, type, payload));
        }
      }

      // 2. 邮件通知
      if (channels.includes(PrefChannel.EMAIL) && payload.userEmail) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.EMAIL,
        );

        if (shouldSend) {
          promises.push(
            this.sendEmailNotification(userId, {
              ...payload,
              userEmail: payload.userEmail!,
            }),
          );
        }
      }

      // 3. 短信通知
      if (channels.includes(PrefChannel.SMS) && payload.userPhone) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.SMS,
        );

        if (shouldSend) {
          promises.push(
            this.sendSmsNotification(userId, {
              ...payload,
              userPhone: payload.userPhone!,
            }),
          );
        }
      }

      // 并行发送所有渠道
      await Promise.allSettled(promises);

      this.logger.log(
        `Multi-channel notification sent for user ${userId}, type ${type}, channels: ${channels.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send multi-channel notification for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 发送 WebSocket 通知
   */
  private async sendWebSocketNotification(
    userId: string,
    type: PrefType,
    payload: {
      title: string;
      message: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const notification = await this.createAndSend({
      userId,
      type: getNotificationCategory(type),
      title: payload.title,
      message: payload.message,
      data: payload.data,
    });

    this.logger.log(`WebSocket notification sent: ${notification.id}`);
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    userId: string,
    payload: {
      title: string;
      message: string;
      userEmail: string;
      template?: string;
      templateContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: payload.userEmail,
        subject: payload.title,
        html: payload.template
          ? undefined
          : `<p>${payload.message}</p>`,
        template: payload.template,
        context: payload.templateContext || {
          title: payload.title,
          message: payload.message,
        },
      });

      this.logger.log(`Email notification sent to ${payload.userEmail}`);
    } catch (error) {
      this.logger.error(`Email notification failed: ${error.message}`);
    }
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(
    userId: string,
    payload: {
      title: string;
      message: string;
      userPhone: string;
    },
  ): Promise<void> {
    try {
      await this.smsService.sendNotification(payload.userPhone, payload.message);

      this.logger.log(`SMS notification sent to ${payload.userPhone}`);
    } catch (error) {
      this.logger.error(`SMS notification failed: ${error.message}`);
    }
  }

  /**
   * @deprecated 已替换为 getNotificationCategory() from @cloudphone/shared
   * 保留以供参考，可以删除
   */
  // private mapToLegacyType(type: PrefType): string {
  //   return type.replace('.', '_').toUpperCase();
  // }
}
