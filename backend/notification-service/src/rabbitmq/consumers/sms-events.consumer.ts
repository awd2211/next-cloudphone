import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  SmsNumberExpiredEvent,
  SmsNumberFromPoolEvent,
  SmsMessageReceivedEvent,
  NotificationEventTypes,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { NotificationGateway } from '../../gateway/notification.gateway';
import { runInTraceContext } from '@cloudphone/shared';

/**
 * SMS Receive Service 事件消费者
 * 监听短信接收服务发布的所有事件并发送相应通知
 *
 * ✅ 2025-11-26: 新建 - 之前短信服务的 number.expired 和 number.from_pool 事件没有消费者
 *   - 处理号码过期事件（重要：用户需要知道号码即将/已过期）
 *   - 处理号码分配事件
 *   - 处理短信接收事件（转发给用户的实时通知）
 */
@Injectable()
export class SmsEventsConsumer {
  private readonly logger = new Logger(SmsEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly gateway: NotificationGateway
  ) {}

  /**
   * 处理短信号码过期事件
   * 当用户的短信接收号码即将或已过期时触发
   * 这是关键事件 - 用户必须知道号码过期才能续费或更换
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.SMS_NUMBER_EXPIRED,
    queue: 'notification-service.sms.number_expired',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleSmsNumberExpired(event: SmsNumberExpiredEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.warn(
        `短信号码已过期: 用户 ${payload.userId}, 号码 ${payload.phoneNumber}, 国家 ${payload.country}`
      );

      try {
        // 创建站内通知
        await this.notificationsService.createRoleBasedNotification(
          payload.userId,
          payload.userRole || 'user',
          'sms.number_expired' as any,
          {
            username: payload.username || '用户',
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            country: payload.country,
            provider: payload.provider,
            expiredAt: payload.expiredAt,
            renewalAvailable: payload.renewalAvailable,
            renewalText: payload.renewalAvailable ? '可续费' : '不可续费',
          },
          {
            userEmail: payload.userEmail,
          }
        );

        // WebSocket 实时推送 - 紧急通知
        this.gateway.sendToUser(payload.userId, {
          type: 'sms.number_expired',
          severity: 'warning',
          data: {
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            country: payload.country,
            provider: payload.provider,
            expiredAt: payload.expiredAt,
            renewalAvailable: payload.renewalAvailable,
          },
        });

        // 如果有邮箱，发送邮件通知
        if (payload.userEmail) {
          await this.sendNumberExpiredEmail(payload);
        }

        this.logger.log(`短信号码过期通知已发送: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`处理短信号码过期事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * 处理从号码池分配号码事件
   * 记录号码分配日志，可用于审计和追踪
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.SMS_NUMBER_FROM_POOL,
    queue: 'notification-service.sms.number_from_pool',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleSmsNumberFromPool(event: SmsNumberFromPoolEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.log(
        `号码池分配: 用户 ${payload.userId}, 号码 ${payload.phoneNumber}, 国家 ${payload.country}`
      );

      try {
        // 创建站内通知 - 告知用户号码已分配
        await this.notificationsService.createAndSend({
          userId: payload.userId,
          type: 'sms.number_assigned' as any,
          title: '短信接收号码已分配',
          message: `您的短信接收号码 ${this.maskPhoneNumber(payload.phoneNumber)} (${payload.country}) 已分配成功，有效期至 ${new Date(payload.expiresAt).toLocaleString('zh-CN')}`,
          data: {
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            country: payload.country,
            provider: payload.provider,
            assignedAt: payload.assignedAt,
            expiresAt: payload.expiresAt,
          },
        });

        // WebSocket 实时推送
        this.gateway.sendToUser(payload.userId, {
          type: 'sms.number_assigned',
          severity: 'info',
          data: {
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            country: payload.country,
            provider: payload.provider,
            assignedAt: payload.assignedAt,
            expiresAt: payload.expiresAt,
          },
        });

        this.logger.log(`号码分配通知已发送: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`处理号码池分配事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * 处理短信消息接收事件
   * 实时通知用户收到了新短信（验证码等）
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.SMS_MESSAGE_RECEIVED,
    queue: 'notification-service.sms.message_received',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleSmsMessageReceived(event: SmsMessageReceivedEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.log(
        `收到短信: 用户 ${payload.userId}, 号码 ${payload.phoneNumber}, 发送方 ${payload.sender}`
      );

      try {
        // 提取验证码（如果有的话）
        const verificationCode = this.extractVerificationCode(payload.message);

        // 创建站内通知
        await this.notificationsService.createAndSend({
          userId: payload.userId,
          type: 'sms.message_received' as any,
          title: '收到新短信',
          message: verificationCode
            ? `来自 ${payload.sender} 的验证码: ${verificationCode}`
            : `来自 ${payload.sender} 的短信: ${this.truncateMessage(payload.message)}`,
          data: {
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            sender: payload.sender,
            smsContent: payload.message,
            verificationCode,
            receivedAt: payload.receivedAt,
            provider: payload.provider,
          },
        });

        // WebSocket 实时推送 - 高优先级
        this.gateway.sendToUser(payload.userId, {
          type: 'sms.message_received',
          severity: 'info',
          priority: 'high',
          data: {
            phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
            sender: payload.sender,
            message: payload.message,
            verificationCode,
            receivedAt: payload.receivedAt,
          },
        });

        this.logger.log(`短信接收通知已发送: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`处理短信接收事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  // ========== 辅助方法 ==========

  /**
   * 遮盖手机号码中间部分
   */
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    return `${start}****${end}`;
  }

  /**
   * 截断过长的短信内容
   */
  private truncateMessage(message: string, maxLength = 100): string {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + '...';
  }

  /**
   * 从短信内容中提取验证码
   * 支持常见的验证码格式：4-8位数字
   */
  private extractVerificationCode(message: string): string | null {
    if (!message) return null;

    // 常见验证码模式
    const patterns = [
      /验证码[：:是为]?\s*(\d{4,8})/i,
      /code[：:is]?\s*(\d{4,8})/i,
      /(\d{4,8})\s*[是为].*验证码/i,
      /【.*】.*(\d{4,8})/,
      /\b(\d{6})\b/, // 6位数字（最常见的验证码长度）
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 发送号码过期邮件通知
   */
  private async sendNumberExpiredEmail(payload: SmsNumberExpiredEvent['payload']) {
    try {
      if (!payload.userEmail) return;

      await this.emailService.sendEmail({
        to: payload.userEmail,
        subject: `短信接收号码已过期 - ${this.maskPhoneNumber(payload.phoneNumber)}`,
        html: `
          <h2>短信接收号码已过期</h2>
          <p>尊敬的 ${payload.username || '用户'}，</p>
          <p>您的短信接收号码已过期，详情如下：</p>
          <ul>
            <li><strong>号码:</strong> ${this.maskPhoneNumber(payload.phoneNumber)}</li>
            <li><strong>国家:</strong> ${payload.country}</li>
            <li><strong>供应商:</strong> ${payload.provider}</li>
            <li><strong>过期时间:</strong> ${new Date(payload.expiredAt).toLocaleString('zh-CN')}</li>
            <li><strong>是否可续费:</strong> ${payload.renewalAvailable ? '是' : '否'}</li>
          </ul>
          ${
            payload.renewalAvailable
              ? '<p>请登录平台续费以继续使用该号码接收短信。</p>'
              : '<p>该号码不支持续费，如需继续使用短信接收服务，请申请新号码。</p>'
          }
          <p>如有任何问题，请联系客服。</p>
        `,
      });

      this.logger.log(`号码过期邮件已发送: ${payload.userEmail}`);
    } catch (error) {
      this.logger.error(`发送号码过期邮件失败: ${error.message}`);
    }
  }
}
