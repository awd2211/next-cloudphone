import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// 加密操作类型
export enum EncryptionOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  KEY_GENERATE = 'key_generate',
  KEY_ROTATE = 'key_rotate',
  KEY_REVOKE = 'key_revoke',
  KEY_EXPORT = 'key_export',
  KEY_IMPORT = 'key_import',
  SESSION_KEY_EXCHANGE = 'session_key_exchange',
}

// 操作结果
export enum OperationResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

// 资源类型
export enum EncryptedResourceType {
  MESSAGE = 'message',
  ATTACHMENT = 'attachment',
  CONVERSATION = 'conversation',
  VISITOR_DATA = 'visitor_data',
  AGENT_DATA = 'agent_data',
  EXPORT_FILE = 'export_file',
  BACKUP = 'backup',
}

@Entity('encryption_audits')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'operation'])
@Index(['tenantId', 'keyId'])
@Index(['tenantId', 'performedBy'])
export class EncryptionAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  // 操作类型
  @Column({
    type: 'enum',
    enum: EncryptionOperation,
  })
  operation: EncryptionOperation;

  // 操作结果
  @Column({
    type: 'enum',
    enum: OperationResult,
    default: OperationResult.SUCCESS,
  })
  result: OperationResult;

  // 使用的密钥ID
  @Column({ nullable: true })
  @Index()
  keyId: string;

  // 密钥版本
  @Column({ nullable: true })
  keyVersion: number;

  // 加密资源类型
  @Column({
    type: 'enum',
    enum: EncryptedResourceType,
    nullable: true,
  })
  resourceType: EncryptedResourceType;

  // 资源ID
  @Column({ nullable: true })
  @Index()
  resourceId: string;

  // 会话ID
  @Column({ nullable: true })
  @Index()
  conversationId: string;

  // 执行者
  @Column({ nullable: true })
  @Index()
  performedBy: string;

  // 执行者类型
  @Column({ nullable: true })
  performedByType: string; // 'agent', 'system', 'visitor'

  // 客户端IP
  @Column({ nullable: true })
  clientIp: string;

  // 用户代理
  @Column({ nullable: true })
  userAgent: string;

  // 数据大小（字节）
  @Column({ type: 'bigint', nullable: true })
  dataSize: number;

  // 处理时间（毫秒）
  @Column({ nullable: true })
  processingTimeMs: number;

  // 算法
  @Column({ nullable: true })
  algorithm: string;

  // 错误信息
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  // 错误代码
  @Column({ nullable: true })
  errorCode: string;

  // 详细信息
  @Column({ type: 'jsonb', nullable: true })
  details: {
    reason?: string;
    sourceIp?: string;
    destinationIp?: string;
    requestId?: string;
    sessionId?: string;
    e2eEnabled?: boolean;
    keyFingerprint?: string;
    previousKeyVersion?: number;
    newKeyVersion?: number;
  };

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;
}
