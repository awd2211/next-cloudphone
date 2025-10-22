import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  LowBalanceEvent,
  PaymentSuccessEvent,
  InvoiceGeneratedEvent,
  NotificationEventTypes,
} from '@cloudphone/shared';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationType } from '../../entities/notification.entity';

/**
 * Billing Service 事件消费者
 * 监听账单服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (billing.low_balance, billing.payment_success, billing.invoice_generated)
 */
@Injectable()
export class BillingEventsConsumer {
  private readonly logger = new Logger(BillingEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService,
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.LOW_BALANCE,
    queue: 'notification-service.billing.low_balance',
    queueOptions: { durable: true },
  })
  async handleLowBalance(event: LowBalanceEvent, msg: ConsumeMessage) {
    this.logger.warn(`余额不足告警: 用户 ${event.payload.userId}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'billing.low_balance',
        {
          balance: event.payload.currentBalance,
          daysRemaining: event.payload.daysRemaining || 3,
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

      // 发送告警邮件（使用渲染的HTML模板）
      if (event.payload.email) {
        await this.emailService.sendLowBalanceAlert(
          event.payload.email,
          event.payload.currentBalance,
        );
      }
    } catch (error) {
      this.logger.error(`处理余额不足事件失败: ${error.message}`);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PAYMENT_SUCCESS,
    queue: 'notification-service.billing.payment_success',
    queueOptions: { durable: true },
  })
  async handlePaymentSuccess(event: PaymentSuccessEvent, msg: ConsumeMessage) {
    this.logger.log(`充值成功: 用户 ${event.payload.userId}, 金额 ¥${event.payload.amount}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'billing.payment_success',
        {
          amount: event.payload.amount,
          orderId: event.payload.orderId || `ORD-${Date.now()}`,
          paymentMethod: event.payload.paymentMethod || '未知',
          paidAt: event.payload.paidAt || new Date(),
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.BILLING,
        title: rendered.title,
        message: rendered.body,
        data: event.payload,
      });
    } catch (error) {
      this.logger.error(`处理充值成功事件失败: ${error.message}`);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.INVOICE_GENERATED,
    queue: 'notification-service.billing.invoice_generated',
    queueOptions: { durable: true },
  })
  async handleInvoiceGenerated(event: InvoiceGeneratedEvent, msg: ConsumeMessage) {
    this.logger.log(`账单生成: 用户 ${event.payload.userId}`);

    try {
      // 渲染模板
      const rendered = await this.templatesService.render(
        'billing.invoice_generated',
        {
          month: event.payload.month || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
          totalAmount: event.payload.amount,
          invoiceId: event.payload.invoiceId,
          dueDate: event.payload.dueDate,
        },
        'zh-CN',
      );

      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.BILLING,
        title: rendered.title,
        message: rendered.body,
        data: event.payload,
      });
    } catch (error) {
      this.logger.error(`处理账单生成事件失败: ${error.message}`);
      throw error;
    }
  }
}
