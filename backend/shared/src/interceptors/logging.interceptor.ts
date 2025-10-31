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
    const now = Date.now();

    // 跳过排除路径
    if (this.shouldSkip(url)) {
      return next.handle();
    }

    const requestLog = [`[${requestId || 'NO-ID'}]`, `Incoming Request: ${method} ${url}`];

    if (Object.keys(query || {}).length) {
      requestLog.push(`Query: ${JSON.stringify(query)}`);
    }

    if (Object.keys(body || {}).length) {
      // 避免记录敏感信息
      const sanitizedBody = this.sanitizeBody(body);
      requestLog.push(`Body: ${JSON.stringify(sanitizedBody)}`);
    }

    this.logger.debug(requestLog.join(' '));

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logger.debug(
            `[${requestId || 'NO-ID'}] Response: ${method} ${url} - ${responseTime}ms`
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[${requestId || 'NO-ID'}] Error Response: ${method} ${url} - ${responseTime}ms - ${error.message}`
          );
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
