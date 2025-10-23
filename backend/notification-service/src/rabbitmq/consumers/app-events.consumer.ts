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
import { NotificationType } from '../../entities/notification.entity';

/**
 * App Service 事件消费者
 * 监听应用服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部3个事件已集成)
 */
@Injectable()
export class AppEventsConsumer {
  private readonly logger = new Logger(AppEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService,
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.APP_INSTALLED,
    queue: 'notification-service.app.installed',
    queueOptions: { durable: true },
  })
  async handleAppInstalled(event: AppInstalledEvent, msg: ConsumeMessage) {
    this.logger.log(`应用安装成功: ${event.payload.appName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'app.installed',
        {
          appName: event.payload.appName,
          deviceName: event.payload.deviceName || '云手机',
          installedAt: event.payload.installedAt || new Date(),
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.MESSAGE,
        title: rendered.title,
        message: rendered.body,
        data: event.payload,
      });
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
    this.logger.warn(`应用安装失败: ${event.payload.appName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'app.install_failed',
        {
          appName: event.payload.appName,
          deviceName: event.payload.deviceName || '云手机',
          reason: event.payload.reason,
          failedAt: event.payload.failedAt || new Date(),
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: event.payload,
      });
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
    this.logger.log(`应用更新成功: ${event.payload.appName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'app.updated',
        {
          appName: event.payload.appName,
          newVersion: event.payload.newVersion,
          oldVersion: event.payload.oldVersion || '未知',
          updatedAt: event.payload.updatedAt || new Date(),
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.MESSAGE,
        title: rendered.title,
        message: rendered.body,
        data: event.payload,
      });
    } catch (error) {
      this.logger.error(`处理应用更新事件失败: ${error.message}`);
      throw error;
    }
  }
}
