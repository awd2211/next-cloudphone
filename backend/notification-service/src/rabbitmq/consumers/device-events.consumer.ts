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
import { NotificationGateway } from '../../gateway/notification.gateway';

/**
 * Device Service 事件消费者
 * 监听设备服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (全部7个事件已集成)
 * ✅ 2025-10-29: 增加 Provider 信息展示
 * ✅ 2025-11-03: 全面升级到角色化通知系统 (7/7 已完成)
 *   - 所有事件处理器使用 createRoleBasedNotification()
 *   - 支持角色特定模板（super_admin, tenant_admin, admin, user）
 *   - 智能模板选择和数据合并
 * ✅ 2025-11-07: 临时添加配额事件处理
 *   - 解决 QuotaEventsConsumer 注册问题
 *   - 提供配额实时推送功能
 */
@Injectable()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService,
    private readonly gateway: NotificationGateway
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
    this.logger.log(`收到设备创建事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.created' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          deviceType: event.deviceType,
          providerType: event.providerType,
          providerDisplayName,
          createdAt: event.createdAt || event.timestamp,
          tenantId: event.tenantId,
          userId: event.userId,
          userEmail: event.userEmail,
          // ✅ 展开 deviceConfig 字段供模板使用
          cpuCores: event.deviceConfig?.cpuCores,
          memoryMB: event.deviceConfig?.memoryMB,
          diskSizeGB: event.deviceConfig?.storageGB,
          // ✅ 简化的设备规格字符串（user 模板使用）
          spec: `${event.deviceConfig?.cpuCores}核 / ${event.deviceConfig?.memoryMB}MB / ${event.deviceConfig?.storageGB}GB`,
          // ✅ 系统统计（管理员模板可能需要）
          // 注：统计数据应由 device-service 在发布事件时包含在 payload 中
          // 当前使用占位值，模板渲染时会优雅降级显示
          onlineDevices: event.systemStats?.onlineDevices ?? 0,
          todayCreated: event.systemStats?.todayCreated ?? 0,
          totalDevices: event.systemStats?.totalDevices ?? 0,
          systemStats: {
            onlineDevices: event.systemStats?.onlineDevices ?? 0,
            todayCreated: event.systemStats?.todayCreated ?? 0,
            totalDevices: event.systemStats?.totalDevices ?? 0,
          },
          // ✅ 租户统计（tenant_admin 模板需要）
          // 注：租户统计应由 device-service 在发布事件时包含
          tenantStats: {
            totalDevices: event.tenantStats?.totalDevices ?? 0,
            activeDevices: event.tenantStats?.activeDevices ?? 0,
            totalUsers: event.tenantStats?.totalUsers ?? 0,
            todayCreated: event.tenantStats?.todayCreated ?? 0,
            onlineDevices: event.tenantStats?.onlineDevices ?? 0,
            quotaUsage: event.tenantStats?.quotaUsage ?? 0,
          },
          adminDashboardUrl: `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/admin/dashboard`,
          tenantDashboardUrl: `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/tenant/dashboard`,
        },
        {
          userEmail: event.userEmail,
        }
      );
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
    this.logger.warn(`收到设备创建失败事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.creation_failed' as any,
        {
          deviceName: event.deviceName,
          reason: event.reason,
          errorCode: event.errorCode,
          failedAt: event.failedAt,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );
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
    this.logger.log(`收到设备启动事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.started' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          deviceType: event.deviceType,
          startedAt: event.startedAt,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );

      // ✅ 实时推送设备状态变更
      this.gateway.sendToUser(event.userId, {
        type: 'device.status.changed',
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          oldStatus: 'stopped',
          newStatus: 'running',
          timestamp: event.startedAt,
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
    this.logger.log(`收到设备停止事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.stopped' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          deviceType: event.deviceType,
          stoppedAt: event.stoppedAt,
          duration: event.duration, // ✅ 运行时长（用于计费）
          reason: event.reason,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );

      // ✅ 实时推送设备状态变更
      this.gateway.sendToUser(event.userId, {
        type: 'device.status.changed',
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          oldStatus: 'running',
          newStatus: 'stopped',
          timestamp: event.stoppedAt,
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
      `收到设备故障事件: ${event.deviceName} (${event.providerType}) - ${event.errorMessage} - Role: ${event.userRole}`
    );

    try {
      // ✅ 使用角色化通知系统
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.error' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          deviceType: event.deviceType,
          errorMessage: event.errorMessage,
          errorType: event.errorType,
          errorCode: event.errorCode,
          occurredAt: event.occurredAt,
          priority: event.priority,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );
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
    this.logger.warn(`收到设备连接丢失事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const deviceUrl = `${process.env.FRONTEND_URL || 'https://cloudphone.example.com'}/devices/${event.deviceId}`;
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.connection_lost' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceUrl,
          deviceType: event.deviceType,
          lastSeenAt: event.lastSeenAt,
          lostAt: event.lostAt,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );
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
    this.logger.log(`收到设备删除事件: ${event.deviceName} (${event.providerType}) - Role: ${event.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      const providerDisplayName = this.getProviderDisplayName(event.providerType);

      await this.notificationsService.createRoleBasedNotification(
        event.userId,
        event.userRole, // ✅ 用户角色
        'device.deleted' as any,
        {
          deviceName: event.deviceName,
          deviceId: event.deviceId,
          deviceType: event.deviceType,
          deletedAt: event.deletedAt,
          reason: event.reason,
          providerType: event.providerType,
          providerDisplayName,
        },
        {
          userEmail: event.userEmail,
        }
      );
    } catch (error) {
      this.logger.error(`处理设备删除事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
