import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  AppInstalledEvent,
  AppInstallFailedEvent,
  AppUpdatedEvent,
  NotificationEventTypes,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationCategory } from '../../entities/notification.entity';

/**
 * App Service 事件消费者
 * 监听应用服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部3个事件已集成)
 * ✅ 2025-11-03: 全面升级到角色化通知系统 (3/3 已完成)
 *   - 所有事件处理器使用 createRoleBasedNotification()
 *   - 支持角色特定模板（super_admin, tenant_admin, admin, user）
 *   - 从 event.payload.userRole 获取角色信息
 */
@Injectable()
export class AppEventsConsumer {
  private readonly logger = new Logger(AppEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_INSTALLED,
    queue: 'notification-service.app.installed',
    queueOptions: { durable: true },
  })
  async handleAppInstalled(event: AppInstalledEvent, msg: ConsumeMessage) {
    this.logger.log(`应用安装成功: ${event.payload.appName} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'app.installed' as any,
        {
          appId: event.payload.appId,
          appName: event.payload.appName,
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName || '云手机',
          installedAt: event.payload.installedAt || new Date().toISOString(),
          version: event.payload.version,
        },
        {
          userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`应用安装通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理应用安装事件失败: ${error.message}`);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_INSTALL_FAILED,
    queue: 'notification-service.app.install_failed',
    queueOptions: { durable: true },
  })
  async handleAppInstallFailed(event: AppInstallFailedEvent, msg: ConsumeMessage) {
    this.logger.warn(`应用安装失败: ${event.payload.appName} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'app.install_failed' as any,
        {
          appId: event.payload.appId,
          appName: event.payload.appName,
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName || '云手机',
          reason: event.payload.reason,
          failedAt: event.payload.failedAt || new Date().toISOString(),
        },
        {
          userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`应用安装失败通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理应用安装失败事件失败: ${error.message}`);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_UPDATED,
    queue: 'notification-service.app.updated',
    queueOptions: { durable: true },
  })
  async handleAppUpdated(event: AppUpdatedEvent, msg: ConsumeMessage) {
    this.logger.log(`应用更新成功: ${event.payload.appName} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'app.updated' as any,
        {
          appId: event.payload.appId,
          appName: event.payload.appName,
          deviceId: event.payload.deviceId,
          newVersion: event.payload.newVersion,
          oldVersion: event.payload.oldVersion || '未知',
          updatedAt: event.payload.updatedAt || new Date().toISOString(),
        },
        {
          userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`应用更新通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理应用更新事件失败: ${error.message}`);
      throw error;
    }
  }
}
