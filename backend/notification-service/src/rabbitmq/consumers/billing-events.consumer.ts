import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  LowBalanceEvent,
  PaymentSuccessEvent,
  InvoiceGeneratedEvent,
  NotificationEventTypes,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { TemplatesService } from '../../templates/templates.service';
import { NotificationCategory } from '../../entities/notification.entity';

/**
 * Billing Service 事件消费者
 * 监听账单服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (billing.low_balance, billing.payment_success, billing.invoice_generated)
 * ✅ 2025-11-03: 全面升级到角色化通知系统 (3/3 已完成)
 *   - 所有事件处理器使用 createRoleBasedNotification()
 *   - 支持角色特定模板（super_admin, tenant_admin, admin, user）
 *   - 从 event.payload.userRole 获取角色信息
 */
@Injectable()
export class BillingEventsConsumer {
  private readonly logger = new Logger(BillingEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly templatesService: TemplatesService
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.LOW_BALANCE,
    queue: 'notification-service.billing.low_balance',
    queueOptions: { durable: true },
  })
  async handleLowBalance(event: LowBalanceEvent, msg: ConsumeMessage) {
    this.logger.warn(`余额不足告警: 用户 ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'billing.low_balance' as any,
        {
          username: event.payload.username,
          balance: event.payload.currentBalance,
          threshold: event.payload.threshold,
          daysRemaining: event.payload.daysRemaining || 3,
          detectedAt: event.payload.detectedAt,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`余额不足告警已发送: ${event.payload.userId}`);
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
    this.logger.log(`充值成功: 用户 ${event.payload.userId}, 金额 ¥${event.payload.amount} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'billing.payment_success' as any,
        {
          username: event.payload.username,
          amount: event.payload.amount,
          orderId: event.payload.orderId || `ORD-${Date.now()}`,
          paymentId: event.payload.paymentId,
          paymentMethod: event.payload.paymentMethod || '未知',
          paidAt: event.payload.paidAt || new Date().toISOString(),
          newBalance: event.payload.newBalance,
        },
        {
          userEmail: event.payload.userEmail,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`充值成功通知已发送: ${event.payload.userId}`);
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
    this.logger.log(`账单生成: 用户 ${event.payload.userId} - Role: ${event.payload.userRole}`);

    try {
      // ✅ 使用角色化通知系统
      await this.notificationsService.createRoleBasedNotification(
        event.payload.userId,
        event.payload.userRole,  // ✅ 用户角色 from payload
        'billing.invoice_generated' as any,
        {
          username: event.payload.username,
          month:
            event.payload.month ||
            new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
          totalAmount: event.payload.amount,
          invoiceId: event.payload.invoiceId,
          dueDate: event.payload.dueDate,
          generatedAt: event.payload.generatedAt,
        },
        {
          userEmail: event.payload.email,  // ✅ 用户邮箱 from payload
        }
      );

      this.logger.log(`账单生成通知已发送: ${event.payload.userId}`);
    } catch (error) {
      this.logger.error(`处理账单生成事件失败: ${error.message}`);
      throw error;
    }
  }
}
