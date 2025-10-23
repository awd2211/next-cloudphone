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
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationType } from '../../entities/notification.entity';

/**
 * Device Service 事件消费者
 * 监听设备服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部7个事件已集成)
 */
@Injectable()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService,
  ) {}

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
    this.logger.log(`收到设备创建事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.payload.deviceId}`;
      const rendered = await this.templatesService.render(
        'device.created',
        {
          deviceName: event.payload.deviceName,
          deviceId: event.payload.deviceId,
          deviceUrl,
          createdAt: event.payload.createdAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          deviceType: event.payload.deviceType,
          createdAt: event.payload.createdAt,
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
    this.logger.warn(`收到设备创建失败事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.creation_failed',
        {
          deviceName: event.payload.deviceName,
          reason: event.payload.reason,
          failedAt: event.payload.failedAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceName: event.payload.deviceName,
          reason: event.payload.reason,
          failedAt: event.payload.failedAt,
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
    this.logger.log(`收到设备启动事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.started',
        {
          deviceName: event.payload.deviceName,
          deviceId: event.payload.deviceId,
          startedAt: event.payload.startedAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          startedAt: event.payload.startedAt,
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
    this.logger.log(`收到设备停止事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.stopped',
        {
          deviceName: event.payload.deviceName,
          deviceId: event.payload.deviceId,
          stoppedAt: event.payload.stoppedAt,
          reason: event.payload.reason,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          stoppedAt: event.payload.stoppedAt,
          reason: event.payload.reason,
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
    this.logger.error(`收到设备故障事件: ${event.payload.deviceName} - ${event.payload.errorMessage}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.error',
        {
          deviceName: event.payload.deviceName,
          errorMessage: event.payload.errorMessage,
          errorType: event.payload.errorType,
          occurredAt: event.payload.occurredAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          errorType: event.payload.errorType,
          errorMessage: event.payload.errorMessage,
          occurredAt: event.payload.occurredAt,
          priority: event.payload.priority,
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
    this.logger.warn(`收到设备连接丢失事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.connection_lost',
        {
          deviceName: event.payload.deviceName,
          deviceId: event.payload.deviceId,
          lastSeenAt: event.payload.lastSeenAt,
          lostAt: event.payload.lostAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.ALERT,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          lastSeenAt: event.payload.lastSeenAt,
          lostAt: event.payload.lostAt,
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
    this.logger.log(`收到设备删除事件: ${event.payload.deviceName}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'device.deleted',
        {
          deviceName: event.payload.deviceName,
          deviceId: event.payload.deviceId,
          deletedAt: event.payload.deletedAt,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.DEVICE,
        title: rendered.title,
        message: rendered.body,
        data: {
          deviceId: event.payload.deviceId,
          deviceName: event.payload.deviceName,
          deletedAt: event.payload.deletedAt,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备删除事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
