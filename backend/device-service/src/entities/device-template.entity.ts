import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateCategory {
  GAMING = 'gaming',
  TESTING = 'testing',
  GENERAL = 'general',
  CUSTOM = 'custom',
}

@Entity('device_templates')
export class DeviceTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.GENERAL,
  })
  @Index()
  category: TemplateCategory;

  // 设备配置
  @Column({ type: 'int', default: 2 })
  cpuCores: number;

  @Column({ type: 'int', default: 4096 })
  memoryMB: number;

  @Column({ type: 'int', default: 10240 })
  storageMB: number;

  @Column({ default: '1080x1920' })
  resolution: string;

  @Column({ type: 'int', default: 320 })
  dpi: number;

  @Column({ default: '11' })
  androidVersion: string;

  @Column({ default: false })
  enableGpu: boolean;

  @Column({ default: false })
  enableAudio: boolean;

  // 预安装应用列表
  @Column({ type: 'jsonb', default: [] })
  preInstalledApps: Array<{
    packageName: string;
    apkPath: string;
    autoStart?: boolean;
  }>;

  // 预设命令（初始化脚本）
  @Column({ type: 'jsonb', default: [] })
  initCommands: string[];

  // 系统设置
  @Column({ type: 'jsonb', nullable: true })
  systemSettings: Record<string, any>;

  // 镜像信息（用于快照）
  @Column({ nullable: true })
  snapshotId: string;

  @Column({ nullable: true })
  snapshotPath: string;

  // 使用统计
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // 模板元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  // 发布状态
  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true })
  @Index()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
