import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * 简化的事件接口（用于事件发布）
 * 可选的 type 和 timestamp 字段，用于增强事件追踪
 */
export interface SimpleEvent {
  type?: string;
  timestamp?: string | Date;
  [key: string]: unknown;
}

/**
 * 事件发布选项
 */
export interface PublishOptions {
  /** 消息是否持久化（默认 true） */
  persistent?: boolean;
  /** 自定义时间戳（默认使用当前时间） */
  timestamp?: number;
  /** 消息优先级（0-10，默认无） */
  priority?: number;
  /** 消息过期时间（毫秒） */
  expiration?: string | number;
}

/**
 * 事件总线服务 (基于 @golevelup/nestjs-rabbitmq)
 *
 * V2 重写说明:
 * - 使用 @golevelup/nestjs-rabbitmq 的 AmqpConnection
 * - 统一所有服务的 RabbitMQ 实现
 * - 保持与 V1 (原生 amqplib) 完全兼容的 API
 *
 * 功能特性:
 * - ✅ 自动重连机制 (由 @golevelup 提供)
 * - ✅ 连接池管理 (由 @golevelup 提供)
 * - ✅ 优雅关闭 (由 @golevelup 提供)
 * - ✅ 错误处理
 * - ✅ 类型安全
 * - ✅ 支持 @RabbitSubscribe 装饰器 (消费者)
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly amqpConnection?: AmqpConnection,
  ) {}

  /**
   * 发布事件到 RabbitMQ（类型安全版本）
   * @param exchange 交换机名称
   * @param routingKey 路由键
   * @param message 消息内容
   * @param options 发布选项
   */
  async publish<T extends SimpleEvent>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.amqpConnection) {
      throw new Error('AmqpConnection not available. Make sure RabbitMQModule is imported.');
    }

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
   * 发布设备相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishDeviceEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `device.${eventType}`, {
      type: `device.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布应用相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishAppEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `app.${eventType}`, {
      type: `app.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布订单相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishOrderEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `order.${eventType}`, {
      type: `order.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布用户相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishUserEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `user.${eventType}`, {
      type: `user.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布通知相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishNotificationEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `notification.${eventType}`, {
      type: `notification.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布计费相关事件（类型安全）
   * @param eventType 事件类型（不含前缀）
   * @param payload 事件负载
   */
  async publishBillingEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): Promise<void> {
    await this.publish('cloudphone.events', `billing.${eventType}`, {
      type: `billing.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    } as SimpleEvent & T);
  }

  /**
   * 发布系统错误事件（用于管理员通知）
   *
   * @param severity 错误严重程度: critical | high | medium | low
   * @param errorCode 错误代码
   * @param errorMessage 错误消息
   * @param serviceName 服务名称
   * @param options 可选参数
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
    },
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
      } as SimpleEvent,
      {
        // 严重错误使用高优先级
        priority: severity === 'critical' ? 10 : severity === 'high' ? 8 : 5,
        persistent: true,
      }
    );

    this.logger.log(
      `System error published: ${errorCode} (${severity}) - ${serviceName}`
    );
  }
}
