import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * 审计事件类型
 */
export enum AuditEventType {
  // 认证相关
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',

  // 用户管理
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ROLE_CHANGED = 'user_role_changed',

  // 权限管理
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  PERMISSION_DENIED = 'permission_denied',

  // 敏感操作
  SENSITIVE_DATA_ACCESSED = 'sensitive_data_accessed',
  SENSITIVE_DATA_MODIFIED = 'sensitive_data_modified',
  SENSITIVE_DATA_EXPORTED = 'sensitive_data_exported',

  // 安全事件
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',

  // 系统操作
  CONFIG_CHANGED = 'config_changed',
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_RESTORE = 'system_restore',
}

/**
 * 审计日志严重级别
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 审计日志接口
 */
export interface AuditLog {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: any;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * 安全审计日志服务
 *
 * 功能：
 * - 记录所有安全相关操作
 * - 记录敏感数据访问
 * - 异常行为检测
 * - 审计日志查询
 */
@Injectable()
export class AuditLogService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 记录审计日志
   *
   * @param log 审计日志
   */
  async log(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      ...log,
      timestamp: new Date(),
    };

    // 根据严重级别选择日志级别
    const logMethod = this.getLogMethod(log.severity);

    // 记录到 Winston
    this.logger[logMethod]({
      type: 'audit_log',
      ...auditLog,
    });

    // TODO: 存储到数据库（可选）
    // await this.saveToDatabase(auditLog);

    // 关键事件触发告警
    if (log.severity === AuditSeverity.CRITICAL) {
      this.triggerAlert(auditLog);
    }
  }

  /**
   * 记录登录成功
   */
  async logLoginSuccess(userId: string, username: string, ip: string, userAgent?: string): Promise<void> {
    await this.log({
      eventType: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      userId,
      username,
      ip,
      userAgent,
      action: 'login',
      success: true,
    });
  }

  /**
   * 记录登录失败
   */
  async logLoginFailed(username: string, ip: string, reason: string, userAgent?: string): Promise<void> {
    await this.log({
      eventType: AuditEventType.LOGIN_FAILED,
      severity: AuditSeverity.WARNING,
      username,
      ip,
      userAgent,
      action: 'login',
      success: false,
      errorMessage: reason,
    });

    // 检测暴力破解
    await this.detectBruteForce(ip, username);
  }

  /**
   * 记录密码修改
   */
  async logPasswordChanged(userId: string, username: string, ip: string): Promise<void> {
    await this.log({
      eventType: AuditEventType.PASSWORD_CHANGED,
      severity: AuditSeverity.INFO,
      userId,
      username,
      ip,
      action: 'change_password',
      success: true,
    });
  }

  /**
   * 记录敏感数据访问
   */
  async logSensitiveDataAccess(
    userId: string,
    username: string,
    resource: string,
    action: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
      severity: AuditSeverity.WARNING,
      userId,
      username,
      ip,
      resource,
      action,
      success: true,
    });
  }

  /**
   * 记录敏感数据修改
   */
  async logSensitiveDataModified(
    userId: string,
    username: string,
    resource: string,
    details: any,
    ip: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SENSITIVE_DATA_MODIFIED,
      severity: AuditSeverity.WARNING,
      userId,
      username,
      ip,
      resource,
      action: 'modify',
      details,
      success: true,
    });
  }

  /**
   * 记录权限被拒绝
   */
  async logPermissionDenied(
    userId: string,
    username: string,
    resource: string,
    action: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.PERMISSION_DENIED,
      severity: AuditSeverity.WARNING,
      userId,
      username,
      ip,
      resource,
      action,
      success: false,
      errorMessage: 'Permission denied',
    });
  }

  /**
   * 记录 SQL 注入尝试
   */
  async logSqlInjectionAttempt(
    ip: string,
    userAgent: string,
    input: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SQL_INJECTION_ATTEMPT,
      severity: AuditSeverity.CRITICAL,
      ip,
      userAgent,
      action: 'sql_injection_attempt',
      details: { input },
      success: false,
      errorMessage: 'SQL injection attempt detected',
    });
  }

  /**
   * 记录可疑活动
   */
  async logSuspiciousActivity(
    userId: string | undefined,
    ip: string,
    reason: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.ERROR,
      userId,
      ip,
      action: 'suspicious_activity',
      details,
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * 记录安全违规
   */
  async logSecurityViolation(
    userId: string | undefined,
    ip: string,
    violation: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SECURITY_VIOLATION,
      severity: AuditSeverity.CRITICAL,
      userId,
      ip,
      action: 'security_violation',
      details,
      success: false,
      errorMessage: violation,
    });
  }

  /**
   * 记录用户创建
   */
  async logUserCreated(
    createdBy: string,
    createdByUsername: string,
    newUserId: string,
    newUsername: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.USER_CREATED,
      severity: AuditSeverity.INFO,
      userId: createdBy,
      username: createdByUsername,
      ip,
      resource: `user:${newUserId}`,
      action: 'create',
      details: { newUsername },
      success: true,
    });
  }

  /**
   * 记录角色变更
   */
  async logRoleChanged(
    changedBy: string,
    changedByUsername: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    ip: string,
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.USER_ROLE_CHANGED,
      severity: AuditSeverity.WARNING,
      userId: changedBy,
      username: changedByUsername,
      ip,
      resource: `user:${targetUserId}`,
      action: 'change_role',
      details: { oldRole, newRole },
      success: true,
    });
  }

  /**
   * 获取日志方法
   */
  private getLogMethod(severity: AuditSeverity): 'info' | 'warn' | 'error' {
    switch (severity) {
      case AuditSeverity.INFO:
        return 'info';
      case AuditSeverity.WARNING:
        return 'warn';
      case AuditSeverity.ERROR:
      case AuditSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * 检测暴力破解
   *
   * 简单实现：如果短时间内失败次数过多，记录暴力破解尝试
   * TODO: 实现更复杂的检测逻辑（使用 Redis 计数）
   */
  private async detectBruteForce(ip: string, username: string): Promise<void> {
    // 这里应该实现基于 Redis 的计数器
    // 如果 5 分钟内失败次数超过 5 次，记录暴力破解尝试
    // 简化实现，仅记录日志
    this.logger.warn({
      type: 'potential_brute_force',
      ip,
      username,
      message: '检测到潜在的暴力破解尝试',
    });
  }

  /**
   * 触发告警
   *
   * 关键安全事件触发告警
   * TODO: 集成告警系统（邮件、短信、钉钉等）
   */
  private triggerAlert(log: AuditLog): void {
    this.logger.error({
      type: 'security_alert',
      ...log,
      message: `🚨 关键安全事件: ${log.eventType}`,
    });

    // TODO: 发送告警通知
    // - 发送邮件给安全团队
    // - 发送短信给管理员
    // - 推送到监控平台
  }

  /**
   * 保存到数据库（可选）
   *
   * TODO: 如果需要持久化审计日志到数据库
   */
  // private async saveToDatabase(log: AuditLog): Promise<void> {
  //   await this.auditLogRepository.save(log);
  // }
}
