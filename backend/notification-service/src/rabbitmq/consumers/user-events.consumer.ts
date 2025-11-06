import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  UserRegisteredEvent,
  UserLoginFailedEvent,
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  TwoFactorEnabledEvent,
  ProfileUpdatedEvent,
  NotificationEventTypes,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationCategory } from '../../entities/notification.entity';

/**
 * User Service 事件消费者
 * 监听用户服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部6个事件已集成)
 * ✅ 2025-11-03: 全面升级到角色化通知系统 (6/6 已完成)
 *   - 所有事件处理器使用 createRoleBasedNotification()
 *   - 支持角色特定模板（super_admin, tenant_admin, admin, user）
 *   - 从 event.payload.userRole 获取角色信息
 */
@Injectable()
export class UserEventsConsumer {
  private readonly logger = new Logger(UserEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService
  ) {}

  /**
   * 用户注册成功
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.USER_REGISTERED,
    queue: 'notification-service.user.registered',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
        'x-dead-letter-routing-key': 'user.registered.failed',
        'x-max-priority': 10, // 支持消息优先级 (0-10)
      },
    },
  })
  async handleUserRegistered(event: UserRegisteredEvent, msg: ConsumeMessage) {
    this.logger.log(`收到用户注册事件: ${event.payload.username} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const loginUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/login`;

      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'user.registered' as any,
        {
          username: event.payload.username,
          email: event.payload.email,
          registeredAt: event.payload.registerTime,
          loginUrl,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`用户注册通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理用户注册事件失败: ${error.message}`, error.stack);
      throw error; // 重新抛出错误触发重试
    }
  }

  /**
   * 用户登录失败（多次）
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.USER_LOGIN_FAILED,
    queue: 'notification-service.user.login_failed',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleLoginFailed(event: UserLoginFailedEvent, msg: ConsumeMessage) {
    this.logger.warn(
      `收到登录失败事件: ${event.payload.username}, 失败次数: ${event.payload.failureCount} - Role: ${event.payload.userRole || 'N/A'}`
    );

    try {
      // 只有当失败次数达到阈值时才发送通知
      if (event.payload.failureCount >= 3 && event.payload.userId) {
        // ✅ 使用角色化通知系统
        await this.notificationsService.createRoleBasedNotification(
          event.payload.userId,
          event.payload.userRole || 'user',  // ✅ 用户角色（登录失败时可能为空，默认为user）
          'user.login_failed' as any,
          {
            username: event.payload.username,
            ipAddress: event.payload.ipAddress,
            location: '未知位置', // 可以集成IP地理位置服务
            attemptTime: event.payload.timestamp,
            failureCount: event.payload.failureCount,
          },
          {
            userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
          }
        );

        this.logger.log(`登录失败告警已发送: ${event.payload.username}`);
      }
    } catch (error) {
      this.logger.error(`处理登录失败事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 密码重置请求
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PASSWORD_RESET_REQUESTED,
    queue: 'notification-service.user.password_reset_requested',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到密码重置请求: ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const resetUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/reset-password?token=${event.payload.resetToken}`;

      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'user.password_reset' as any,
        {
          username: event.payload.username || '用户',
          resetUrl,
          code: event.payload.resetToken.substring(0, 6), // 前6位作为验证码
          expiresAt: event.payload.expiresAt,
          email: event.payload.email,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`密码重置通知已发送: ${event.payload.email}`);
    } catch (error) {
      this.logger.error(`处理密码重置请求失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 密码已更改
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PASSWORD_CHANGED,
    queue: 'notification-service.user.password_changed',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handlePasswordChanged(event: PasswordChangedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到密码变更事件: ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'user.password_changed' as any,
        {
          username: event.payload.username,
          changedAt: event.payload.changedAt,
          email: event.payload.email,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`密码变更通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理密码变更事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 双因素认证已启用
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.TWO_FACTOR_ENABLED,
    queue: 'notification-service.user.two_factor_enabled',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleTwoFactorEnabled(event: TwoFactorEnabledEvent, msg: ConsumeMessage) {
    this.logger.log(`收到双因素认证启用事件: ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'user.two_factor_enabled' as any,
        {
          username: event.payload.username || '用户',
          enabledAt: event.payload.enabledAt,
          email: event.payload.email,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`双因素认证通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理双因素认证事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 用户资料已更新
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PROFILE_UPDATED,
    queue: 'notification-service.user.profile_updated',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleProfileUpdated(event: ProfileUpdatedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到用户资料更新事件: ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'user.profile_updated' as any,
        {
          username: event.payload.username,
          updatedFields: event.payload.updatedFields,
          updatedAt: event.payload.updatedAt,
        },
        {
          userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`用户资料更新通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理用户资料更新事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
