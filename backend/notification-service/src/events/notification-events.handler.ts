import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { NotificationType } from '../entities/notification.entity';

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
  async handleDeviceCreated(event: any) {
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
  async handleDeviceCreationFailed(event: any) {
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
  async handleOrderPaid(event: any) {
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
  async handleLowBalance(event: any) {
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
  async handleSystemMaintenance(event: any) {
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
  async handleInvoiceGenerated(event: any) {
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
}

