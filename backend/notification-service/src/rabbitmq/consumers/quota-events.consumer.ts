import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { NotificationGateway } from '../../gateway/notification.gateway';
import { BaseConsumer } from '@cloudphone/shared';
import { Retry } from '../../common/decorators/retry.decorator';

/**
 * 配额事件类型
 */
interface QuotaEvent {
  userId: string;
  quotaId: string;
  type: 'updated' | 'alert' | 'exceeded' | 'renewed';
  limits?: Record<string, number>;
  usage?: Record<string, number>;
  usagePercent?: number;
  alertLevel?: 'warning' | 'critical';
  timestamp: string;
}

/**
 * 配额事件消费者
 *
 * 监听配额相关事件并通过 WebSocket 推送给客户端
 *
 * ✅ 增强功能:
 * - 继承 BaseConsumer 获得统一错误处理
 * - 使用 @Retry 装饰器自动重试可重试错误
 * - 详细的错误日志和 DLX 集成
 */
@Injectable()
export class QuotaEventsConsumer extends BaseConsumer {
  protected readonly logger = new Logger(QuotaEventsConsumer.name);

  constructor(private readonly gateway: NotificationGateway) {
    super(); // 初始化 BaseConsumer
  }

  /**
   * 处理配额更新事件
   *
   * 路由键: quota.updated
   *
   * ✅ 增强功能:
   * - 数据验证
   * - 超时保护（10秒）
   * - 自动重试（网络错误）
   * - 详细错误日志
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'quota.updated',
    queue: 'notification-service.quota-updated',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  @Retry({ maxAttempts: 3, baseDelayMs: 1000 })
  async handleQuotaUpdated(event: QuotaEvent, msg?: ConsumeMessage) {
    try {
      // 1. 验证必需字段
      this.validateEventData(event, ['userId', 'quotaId', 'type', 'timestamp']);

      this.logger.log(`处理配额更新事件: 用户=${event.userId}, 配额=${event.quotaId}`);

      // 2. 使用超时保护执行推送
      await this.executeWithTimeout(async () => {
        // 推送给特定用户
        this.gateway.sendToUser(event.userId, {
          type: 'quota.updated',
          data: event,
        });

        // 如果是管理员房间，也推送一份
        const adminRoomCount = await this.gateway.getRoomClientsCount('admin');
        if (adminRoomCount > 0) {
          this.gateway.sendToRoom('admin', {
            type: 'quota.updated',
            data: event,
          });
        }
      }, 10000, 'WebSocket push');

      // 3. 记录成功
      this.logSuccess('quota.updated', event);
    } catch (error) {
      // 4. 统一错误处理
      this.handleConsumerError(error, 'quota.updated', event, msg);
      throw error; // 重新抛出以便进入 DLX
    }
  }

  /**
   * 处理配额告警事件
   *
   * 路由键: quota.alert
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'quota.alert',
    queue: 'notification-service.quota-alert',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleQuotaAlert(event: QuotaEvent) {
    try {
      this.logger.warn(
        `配额告警: 用户=${event.userId}, 配额=${event.quotaId}, 等级=${event.alertLevel}, 使用率=${event.usagePercent}%`
      );

      // 推送给特定用户
      this.gateway.sendToUser(event.userId, {
        type: 'quota.alert',
        data: event,
      });

      // 如果是严重告警（≥95%），推送给管理员房间
      if (event.alertLevel === 'critical' || (event.usagePercent && event.usagePercent >= 95)) {
        this.gateway.sendNotificationToRoom('admin', {
          type: 'critical',
          title: '配额严重告警',
          message: `用户 ${event.userId} 的配额 ${event.quotaId} 使用率达到 ${event.usagePercent}%`,
          data: event,
          timestamp: event.timestamp,
        });
      }

      this.logger.log(`配额告警事件已推送: ${event.quotaId}`);
    } catch (error) {
      this.logger.error(`处理配额告警事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理配额超额事件
   *
   * 路由键: quota.exceeded
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'quota.exceeded',
    queue: 'notification-service.quota-exceeded',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleQuotaExceeded(event: QuotaEvent) {
    try {
      this.logger.error(`配额超额: 用户=${event.userId}, 配额=${event.quotaId}`);

      // 推送给特定用户
      this.gateway.sendToUser(event.userId, {
        type: 'quota.exceeded',
        data: event,
      });

      // 推送给管理员房间（配额超额需要管理员关注）
      this.gateway.sendNotificationToRoom('admin', {
        type: 'error',
        title: '配额超额',
        message: `用户 ${event.userId} 的配额 ${event.quotaId} 已超额`,
        data: event,
        timestamp: event.timestamp,
      });

      this.logger.log(`配额超额事件已推送: ${event.quotaId}`);
    } catch (error) {
      this.logger.error(`处理配额超额事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理配额续费事件
   *
   * 路由键: quota.renewed
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'quota.renewed',
    queue: 'notification-service.quota-renewed',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleQuotaRenewed(event: QuotaEvent) {
    try {
      this.logger.log(`配额续费: 用户=${event.userId}, 配额=${event.quotaId}`);

      // 推送给特定用户
      this.gateway.sendToUser(event.userId, {
        type: 'quota.renewed',
        data: event,
      });

      this.logger.log(`配额续费事件已推送: ${event.quotaId}`);
    } catch (error) {
      this.logger.error(`处理配额续费事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
