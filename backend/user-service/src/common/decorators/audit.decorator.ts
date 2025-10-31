import { SetMetadata } from '@nestjs/common';
import { AuditEventType, AuditSeverity } from '../services/audit-log.service';

/**
 * 审计元数据键
 */
export const AUDIT_METADATA_KEY = 'audit';

/**
 * 审计配置接口
 */
export interface AuditConfig {
  /**
   * 事件类型
   */
  eventType: AuditEventType;

  /**
   * 严重级别
   */
  severity?: AuditSeverity;

  /**
   * 资源类型
   */
  resource?: string;

  /**
   * 操作类型
   */
  action?: string;

  /**
   * 是否记录请求参数
   */
  logParameters?: boolean;

  /**
   * 是否记录响应
   */
  logResponse?: boolean;
}

/**
 * 审计装饰器
 *
 * 自动记录方法调用的审计日志
 *
 * @example
 * ```typescript
 * @Audit({
 *   eventType: AuditEventType.USER_CREATED,
 *   severity: AuditSeverity.INFO,
 *   resource: 'user',
 *   action: 'create',
 * })
 * async createUser(dto: CreateUserDto) {
 *   // ...
 * }
 * ```
 */
export const Audit = (config: AuditConfig) =>
  SetMetadata(AUDIT_METADATA_KEY, {
    eventType: config.eventType,
    severity: config.severity || AuditSeverity.INFO,
    resource: config.resource,
    action: config.action,
    logParameters: config.logParameters !== false, // 默认记录
    logResponse: config.logResponse !== false, // 默认记录
  });

/**
 * 敏感操作装饰器
 *
 * 标记为敏感操作，自动使用 WARNING 级别
 */
export const SensitiveOperation = (resource: string, action: string) =>
  Audit({
    eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
    severity: AuditSeverity.WARNING,
    resource,
    action,
  });

/**
 * 关键操作装饰器
 *
 * 标记为关键操作，自动使用 CRITICAL 级别
 */
export const CriticalOperation = (eventType: AuditEventType, resource?: string) =>
  Audit({
    eventType,
    severity: AuditSeverity.CRITICAL,
    resource,
  });
