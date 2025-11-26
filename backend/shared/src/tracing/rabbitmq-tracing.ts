/**
 * ✅ RabbitMQ 消息追踪工具
 *
 * 提供在 RabbitMQ 消费者中提取和恢复 OpenTelemetry trace context 的功能
 * 确保异步事件链路可以正确追踪
 */

import { context, propagation, trace, SpanKind, SpanStatusCode, Context } from '@opentelemetry/api';
import { Logger } from '@nestjs/common';

const logger = new Logger('RabbitMQTracing');

/**
 * 消息中的 trace context 接口
 *
 * 使用 { _trace?: ... } 而不是 index signature，
 * 这样可以兼容具有字面量类型属性的事件接口
 */
export interface TracedMessage {
  _trace?: Record<string, string>;
}

/**
 * 宽松版本的 TracedMessage，用于接受任何带 _trace 的对象
 * 这允许事件接口（如 DeviceCreatedEvent）直接传入而无需类型断言
 */
export type AnyTracedMessage = { _trace?: Record<string, string> } & Record<string, unknown>;

/**
 * ✅ 从 RabbitMQ 消息中提取 OpenTelemetry context
 *
 * @param message 包含 _trace 字段的消息（接受任意对象类型）
 * @returns 提取的 OpenTelemetry context
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({...})
 * async handleDeviceCreated(message: DeviceCreatedEvent) {
 *   const extractedContext = extractTraceContext(message);
 *   await context.with(extractedContext, async () => {
 *     // 在正确的 trace context 中执行业务逻辑
 *   });
 * }
 * ```
 */
export function extractTraceContext(message: unknown): Context {
  const msg = message as { _trace?: Record<string, string> };
  if (!msg._trace) {
    logger.debug('No trace context found in message, using current context');
    return context.active();
  }

  try {
    return propagation.extract(context.active(), msg._trace);
  } catch (error) {
    logger.warn('Failed to extract trace context from message', error);
    return context.active();
  }
}

/**
 * ✅ 在消息的 trace context 中创建消费者 span
 *
 * @param message 包含 _trace 字段的消息
 * @param spanName span 名称
 * @param routingKey 路由键（用于属性）
 * @returns 新创建的 span
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({...})
 * async handleDeviceCreated(message: DeviceCreatedEvent) {
 *   const span = createConsumerSpan(message, 'process device.created', 'device.created');
 *   try {
 *     // 业务逻辑
 *     span.setStatus({ code: SpanStatusCode.OK });
 *   } catch (error) {
 *     span.recordException(error);
 *     span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 *     throw error;
 *   } finally {
 *     span.end();
 *   }
 * }
 * ```
 */
export function createConsumerSpan(
  message: unknown,
  spanName: string,
  routingKey: string
): any {
  const extractedContext = extractTraceContext(message);
  const tracer = trace.getTracer('cloudphone-event-consumer');

  return tracer.startSpan(
    spanName,
    {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.operation': 'receive',
        'messaging.rabbitmq.routing_key': routingKey,
        'messaging.message_type': (message as any).type || routingKey,
      },
    },
    extractedContext
  );
}

/**
 * ✅ 装饰器风格的消息处理包装器
 *
 * 自动提取 trace context、创建 span、处理异常
 *
 * @param routingKey 路由键
 * @param handler 消息处理函数
 * @returns 包装后的处理函数
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({
 *   exchange: 'cloudphone.events',
 *   routingKey: 'device.created',
 *   queue: 'billing-service.device-created',
 * })
 * handleDeviceCreated = withTracing('device.created', async (message: DeviceCreatedEvent) => {
 *   // 业务逻辑（自动在正确的 trace context 中执行）
 *   await this.billingService.startMetering(message.deviceId);
 * });
 * ```
 */
export function withTracing<T, R>(
  routingKey: string,
  handler: (message: T) => Promise<R>
): (message: T) => Promise<R> {
  return async (message: T): Promise<R> => {
    const span = createConsumerSpan(message, `process ${routingKey}`, routingKey);
    const extractedContext = extractTraceContext(message);

    return context.with(trace.setSpan(extractedContext, span), async () => {
      try {
        const result = await handler(message);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  };
}

/**
 * ✅ 在提取的 trace context 中执行异步操作
 *
 * @param message 包含 _trace 字段的消息
 * @param fn 要执行的异步函数
 * @returns 执行结果
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({...})
 * async handleDeviceCreated(message: DeviceCreatedEvent) {
 *   return runInTraceContext(message, async () => {
 *     // 所有在此执行的代码都会继承正确的 trace context
 *     await this.notificationService.send(...);
 *     await this.auditService.log(...);
 *   });
 * }
 * ```
 */
export async function runInTraceContext<T, R>(
  message: T,
  fn: () => Promise<R>
): Promise<R> {
  const extractedContext = extractTraceContext(message);
  return context.with(extractedContext, fn);
}

/**
 * ✅ 获取消息中的 trace ID（用于日志关联）
 *
 * @param message 包含 _trace 字段的消息
 * @returns trace ID 或 undefined
 */
export function getTraceIdFromMessage(message: unknown): string | undefined {
  const msg = message as { _trace?: Record<string, string> };
  if (!msg._trace?.traceparent) {
    return undefined;
  }

  // W3C traceparent 格式: {version}-{trace-id}-{parent-id}-{flags}
  const parts = msg._trace.traceparent.split('-');
  return parts.length >= 2 ? parts[1] : undefined;
}

/**
 * ✅ 清理消息中的 _trace 字段（如果不想在日志中显示）
 *
 * @param message 原始消息
 * @returns 不包含 _trace 字段的消息副本
 */
export function stripTraceContext<T>(message: T): Omit<T, '_trace'> {
  const { _trace, ...rest } = message as T & { _trace?: unknown };
  return rest as Omit<T, '_trace'>;
}
