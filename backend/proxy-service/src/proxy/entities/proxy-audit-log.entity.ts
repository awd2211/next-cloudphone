import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理审计日志实体
 *
 * 记录所有代理服务的操作审计
 */
@Entity('proxy_audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['createdAt'])
export class ProxyAuditLog {
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

  // 操作信息
  @Column({ name: 'action', type: 'varchar', length: 100 })
  @Index()
  action: string; // create, update, delete, assign, release, failover, etc.

  @Column({ name: 'action_category', type: 'varchar', length: 50 })
  actionCategory: string; // proxy, session, config, cost, alert, report

  @Column({ name: 'action_description', type: 'text' })
  actionDescription: string;

  // 资源信息
  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  @Index()
  resourceType: string; // proxy, session, config, budget, alert, group

  @Column({ name: 'resource_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  resourceId: string;

  @Column({ name: 'resource_name', type: 'varchar', length: 200, nullable: true })
  resourceName: string;

  // 变更详情
  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };

  // 请求信息
  @Column({ name: 'request_method', type: 'varchar', length: 10, nullable: true })
  requestMethod: string;

  @Column({ name: 'request_path', type: 'varchar', length: 500, nullable: true })
  requestPath: string;

  @Column({ name: 'request_params', type: 'jsonb', nullable: true })
  requestParams: Record<string, any>;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  // 响应信息
  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode: number;

  @Column({ name: 'is_successful', type: 'boolean', default: true })
  isSuccessful: boolean;

  // 简化字段（兼容Service使用）
  @Column({ name: 'success', type: 'boolean', default: true })
  success: boolean;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ name: 'request_data', type: 'jsonb', nullable: true })
  requestData: Record<string, any>;

  @Column({ name: 'response_data', type: 'jsonb', nullable: true })
  responseData: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'response_time', type: 'integer', nullable: true })
  responseTime: number; // 毫秒

  // 客户端信息
  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
  deviceType: string; // web, mobile, api

  // 影响范围
  @Column({ name: 'affected_resources', type: 'jsonb', nullable: true })
  affectedResources: Array<{
    type: string;
    id: string;
    name?: string;
  }>;

  @Column({ name: 'affected_count', type: 'integer', default: 1 })
  affectedCount: number;

  // 风险级别
  @Column({ name: 'risk_level', type: 'varchar', length: 20, default: 'low' })
  riskLevel: string; // low, medium, high, critical

  @Column({ name: 'is_sensitive', type: 'boolean', default: false })
  isSensitive: boolean;

  // 标签
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
