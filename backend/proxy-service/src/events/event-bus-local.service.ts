import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * 本地简化版 EventBusService
 *
 * 相比 shared 包中的 EventBusService:
 * - 不依赖 ConfigService (避免循环依赖)
 * - 只提供核心的事件发布功能
 * - 专门为 proxy-service 设计
 */
@Injectable()
export class EventBusLocalService {
  private readonly logger = new Logger(EventBusLocalService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * 发布事件到 RabbitMQ
   */
  async publish(
    exchange: string,
    routingKey: string,
    message: any,
    options?: {
      persistent?: boolean;
      timestamp?: number;
      priority?: number;
      expiration?: string | number;
    }
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(exchange, routingKey, message, {
        persistent: options?.persistent ?? true,
        timestamp: options?.timestamp ?? Date.now(),
        priority: options?.priority,
        expiration: options?.expiration ? String(options.expiration) : undefined,
      });

      this.logger.debug(`Event published: ${routingKey} to ${exchange}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${routingKey}`, error);
      throw error;
    }
  }

  /**
   * 发布代理相关事件
   */
  async publishProxyEvent(eventType: string, payload: any): Promise<void> {
    await this.publish('cloudphone.events', `proxy.${eventType}`, {
      type: `proxy.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * 发布系统错误事件
   */
  async publishSystemError(
    severity: 'critical' | 'high' | 'medium' | 'low',
    errorCode: string,
    errorMessage: string,
    serviceName: string,
    options?: {
      userMessage?: string;
      requestId?: string;
      userId?: string;
      stackTrace?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const routingKey = `system.error.${severity}`;

    await this.publish(
      'cloudphone.events',
      routingKey,
      {
        type: routingKey,
        errorCode,
        errorMessage,
        userMessage: options?.userMessage,
        serviceName,
        requestId: options?.requestId,
        userId: options?.userId,
        stackTrace: options?.stackTrace,
        metadata: options?.metadata,
        timestamp: new Date(),
      },
      {
        priority: severity === 'critical' ? 10 : severity === 'high' ? 8 : 5,
        persistent: true,
      }
    );

    this.logger.log(`System error published: ${errorCode} (${severity}) - ${serviceName}`);
  }
}
