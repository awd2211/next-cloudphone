import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CreateNotificationDto } from './notification.interface';
import {
  Notification,
  NotificationStatus,
  NotificationCategory,
  NotificationChannel,
} from '../entities/notification.entity';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationPreferencesService } from './preferences.service';
import {
  NotificationChannel as PrefChannel,
  NotificationType as PrefType,
  getNotificationCategory,
} from '@cloudphone/shared';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { UnifiedCacheService } from '@cloudphone/shared';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';
import { TemplatesService } from '../templates/templates.service';
import { trace, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly tracer = trace.getTracer('notification-service');

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly gateway: NotificationGateway,
    private cacheService: UnifiedCacheService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * 创建并发送通知
   */
  async createAndSend(dto: CreateNotificationDto): Promise<Notification> {
    // 创建通知记录
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type || NotificationCategory.SYSTEM,
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

    // ✅ 清除用户通知相关的所有缓存
    await this.invalidateUserNotificationCache(dto.userId);

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

    // ✅ 清除用户通知相关的所有缓存
    await this.invalidateUserNotificationCache(notification.userId);

    return updated;
  }

  /**
   * 获取用户的所有通知（分页）
   * ✅ 使用统一缓存优化查询性能
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Notification[]; total: number }> {
    return this.cacheService.wrap(
      CacheKeys.notificationList(userId, undefined, page, limit),
      async () => {
        // 从数据库查询
        const [data, total] = await this.notificationRepository.findAndCount({
          where: { userId },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return { data, total };
      },
      CacheTTL.NOTIFICATION_LIST // 2 minutes
    );
  }

  /**
   * 获取用户未读通知数量
   * ✅ 使用缓存优化高频查询
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.cacheService.wrap(
      CacheKeys.unreadCount(userId),
      async () => {
        return await this.notificationRepository.count({
          where: {
            userId,
            status: NotificationStatus.SENT,
          },
        });
      },
      CacheTTL.UNREAD_COUNT // 1 minute
    );
  }

  /**
   * 获取用户未读通知
   * ✅ 使用缓存优化高频查询
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.cacheService.wrap(
      CacheKeys.notificationList(userId, false), // isRead = false (未读)
      async () => {
        return await this.notificationRepository.find({
          where: {
            userId,
            status: NotificationStatus.SENT,
          },
          order: { createdAt: 'DESC' },
          take: 50, // 最多返回50条未读
        });
      },
      CacheTTL.NOTIFICATION_LIST // 2 minutes
    );
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    // 先查询通知获取 userId（用于清除缓存）
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      select: ['id', 'userId'],
    });

    const result = await this.notificationRepository.delete(notificationId);

    if (result.affected && result.affected > 0) {
      this.logger.log(`通知已删除: ${notificationId}`);

      // ✅ 清除用户通知相关的所有缓存
      if (notification) {
        await this.invalidateUserNotificationCache(notification.userId);
      }

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
      }
    );

    const updated = result.affected || 0;
    this.logger.log(`用户 ${userId} 的 ${updated} 条通知已标记为已读`);

    // ✅ 清除用户通知相关的所有缓存
    await this.invalidateUserNotificationCache(userId);

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
   * ✅ 使用缓存优化统计查询
   */
  async getStats() {
    return this.cacheService.wrap(
      CacheKeys.globalStats('all'),
      async () => {
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
          .where("notification.createdAt > NOW() - INTERVAL '7 days'")
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
      },
      CacheTTL.GLOBAL_STATS // 10 minutes
    );
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
    }
  ): Promise<void> {
    // 创建自定义 span 用于追踪通知发送
    return await this.tracer.startActiveSpan(
      'notification.send_multi_channel',
      {
        attributes: {
          'user.id': userId,
          'notification.type': type,
          'notification.title': payload.title,
        },
      },
      async (span) => {
        try {
          // 获取用户偏好
          const preference = await this.preferencesService.getUserPreference(userId, type);

          // 检查是否启用
          if (!preference.enabled) {
            this.logger.log(`Notification ${type} disabled for user ${userId}`);
            span.setAttributes({
              'notification.enabled': false,
            });
            span.setStatus({ code: SpanStatusCode.OK });
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
              PrefChannel.WEBSOCKET
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
              PrefChannel.EMAIL
            );

            if (shouldSend) {
              promises.push(
                this.sendEmailNotification(userId, {
                  ...payload,
                  userEmail: payload.userEmail!,
                })
              );
            }
          }

          // 3. 短信通知
          if (channels.includes(PrefChannel.SMS) && payload.userPhone) {
            const shouldSend = await this.preferencesService.shouldReceiveNotification(
              userId,
              type,
              PrefChannel.SMS
            );

            if (shouldSend) {
              promises.push(
                this.sendSmsNotification(userId, {
                  ...payload,
                  userPhone: payload.userPhone!,
                })
              );
            }
          }

          // 并行发送所有渠道
          await Promise.allSettled(promises);

          // 添加运行时属性
          span.setAttributes({
            'notification.enabled': true,
            'notification.channels_count': channels.length,
            'notification.channels': channels.join(','),
            'notification.promises_count': promises.length,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          this.logger.log(
            `Multi-channel notification sent for user ${userId}, type ${type}, channels: ${channels.join(', ')}`
          );
        } catch (error) {
          this.logger.error(`Failed to send multi-channel notification for user ${userId}:`, error);
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Multi-channel notification failed',
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 🎯 创建角色化通知
   *
   * 根据用户角色自动选择和渲染合适的通知模板
   *
   * @param userId - 用户ID
   * @param userRole - 用户角色（如 super_admin, tenant_admin, admin, user）
   * @param type - 通知类型（来自偏好枚举）
   * @param data - 渲染数据
   * @param options - 可选配置
   * @returns 创建的通知
   */
  async createRoleBasedNotification(
    userId: string,
    userRole: string,
    type: PrefType,
    data: Record<string, any>,
    options?: {
      userEmail?: string;
      userPhone?: string;
      expiresAt?: Date;
      language?: string;
    },
  ): Promise<Notification> {
    try {
      // 1. 根据角色渲染模板
      const templateCode = type; // 使用通知类型作为模板代码
      const rendered = await this.templatesService.renderWithRole(
        templateCode,
        userRole,
        data,
        options?.language,
      );

      this.logger.log(
        `Rendered role-based template for user ${userId} (role: ${userRole}), type: ${type}`
      );

      // 2. 获取用户偏好
      const preference = await this.preferencesService.getUserPreference(userId, type);

      // 3. 检查是否启用
      if (!preference.enabled) {
        this.logger.log(`Notification ${type} disabled for user ${userId}`);
        // 即使禁用，也创建通知记录（只是不发送）
        const notification = this.notificationRepository.create({
          userId,
          type: getNotificationCategory(type),
          status: NotificationStatus.PENDING,
          title: rendered.title,
          message: rendered.body,
          data,
          expiresAt: options?.expiresAt,
          channels: [],
        });

        return await this.notificationRepository.save(notification);
      }

      // 4. 准备多渠道发送
      const channels = preference.enabledChannels;
      const promises: Promise<void>[] = [];

      // 5. 创建通知记录
      const notification = this.notificationRepository.create({
        userId,
        type: getNotificationCategory(type),
        status: NotificationStatus.PENDING,
        title: rendered.title,
        message: rendered.body,
        data,
        expiresAt: options?.expiresAt,
        channels: channels.map((ch) => this.mapPrefChannelToEntity(ch)),
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // 6. 发送到各个渠道
      // WebSocket 通知（站内信）
      if (channels.includes(PrefChannel.WEBSOCKET)) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.WEBSOCKET,
        );

        if (shouldSend) {
          try {
            this.gateway.sendToUser(userId, savedNotification);
            savedNotification.status = NotificationStatus.SENT;
            savedNotification.sentAt = new Date();
          } catch (error) {
            this.logger.error(`WebSocket send failed for ${userId}:`, error);
          }
        }
      }

      // 邮件通知
      if (channels.includes(PrefChannel.EMAIL) && options?.userEmail && rendered.emailHtml) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.EMAIL,
        );

        if (shouldSend) {
          promises.push(
            this.emailService
              .sendEmail({
                to: options.userEmail,
                subject: rendered.title,
                html: rendered.emailHtml,
              })
              .then(() => {
                this.logger.log(`Email sent to ${options.userEmail} for user ${userId}`);
              })
              .catch((error) => {
                this.logger.error(`Email send failed for ${userId}:`, error);
              }),
          );
        }
      }

      // 短信通知
      if (channels.includes(PrefChannel.SMS) && options?.userPhone && rendered.smsText) {
        const shouldSend = await this.preferencesService.shouldReceiveNotification(
          userId,
          type,
          PrefChannel.SMS,
        );

        if (shouldSend) {
          promises.push(
            this.smsService
              .sendNotification(options.userPhone, rendered.smsText)
              .then(() => {
                this.logger.log(`SMS sent to ${options.userPhone} for user ${userId}`);
              })
              .catch((error) => {
                this.logger.error(`SMS send failed for ${userId}:`, error);
              }),
          );
        }
      }

      // 并行发送所有渠道
      await Promise.allSettled(promises);

      // 7. 更新通知状态
      if (savedNotification.status === NotificationStatus.PENDING && promises.length > 0) {
        savedNotification.status = NotificationStatus.SENT;
        savedNotification.sentAt = new Date();
      }

      await this.notificationRepository.save(savedNotification);

      // 8. 清除缓存
      await this.invalidateUserNotificationCache(userId);

      this.logger.log(
        `Role-based notification created for user ${userId} (role: ${userRole}), channels: ${channels.join(', ')}`
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Failed to create role-based notification for user ${userId} (role: ${userRole}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * 🎯 批量创建角色化通知
   *
   * 为多个用户创建通知，自动按角色分组渲染模板
   *
   * @param users - 用户列表（包含 userId 和 role）
   * @param type - 通知类型
   * @param dataProvider - 数据提供函数（根据 userId 生成渲染数据）
   * @param options - 可选配置
   * @returns 创建的通知数组
   */
  async createBulkRoleBasedNotifications(
    users: Array<{ userId: string; role: string; email?: string; phone?: string }>,
    type: PrefType,
    dataProvider: (userId: string, role: string) => Record<string, any> | Promise<Record<string, any>>,
    options?: {
      expiresAt?: Date;
      language?: string;
    },
  ): Promise<Notification[]> {
    if (!users || users.length === 0) {
      this.logger.warn('No users provided for bulk role-based notifications');
      return [];
    }

    try {
      // 1. 按角色分组
      const usersByRole = users.reduce(
        (acc, user) => {
          if (!acc[user.role]) {
            acc[user.role] = [];
          }
          acc[user.role].push(user);
          return acc;
        },
        {} as Record<string, typeof users>,
      );

      this.logger.log(
        `Creating bulk role-based notifications for ${users.length} users, ` +
          `grouped into ${Object.keys(usersByRole).length} roles`
      );

      // 2. 为每个角色组并行处理
      const roleResults = await Promise.allSettled(
        Object.entries(usersByRole).map(async ([role, roleUsers]) => {
          // 为当前角色的用户并行创建通知
          const notifications = await Promise.allSettled(
            roleUsers.map(async (user) => {
              try {
                // 获取用户专属数据
                const userData = await Promise.resolve(dataProvider(user.userId, role));

                // 创建角色化通知
                return await this.createRoleBasedNotification(
                  user.userId,
                  role,
                  type,
                  userData,
                  {
                    userEmail: user.email,
                    userPhone: user.phone,
                    expiresAt: options?.expiresAt,
                    language: options?.language,
                  },
                );
              } catch (error) {
                this.logger.error(
                  `Failed to create notification for user ${user.userId} (role: ${role}):`,
                  error,
                );
                return null;
              }
            }),
          );

          // 提取成功的通知
          return notifications
            .filter(
              (result): result is PromiseFulfilledResult<Notification> =>
                result.status === 'fulfilled' && result.value !== null,
            )
            .map((result) => result.value);
        }),
      );

      // 3. 合并所有角色的通知结果
      const allNotifications = roleResults
        .filter((result): result is PromiseFulfilledResult<Notification[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      this.logger.log(
        `Bulk role-based notifications created: ${allNotifications.length}/${users.length} succeeded`
      );

      return allNotifications;
    } catch (error) {
      this.logger.error('Failed to create bulk role-based notifications:', error);
      throw error;
    }
  }

  /**
   * 辅助方法：映射偏好渠道到实体渠道
   */
  private mapPrefChannelToEntity(channel: PrefChannel): NotificationChannel {
    switch (channel) {
      case PrefChannel.WEBSOCKET:
        return NotificationChannel.WEBSOCKET;
      case PrefChannel.EMAIL:
        return NotificationChannel.EMAIL;
      case PrefChannel.SMS:
        return NotificationChannel.SMS;
      default:
        return NotificationChannel.WEBSOCKET;
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
    }
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
    }
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: payload.userEmail,
        subject: payload.title,
        html: payload.template ? undefined : `<p>${payload.message}</p>`,
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
    }
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

  /**
   * ✅ 清除用户通知相关的所有缓存
   * @param userId 用户ID
   */
  private async invalidateUserNotificationCache(userId: string): Promise<void> {
    // 清除未读计数缓存
    await this.cacheService.del(CacheKeys.unreadCount(userId));

    // 清除用户通知列表缓存（使用模式匹配）
    await this.cacheService.delPattern(CacheKeys.userNotificationPattern(userId));

    this.logger.debug(`User notification cache invalidated: ${userId}`);
  }
}
