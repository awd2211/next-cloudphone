import { Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';

/**
 * 消费者错误类型
 */
export enum ConsumerErrorType {
  /** 网络错误（可重试） */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 超时错误（可重试） */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** 依赖服务不可用（可重试） */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 业务逻辑错误（不可重试） */
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  /** 数据验证错误（不可重试） */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 消费者错误
 */
export class ConsumerError extends Error {
  constructor(
    message: string,
    public readonly type: ConsumerErrorType,
    public readonly originalError?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ConsumerError';
  }
}

/**
 * 错误处理策略
 */
export interface ErrorHandlingStrategy {
  /**
   * 判断错误是否可重试
   */
  isRetryable(error: Error): boolean;

  /**
   * 获取错误类型
   */
  getErrorType(error: Error): ConsumerErrorType;

  /**
   * 获取重试延迟（毫秒）
   */
  getRetryDelay(attempt: number): number;
}

/**
 * 默认错误处理策略
 */
export class DefaultErrorHandlingStrategy implements ErrorHandlingStrategy {
  isRetryable(error: Error): boolean {
    // 网络错误、超时、服务不可用都可以重试
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
      'TimeoutError',
      'ServiceUnavailableException',
    ];

    return retryableErrors.some(
      (retryable) =>
        error.message.includes(retryable) || error.name === retryable
    );
  }

  getErrorType(error: Error): ConsumerErrorType {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      return ConsumerErrorType.NETWORK_ERROR;
    }
    if (error.message.includes('Timeout') || error.name === 'TimeoutError') {
      return ConsumerErrorType.TIMEOUT_ERROR;
    }
    if (error.message.includes('ServiceUnavailable')) {
      return ConsumerErrorType.SERVICE_UNAVAILABLE;
    }
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return ConsumerErrorType.VALIDATION_ERROR;
    }
    return ConsumerErrorType.UNKNOWN_ERROR;
  }

  getRetryDelay(attempt: number): number {
    // 指数退避: 1s, 2s, 4s, 8s, ...
    const baseDelay = 1000;
    const maxDelay = 30000; // 最大 30 秒
    return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  }
}

/**
 * 消费者基类
 *
 * 提供统一的错误处理、日志记录、重试机制
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyConsumer extends BaseConsumer {
 *   protected readonly logger = new Logger(MyConsumer.name);
 *
 *   @RabbitSubscribe({
 *     exchange: 'cloudphone.events',
 *     routingKey: 'user.created',
 *     queue: 'my-service.user-created',
 *     queueOptions: { durable: true, deadLetterExchange: 'cloudphone.dlx' },
 *   })
 *   async handleUserCreated(event: UserCreatedEvent, msg: ConsumeMessage) {
 *     try {
 *       this.validateEventData(event, ['userId', 'email']);
 *       await this.executeWithTimeout(
 *         () => this.processUser(event),
 *         5000,
 *         'ProcessUser'
 *       );
 *       this.logSuccess('user.created', event);
 *     } catch (error) {
 *       this.handleConsumerError(error, 'user.created', event, msg);
 *       throw error; // Rethrow to send to DLX
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseConsumer {
  protected abstract readonly logger: Logger;
  protected readonly errorStrategy: ErrorHandlingStrategy;

  constructor(errorStrategy?: ErrorHandlingStrategy) {
    this.errorStrategy = errorStrategy || new DefaultErrorHandlingStrategy();
  }

  /**
   * 处理消费者错误
   *
   * @param error 原始错误
   * @param eventName 事件名称
   * @param eventData 事件数据
   * @param msg RabbitMQ 消息对象
   */
  protected handleConsumerError(
    error: Error,
    eventName: string,
    eventData: any,
    msg?: ConsumeMessage
  ): void {
    const errorType = this.errorStrategy.getErrorType(error);
    const isRetryable = this.errorStrategy.isRetryable(error);

    // 记录详细错误日志
    this.logger.error(
      `事件处理失败: ${eventName}`,
      JSON.stringify({
        eventName,
        errorType,
        errorMessage: error.message,
        isRetryable,
        eventData: this.sanitizeEventData(eventData),
        routingKey: msg?.fields?.routingKey,
        exchange: msg?.fields?.exchange,
        deliveryTag: msg?.fields?.deliveryTag,
      }, null, 2),
      error.stack
    );

    // 如果不可重试，记录到特殊日志
    if (!isRetryable) {
      this.logger.error(
        `不可重试错误，消息将进入 DLX: ${eventName}`,
        JSON.stringify({
          eventData: this.sanitizeEventData(eventData),
          errorMessage: error.message,
        })
      );
    }
  }

  /**
   * 清理敏感数据
   */
  protected sanitizeEventData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * 验证事件数据
   */
  protected validateEventData(data: any, requiredFields: string[]): void {
    if (!data) {
      throw new ConsumerError(
        '事件数据为空',
        ConsumerErrorType.VALIDATION_ERROR,
        undefined,
        false
      );
    }

    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new ConsumerError(
        `缺少必需字段: ${missingFields.join(', ')}`,
        ConsumerErrorType.VALIDATION_ERROR,
        undefined,
        false
      );
    }
  }

  /**
   * 安全执行异步操作（带超时）
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    operationName: string = 'Operation'
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * 记录成功处理的事件
   */
  protected logSuccess(eventName: string, eventData: any): void {
    this.logger.log(
      `事件处理成功: ${eventName}`,
      JSON.stringify({
        eventName,
        userId: eventData?.userId,
        timestamp: eventData?.timestamp || new Date().toISOString(),
      })
    );
  }
}
