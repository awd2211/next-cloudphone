import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 日志拦截器
 * 
 * 记录请求和响应的详细信息
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query } = request;
    const now = Date.now();

    this.logger.debug(
      `Incoming Request: ${method} ${url}` +
      (Object.keys(query).length ? ` Query: ${JSON.stringify(query)}` : '') +
      (Object.keys(body || {}).length ? ` Body: ${JSON.stringify(body)}` : ''),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logger.debug(`Response: ${method} ${url} - ${responseTime}ms`);
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `Error Response: ${method} ${url} - ${responseTime}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
