import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NodeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  DRAINING = 'draining', // 正在排空，不接受新设备
}

export interface ResourceCapacity {
  totalCpuCores: number;
  totalMemoryMB: number;
  totalStorageGB: number;
  maxDevices: number;
}

export interface ResourceUsage {
  usedCpuCores: number;
  usedMemoryMB: number;
  usedStorageGB: number;
  activeDevices: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageUsagePercent: number;
}

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column()
  hostname: string;

  @Column()
  ipAddress: string;

  @Column({ type: 'int', default: 2375 })
  dockerPort: number;

  // 节点状态
  @Column({
    type: 'enum',
    enum: NodeStatus,
    default: NodeStatus.OFFLINE,
  })
  @Index()
  status: NodeStatus;

  // 资源容量
  @Column({ type: 'jsonb' })
  capacity: ResourceCapacity;

  // 当前资源使用情况
  @Column({ type: 'jsonb' })
  usage: ResourceUsage;

  // 负载分数 (0-100)
  @Column({ type: 'float', default: 0 })
  loadScore: number;

  // 节点标签（用于调度）
  @Column({ type: 'jsonb', default: [] })
  labels: Record<string, string>;

  // 节点污点（Taints，用于排斥某些设备）
  @Column({ type: 'jsonb', default: [] })
  taints: Array<{
    key: string;
    value: string;
    effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  }>;

  // 优先级（用于调度，数值越大优先级越高）
  @Column({ type: 'int', default: 0 })
  priority: number;

  // 地理位置信息（可选）
  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  zone: string;

  // 健康检查
  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date;

  @Column({ type: 'int', default: 0 })
  failedHealthChecks: number;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 计算可用资源百分比
  getAvailableResourcePercent(): number {
    const cpuAvailable =
      ((this.capacity.totalCpuCores - this.usage.usedCpuCores) /
        this.capacity.totalCpuCores) *
      100;
    const memoryAvailable =
      ((this.capacity.totalMemoryMB - this.usage.usedMemoryMB) /
        this.capacity.totalMemoryMB) *
      100;
    const deviceAvailable =
      ((this.capacity.maxDevices - this.usage.activeDevices) /
        this.capacity.maxDevices) *
      100;

    return Math.min(cpuAvailable, memoryAvailable, deviceAvailable);
  }

  // 判断节点是否可以调度
  isSchedulable(): boolean {
    return (
      this.status === NodeStatus.ONLINE &&
      this.usage.activeDevices < this.capacity.maxDevices &&
      this.failedHealthChecks < 3
    );
  }
}
