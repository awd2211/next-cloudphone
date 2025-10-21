import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AuditLog as AuditLogEntity, AuditAction, AuditLevel } from '../../entities/audit-log.entity';
import { AlertService, AlertLevel } from './alert/alert.service';

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
  resourceType?: string;
  resourceId?: string;
  action?: string;
  description?: string;
  details?: any;
  metadata?: Record<string, any>;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
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
  // 异常检测缓存（生产环境应使用 Redis）
  private failedLoginAttempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  private readonly BRUTE_FORCE_THRESHOLD = 5; // 5次失败尝试
  private readonly BRUTE_FORCE_WINDOW = 5 * 60 * 1000; // 5分钟窗口
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10分钟清理一次

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    private readonly alertService: AlertService,
  ) {
    // 定期清理过期数据
    setInterval(() => this.cleanupExpiredRecords(), this.CLEANUP_INTERVAL);
  }

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

    // 存储到数据库（异步，不阻塞主流程）
    this.saveToDatabase(auditLog).catch((error) => {
      this.logger.error({
        type: 'audit_log_db_save_failed',
        error: error.message,
        auditLog,
      });
    });

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
   * 基于滑动窗口的失败登录计数
   */
  private async detectBruteForce(ip: string, username: string): Promise<void> {
    const key = `${ip}:${username}`;
    const now = Date.now();

    // 获取或创建记录
    let record = this.failedLoginAttempts.get(key);

    if (!record) {
      // 首次失败尝试
      this.failedLoginAttempts.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return;
    }

    // 检查是否在时间窗口内
    const elapsed = now - record.firstAttempt;

    if (elapsed > this.BRUTE_FORCE_WINDOW) {
      // 超过时间窗口，重置计数
      this.failedLoginAttempts.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return;
    }

    // 增加失败计数
    record.count++;
    this.failedLoginAttempts.set(key, record);

    // 检查是否达到阈值
    if (record.count >= this.BRUTE_FORCE_THRESHOLD) {
      // 标记为可疑 IP
      this.suspiciousIPs.add(ip);

      // 记录暴力破解尝试
      await this.log({
        eventType: AuditEventType.BRUTE_FORCE_ATTEMPT,
        severity: AuditSeverity.CRITICAL,
        userId: 'system',
        username,
        ip,
        description: `检测到暴力破解尝试：${record.count} 次失败登录（${Math.floor(elapsed / 1000)}秒内）`,
        metadata: {
          failedAttempts: record.count,
          timeWindowSeconds: Math.floor(elapsed / 1000),
          threshold: this.BRUTE_FORCE_THRESHOLD,
        },
        success: false,
      });

      // 清除记录，避免重复告警
      this.failedLoginAttempts.delete(key);
    }
  }

  /**
   * 清理过期的检测记录
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    let cleaned = 0;

    // 清理过期的失败登录记录
    for (const [key, record] of this.failedLoginAttempts.entries()) {
      if (now - record.firstAttempt > this.BRUTE_FORCE_WINDOW) {
        this.failedLoginAttempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug({
        type: 'audit_cleanup',
        message: `清理了 ${cleaned} 条过期的异常检测记录`,
      });
    }
  }

  /**
   * 检查 IP 是否可疑
   */
  isIPSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * 移除可疑 IP 标记
   */
  clearSuspiciousIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
  }

  /**
   * 获取异常检测统计
   */
  getAnomalyStats(): {
    suspiciousIPs: number;
    activeMonitoring: number;
    failedAttempts: Array<{ key: string; count: number; elapsed: number }>;
  } {
    const now = Date.now();
    const failedAttempts = Array.from(this.failedLoginAttempts.entries()).map(
      ([key, record]) => ({
        key,
        count: record.count,
        elapsed: Math.floor((now - record.firstAttempt) / 1000),
      }),
    );

    return {
      suspiciousIPs: this.suspiciousIPs.size,
      activeMonitoring: this.failedLoginAttempts.size,
      failedAttempts,
    };
  }

  /**
   * 触发告警
   *
   * 关键安全事件触发告警
   */
  private triggerAlert(log: AuditLog): void {
    this.logger.error({
      type: 'security_alert',
      ...log,
      message: `🚨 关键安全事件: ${log.eventType}`,
    });

    // 映射审计严重级别到告警级别
    const alertLevel =
      log.severity === AuditSeverity.CRITICAL
        ? AlertLevel.CRITICAL
        : log.severity === AuditSeverity.ERROR
          ? AlertLevel.ERROR
          : AlertLevel.WARNING;

    // 发送告警通知
    this.alertService
      .sendAlert({
        level: alertLevel,
        title: `安全告警: ${log.eventType}`,
        content: log.description,
        metadata: {
          用户: log.username || log.userId || 'unknown',
          IP地址: log.ip || 'unknown',
          事件类型: log.eventType,
          严重级别: log.severity,
          资源类型: log.resourceType,
          资源ID: log.resourceId,
          ...log.metadata,
        },
      })
      .catch((error) => {
        this.logger.error({
          type: 'alert_send_failed',
          error: error.message,
          auditLog: log,
        });
      });
  }

  /**
   * 保存审计日志到数据库
   */
  private async saveToDatabase(log: AuditLog): Promise<void> {
    try {
      // 将审计日志接口映射到数据库实体
      const entity = this.mapToEntity(log);
      await this.auditLogRepository.save(entity);
    } catch (error) {
      // 记录错误但不抛出，避免影响主流程
      this.logger.error({
        type: 'audit_log_save_error',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 将审计日志映射到数据库实体
   */
  private mapToEntity(log: AuditLog): Partial<AuditLogEntity> {
    // 映射事件类型到数据库 Action
    const actionMap: Record<string, AuditAction> = {
      [AuditEventType.LOGIN_SUCCESS]: AuditAction.USER_LOGIN,
      [AuditEventType.LOGIN_FAILED]: AuditAction.USER_LOGIN,
      [AuditEventType.LOGOUT]: AuditAction.USER_LOGOUT,
      [AuditEventType.PASSWORD_CHANGED]: AuditAction.PASSWORD_CHANGE,
      [AuditEventType.PASSWORD_RESET]: AuditAction.PASSWORD_RESET,
      [AuditEventType.USER_CREATED]: AuditAction.USER_REGISTER,
      [AuditEventType.USER_UPDATED]: AuditAction.USER_UPDATE,
      [AuditEventType.USER_DELETED]: AuditAction.USER_DELETE,
      [AuditEventType.USER_ROLE_CHANGED]: AuditAction.ROLE_ASSIGN,
      [AuditEventType.PERMISSION_GRANTED]: AuditAction.PERMISSION_GRANT,
      [AuditEventType.PERMISSION_REVOKED]: AuditAction.PERMISSION_REVOKE,
      [AuditEventType.CONFIG_CHANGED]: AuditAction.CONFIG_UPDATE,
    };

    // 映射严重级别
    const levelMap: Record<string, AuditLevel> = {
      [AuditSeverity.INFO]: AuditLevel.INFO,
      [AuditSeverity.WARNING]: AuditLevel.WARNING,
      [AuditSeverity.ERROR]: AuditLevel.ERROR,
      [AuditSeverity.CRITICAL]: AuditLevel.CRITICAL,
    };

    return {
      userId: log.userId || 'system',
      action: actionMap[log.eventType] || AuditAction.SYSTEM_MAINTENANCE,
      level: levelMap[log.severity] || AuditLevel.INFO,
      resourceType: log.resourceType || 'unknown',
      resourceId: log.resourceId,
      description: log.description || log.eventType,
      oldValue: log.oldValue,
      newValue: log.newValue,
      metadata: log.metadata || {},
      ipAddress: log.ip,
      userAgent: log.userAgent,
      requestId: log.metadata?.requestId,
      success: log.severity !== AuditSeverity.ERROR && log.severity !== AuditSeverity.CRITICAL,
      errorMessage: log.severity === AuditSeverity.ERROR || log.severity === AuditSeverity.CRITICAL
        ? log.description
        : undefined,
    };
  }

  /**
   * 查询审计日志（新增功能）
   */
  async findAuditLogs(options: {
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntity[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (options.userId) {
      query.andWhere('audit.userId = :userId', { userId: options.userId });
    }

    if (options.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    if (options.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }

    query.orderBy('audit.createdAt', 'DESC');
    query.limit(options.limit || 100);

    return await query.getMany();
  }
}
