import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

export enum SnapshotStatus {
  CREATING = 'creating',
  READY = 'ready',
  FAILED = 'failed',
  RESTORING = 'restoring',
}

@Entity('device_snapshots')
export class DeviceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  // 关联设备
  @Column({ type: 'varchar' })
  @Index()
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  // 快照状态
  @Column({
    type: 'enum',
    enum: SnapshotStatus,
    default: SnapshotStatus.CREATING,
  })
  status: SnapshotStatus;

  // Docker 镜像信息
  @Column({ type: 'varchar' })
  imageId: string; // Docker 镜像 ID

  @Column({ type: 'varchar' })
  imageName: string; // Docker 镜像名称（如 cloudphone-snapshot:xxx）

  @Column({ type: 'bigint' })
  imageSize: number; // 镜像大小（字节）

  // 快照元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // 存储设备配置、应用列表等

  // 版本信息
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', nullable: true })
  parentSnapshotId: string; // 父快照 ID（用于增量快照）

  // 压缩信息
  @Column({ default: false })
  isCompressed: boolean;

  @Column({ type: 'varchar', nullable: true })
  compressedPath: string; // 压缩文件路径

  @Column({ type: 'bigint', nullable: true })
  compressedSize: number; // 压缩后大小（字节）

  // 标签
  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  // 创建者
  @Column({ type: 'varchar' })
  @Index()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 最后恢复时间
  @Column({ type: 'timestamp', nullable: true })
  lastRestoredAt: Date;

  @Column({ type: 'int', default: 0 })
  restoreCount: number; // 恢复次数

  // 快照保留策略
  @Column({ type: 'int', nullable: true })
  retentionDays: number; // 保留天数（null 表示永久保留）

  // 快照到期时间
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  // 是否为自动备份
  @Column({ default: false })
  isAutoBackup: boolean;
}
