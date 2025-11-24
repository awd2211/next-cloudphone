import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction, AuditLevel } from '../entities/audit-log.entity';

/**
 * 自动审计拦截器
 * 用于自动记录敏感操作的审计日志
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers, body } = request;

    // 确定审计操作类型
    const action = this.determineAction(method, url);

    // 如果不是需要审计的操作，直接跳过
    if (!action) {
      return next.handle();
    }

    // 对于登录/注册等操作，可能没有user对象，使用临时ID
    const userId = user?.id || user?.userId || '00000000-0000-0000-0000-000000000000';

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        // 成功的操作
        const duration = Date.now() - startTime;

        this.auditLogsService
          .createLog({
            userId,
            action,
            level: AuditLevel.INFO,
            resourceType: this.getResourceType(url),
            resourceId: this.getResourceId(url, response),
            description: this.generateDescription(action, method, url, true),
            newValue: this.sanitizeData(response),
            metadata: {
              duration,
            },
            method,
            requestPath: url,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            success: true,
          })
          .catch((err) => {
            this.logger.error('Failed to create audit log', err);
          });
      }),
      catchError((error) => {
        // 失败的操作
        const duration = Date.now() - startTime;

        this.auditLogsService
          .createLog({
            userId,
            action,
            level: AuditLevel.ERROR,
            resourceType: this.getResourceType(url),
            description: this.generateDescription(action, method, url, false),
            metadata: {
              duration,
              error: error.message,
            },
            method,
            requestPath: url,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            success: false,
            errorMessage: error.message,
          })
          .catch((err) => {
            this.logger.error('Failed to create audit log', err);
          });

        return throwError(() => error);
      })
    );
  }

  private determineAction(method: string, url: string): AuditAction | null {
    // 根据 HTTP 方法和 URL 确定审计操作类型
    if (url.includes('/auth/login')) return AuditAction.USER_LOGIN;
    if (url.includes('/auth/logout')) return AuditAction.USER_LOGOUT;
    if (url.includes('/auth/register')) return AuditAction.USER_REGISTER;

    if (url.includes('/users') && method === 'PUT') return AuditAction.USER_UPDATE;
    if (url.includes('/users') && method === 'DELETE') return AuditAction.USER_DELETE;

    if (url.includes('/password/change')) return AuditAction.PASSWORD_CHANGE;
    if (url.includes('/password/reset')) return AuditAction.PASSWORD_RESET;

    if (url.includes('/quotas') && method === 'POST') return AuditAction.QUOTA_CREATE;
    if (url.includes('/quotas') && method === 'PUT') return AuditAction.QUOTA_UPDATE;
    if (url.includes('/quotas/deduct')) return AuditAction.QUOTA_DEDUCT;
    if (url.includes('/quotas/restore')) return AuditAction.QUOTA_RESTORE;

    if (url.includes('/balance/recharge')) return AuditAction.BALANCE_RECHARGE;
    if (url.includes('/balance/consume')) return AuditAction.BALANCE_CONSUME;
    if (url.includes('/balance/adjust')) return AuditAction.BALANCE_ADJUST;
    if (url.includes('/balance/freeze')) return AuditAction.BALANCE_FREEZE;
    if (url.includes('/balance/unfreeze')) return AuditAction.BALANCE_UNFREEZE;

    if (url.includes('/api-keys') && method === 'POST') return AuditAction.API_KEY_CREATE;
    if (url.includes('/api-keys') && method === 'DELETE') return AuditAction.API_KEY_REVOKE;

    if (url.includes('/roles') && method === 'POST') return AuditAction.ROLE_ASSIGN;
    if (url.includes('/roles') && method === 'DELETE') return AuditAction.ROLE_REVOKE;

    return null;
  }

  private getResourceType(url: string): string {
    if (url.includes('/auth')) return 'auth';
    if (url.includes('/users')) return 'user';
    if (url.includes('/quotas')) return 'quota';
    if (url.includes('/balance')) return 'balance';
    if (url.includes('/devices')) return 'device';
    if (url.includes('/roles')) return 'role';
    if (url.includes('/api-keys')) return 'api-key';
    if (url.includes('/password')) return 'password';
    return 'system';
  }

  private getResourceId(url: string, response?: any): string | undefined {
    // 尝试从 URL 提取 ID
    const idMatch = url.match(/\/([a-f0-9-]{36})/);
    if (idMatch) return idMatch[1];

    // 尝试从响应提取 ID
    if (response && response.id) return response.id;

    return undefined;
  }

  private generateDescription(
    action: AuditAction,
    method: string,
    url: string,
    success: boolean
  ): string {
    const status = success ? '成功' : '失败';
    return `${action} ${status} - ${method} ${url}`;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
