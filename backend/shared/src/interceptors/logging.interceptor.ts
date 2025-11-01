import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LoggingInterceptorOptions {
  /**
   * 要排除的路径模式（不记录日志）
   * 例如: ['/health', '/metrics', '/favicon.ico']
   */
  excludePaths?: string[];
}

/**
 * 日志拦截器
 *
 * 记录请求和响应的详细信息
 * - 包含 Request ID
 * - 支持路径过滤（健康检查、监控端点等）
 * - 记录请求时间
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly excludePaths: string[];

  constructor(options?: LoggingInterceptorOptions) {
    this.excludePaths = options?.excludePaths || ['/health', '/metrics', '/favicon.ico'];
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query } = request;
    const requestId = request.headers['x-request-id'] || request.id;

    // ✅ 获取追踪信息（来自 RequestTracingMiddleware）
    const traceId = request.traceId || 'N/A';
    const spanId = request.spanId || 'N/A';
    const now = Date.now();

    // 跳过排除路径
    if (this.shouldSkip(url)) {
      return next.handle();
    }

    // ✅ 结构化日志（包含追踪信息）
    const requestLogData = {
      type: 'INCOMING_REQUEST',
      traceId,
      spanId,
      requestId: requestId || 'NO-ID',
      method,
      url,
      query: Object.keys(query || {}).length > 0 ? query : undefined,
      body: Object.keys(body || {}).length > 0 ? this.sanitizeBody(body) : undefined,
    };

    this.logger.debug(JSON.stringify(requestLogData));

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;

          // ✅ 结构化响应日志
          const responseLogData = {
            type: 'OUTGOING_RESPONSE',
            traceId,
            spanId,
            requestId: requestId || 'NO-ID',
            method,
            url,
            duration: `${responseTime}ms`,
            durationMs: responseTime,
          };

          this.logger.debug(JSON.stringify(responseLogData));

          // ✅ 慢请求警告（超过1秒）
          if (responseTime > 1000) {
            this.logger.warn(
              JSON.stringify({
                type: 'SLOW_REQUEST',
                traceId,
                spanId,
                method,
                url,
                duration: `${responseTime}ms`,
                threshold: '1000ms',
              })
            );
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;

          // ✅ 结构化错误日志
          const errorLogData = {
            type: 'ERROR_RESPONSE',
            traceId,
            spanId,
            requestId: requestId || 'NO-ID',
            method,
            url,
            duration: `${responseTime}ms`,
            durationMs: responseTime,
            error: {
              name: error.name,
              message: error.message,
              status: error.status || 500,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
          };

          this.logger.error(JSON.stringify(errorLogData));
        },
      })
    );
  }

  /**
   * 检查是否应该跳过日志记录
   */
  private shouldSkip(url: string): boolean {
    return this.excludePaths.some((path) => url.startsWith(path));
  }

  /**
   * 清理请求体中的敏感信息
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
