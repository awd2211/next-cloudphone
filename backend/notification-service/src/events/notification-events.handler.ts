import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { NotificationType } from '../entities/notification.entity';

/**
 * 事件类型定义
 */
interface DeviceCreatedEventPayload {
  deviceId: string;
  deviceName: string;
  userId: string;
  userEmail?: string;
}

interface DeviceCreationFailedEventPayload {
  deviceId?: string;
  deviceName: string;
  userId: string;
  reason?: string;
}

interface OrderPaidEventPayload {
  orderId: string;
  orderNo: string;
  userId: string;
  amount: number;
}

interface LowBalanceEventPayload {
  userId: string;
  balance: number;
  threshold: number;
  userEmail?: string;
}

interface SystemMaintenanceEventPayload {
  startTime: string;
  endTime: string;
  duration: number;
}

interface InvoiceGeneratedEventPayload {
  invoiceId: string;
  userId: string;
  amount: number;
  dueDate: string;
}

interface DeviceBackupCreatedEventPayload {
  deviceId: string;
  deviceName: string;
  userId: string;
  snapshotId: string;
  snapshotName: string;
}

interface DeviceExpirationWarningEventPayload {
  deviceId: string;
  deviceName: string;
  userId: string;
  expiresAt: string;
  daysRemaining: number;
  userEmail?: string;
}

interface DeviceExpiredEventPayload {
  deviceId: string;
  userId: string;
}

interface SnapshotExpirationWarningEventPayload {
  snapshotId: string;
  snapshotName: string;
  deviceId: string;
  expiresAt: string;
  daysRemaining: number;
}

interface SnapshotExpiredEventPayload {
  snapshotId: string;
  snapshotName: string;
}

interface BackupCompletedEventPayload {
  totalDevices: number;
  successCount: number;
  failureCount: number;
}

interface BackupCleanupCompletedEventPayload {
  cleanedCount: number;
  freedSpaceMB: number;
}

/**
 * 通知事件处理器
 * 监听业务事件并自动发送通知
 */
@Injectable()
export class NotificationEventsHandler {
  private readonly logger = new Logger(NotificationEventsHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 设备创建事件
   */
  @OnEvent('device.created')
  async handleDeviceCreated(event: DeviceCreatedEventPayload) {
    this.logger.log(`收到设备创建事件: ${event.deviceId}`);

    try {
      // 发送 WebSocket 通知
      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationType.DEVICE,
        title: '设备创建成功',
        message: `您的设备 ${event.deviceName} 已成功创建`,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
        },
      });

