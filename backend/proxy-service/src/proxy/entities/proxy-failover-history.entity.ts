import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 代理故障切换历史记录实体
 *
 * 记录每次故障切换的详细信息，用于分析和审计
 */
@Entity('proxy_failover_history')
@Index(['sessionId', 'triggeredAt'])
@Index(['oldProxyId', 'triggeredAt'])
@Index(['newProxyId', 'triggeredAt'])
@Index(['triggeredAt'])
export class ProxyFailoverHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  @Index()
  sessionId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  @Index()
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  deviceId: string;

  // 切换信息
  @Column({ name: 'old_proxy_id', type: 'varchar', length: 50 })
  @Index()
  oldProxyId: string;

  @Column({ name: 'old_provider', type: 'varchar', length: 50 })
  oldProvider: string;

  @Column({ name: 'new_proxy_id', type: 'varchar', length: 50 })
  @Index()
  newProxyId: string;

  @Column({ name: 'new_provider', type: 'varchar', length: 50 })
  newProvider: string;

  // 触发原因
  @Column({ name: 'trigger_reason', type: 'varchar', length: 100 })
  triggerReason: string; // connection_failed, timeout, high_latency, low_quality, manual

  // 简化字段（兼容Service使用）
  @Column({ name: 'reason', type: 'varchar', length: 100 })
  reason: string;

  @Column({ name: 'failure_details', type: 'text', nullable: true })
  failureDetails: string;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // 性能指标
  @Column({ name: 'old_proxy_latency', type: 'integer', nullable: true })
  oldProxyLatency: number; // 毫秒

  @Column({ name: 'old_proxy_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  oldProxySuccessRate: number;

  @Column({ name: 'old_proxy_quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  oldProxyQualityScore: number;

  @Column({ name: 'new_proxy_latency', type: 'integer', nullable: true })
  newProxyLatency: number;

  @Column({ name: 'new_proxy_success_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  newProxySuccessRate: number;

  @Column({ name: 'new_proxy_quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  newProxyQualityScore: number;

  // 切换过程
  @Column({ name: 'strategy_used', type: 'varchar', length: 50 })
  strategyUsed: string;

  // 简化字段（兼容Service使用）
  @Column({ name: 'strategy', type: 'varchar', length: 50 })
  strategy: string;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @Column({ name: 'candidates_considered', type: 'integer', default: 0 })
  candidatesConsidered: number;

  @Column({ name: 'switch_duration', type: 'integer' })
  switchDuration: number; // 毫秒

  @Column({ name: 'is_successful', type: 'boolean' })
  isSuccessful: boolean;

  // 简化字段（兼容Service使用）
  @Column({ name: 'success', type: 'boolean' })
  success: boolean;

  @Column({ name: 'switch_result', type: 'varchar', length: 50 })
  switchResult: string; // success, failed, no_alternative, rollback

  // 候选代理列表
  @Column({ name: 'alternatives_evaluated', type: 'jsonb', nullable: true })
  alternativesEvaluated: Array<{
    proxyId: string;
    provider: string;
    score: number;
    reason: string;
  }>;

  // 时间信息
  @Column({ name: 'triggered_at', type: 'timestamp' })
  @Index()
  triggeredAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // 后续验证
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verification_result', type: 'varchar', length: 50, nullable: true })
  verificationResult: string; // success, failed, timeout

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  // 是否触发回滚
  @Column({ name: 'rolled_back', type: 'boolean', default: false })
  rolledBack: boolean;

  @Column({ name: 'rollback_reason', type: 'text', nullable: true })
  rollbackReason: string;

  @Column({ name: 'rollback_at', type: 'timestamp', nullable: true })
  rollbackAt: Date;

  // 元数据
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
