import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_METADATA_KEY, AuditConfig } from '../decorators/audit.decorator';
import { AuditLogService } from '../services/audit-log.service';

/**
 * 审计拦截器
 *
 * 自动记录带有 @Audit 装饰器的方法调用
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 获取审计配置
    const auditConfig = this.reflector.get<AuditConfig>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // 如果没有审计配置，跳过
    if (!auditConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const username = request.user?.username;
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (response) => {
        // 操作成功，记录审计日志
        await this.auditLogService.log({
          eventType: auditConfig.eventType,
          severity: auditConfig.severity as any || 'info',
          userId,
          username,
          ip,
          userAgent,
          resource: auditConfig.resource,
          action: auditConfig.action,
          details: this.getDetails(request, response, auditConfig),
          success: true,
        });
      }),
      catchError(async (error) => {
        // 操作失败，也记录审计日志
        await this.auditLogService.log({
          eventType: auditConfig.eventType,
          severity: auditConfig.severity as any || 'warn',
          userId,
          username,
          ip,
          userAgent,
          resource: auditConfig.resource,
          action: auditConfig.action,
          details: this.getDetails(request, null, auditConfig),
          success: false,
          errorMessage: error.message,
        });

        throw error;
      }),
    );
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * 获取详情
   */
  private getDetails(request: any, response: any, config: AuditConfig): any {
    const details: any = {};

    // 记录请求参数
    if (config.logParameters) {
      details.params = this.sanitizeParameters(request.params);
      details.query = this.sanitizeParameters(request.query);
      details.body = this.sanitizeParameters(request.body);
    }

    // 记录响应（简化版）
    if (config.logResponse && response) {
      details.responseSize = JSON.stringify(response).length;
    }

    return details;
  }

  /**
   * 清理参数（移除敏感信息）
   */
  private sanitizeParameters(params: any): any {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized: any = {};
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        // 敏感字段替换为 [REDACTED]
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = params[key];
        }
      }
    }

    return sanitized;
  }
}
