import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理健康状态枚举
 */
export enum ProxyHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * 代理释放原因枚举
 */
export enum ProxyReleaseReason {
  DEVICE_DELETED = 'device_deleted',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  MANUAL = 'manual',
  AUTO_CLEANUP = 'auto_cleanup',
  ORPHAN_CLEANUP = 'orphan_cleanup', // 孤儿代理清理
}

/**
 * 代理使用记录实体
 * 用于追踪代理分配历史、性能指标和健康状态
 */
@Entity('proxy_usage')
@Index(['proxyId'])
@Index(['deviceId'])
@Index(['userId'])
@Index(['assignedAt'])
@Index(['releasedAt'])
@Index(['healthStatus'])
// 部分索引：只索引活跃代理（未释放的）
@Index('idx_proxy_usage_active', ['proxyId', 'deviceId'], {
  where: 'released_at IS NULL',
})
// 复合索引：用于统计查询
@Index('idx_proxy_usage_stats', ['proxyId', 'assignedAt', 'releasedAt'])
export class ProxyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========== 关联信息 ==========

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  userName: string | null;

  // ========== 代理信息 ==========

  @Column({ name: 'proxy_id', type: 'varchar', length: 255 })
  proxyId: string;

  @Column({ name: 'proxy_host', type: 'varchar', length: 255 })
  proxyHost: string;

  @Column({ name: 'proxy_port', type: 'int' })
  proxyPort: number;

  @Column({ name: 'proxy_type', type: 'varchar', length: 50, nullable: true })
  proxyType: string | null;

  @Column({ name: 'proxy_country', type: 'varchar', length: 2, nullable: true })
  proxyCountry: string | null;

  // ========== 时间信息 ==========

  @Column({
    name: 'assigned_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  assignedAt: Date;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  // ========== 性能指标 ==========

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  successRate: number | null;

  @Column({ name: 'avg_latency_ms', type: 'int', nullable: true })
  avgLatencyMs: number | null;

  @Column({ name: 'total_requests', type: 'int', nullable: true })
  totalRequests: number | null;

  @Column({ name: 'failed_requests', type: 'int', nullable: true })
  failedRequests: number | null;

  // ========== 健康状态 ==========

  @Column({
    name: 'health_status',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  healthStatus: ProxyHealthStatus | null;

  @Column({ name: 'health_checks_passed', type: 'int', default: 0 })
  healthChecksPassed: number;

  @Column({ name: 'health_checks_failed', type: 'int', default: 0 })
  healthChecksFailed: number;

  @Column({ name: 'last_health_check', type: 'timestamp', nullable: true })
  lastHealthCheck: Date | null;

  // ========== 元数据 ==========

  @Column({
    name: 'release_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  releaseReason: ProxyReleaseReason | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ========== 时间戳 ==========

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ========== 辅助方法 ==========

  /**
   * 计算健康检查通过率
   */
  getHealthCheckPassRate(): number {
    const total = this.healthChecksPassed + this.healthChecksFailed;
    if (total === 0) return 0;
    return (this.healthChecksPassed / total) * 100;
  }

  /**
   * 判断代理是否仍在使用中
   */
  isActive(): boolean {
    return this.releasedAt === null;
  }

  /**
   * 获取使用时长（分钟）
   */
  getDuration(): number | null {
    if (!this.releasedAt) return null;
    const diffMs = this.releasedAt.getTime() - this.assignedAt.getTime();
    return Math.floor(diffMs / 60000); // 转换为分钟
  }

  /**
   * 获取当前使用时长（如果仍在使用）
   */
  getCurrentDuration(): number {
    const endTime = this.releasedAt ? this.releasedAt.getTime() : Date.now();
    const diffMs = endTime - this.assignedAt.getTime();
    return Math.floor(diffMs / 60000);
  }
}

/**
 * 代理使用统计摘要
 */
export interface ProxyUsageSummary {
  proxyId: string;
  totalAssignments: number;
  activeAssignments: number;
  averageDurationMinutes: number;
  averageSuccessRate: number;
  averageLatencyMs: number;
  totalRequests: number;
  totalFailedRequests: number;
  overallHealthRate: number;
  lastUsedAt: Date | null;
}

/**
 * 活跃代理统计
 */
export interface ActiveProxyStats {
  proxyId: string;
  proxyHost: string;
  proxyPort: number;
  proxyCountry: string | null;
  activeDevices: number;
  earliestAssignment: Date;
  latestAssignment: Date;
  avgHealthRate: number;
}
