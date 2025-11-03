import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理敏感审计日志实体
 *
 * 记录敏感操作的详细审计（加密存储）
 */
@Entity('proxy_sensitive_audit_logs')
@Index(['userId', 'createdAt'])
@Index(['sensitiveAction', 'createdAt'])
@Index(['createdAt'])
export class ProxySensitiveAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  @Column({ name: 'username', type: 'varchar', length: 100, nullable: true })
  username: string;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole: string;

  // 敏感操作类型
  @Column({ name: 'sensitive_action', type: 'varchar', length: 100 })
  @Index()
  sensitiveAction: string; // access_credentials, modify_budget, export_data, delete_group, etc.

  // 简化字段（兼容Service使用）
  @Column({ name: 'action', type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'data_type', type: 'varchar', length: 50 })
  dataType: string; // credentials, payment, personal, config

  @Column({ name: 'access_purpose', type: 'varchar', length: 200, nullable: true })
  accessPurpose: string;

  @Column({ name: 'action_description', type: 'text' })
  actionDescription: string;

  @Column({ name: 'risk_level', type: 'varchar', length: 20 })
  riskLevel: string; // high, critical

  // 资源信息
  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 50, nullable: true })
  resourceId: string;

  @Column({ name: 'resource_name', type: 'varchar', length: 200, nullable: true })
  resourceName: string;

  // 敏感数据（加密存储）
  @Column({ name: 'encrypted_data', type: 'text', nullable: true })
  encryptedData: string; // 加密的敏感信息

  @Column({ name: 'encryption_algorithm', type: 'varchar', length: 50, default: 'AES-256-GCM' })
  encryptionAlgorithm: string;

  @Column({ name: 'data_hash', type: 'varchar', length: 64 })
  dataHash: string; // SHA-256哈希，用于完整性验证

  // 变更详情（不包含敏感字段）
  @Column({ name: 'changes_summary', type: 'jsonb', nullable: true })
  changesSummary: {
    fieldsChanged?: string[];
    operationType?: string;
    changeCount?: number;
  };

  // 授权信息
  @Column({ name: 'authorization_method', type: 'varchar', length: 50 })
  authorizationMethod: string; // jwt, api_key, 2fa, admin_approval

  @Column({ name: 'required_approval', type: 'boolean', default: false })
  requiredApproval: boolean;

  // 简化字段（兼容Service使用）
  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approval_status', type: 'varchar', length: 20, default: 'pending' })
  approvalStatus: string; // pending, approved, rejected

  @Column({ name: 'approval_note', type: 'text', nullable: true })
  approvalNote: string;

  @Column({ name: 'approved_by', type: 'varchar', length: 50, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'accessed_at', type: 'timestamp', nullable: true })
  @Index()
  accessedAt: Date; // 实际访问/操作时间

  // 请求信息
  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ name: 'request_id', type: 'varchar', length: 50, nullable: true })
  requestId: string; // 追踪ID

  // 操作结果
  @Column({ name: 'is_successful', type: 'boolean' })
  isSuccessful: boolean;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  // 安全标记
  @Column({ name: 'is_suspicious', type: 'boolean', default: false })
  isSuspicious: boolean;

  @Column({ name: 'suspicious_reasons', type: 'simple-array', nullable: true })
  suspiciousReasons: string[];

  @Column({ name: 'security_alert_triggered', type: 'boolean', default: false })
  securityAlertTriggered: boolean;

  // 合规信息
  @Column({ name: 'compliance_tags', type: 'simple-array', nullable: true })
  complianceTags: string[]; // ['GDPR', 'SOC2', 'HIPAA']

  @Column({ name: 'retention_until', type: 'timestamp' })
  retentionUntil: Date; // 法规要求的保留期限

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
