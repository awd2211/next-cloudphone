import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  // 用户操作
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',

  // 配额操作
  QUOTA_CREATE = 'quota_create',
  QUOTA_UPDATE = 'quota_update',
  QUOTA_DEDUCT = 'quota_deduct',
  QUOTA_RESTORE = 'quota_restore',

  // 余额操作
  BALANCE_RECHARGE = 'balance_recharge',
  BALANCE_CONSUME = 'balance_consume',
  BALANCE_ADJUST = 'balance_adjust',
  BALANCE_FREEZE = 'balance_freeze',
  BALANCE_UNFREEZE = 'balance_unfreeze',

  // 设备操作
  DEVICE_CREATE = 'device_create',
  DEVICE_START = 'device_start',
  DEVICE_STOP = 'device_stop',
  DEVICE_DELETE = 'device_delete',
  DEVICE_UPDATE = 'device_update',

  // 权限操作
  ROLE_ASSIGN = 'role_assign',
  ROLE_REVOKE = 'role_revoke',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',

  // 系统操作
  CONFIG_UPDATE = 'config_update',
  SYSTEM_MAINTENANCE = 'system_maintenance',

  // API 操作
  API_KEY_CREATE = 'api_key_create',
  API_KEY_REVOKE = 'api_key_revoke',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
// 复合索引 - 优化常见查询场景
@Index('idx_audit_resource', ['resourceType', 'resourceId', 'createdAt'])
@Index('idx_audit_user_action', ['userId', 'action', 'createdAt'])
@Index('idx_audit_level_time', ['level', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  targetUserId: string; // 目标用户（如果操作涉及其他用户）

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  @Index()
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditLevel,
    default: AuditLevel.INFO,
  })
  @Index()
  level: AuditLevel;

  @Column({ type: 'varchar' })
  @Index()
  resourceType: string; // 资源类型（如 user, device, quota）

  @Column({ type: 'varchar', nullable: true })
  @Index()
  resourceId: string; // 资源 ID

  @Column({ type: 'text' })
  description: string; // 操作描述

  @Column({ type: 'jsonb', nullable: true })
  oldValue: Record<string, any>; // 操作前的值

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, any>; // 操作后的值

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // 额外元数据

  @Column({ type: 'varchar', nullable: true })
  @Index()
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', nullable: true })
  requestId: string; // 请求追踪 ID

  @Column({ type: 'varchar', nullable: true })
  method: string; // HTTP 方法 (GET/POST/PUT/DELETE/PATCH)

  @Column({ type: 'varchar', nullable: true })
  requestPath: string; // 请求路径

  @Column({ type: 'boolean', default: true })
  success: boolean; // 操作是否成功

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // 错误消息（如果失败）

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
