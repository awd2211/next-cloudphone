import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum DeviceStatus {
  CREATING = "creating",
  IDLE = "idle",
  ALLOCATED = "allocated",
  RUNNING = "running",
  STOPPED = "stopped",
  PAUSED = "paused",
  ERROR = "error",
  DELETED = "deleted",
}

export enum DeviceType {
  PHONE = "phone",
  TABLET = "tablet",
}

export enum DeviceProviderType {
  REDROID = "redroid",
  HUAWEI_CPH = "huawei_cph",
  ALIYUN_ECP = "aliyun_ecp",
  PHYSICAL = "physical",
}

@Entity("devices")
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: DeviceType,
    default: DeviceType.PHONE,
  })
  type: DeviceType;

  @Column({
    type: "enum",
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

  // ========== Provider 信息（多设备源支持） ==========
  @Column({
    name: "provider_type",
    type: "enum",
    enum: DeviceProviderType,
    default: DeviceProviderType.REDROID,
  })
  @Index()
  providerType: DeviceProviderType;

  @Column({ name: "external_id", nullable: true })
  @Index()
  externalId: string; // Provider 侧的设备 ID（如 Docker containerId、华为 instanceId、物理设备 MAC）

  @Column({ name: "provider_config", type: "jsonb", nullable: true })
  providerConfig: Record<string, any>; // Provider 特定配置（创建时的参数）

  @Column({ name: "connection_info", type: "jsonb", nullable: true })
  connectionInfo: Record<string, any>; // 连接信息（ADB、SCRCPY、WebRTC 等）

  @Column({ name: "device_group", nullable: true })
  deviceGroup: string; // 设备分组（物理设备的机架位置、云设备的区域等）

  @Column({ name: "health_score", type: "int", default: 100 })
  healthScore: number; // 设备健康评分 (0-100)

  // Docker 容器信息（仅 Redroid 使用）
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

  @Column({ type: "int", nullable: true })
  adbPort: number;

  // 设备配置
  @Column({ type: "int", default: 2 })
  cpuCores: number;

  @Column({ type: "int", default: 4096 })
  memoryMB: number;

  @Column({ type: "int", default: 10240 })
  storageMB: number;

  @Column({ default: "1920x1080" })
  resolution: string;

  @Column({ type: "int", default: 240 })
  dpi: number;

  // Android 配置
  @Column({ default: "11" })
  androidVersion: string;

  @Column({ nullable: true })
  androidId: string;

  // 网络配置
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  macAddress: string;

  // 状态信息
  @Column({ type: "int", default: 0 })
  cpuUsage: number;

  @Column({ type: "int", default: 0 })
  memoryUsage: number;

  @Column({ type: "int", default: 0 })
  storageUsage: number;

  @Column({ name: "last_heartbeat_at", type: "timestamp", nullable: true })
  lastHeartbeatAt: Date;

  @Column({ name: "last_active_at", type: "timestamp", nullable: true })
  lastActiveAt: Date;

  // 到期时间（用于临时设备或有时限的设备）
  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  @Index()
  expiresAt: Date;

  // 是否启用自动备份
  @Column({ name: "auto_backup_enabled", default: false })
  autoBackupEnabled: boolean;

  // 自动备份间隔（小时）
  @Column({ name: "backup_interval_hours", type: "int", nullable: true })
  backupIntervalHours: number;

  // 最后备份时间
  @Column({ name: "last_backup_at", type: "timestamp", nullable: true })
  lastBackupAt: Date;

  // 元数据
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  deviceTags: string[]; // 设备标签（用于过滤和搜索）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
