import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

/**
 * 通知服务事件处理器
 * 
 * 订阅所有业务事件，发送相应通知
 */
@Injectable()
export class AllEventsHandler {
  private readonly logger = new Logger(AllEventsHandler.name);

  constructor(
    private notificationsService: NotificationsService,
  ) {}

  /**
   * 用户创建 - 发送欢迎通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.created',
    queue: 'notification-service.user-created',
  })
  async handleUserCreated(msg: any) {
    this.logger.log(`收到用户创建事件: ${msg.userId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.SYSTEM_UPDATE,
        title: '欢迎加入云手机平台',
        content: `欢迎您，${msg.username}！开始您的云手机之旅吧。`,
      });
    } catch (error) {
      this.logger.error(`发送欢迎通知失败: ${error.message}`);
    }
  }

  /**
   * 设备启动 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.started',
    queue: 'notification-service.device-started',
  })
  async handleDeviceStarted(msg: any) {
    this.logger.log(`收到设备启动事件: ${msg.deviceId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.DEVICE_STARTED,
        title: '设备启动成功',
        content: `您的设备 ${msg.deviceName || msg.deviceId} 已成功启动`,
        resourceType: 'device',
        resourceId: msg.deviceId,
        actionUrl: `/devices/${msg.deviceId}`,
      });
    } catch (error) {
      this.logger.error(`发送设备启动通知失败: ${error.message}`);
    }
  }

  /**
   * 设备停止 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.stopped',
    queue: 'notification-service.device-stopped',
  })
  async handleDeviceStopped(msg: any) {
    this.logger.log(`收到设备停止事件: ${msg.deviceId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.DEVICE_STOPPED,
        title: '设备已停止',
        content: `您的设备 ${msg.deviceName || msg.deviceId} 已停止运行。使用时长：${msg.duration || 0} 秒`,
        resourceType: 'device',
        resourceId: msg.deviceId,
      });
    } catch (error) {
      this.logger.error(`发送设备停止通知失败: ${error.message}`);
    }
  }

  /**
   * 订单支付成功 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'order.paid',
    queue: 'notification-service.order-paid',
  })
  async handleOrderPaid(msg: any) {
    this.logger.log(`收到订单支付事件: ${msg.orderId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.INVOICE_GENERATED,
        title: '支付成功',
        content: `您的订单已支付成功！金额：¥${msg.amount}`,
        resourceType: 'order',
        resourceId: msg.orderId,
        actionUrl: `/billing/orders/${msg.orderId}`,
      });
    } catch (error) {
      this.logger.error(`发送支付成功通知失败: ${error.message}`);
    }
  }

  /**
   * 订单取消 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'order.cancelled',
    queue: 'notification-service.order-cancelled',
  })
  async handleOrderCancelled(msg: any) {
    this.logger.log(`收到订单取消事件: ${msg.orderId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.SYSTEM_UPDATE,
        title: '订单已取消',
        content: `您的订单已取消。${msg.reason ? `原因：${msg.reason}` : ''}`,
        resourceType: 'order',
        resourceId: msg.orderId,
      });
    } catch (error) {
      this.logger.error(`发送订单取消通知失败: ${error.message}`);
    }
  }

  /**
   * 余额不足 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.balance.low',
    queue: 'notification-service.balance-low',
  })
  async handleBalanceLow(msg: any) {
    this.logger.log(`收到余额不足事件: ${msg.userId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.BALANCE_LOW,
        title: '余额不足提醒',
        content: `您的账户余额不足，当前余额：¥${msg.balance}`,
        actionUrl: '/billing/recharge',
      });
    } catch (error) {
      this.logger.error(`发送余额不足通知失败: ${error.message}`);
    }
  }

  /**
   * 配额超限 - 发送通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'quota.exceeded',
    queue: 'notification-service.quota-exceeded',
  })
  async handleQuotaExceeded(msg: any) {
    this.logger.log(`收到配额超限事件: ${msg.userId}`);
    
    try {
      await this.notificationsService.sendNotification({
        userId: msg.userId,
        type: NotificationType.QUOTA_EXCEEDED,
        title: '配额超限提醒',
        content: `您的${msg.quotaType}配额已超限，请升级套餐或联系管理员`,
        actionUrl: '/billing/plans',
      });
    } catch (error) {
      this.logger.error(`发送配额超限通知失败: ${error.message}`);
    }
  }
}

