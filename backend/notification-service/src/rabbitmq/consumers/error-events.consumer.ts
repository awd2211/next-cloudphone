import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ErrorNotificationService, ErrorEvent } from '../../notifications/error-notification.service';

/**
 * 系统错误事件消费者
 *
 * 监听来自所有服务的系统错误事件，并触发管理员通知
 *
 * 事件路由键模式:
 * - system.error.critical - 严重错误（立即通知）
 * - system.error.high - 高优先级错误
 * - system.error.medium - 中等优先级错误
 * - system.error.low - 低优先级错误
 */
@Injectable()
export class ErrorEventsConsumer {
  private readonly logger = new Logger(ErrorEventsConsumer.name);

  constructor(
    private readonly errorNotificationService: ErrorNotificationService,
  ) {}

  /**
   * 监听严重错误
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'system.error.critical',
    queue: 'notification-service.system-error-critical',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'system.error.critical.failed',
    },
  })
  async handleCriticalError(event: ErrorEvent): Promise<void> {
    this.logger.error(
      `收到严重错误事件: ${event.errorCode} - ${event.serviceName}`,
      event.stackTrace
    );

    try {
      await this.errorNotificationService.handleErrorEvent(event);
    } catch (error) {
      this.logger.error('处理严重错误事件失败:', error.stack);
      throw error; // 重新抛出，让消息进入DLX
    }
  }

  /**
   * 监听高优先级错误
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'system.error.high',
    queue: 'notification-service.system-error-high',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'system.error.high.failed',
    },
  })
  async handleHighError(event: ErrorEvent): Promise<void> {
    this.logger.warn(
      `收到高优先级错误事件: ${event.errorCode} - ${event.serviceName}`
    );

    try {
      await this.errorNotificationService.handleErrorEvent(event);
    } catch (error) {
      this.logger.error('处理高优先级错误事件失败:', error.stack);
      throw error;
    }
  }

  /**
   * 监听中等优先级错误
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'system.error.medium',
    queue: 'notification-service.system-error-medium',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'system.error.medium.failed',
    },
  })
  async handleMediumError(event: ErrorEvent): Promise<void> {
    this.logger.log(
      `收到中等优先级错误事件: ${event.errorCode} - ${event.serviceName}`
    );

    try {
      await this.errorNotificationService.handleErrorEvent(event);
    } catch (error) {
      this.logger.error('处理中等优先级错误事件失败:', error.stack);
      throw error;
    }
  }

  /**
   * 监听低优先级错误
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'system.error.low',
    queue: 'notification-service.system-error-low',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'system.error.low.failed',
    },
  })
  async handleLowError(event: ErrorEvent): Promise<void> {
    this.logger.debug(
      `收到低优先级错误事件: ${event.errorCode} - ${event.serviceName}`
    );

    try {
      await this.errorNotificationService.handleErrorEvent(event);
    } catch (error) {
      this.logger.error('处理低优先级错误事件失败:', error.stack);
      throw error;
    }
  }

  /**
   * 监听所有系统错误（通配符）
   * 用于统计和监控，不触发通知
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'system.error.*',
    queue: 'notification-service.system-error-all',
    queueOptions: {
      durable: true,
    },
  })
  async handleAllErrors(event: ErrorEvent): Promise<void> {
    // 只记录日志，不触发通知（通知已由具体的优先级队列处理）
    this.logger.debug(
      `系统错误统计: ${event.errorCode} - ${event.serviceName} (${event.errorMessage})`
    );
  }
}
