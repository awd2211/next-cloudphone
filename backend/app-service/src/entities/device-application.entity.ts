import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InstallStatus {
  INSTALLING = 'installing',
  INSTALLED = 'installed',
  FAILED = 'failed',
  UNINSTALLING = 'uninstalling',
  UNINSTALLED = 'uninstalled',
}

@Entity('device_applications')
export class DeviceApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  deviceId: string;

  @Column()
  @Index()
  applicationId: string;

  @Column({
    type: 'enum',
    enum: InstallStatus,
    default: InstallStatus.INSTALLING,
  })
  @Index()
  status: InstallStatus;

  @Column({ nullable: true })
  installPath: string;

  @Column({ type: 'timestamp', nullable: true })
  installedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  uninstalledAt: Date;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
