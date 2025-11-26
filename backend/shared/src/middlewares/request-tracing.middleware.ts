import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { context, trace, propagation, SpanKind, SpanStatusCode } from '@opentelemetry/api';

/**
 * ✅ 增强版请求追踪中间件
 *
 * 功能：
 * 1. 为每个请求生成唯一的 traceId 和 spanId
 * 2. 支持 W3C Trace Context 标准（traceparent header）
 * 3. 与 OpenTelemetry API 集成，自动创建和管理 span
 * 4. 将追踪信息注入到请求对象（方便日志和其他中间件使用）
 * 5. 支持分布式追踪（从上游服务提取 trace context）
 * 6. 返回追踪头信息给客户端
 *
 * W3C Trace Context 格式：
 * traceparent: {version}-{trace-id}-{parent-id}-{trace-flags}
 * 例如: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
@Injectable()
export class RequestTracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestTracing');

  use(req: Request, res: Response, next: NextFunction) {
    const tracer = trace.getTracer('cloudphone-platform');

    // ✅ 1. 从上游提取 OpenTelemetry context（支持 W3C Trace Context）
    const extractedContext = propagation.extract(context.active(), req.headers);

    // ✅ 2. 在提取的 context 中创建新的 span
    const span = tracer.startSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.target': req.path,
          'http.host': req.hostname,
          'http.user_agent': req.get('user-agent') || 'unknown',
          'http.client_ip': req.ip || req.get('x-forwarded-for') || 'unknown',
        },
      },
      extractedContext
    );

    // ✅ 3. 获取 span context
    const spanContext = span.spanContext();
    const traceId = spanContext.traceId;
    const spanId = spanContext.spanId;

    // ✅ 4. 兼容：也支持自定义的 X-Trace-Id header（用于非 OpenTelemetry 客户端）
    const customTraceId = (req.headers['x-trace-id'] as string) || traceId;
    const parentSpanId = req.headers['x-span-id'] as string;

    // ✅ 5. 将追踪信息注入到请求对象
    (req as any).traceId = customTraceId;
    (req as any).spanId = spanId;
    (req as any).parentSpanId = parentSpanId;
    (req as any).otelSpan = span; // 保存 span 引用，供后续使用

    // ✅ 6. 将追踪信息添加到响应头
    res.setHeader('X-Trace-Id', customTraceId);
    res.setHeader('X-Span-Id', spanId);

    // ✅ 7. 注入 W3C Trace Context 到响应头（方便客户端继续追踪）
    const traceHeaders: Record<string, string> = {};
    propagation.inject(trace.setSpan(context.active(), span), traceHeaders);
    if (traceHeaders['traceparent']) {
      res.setHeader('traceparent', traceHeaders['traceparent']);
    }
    if (traceHeaders['tracestate']) {
      res.setHeader('tracestate', traceHeaders['tracestate']);
    }

    // ✅ 8. 在 OpenTelemetry context 中执行后续中间件
    context.with(trace.setSpan(extractedContext, span), () => {
      // ✅ 9. 监听响应完成，结束 span
      res.on('finish', () => {
        // 设置 HTTP 状态码
        span.setAttribute('http.status_code', res.statusCode);

        // 根据状态码设置 span 状态
        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
      });

      // ✅ 10. 监听错误
      res.on('error', (error) => {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.end();
      });

      next();
    });
  }
}

/**
 * ✅ 扩展 Express Request 类型
 * 添加追踪字段的类型定义
 */
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      spanId?: string;
      parentSpanId?: string;
      otelSpan?: any; // OpenTelemetry Span
    }
  }
}

/**
 * ✅ 追踪上下文工具函数
 * 用于在服务内部获取当前追踪信息
 */
export function getCurrentTraceContext(): {
  traceId: string;
  spanId: string;
  isValid: boolean;
} {
  const span = trace.getActiveSpan();
  if (!span) {
    return { traceId: '', spanId: '', isValid: false };
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    isValid: trace.isSpanContextValid(spanContext),
  };
}

/**
 * ✅ 创建子 span 的工具函数
 * 用于追踪服务内部的关键操作
 */
export function createChildSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): any {
  const tracer = trace.getTracer('cloudphone-platform');
  return tracer.startSpan(name, {
    kind: SpanKind.INTERNAL,
    attributes,
  });
}

/**
 * ✅ 结束 span 并设置状态
 */
export function endSpan(
  span: any,
  error?: Error
): void {
  if (!span) return;

  if (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}
