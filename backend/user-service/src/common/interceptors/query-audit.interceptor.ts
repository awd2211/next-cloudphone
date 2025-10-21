import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SAFE_QUERY_KEY, RAW_QUERY_KEY } from '../decorators/safe-query.decorator';

/**
 * 查询审计拦截器
 *
 * 功能：
 * - 记录所有数据库查询
 * - 检测潜在的 SQL 注入风险
 * - 统计查询性能
 * - 记录查询错误
 */
@Injectable()
export class QueryAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('QueryAudit');

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 获取 @SafeQuery 和 @RawQuery 元数据
    const safeQueryMeta = this.reflector.get(SAFE_QUERY_KEY, context.getHandler());
    const rawQueryMeta = this.reflector.get(RAW_QUERY_KEY, context.getHandler());

    // 如果没有标记，跳过审计
    if (!safeQueryMeta && !rawQueryMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    const startTime = Date.now();

    // 记录查询开始
    if (safeQueryMeta) {
      this.logSafeQuery(
        className,
        methodName,
        safeQueryMeta,
        context.getArgs(),
      );
    }

    if (rawQueryMeta) {
      this.logRawQuery(className, methodName, rawQueryMeta);
    }

    return next.handle().pipe(
      tap((result) => {
        // 查询成功
        const duration = Date.now() - startTime;

        this.logger.log({
          type: 'query_success',
          class: className,
          method: methodName,
          duration: `${duration}ms`,
          resultSize: this.getResultSize(result),
          timestamp: new Date().toISOString(),
        });

        // 性能警告
        if (duration > 1000) {
          this.logger.warn({
            type: 'slow_query',
            class: className,
            method: methodName,
            duration: `${duration}ms`,
            message: '查询耗时超过 1 秒',
            timestamp: new Date().toISOString(),
          });
        }
      }),
      catchError((error) => {
        // 查询失败
        const duration = Date.now() - startTime;

        this.logger.error({
          type: 'query_error',
          class: className,
          method: methodName,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }),
    );
  }

  /**
   * 记录安全查询
   */
  private logSafeQuery(
    className: string,
    methodName: string,
    meta: any,
    args: any[],
  ): void {
    this.logger.log({
      type: 'safe_query',
      class: className,
      method: methodName,
      description: meta.description,
      parameters: meta.logParameters ? this.sanitizeParameters(args) : '[hidden]',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 记录原生 SQL 查询
   */
  private logRawQuery(className: string, methodName: string, meta: any): void {
    const logLevel = meta.reviewed ? 'log' : 'warn';

    this.logger[logLevel]({
      type: 'raw_query',
      class: className,
      method: methodName,
      description: meta.description,
      reviewed: meta.reviewed,
      reviewedBy: meta.reviewedBy,
      reviewDate: meta.reviewDate,
      warning: meta.reviewed
        ? undefined
        : '⚠️ 未经审查的原生 SQL 查询！请进行安全审查',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 清理参数（移除敏感信息）
   */
  private sanitizeParameters(args: any[]): any {
    return args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized: any = {};

        for (const key in arg) {
          if (arg.hasOwnProperty(key)) {
            // 隐藏敏感字段
            if (this.isSensitiveField(key)) {
              sanitized[key] = '[REDACTED]';
            } else {
              sanitized[key] = arg[key];
            }
          }
        }

        return sanitized;
      }

      return arg;
    });
  }

  /**
   * 判断是否为敏感字段
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'pwd',
      'secret',
      'token',
      'apiKey',
      'privateKey',
      'creditCard',
      'ssn',
    ];

    return sensitiveFields.some((field) =>
      fieldName.toLowerCase().includes(field.toLowerCase()),
    );
  }

  /**
   * 获取结果大小
   */
  private getResultSize(result: any): string {
    if (Array.isArray(result)) {
      return `${result.length} rows`;
    }

    if (typeof result === 'object' && result !== null) {
      return '1 row';
    }

    return 'unknown';
  }
}
