import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  DeviceCreatedEvent,
  DeviceCreationFailedEvent,
  DeviceStartedEvent,
  DeviceStoppedEvent,
  DeviceErrorEvent,
  DeviceConnectionLostEvent,
  DeviceDeletedEvent,
  NotificationEventTypes,
  ProviderDisplayNamesCN,
  DeviceProviderType,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationCategory } from '../../entities/notification.entity';

/**
 * Device Service 事件消费者
 * 监听设备服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部7个事件已集成)
 * ✅ 2025-10-29: 增加 Provider 信息展示
 */
@Injectable()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService
  ) {}

  /**
   * 获取 Provider 中文显示名称
   */
  private getProviderDisplayName(providerType: DeviceProviderType): string {
    return ProviderDisplayNamesCN[providerType] || providerType;
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_CREATED,
    queue: 'notification-service.device.created',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceCreated(event: DeviceCreatedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到设备创建事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      const rendered = await this.templatesService.render(
        'device.created',
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          createdAt: event.createdAt,
          providerType: event.providerType, // ✅ 新增
          providerDisplayName, // ✅ 新增
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          deviceType: event.deviceType,
          providerType: event.providerType, // ✅ 新增
          providerDisplayName, // ✅ 新增
          createdAt: event.createdAt,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备创建事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_CREATION_FAILED,
    queue: 'notification-service.device.creation_failed',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceCreationFailed(event: DeviceCreationFailedEvent, msg: ConsumeMessage) {
    this.logger.warn(`收到设备创建失败事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      const rendered = await this.templatesService.render(
        'device.creation_failed',
        {
          deviceName: event.deviceName,
          reason: event.reason,
          failedAt: event.failedAt,
          providerType: event.providerType, // ✅ 新增
          providerDisplayName, // ✅ 新增
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceName: event.deviceName,
          reason: event.reason,
          failedAt: event.failedAt,
          providerType: event.providerType, // ✅ 新增
          providerDisplayName, // ✅ 新增
        },
      });
    } catch (error) {
      this.logger.error(`处理设备创建失败事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_STARTED,
    queue: 'notification-service.device.started',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceStarted(event: DeviceStartedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到设备启动事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      const rendered = await this.templatesService.render(
        'device.started',
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          startedAt: event.startedAt,
          providerType: event.providerType,
          providerDisplayName,
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          startedAt: event.startedAt,
          providerType: event.providerType,
          providerDisplayName,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备启动事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_STOPPED,
    queue: 'notification-service.device.stopped',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceStopped(event: DeviceStoppedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到设备停止事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.stopped',
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          stoppedAt: event.stoppedAt,
          reason: event.reason,
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          stoppedAt: event.stoppedAt,
          reason: event.reason,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备停止事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_ERROR,
    queue: 'notification-service.device.error',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceError(event: DeviceErrorEvent, msg: ConsumeMessage) {
    this.logger.error(
      `收到设备故障事件: ${event.deviceName} (${event.providerType}) - ${event.errorMessage}`
    );

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.error',
        {
          deviceName: event.deviceName,
          errorMessage: event.errorMessage,
          errorType: event.errorType,
          occurredAt: event.occurredAt,
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          errorType: event.errorType,
          errorMessage: event.errorMessage,
          occurredAt: event.occurredAt,
          priority: event.priority,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备故障事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_CONNECTION_LOST,
    queue: 'notification-service.device.connection_lost',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceConnectionLost(event: DeviceConnectionLostEvent, msg: ConsumeMessage) {
    this.logger.warn(`收到设备连接丢失事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.connection_lost',
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          lastSeenAt: event.lastSeenAt,
          lostAt: event.lostAt,
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          lastSeenAt: event.lastSeenAt,
          lostAt: event.lostAt,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备连接丢失事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.DEVICE_DELETED,
    queue: 'notification-service.device.deleted',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      },
    },
  })
  async handleDeviceDeleted(event: DeviceDeletedEvent, msg: ConsumeMessage) {
    this.logger.log(`收到设备删除事件: ${event.deviceName} (${event.providerType})`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.deleted',
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deletedAt: event.deletedAt,
        },
        'zh-CN'
      );

      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationCategory.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          deletedAt: event.deletedAt,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备删除事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
