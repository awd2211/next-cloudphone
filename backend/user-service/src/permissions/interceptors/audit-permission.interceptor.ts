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
import { of } from 'rxjs';

/**
 * 审计元数据键
 */
export const AUDIT_PERMISSION_KEY = 'auditPermission';
export const SKIP_AUDIT_KEY = 'skipAudit';
export const AUDIT_RESOURCE_KEY = 'auditResource';
export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * 审计日志级别
 */
export enum AuditLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  username?: string;
  tenantId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  requestBody?: any;
  responseStatus?: number;
  success: boolean;
  errorMessage?: string;
  duration: number;
  level: AuditLevel;
  metadata?: Record<string, any>;
}

/**
 * 审计权限拦截器
 * 记录权限相关的敏感操作
 *
 * 使用方式：
 * @UseInterceptors(AuditPermissionInterceptor)
 * @AuditPermission({ resource: 'user', action: 'delete' })
 * async deleteUser(@Param('id') id: string) {
 *   return this.userService.delete(id);
 * }
 */
@Injectable()
export class AuditPermissionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditPermissionInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否跳过审计
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle();
    }

    // 检查是否需要审计
    const shouldAudit = this.reflector.getAllAndOverride<boolean>(
      AUDIT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!shouldAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    // 获取审计元数据
    const resource = this.reflector.getAllAndOverride<string>(
      AUDIT_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    ) || 'unknown';

    const action = this.reflector.getAllAndOverride<string>(
      AUDIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    ) || request.method.toLowerCase();

    const startTime = Date.now();

    // 构建审计日志基础信息
    const auditEntry: Partial<AuditLogEntry> = {
      timestamp: new Date(),
      userId: user?.id || 'anonymous',
      username: user?.username,
      tenantId: user?.tenantId,
      action,
      resource,
      method: request.method,
      path: request.url,
      ip: this.getClientIp(request),
      userAgent: request.get('user-agent') || 'unknown',
      requestBody: this.sanitizeRequestBody(request.body),
    };

    return next.handle().pipe(
      tap((data) => {
        // 请求成功
        const duration = Date.now() - startTime;
        const completeEntry: AuditLogEntry = {
          ...auditEntry,
          responseStatus: response.statusCode,
          success: true,
          duration,
          level: this.determineAuditLevel(action, true),
        } as AuditLogEntry;

        this.logAuditEntry(completeEntry);
      }),
      catchError((error) => {
        // 请求失败
        const duration = Date.now() - startTime;
        const completeEntry: AuditLogEntry = {
          ...auditEntry,
          responseStatus: error.status || 500,
          success: false,
          errorMessage: error.message,
          duration,
          level: AuditLevel.ERROR,
        } as AuditLogEntry;

        this.logAuditEntry(completeEntry);

        // 重新抛出错误
        throw error;
      }),
    );
  }

  /**
   * 记录审计日志
   */
  private logAuditEntry(entry: AuditLogEntry): void {
    const logMessage = this.formatAuditLog(entry);

    switch (entry.level) {
      case AuditLevel.CRITICAL:
        this.logger.error(logMessage);
        // TODO: 发送告警通知
        break;
      case AuditLevel.ERROR:
        this.logger.error(logMessage);
        break;
      case AuditLevel.WARN:
        this.logger.warn(logMessage);
        break;
      default:
        this.logger.log(logMessage);
    }

    // TODO: 将审计日志持久化到数据库
    // await this.auditLogRepository.save(entry);
  }

  /**
   * 格式化审计日志
   */
  private formatAuditLog(entry: AuditLogEntry): string {
    const parts = [
      `[AUDIT]`,
      `用户=${entry.username || entry.userId}`,
      `操作=${entry.action}`,
      `资源=${entry.resource}`,
      `方法=${entry.method}`,
      `路径=${entry.path}`,
      `状态=${entry.responseStatus}`,
      `成功=${entry.success}`,
      `耗时=${entry.duration}ms`,
      `IP=${entry.ip}`,
    ];

    if (!entry.success && entry.errorMessage) {
      parts.push(`错误=${entry.errorMessage}`);
    }

    if (entry.tenantId) {
      parts.push(`租户=${entry.tenantId}`);
    }

    return parts.join(' | ');
  }

  /**
   * 确定审计级别
   */
  private determineAuditLevel(action: string, success: boolean): AuditLevel {
    if (!success) {
      return AuditLevel.ERROR;
    }

    // 敏感操作使用 WARN 级别
    const criticalActions = [
      'delete',
      'remove',
      'destroy',
      'revoke',
      'disable',
      'block',
      'ban',
    ];

    if (criticalActions.some((a) => action.toLowerCase().includes(a))) {
      return AuditLevel.WARN;
    }

    // 权限相关操作使用 WARN 级别
    const permissionActions = [
      'grant',
      'assign',
      'permission',
      'role',
      'access',
    ];

    if (permissionActions.some((a) => action.toLowerCase().includes(a))) {
      return AuditLevel.WARN;
    }

    return AuditLevel.INFO;
  }

  /**
   * 清理请求体（移除敏感信息）
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'apiKey',
      'privateKey',
      'accessToken',
      'refreshToken',
      'creditCard',
      'cvv',
      'ssn',
    ];

    const sanitized = { ...body };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
