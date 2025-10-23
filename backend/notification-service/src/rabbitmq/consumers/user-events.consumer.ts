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
import { NotificationType } from '../../entities/notification.entity';

/**
 * User Service 事件消费者
 * 监听用户服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部6个事件已集成)
 */
@Injectable()
export class UserEventsConsumer {
  private readonly logger = new Logger(UserEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService,
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
  async handleUserRegistered(
    event: UserRegisteredEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.log(`收到用户注册事件: ${event.payload.username}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'user.registered',
        {
          username: event.payload.username,
          email: event.payload.email,
          registeredAt: event.payload.registerTime,
          loginUrl: process.env.FRONTEND_URL || 'https://cloudphone.example.com/login',
        },
        'zh-CN',
      );

      // 发送 WebSocket 通知
      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.SYSTEM,
        title: rendered.title,
        message: rendered.body,
        data: {
          username: event.payload.username,
          registerTime: event.payload.registerTime,
        },
      });

      // 发送欢迎邮件（使用渲染的HTML模板）
      if (event.payload.email && rendered.emailHtml) {
        await this.emailService.sendWelcomeEmail(
          event.payload.email,
          event.payload.username,
        );
      }

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
  async handleLoginFailed(
    event: UserLoginFailedEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.warn(`收到登录失败事件: ${event.payload.username}, 失败次数: ${event.payload.failureCount}`);

    try {
      // 只有当失败次数达到阈值时才发送通知
      if (event.payload.failureCount >= 3 && event.payload.userId) {
        // 渲染模板
        const rendered = await this.templatesService.render(
          'user.login_failed',
          {
            username: event.payload.username,
            ipAddress: event.payload.ipAddress,
            location: '未知位置', // 可以集成IP地理位置服务
            attemptTime: event.payload.timestamp,
          },
          'zh-CN',
        );

        // 发送高优先级告警通知
        await this.notificationsService.createAndSend({
          userId: event.payload.userId,
          type: NotificationType.ALERT,
          title: rendered.title,
          message: rendered.body,
          data: {
            username: event.payload.username,
            ipAddress: event.payload.ipAddress,
            failureCount: event.payload.failureCount,
            timestamp: event.payload.timestamp,
          },
        });

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
  async handlePasswordResetRequested(
    event: PasswordResetRequestedEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.log(`收到密码重置请求: ${event.payload.userId}`);

    try {
      // 渲染模板
      const resetUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/reset-password?token=${event.payload.resetToken}`;
      const rendered = await this.templatesService.render(
        'user.password_reset',
        {
          username: event.payload.username || '用户',
          resetUrl,
          code: event.payload.resetToken.substring(0, 6), // 前6位作为验证码
          expiresAt: event.payload.expiresAt,
        },
        'zh-CN',
      );

      // 发送重置链接邮件（使用渲染的HTML模板）
      await this.emailService.sendPasswordResetEmail(
        event.payload.email,
        event.payload.resetToken,
        event.payload.expiresAt,
      );

      // WebSocket 通知
      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.SYSTEM,
        title: rendered.title,
        message: rendered.body,
        data: {
          email: event.payload.email,
          expiresAt: event.payload.expiresAt,
        },
      });

      this.logger.log(`密码重置邮件已发送: ${event.payload.email}`);
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
  async handlePasswordChanged(
    event: PasswordChangedEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.log(`收到密码变更事件: ${event.payload.userId}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'user.password_changed',
        {
          username: event.payload.username,
          changedAt: event.payload.changedAt,
        },
        'zh-CN',
      );

      // WebSocket 通知
      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          changedAt: event.payload.changedAt,
        },
      });

      // 邮件确认（使用渲染的HTML模板）
      if (event.payload.email) {
        await this.emailService.sendPasswordChangedNotification(
          event.payload.email,
          event.payload.username,
          event.payload.changedAt,
        );
      }

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
  async handleTwoFactorEnabled(
    event: TwoFactorEnabledEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.log(`收到双因素认证启用事件: ${event.payload.userId}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'user.two_factor_enabled',
        {
          username: event.payload.username || '用户',
          enabledAt: event.payload.enabledAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.SYSTEM,
        title: rendered.title,
        message: rendered.body,
        data: {
          enabledAt: event.payload.enabledAt,
        },
      });

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
  async handleProfileUpdated(
    event: ProfileUpdatedEvent,
    msg: ConsumeMessage,
  ) {
    this.logger.log(`收到用户资料更新事件: ${event.payload.userId}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'user.profile_updated',
        {
          updatedFields: event.payload.updatedFields,
          updatedAt: event.payload.updatedAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.SYSTEM,
        title: rendered.title,
        message: rendered.body,
        data: {
          updatedFields: event.payload.updatedFields,
          updatedAt: event.payload.updatedAt,
        },
      });

      this.logger.log(`用户资料更新通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理用户资料更新事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
