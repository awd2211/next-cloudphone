import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * 失败消息类型定义
 * 所有进入 DLX 的消息都应包含这些基础字段
 */
interface FailedMessage {
  eventId?: string;
  eventType?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * 死信队列消费者
 * 处理所有失败的消息，实现重试逻辑和失败告警
 */
@Injectable()
export class DlxConsumer {
  private readonly logger = new Logger(DlxConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 处理用户事件失败
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.notifications.dlx',
    routingKey: 'user.*.failed',
    queue: 'notification-service.dlx.user',
    queueOptions: {
      durable: true,
    },
  })
  async handleUserEventFailure(msg: FailedMessage, amqpMsg: ConsumeMessage) {
    await this.handleFailedMessage('user', msg, amqpMsg);
  }

  /**
   * 处理设备事件失败
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.notifications.dlx',
    routingKey: 'device.*.failed',
    queue: 'notification-service.dlx.device',
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceEventFailure(msg: FailedMessage, amqpMsg: ConsumeMessage) {
    await this.handleFailedMessage('device', msg, amqpMsg);
  }

  /**
   * 处理应用事件失败
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.notifications.dlx',
    routingKey: 'app.*.failed',
    queue: 'notification-service.dlx.app',
    queueOptions: {
      durable: true,
    },
  })
  async handleAppEventFailure(msg: FailedMessage, amqpMsg: ConsumeMessage) {
    await this.handleFailedMessage('app', msg, amqpMsg);
  }

  /**
   * 处理计费事件失败
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.notifications.dlx',
    routingKey: 'billing.*.failed',
    queue: 'notification-service.dlx.billing',
    queueOptions: {
      durable: true,
    },
  })
  async handleBillingEventFailure(msg: FailedMessage, amqpMsg: ConsumeMessage) {
    await this.handleFailedMessage('billing', msg, amqpMsg);
  }

  /**
   * 通用失败消息处理
   */
  private async handleFailedMessage(
    category: string,
    msg: FailedMessage,
    amqpMsg: ConsumeMessage,
  ) {
    const retryCount = this.getRetryCount(amqpMsg);
    const maxRetries = 3; // 最大重试次数

    this.logger.warn(
      `处理失败消息 [${category}]: ${amqpMsg.fields.routingKey}, 重试次数: ${retryCount}/${maxRetries}`,
    );

    try {
      // 记录失败消息到数据库
      await this.logFailedMessage(category, msg, amqpMsg, retryCount);

      // 如果超过最大重试次数，发送告警
      if (retryCount >= maxRetries) {
        this.logger.error(
          `消息处理失败超过最大重试次数: ${amqpMsg.fields.routingKey}`,
        );
        await this.sendFailureAlert(category, msg, amqpMsg, retryCount);

        // 标记为永久失败
        await this.markAsPermanentFailure(category, msg, amqpMsg);
      } else {
        this.logger.log(
          `消息将在稍后重试: ${amqpMsg.fields.routingKey}, 下次重试: ${retryCount + 1}/${maxRetries}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `处理死信消息时发生错误: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 获取消息的重试次数
   */
  private getRetryCount(amqpMsg: ConsumeMessage): number {
    const xDeathHeader = amqpMsg.properties.headers?.['x-death'];
    if (Array.isArray(xDeathHeader) && xDeathHeader.length > 0) {
      return xDeathHeader[0].count || 0;
    }
    return 0;
  }

  /**
   * 记录失败消息到数据库
   */
  private async logFailedMessage(
    category: string,
    msg: FailedMessage,
    amqpMsg: ConsumeMessage,
    retryCount: number,
  ) {
    try {
      // 这里可以扩展为将失败消息存储到专门的失败消息表
      this.logger.debug(
        `记录失败消息: ${JSON.stringify({
          category,
          routingKey: amqpMsg.fields.routingKey,
          retryCount,
          eventId: msg.eventId,
          eventType: msg.eventType,
          timestamp: new Date().toISOString(),
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `记录失败消息时出错: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 发送失败告警
   */
  private async sendFailureAlert(
    category: string,
    msg: FailedMessage,
    amqpMsg: ConsumeMessage,
    retryCount: number,
  ) {
    try {
      // 向系统管理员发送告警通知
      await this.notificationsService.createAndSend({
        userId: 'SYSTEM_ADMIN', // 系统管理员ID
        type: 'alert' as any,
        title: `消息处理失败告警 [${category}]`,
        message: `消息 ${amqpMsg.fields.routingKey} 处理失败 ${retryCount} 次，已超过最大重试次数。`,
        data: {
          category,
          routingKey: amqpMsg.fields.routingKey,
          eventId: msg.eventId,
          eventType: msg.eventType,
          retryCount,
          failedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`已发送失败告警通知: ${category}/${amqpMsg.fields.routingKey}`);
    } catch (error) {
      this.logger.error(
        `发送失败告警时出错: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 标记为永久失败
   */
  private async markAsPermanentFailure(
    category: string,
    msg: FailedMessage,
    amqpMsg: ConsumeMessage,
  ) {
    try {
      // 这里可以将消息移到永久失败存储，用于后续人工处理
      this.logger.warn(
        `消息已标记为永久失败: ${category}/${amqpMsg.fields.routingKey}`,
      );
    } catch (error) {
      this.logger.error(
        `标记永久失败时出错: ${error.message}`,
        error.stack,
      );
    }
  }
}
