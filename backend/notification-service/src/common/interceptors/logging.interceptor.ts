import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers, body } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // 请求日志
    this.logger.log({
      message: `Incoming ${method} request to ${url}`,
      context: 'HTTP',
      method,
      url,
      ip,
      userAgent,
      body: this.sanitizeBody(body),
      user: (request as any).user?.id,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          this.logger.log({
            message: `Request ${method} ${url} completed successfully`,
            context: 'HTTP',
            method,
            url,
            statusCode: response.statusCode,
            duration,
            user: (request as any).user?.id,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.error({
            message: `Request ${method} ${url} failed`,
            context: 'HTTP',
            method,
            url,
            error: error.message,
            stack: error.stack,
            duration,
            user: (request as any).user?.id,
          });
        },
      }),
    );
  }

  /**
   * 移除敏感信息
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
      'privateKey',
      'credit_card',
      'cvv',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
