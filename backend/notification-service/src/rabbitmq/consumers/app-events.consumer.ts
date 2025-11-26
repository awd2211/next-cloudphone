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
import { NotificationGateway } from '../../gateway/notification.gateway';
import { runInTraceContext } from '@cloudphone/shared';

/**
 * App Service 事件消费者
 * 监听应用服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部3个事件已集成)
 * ✅ 2025-11-03: 全面升级到角色化通知系统 (3/3 已完成)
 *   - 所有事件处理器使用 createRoleBasedNotification()
 *   - 支持角色特定模板（super_admin, tenant_admin, admin, user）
 *   - 从 event.payload.userRole 获取角色信息
 * ✅ 2025-11-07: 添加 WebSocket 实时推送
 *   - 集成 NotificationGateway 进行实时事件推送
 *   - 支持用户订阅推送
 */
@Injectable()
export class AppEventsConsumer {
  private readonly logger = new Logger(AppEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService,
    private readonly gateway: NotificationGateway
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_INSTALLED,
    queue: 'notification-service.app.installed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'app.installed.failed',
    },
  })
  async handleAppInstalled(event: AppInstalledEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
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

        // ✅ WebSocket 实时推送
        this.gateway.sendToUser(event.payload.userId, {
          type: 'app.installed',
          data: {
            userId: event.payload.userId,
            appId: event.payload.appId,
            appName: event.payload.appName,
            deviceId: event.payload.deviceId,
            deviceName: event.payload.deviceName,
            version: event.payload.version,
            installedAt: event.payload.installedAt || new Date().toISOString(),
          },
        });

        this.logger.log(`应用安装通知已发送并推送: ${event.payload.userId}`);
      } catch (error) {
        this.logger.error(`处理应用安装事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_INSTALL_FAILED,
    queue: 'notification-service.app.install_failed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'app.install_failed.failed',
    },
  })
  async handleAppInstallFailed(event: AppInstallFailedEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
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

        // ✅ WebSocket 实时推送
        this.gateway.sendToUser(event.payload.userId, {
          type: 'app.install_failed',
          data: {
            userId: event.payload.userId,
            appId: event.payload.appId,
            appName: event.payload.appName,
            deviceId: event.payload.deviceId,
            deviceName: event.payload.deviceName,
            reason: event.payload.reason,
            failedAt: event.payload.failedAt || new Date().toISOString(),
          },
        });

        this.logger.log(`应用安装失败通知已发送并推送: ${event.payload.userId}`);
      } catch (error) {
        this.logger.error(`处理应用安装失败事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_UPDATED,
    queue: 'notification-service.app.updated',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'app.updated.failed',
    },
  })
  async handleAppUpdated(event: AppUpdatedEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
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

        // ✅ WebSocket 实时推送
        this.gateway.sendToUser(event.payload.userId, {
          type: 'app.updated',
          data: {
            userId: event.payload.userId,
            appId: event.payload.appId,
            appName: event.payload.appName,
            deviceId: event.payload.deviceId,
            oldVersion: event.payload.oldVersion,
            newVersion: event.payload.newVersion,
            updatedAt: event.payload.updatedAt || new Date().toISOString(),
          },
        });

        this.logger.log(`应用更新通知已发送并推送: ${event.payload.userId}`);
      } catch (error) {
        this.logger.error(`处理应用更新事件失败: ${error.message}`);
        throw error;
      }
    });
  }
}
