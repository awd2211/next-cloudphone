/**
 * 自定义 Span 和 Attributes 使用示例
 *
 * 本文件展示如何在 NestJS 服务中添加自定义 span 和业务相关 attributes
 */

import { Injectable } from '@nestjs/common';
import { trace, SpanStatusCode, context, SpanKind } from '@opentelemetry/api';

@Injectable()
export class DeviceServiceExample {
  // 获取 tracer 实例
  private readonly tracer = trace.getTracer('device-service');

  /**
   * 示例 1: 创建设备时添加自定义 span
   */
  async createDevice(userId: string, deviceType: string) {
    // 创建自定义 span
    return await this.tracer.startActiveSpan(
      'device.create',
      async (span) => {
        try {
          // 添加业务相关 attributes
          span.setAttributes({
            'user.id': userId,
            'device.type': deviceType,
            'operation.type': 'create',
          });

          // 执行业务逻辑
          const device = await this.performDeviceCreation(userId, deviceType);

          // 添加创建结果的 attributes
          span.setAttributes({
            'device.id': device.id,
            'device.status': device.status,
          });

          // 设置成功状态
          span.setStatus({ code: SpanStatusCode.OK });

          return device;
        } catch (error) {
          // 记录错误
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          // span 会自动结束
          span.end();
        }
      },
    );
  }

  /**
   * 示例 2: 在现有 context 中创建子 span
   */
  async startDevice(deviceId: string) {
    const currentSpan = trace.getActiveSpan();

    return await this.tracer.startActiveSpan(
      'device.start',
      {
        // 设置 span 类型
        kind: SpanKind.INTERNAL,
        // 添加初始 attributes
        attributes: {
          'device.id': deviceId,
          'operation': 'start',
        },
      },
      async (span) => {
        try {
          // 添加事件（重要的时间点）
          span.addEvent('Starting device container');

          const result = await this.performDeviceStart(deviceId);

          span.addEvent('Device container started', {
            'container.id': result.containerId,
          });

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * 示例 3: 手动管理 span（高级用法）
   */
  async complexOperation(deviceId: string) {
    // 创建 span 但不立即激活
    const span = this.tracer.startSpan('device.complex_operation');

    span.setAttributes({
      'device.id': deviceId,
      'complexity': 'high',
    });

    try {
      // 在特定上下文中执行操作
      const ctx = trace.setSpan(context.active(), span);

      // 执行多个子操作
      await context.with(ctx, async () => {
        await this.subOperation1(deviceId);
        await this.subOperation2(deviceId);
        await this.subOperation3(deviceId);
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 示例 4: 添加链接到其他 trace
   */
  async relatedOperation(deviceId: string, relatedTraceId: string) {
    // 获取当前 span 上下文
    const currentContext = trace.getActiveSpan()?.spanContext();

    return await this.tracer.startActiveSpan(
      'device.related_operation',
      {
        links: relatedTraceId
          ? [
              {
                context: {
                  traceId: relatedTraceId,
                  spanId: '', // 需要提供实际的 spanId
                  traceFlags: 0,
                },
              },
            ]
          : [],
      },
      async (span) => {
        span.setAttributes({
          'device.id': deviceId,
          'related.trace_id': relatedTraceId,
        });

        const result = await this.performRelatedOperation(deviceId);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      },
    );
  }

  // 辅助方法（示例）
  private async performDeviceCreation(userId: string, deviceType: string) {
    return { id: 'device-123', status: 'creating' };
  }

  private async performDeviceStart(deviceId: string) {
    return { containerId: 'container-456' };
  }

  private async subOperation1(deviceId: string) {}
  private async subOperation2(deviceId: string) {}
  private async subOperation3(deviceId: string) {}

  private async performRelatedOperation(deviceId: string) {
    return {};
  }
}

/**
 * 示例 5: 装饰器模式（更优雅的方式）
 */
function TraceMethod(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer('custom-decorator');

    descriptor.value = async function (...args: any[]) {
      const spanName = operationName || `${target.constructor.name}.${propertyKey}`;

      return await tracer.startActiveSpan(spanName, async (span) => {
        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

// 使用装饰器
@Injectable()
export class DeviceServiceWithDecorator {
  @TraceMethod('device.create_with_decorator')
  async createDevice(userId: string, deviceType: string) {
    // 业务逻辑
    return { id: 'device-789', status: 'created' };
  }
}
