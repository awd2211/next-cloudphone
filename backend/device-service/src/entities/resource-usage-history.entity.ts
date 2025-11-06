import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Node } from './node.entity';

/**
 * 资源使用历史记录实体
 * 用于存储节点和集群级别的资源使用趋势数据
 */
@Entity('resource_usage_history')
@Index(['nodeId', 'recordedAt'])
@Index(['recordedAt'])
export class ResourceUsageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 节点ID（如果为null，表示集群级别的汇总数据）
   */
  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  @Index()
  nodeId: string | null;

  /**
   * 记录时间
   */
  @Column({ name: 'recorded_at', type: 'timestamptz' })
  @Index()
  recordedAt: Date;

  /**
   * CPU使用情况
   */
  @Column({ name: 'cpu_usage_percent', type: 'decimal', precision: 5, scale: 2 })
  cpuUsagePercent: number;

  @Column({ name: 'used_cpu_cores', type: 'decimal', precision: 5, scale: 2 })
  usedCpuCores: number;

  @Column({ name: 'total_cpu_cores', type: 'int' })
  totalCpuCores: number;

  /**
   * 内存使用情况
   */
  @Column({ name: 'memory_usage_percent', type: 'decimal', precision: 5, scale: 2 })
  memoryUsagePercent: number;

  @Column({ name: 'used_memory_mb', type: 'int' })
  usedMemoryMB: number;

  @Column({ name: 'total_memory_mb', type: 'int' })
  totalMemoryMB: number;

  /**
   * 存储使用情况
   */
  @Column({ name: 'storage_usage_percent', type: 'decimal', precision: 5, scale: 2 })
  storageUsagePercent: number;

  @Column({ name: 'used_storage_gb', type: 'decimal', precision: 10, scale: 2 })
  usedStorageGB: number;

  @Column({ name: 'total_storage_gb', type: 'int' })
  totalStorageGB: number;

  /**
   * 活跃设备数
   */
  @Column({ name: 'active_devices', type: 'int', default: 0 })
  activeDevices: number;

  @Column({ name: 'max_devices', type: 'int', nullable: true })
  maxDevices: number;

  /**
   * 负载分数 (0-100)
   */
  @Column({ name: 'load_score', type: 'decimal', precision: 5, scale: 2 })
  loadScore: number;

  /**
   * 节点状态（如果是节点级别数据）
   */
  @Column({ name: 'node_status', type: 'varchar', length: 50, nullable: true })
  nodeStatus: string;

  /**
   * 附加元数据
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 关联节点（可选）
   */
  @ManyToOne(() => Node, { eager: false, nullable: true })
  @JoinColumn({ name: 'node_id' })
  node?: Node;
}
