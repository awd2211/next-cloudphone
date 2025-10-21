import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DeviceStatus {
  CREATING = 'creating',
  IDLE = 'idle',
  ALLOCATED = 'allocated',
  RUNNING = 'running',
  STOPPED = 'stopped',
  PAUSED = 'paused',
  ERROR = 'error',
  DELETED = 'deleted',
}

export enum DeviceType {
  PHONE = 'phone',
  TABLET = 'tablet',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.PHONE,
  })
  type: DeviceType;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.CREATING,
  })
  @Index()
  status: DeviceStatus;

  @Column({ nullable: true })
  @Index()
  userId: string; // 逻辑外键 → user-service
  
  // ========== 冗余字段（从 user-service 同步，避免跨服务查询） ==========
  @Column({ nullable: true })
  userName: string; // 用户名
  
  @Column({ nullable: true })
  userEmail: string; // 用户邮箱

  @Column({ nullable: true })
  @Index()
  tenantId: string;

  // Docker 容器信息
  @Column({ nullable: true })
  @Index()
  containerId: string;

  @Column({ nullable: true })
  containerName: string;

  @Column({ nullable: true })
  imageTag: string;

  // ADB 连接信息
  @Column({ nullable: true })
  adbHost: string;

  @Column({ type: 'int', nullable: true })
  adbPort: number;

  // 设备配置
  @Column({ type: 'int', default: 2 })
  cpuCores: number;

  @Column({ type: 'int', default: 4096 })
  memoryMB: number;

  @Column({ type: 'int', default: 10240 })
  storageMB: number;

  @Column({ default: '1920x1080' })
  resolution: string;

  @Column({ type: 'int', default: 240 })
  dpi: number;

  // Android 配置
  @Column({ default: '11' })
  androidVersion: string;

  @Column({ nullable: true })
  androidId: string;

  // 网络配置
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  macAddress: string;

  // 状态信息
  @Column({ type: 'int', default: 0 })
  cpuUsage: number;

  @Column({ type: 'int', default: 0 })
  memoryUsage: number;

  @Column({ type: 'int', default: 0 })
  storageUsage: number;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
