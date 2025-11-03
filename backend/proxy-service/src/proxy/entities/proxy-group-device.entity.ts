import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理组设备成员实体
 *
 * 记录设备组中的设备成员关系
 */
@Entity('proxy_group_devices')
@Index(['groupId', 'deviceId'], { unique: true })
@Index(['groupId', 'status'])
@Index(['deviceId'])
export class ProxyGroupDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'varchar', length: 50 })
  @Index()
  groupId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50 })
  @Index()
  deviceId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  // 成员状态
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string; // active, inactive, suspended, removed

  @Column({ name: 'role', type: 'varchar', length: 50, default: 'member' })
  role: string; // member, priority_member

  @Column({ name: 'priority', type: 'integer', default: 5 })
  priority: number; // 1-10, 高优先级设备优先获得代理资源

  // 代理分配
  @Column({ name: 'assigned_proxy_id', type: 'varchar', length: 50, nullable: true })
  assignedProxyId: string;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ name: 'assignment_duration', type: 'integer', default: 0 })
  assignmentDuration: number; // 秒

  // 使用统计
  @Column({ name: 'total_requests', type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ name: 'successful_requests', type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ name: 'failed_requests', type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ name: 'total_data_transferred', type: 'bigint', default: 0 })
  totalDataTransferred: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  // 性能指标
  @Column({ name: 'avg_success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgSuccessRate: number;

  @Column({ name: 'avg_latency', type: 'integer', default: 0 })
  avgLatency: number;

  @Column({ name: 'last_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  lastSuccessRate: number;

  @Column({ name: 'last_latency', type: 'integer', nullable: true })
  lastLatency: number;

  // 故障统计
  @Column({ name: 'failover_count', type: 'integer', default: 0 })
  failoverCount: number;

  @Column({ name: 'last_failover_at', type: 'timestamp', nullable: true })
  lastFailoverAt: Date;

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number;

  // 健康状态
  @Column({ name: 'health_status', type: 'varchar', length: 20, default: 'healthy' })
  healthStatus: string; // healthy, degraded, unhealthy

  @Column({ name: 'last_health_check_at', type: 'timestamp', nullable: true })
  lastHealthCheckAt: Date;

  // 时间信息
  @Column({ name: 'joined_at', type: 'timestamp' })
  joinedAt: Date;

  @Column({ name: 'last_active_at', type: 'timestamp' })
  lastActiveAt: Date;

  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt: Date;

  @Column({ name: 'removal_reason', type: 'text', nullable: true })
  removalReason: string;

  // 配置覆盖
  @Column({ name: 'override_config', type: 'jsonb', nullable: true })
  overrideConfig: Record<string, any>; // 设备级别的特殊配置

  // 标签
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
