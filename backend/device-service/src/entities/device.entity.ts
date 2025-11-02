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

export enum DeviceProviderType {
  REDROID = 'redroid',
  HUAWEI_CPH = 'huawei_cph',
  ALIYUN_ECP = 'aliyun_ecp',
  PHYSICAL = 'physical',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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

  @Column({ type: 'varchar', nullable: true })
  @Index()
  userId: string | null; // 逻辑外键 → user-service

  // ========== 冗余字段（从 user-service 同步，避免跨服务查询） ==========
  @Column({ type: 'varchar', nullable: true })
  userName: string | null; // 用户名

  @Column({ type: 'varchar', nullable: true })
  userEmail: string | null; // 用户邮箱

  @Column({ type: 'varchar', nullable: true })
  @Index()
  tenantId: string | null;

  // ========== Provider 信息（多设备源支持） ==========
  @Column({
    name: 'provider_type',
    type: 'enum',
    enum: DeviceProviderType,
    default: DeviceProviderType.REDROID,
  })
  @Index()
  providerType: DeviceProviderType;

  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  @Index()
  externalId: string | null; // Provider 侧的设备 ID（如 Docker containerId、华为 instanceId、物理设备 MAC）

  @Column({ name: 'provider_config', type: 'jsonb', nullable: true })
  providerConfig: Record<string, any> | null; // Provider 特定配置（创建时的参数）

  @Column({ name: 'connection_info', type: 'jsonb', nullable: true })
  connectionInfo: Record<string, any> | null; // 连接信息（ADB、SCRCPY、WebRTC 等）

  @Column({ name: 'device_group', type: 'varchar', nullable: true })
  deviceGroup: string | null; // 设备分组（物理设备的机架位置、云设备的区域等）

  @Column({ name: 'health_score', type: 'int', default: 100 })
  healthScore: number; // 设备健康评分 (0-100)

  // Docker 容器信息（仅 Redroid 使用）
  @Column({ type: 'varchar', nullable: true })
  @Index()
  containerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  containerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageTag: string | null;

  // ADB 连接信息
  @Column({ type: 'varchar', nullable: true })
  adbHost: string | null;

  @Column({ type: 'int', nullable: true })
  adbPort: number | null;

  // 设备配置
  @Column({ type: 'int', default: 2 })
  cpuCores: number;

  @Column({ type: 'int', default: 4096 })
  memoryMB: number;

  @Column({ type: 'int', default: 10240 })
  storageMB: number;

  @Column({ type: 'varchar', default: '1920x1080' })
  resolution: string;

  @Column({ type: 'int', default: 240 })
  dpi: number;

  // Android 配置
  @Column({ type: 'varchar', default: '11' })
  androidVersion: string;

  @Column({ type: 'varchar', nullable: true })
  androidId: string | null;

  // 网络配置
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  macAddress: string | null;

  // ========== 代理配置（家宽代理，每台云手机独立 IP） ==========
  /** 代理 ID（proxy-service 分配） */
  @Column({ name: 'proxy_id', type: 'varchar', nullable: true })
  @Index()
  proxyId: string | null;

  /** 代理主机地址 */
  @Column({ name: 'proxy_host', type: 'varchar', nullable: true })
  proxyHost: string | null;

  /** 代理端口 */
  @Column({ name: 'proxy_port', type: 'int', nullable: true })
  proxyPort: number | null;

  /** 代理类型 (HTTP/SOCKS5) */
  @Column({ name: 'proxy_type', type: 'varchar', nullable: true, default: 'HTTP' })
  proxyType: string | null;

  /** 代理用户名（可选） */
  @Column({ name: 'proxy_username', type: 'varchar', nullable: true })
  proxyUsername: string | null;

  /** 代理密码（加密存储，可选） */
  @Column({ name: 'proxy_password', type: 'varchar', nullable: true })
  proxyPassword: string | null;

  /** 代理国家代码 (如 US, CN, JP) */
  @Column({ name: 'proxy_country', type: 'varchar', length: 2, nullable: true })
  proxyCountry: string | null;

  /** 代理分配时间 */
  @Column({ name: 'proxy_assigned_at', type: 'timestamp', nullable: true })
  proxyAssignedAt: Date | null;

  // 状态信息
  @Column({ type: 'int', default: 0 })
  cpuUsage: number;

  @Column({ type: 'int', default: 0 })
  memoryUsage: number;

  @Column({ type: 'int', default: 0 })
  storageUsage: number;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  // 到期时间（用于临时设备或有时限的设备）
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date | null;

  // 是否启用自动备份
  @Column({ name: 'auto_backup_enabled', default: false })
  autoBackupEnabled: boolean;

  // 自动备份间隔（小时）
  @Column({ name: 'backup_interval_hours', type: 'int', nullable: true })
  backupIntervalHours: number | null;

  // 最后备份时间
  @Column({ name: 'last_backup_at', type: 'timestamp', nullable: true })
  lastBackupAt: Date | null;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'device_tags', type: 'jsonb', nullable: true })
  deviceTags: string[] | null; // 设备标签（用于过滤和搜索）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