      // 发送邮件通知（如果有邮箱）
      if (event.userEmail) {
        await this.emailService.sendDeviceCreatedEmail(
          event.userEmail,
          event.deviceName,
        );
      }
    } catch (error) {
      this.logger.error(`处理设备创建事件失败: ${error.message}`);
    }
  }

  /**
   * 设备创建失败事件
   */
  @OnEvent('device.creation_failed')
  async handleDeviceCreationFailed(event: DeviceCreationFailedEventPayload) {
    this.logger.log(`收到设备创建失败事件: ${event.deviceId}`);

    await this.notificationsService.createAndSend({
      userId: event.userId,
      type: NotificationType.ALERT,
      title: '设备创建失败',
      message: `设备 ${event.deviceName} 创建失败：${event.reason || '未知错误'}`,
      data: {
        deviceId: event.deviceId,
        error: event.reason,
      },
    });
  }

  /**
   * 订单支付成功事件
   */
  @OnEvent('order.paid')
  async handleOrderPaid(event: OrderPaidEventPayload) {
    this.logger.log(`收到订单支付事件: ${event.orderId}`);

    await this.notificationsService.createAndSend({
      userId: event.userId,
      type: NotificationType.ORDER,
      title: '支付成功',
      message: `订单 ${event.orderNo} 支付成功，金额 ¥${event.amount}`,
      data: {
        orderId: event.orderId,
        orderNo: event.orderNo,
        amount: event.amount,
      },
    });
  }

  /**
   * 余额不足事件
   */
  @OnEvent('billing.low_balance')
  async handleLowBalance(event: LowBalanceEventPayload) {
    this.logger.log(`收到余额不足事件: 用户 ${event.userId}`);

    // WebSocket 通知
    await this.notificationsService.createAndSend({
      userId: event.userId,
      type: NotificationType.ALERT,
      title: '余额不足提醒',
      message: `您的账户余额仅剩 ¥${event.balance}，请及时充值`,
      data: {
        balance: event.balance,
        threshold: event.threshold,
      },
    });

    // 邮件告警
    if (event.userEmail) {
      await this.emailService.sendLowBalanceAlert(
        event.userEmail,
        event.balance,
      );
    }
  }

  /**
   * 系统维护通知
   */
  @OnEvent('system.maintenance')
  async handleSystemMaintenance(event: SystemMaintenanceEventPayload) {
    this.logger.log('收到系统维护通知事件');

    // 广播给所有在线用户
    await this.notificationsService.broadcast(
      '系统维护通知',
      `系统将于 ${event.startTime} 进行维护，预计持续 ${event.duration} 分钟`,
      {
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
      },
    );
  }

  /**
   * 账单生成事件
   */
  @OnEvent('billing.invoice_generated')
  async handleInvoiceGenerated(event: InvoiceGeneratedEventPayload) {
    this.logger.log(`收到账单生成事件: ${event.invoiceId}`);

    await this.notificationsService.createAndSend({
      userId: event.userId,
      type: NotificationType.BILLING,
      title: '新账单生成',
      message: `您有一张新账单，金额 ¥${event.amount}，请及时支付`,
      data: {
        invoiceId: event.invoiceId,
        amount: event.amount,
        dueDate: event.dueDate,
      },
    });
  }

  /**
   * 设备备份创建事件
   */
  @OnEvent('device.backup_created')
  async handleDeviceBackupCreated(event: DeviceBackupCreatedEventPayload) {
    this.logger.log(`收到设备备份创建事件: ${event.snapshotId}`);

    try {
      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationType.DEVICE,
        title: '设备备份成功',
        message: `设备 ${event.deviceName} 的备份已成功创建`,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          snapshotId: event.snapshotId,
          snapshotName: event.snapshotName,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备备份创建事件失败: ${error.message}`);
    }
  }

  /**
   * 设备到期提醒事件
   */
  @OnEvent('device.expiration_warning')
  async handleDeviceExpirationWarning(event: DeviceExpirationWarningEventPayload) {
    this.logger.log(
      `收到设备到期提醒事件: ${event.deviceId}, ${event.daysRemaining} 天后到期`,
    );

    try {
      // WebSocket 通知
      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationType.ALERT,
        title: '设备即将到期',
        message: `您的设备 ${event.deviceName} 将在 ${event.daysRemaining} 天后到期，请及时续费或备份数据`,
        data: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          expiresAt: event.expiresAt,
          daysRemaining: event.daysRemaining,
        },
      });

      // 如果剩余天数较少，发送邮件提醒
      if (event.daysRemaining <= 7 && event.userEmail) {
        await this.emailService.sendDeviceExpirationWarning(
          event.userEmail,
          event.deviceName,
          new Date(event.expiresAt),
          event.daysRemaining,
        );
      }
    } catch (error) {
      this.logger.error(`处理设备到期提醒事件失败: ${error.message}`);
    }
  }

  /**
   * 设备已过期事件
   */
  @OnEvent('device.expired')
  async handleDeviceExpired(event: DeviceExpiredEventPayload) {
    this.logger.log(`收到设备已过期事件: ${event.deviceId}`);

    try {
      await this.notificationsService.createAndSend({
        userId: event.userId,
        type: NotificationType.ALERT,
        title: '设备已过期',
        message: `您的设备已过期，请及时处理或续费`,
        data: {
          deviceId: event.deviceId,
        },
      });
    } catch (error) {
      this.logger.error(`处理设备已过期事件失败: ${error.message}`);
    }
  }

  /**
   * 快照到期提醒事件
   */
  @OnEvent('snapshot.expiration_warning')
  async handleSnapshotExpirationWarning(event: SnapshotExpirationWarningEventPayload) {
    this.logger.log(
      `收到快照到期提醒事件: ${event.snapshotId}, ${event.daysRemaining} 天后到期`,
    );

    try {
      // 查询设备的用户ID（需要从设备服务获取）
      // 这里先记录日志，实际应用中需要通过 deviceId 查询用户
      this.logger.log(
        `快照 ${event.snapshotName} (设备: ${event.deviceId}) 将在 ${event.daysRemaining} 天后到期`,
      );

      // 可以通过 API 调用设备服务获取用户信息，然后发送通知
      // 简化处理：直接记录日志
    } catch (error) {
      this.logger.error(`处理快照到期提醒事件失败: ${error.message}`);
    }
  }

  /**
   * 快照已过期事件
   */
  @OnEvent('snapshot.expired')
  async handleSnapshotExpired(event: SnapshotExpiredEventPayload) {
    this.logger.log(`收到快照已过期事件: ${event.snapshotId}`);

    try {
      this.logger.log(`快照 ${event.snapshotId} 已过期并将被自动清理`);
    } catch (error) {
      this.logger.error(`处理快照已过期事件失败: ${error.message}`);
    }
  }

  /**
   * 备份任务完成事件
   */
  @OnEvent('device.backup_completed')
  async handleBackupCompleted(event: BackupCompletedEventPayload) {
    this.logger.log(
      `收到备份任务完成事件: 成功 ${event.successCount}/${event.totalDevices}`,
    );

    // 如果有失败的备份，可以发送管理员通知
    if (event.failureCount > 0) {
      this.logger.warn(
        `备份任务有 ${event.failureCount} 个失败，需要关注`,
      );
    }
  }

  /**
   * 备份清理完成事件
   */
  @OnEvent('device.backup_cleanup_completed')
  async handleBackupCleanupCompleted(event: BackupCleanupCompletedEventPayload) {
    this.logger.log(`收到备份清理完成事件: 清理了 ${event.cleanedCount} 个过期备份`);
  }
}

