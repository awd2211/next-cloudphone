import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Device } from '../entities/device.entity';
import { DeviceSnapshot } from '../entities/device-snapshot.entity';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { EventBusService } from '@cloudphone/shared';

export interface BackupResult {
  success: boolean;
  deviceId: string;
  snapshotId?: string;
  error?: string;
}

export interface ExpirationCheckResult {
  devicesExpiring: Array<{
    deviceId: string;
    deviceName: string;
    userId: string;
    expiresAt: Date;
    daysRemaining: number;
  }>;
  snapshotsExpiring: Array<{
    snapshotId: string;
    snapshotName: string;
    deviceId: string;
    expiresAt: Date;
    daysRemaining: number;
  }>;
  devicesExpired: string[];
  snapshotsExpired: string[];
}

export interface BackupScheduleConfig {
  enabled: boolean;
  defaultIntervalHours: number;
  retentionDays: number;
  maxBackupsPerDevice: number;
  expirationWarningDays: number[];
}

@Injectable()
export class BackupExpirationService {
  private readonly logger = new Logger(BackupExpirationService.name);
  private config: BackupScheduleConfig;

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(DeviceSnapshot)
    private snapshotRepository: Repository<DeviceSnapshot>,
    private snapshotsService: SnapshotsService,
    private eventBusService: EventBusService,
    private configService: ConfigService
  ) {
    this.config = {
      enabled: this.configService.get<boolean>('BACKUP_SCHEDULE_ENABLED', true),
      defaultIntervalHours: this.configService.get<number>('BACKUP_INTERVAL_HOURS', 24),
      retentionDays: this.configService.get<number>('BACKUP_RETENTION_DAYS', 30),
      maxBackupsPerDevice: this.configService.get<number>('MAX_BACKUPS_PER_DEVICE', 10),
      expirationWarningDays: [30, 7, 3, 1], // 提前 30, 7, 3, 1 天警告
    };

    this.logger.log(
      `BackupExpirationService initialized with config: ${JSON.stringify(this.config)}`
    );
  }

  /**
   * 定时执行自动备份（每小时检查一次）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async performScheduledBackups(): Promise<BackupResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    this.logger.log('Starting scheduled backup task');

    try {
      // 查找需要备份的设备
      const devicesToBackup = await this.findDevicesNeedingBackup();

      this.logger.log(`Found ${devicesToBackup.length} devices needing backup`);

      const results: BackupResult[] = [];

      for (const device of devicesToBackup) {
        try {
          const snapshot = await this.createAutoBackup(device);
          results.push({
            success: true,
            deviceId: device.id,
            snapshotId: snapshot.id,
          });

          this.logger.log(`Auto backup created for device ${device.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to create auto backup for device ${device.id}: ${error.message}`
          );
          results.push({
            success: false,
            deviceId: device.id,
            error: error.message,
          });
        }
      }

      // 发布备份完成事件
      if (results.length > 0) {
        this.eventBusService.publishDeviceEvent('backup_completed', {
          timestamp: new Date(),
          totalDevices: devicesToBackup.length,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
          results,
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Scheduled backup task failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 定时检查到期提醒（每天 9:00 执行）
   */
  @Cron('0 9 * * *')
  async checkExpirations(): Promise<ExpirationCheckResult> {
    this.logger.log('Starting expiration check task');

    try {
      const result: ExpirationCheckResult = {
        devicesExpiring: [],
        snapshotsExpiring: [],
        devicesExpired: [],
        snapshotsExpired: [],
      };

      // 检查即将到期的设备
      const expiringDevices = await this.findExpiringDevices();
      result.devicesExpiring = expiringDevices;

      // 检查即将到期的快照
      const expiringSnapshots = await this.findExpiringSnapshots();
      result.snapshotsExpiring = expiringSnapshots;

      // 检查已过期的设备
      const expiredDevices = await this.findExpiredDevices();
      result.devicesExpired = expiredDevices.map((d) => d.id);

      // 检查已过期的快照
      const expiredSnapshots = await this.findExpiredSnapshots();
      result.snapshotsExpired = expiredSnapshots.map((s) => s.id);

      // 发送到期提醒通知
      await this.sendExpirationNotifications(result);

      // 清理已过期的快照（设备由用户手动处理）
      await this.cleanupExpiredSnapshots(expiredSnapshots);

      this.logger.log(
        `Expiration check completed: ${result.devicesExpiring.length} devices expiring, ${result.snapshotsExpiring.length} snapshots expiring, ${result.devicesExpired.length} devices expired, ${result.snapshotsExpired.length} snapshots expired`
      );

      return result;
    } catch (error) {
      this.logger.error(`Expiration check task failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 定时清理过期备份（每天凌晨 2:00 执行）
   */
  @Cron('0 2 * * *')
  async cleanupOldBackups(): Promise<number> {
    this.logger.log('Starting old backup cleanup task');

    try {
      let cleanedCount = 0;

      // 1. 清理超过保留期的自动备份
      const oldBackups = await this.snapshotRepository.find({
        where: {
          isAutoBackup: true,
          createdAt: LessThan(
            new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)
          ),
        },
      });

      for (const snapshot of oldBackups) {
        try {
          await this.snapshotsService.deleteSnapshot(snapshot.id, snapshot.createdBy);
          cleanedCount++;
          this.logger.log(`Deleted old auto backup: ${snapshot.id}`);
        } catch (error) {
          this.logger.warn(`Failed to delete old backup ${snapshot.id}: ${error.message}`);
        }
      }

      // 2. 清理超过最大数量限制的备份（保留最新的）
      const devices = await this.deviceRepository.find({
        where: { autoBackupEnabled: true },
      });

      for (const device of devices) {
        const snapshots = await this.snapshotRepository.find({
          where: { deviceId: device.id, isAutoBackup: true },
          order: { createdAt: 'DESC' },
        });

        if (snapshots.length > this.config.maxBackupsPerDevice) {
          const toDelete = snapshots.slice(this.config.maxBackupsPerDevice);

          for (const snapshot of toDelete) {
            try {
              await this.snapshotsService.deleteSnapshot(snapshot.id, snapshot.createdBy);
              cleanedCount++;
              this.logger.log(`Deleted excess backup for device ${device.id}: ${snapshot.id}`);
            } catch (error) {
              this.logger.warn(`Failed to delete excess backup ${snapshot.id}: ${error.message}`);
            }
          }
        }
      }

      this.logger.log(`Old backup cleanup completed: ${cleanedCount} backups deleted`);

      // 发布清理完成事件
      this.eventBusService.publishDeviceEvent('backup_cleanup_completed', {
        timestamp: new Date(),
        cleanedCount,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error(`Old backup cleanup task failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查找需要备份的设备
   */
  private async findDevicesNeedingBackup(): Promise<Device[]> {
    const now = new Date();

    // 查找启用了自动备份且满足备份条件的设备
    const devices = await this.deviceRepository
      .createQueryBuilder('device')
      .where('device.autoBackupEnabled = :enabled', { enabled: true })
      .andWhere('device.status = :status', { status: 'running' })
      .andWhere('(device.lastBackupAt IS NULL OR device.lastBackupAt < :backupThreshold)', {
        backupThreshold: new Date(
          now.getTime() - this.config.defaultIntervalHours * 60 * 60 * 1000
        ),
      })
      .getMany();

    return devices;
  }

  /**
   * 创建自动备份
   */
  private async createAutoBackup(device: Device): Promise<DeviceSnapshot> {
    const snapshotName = `auto-backup-${device.name}-${Date.now()}`;

    // 计算到期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.retentionDays);

    const snapshot = await this.snapshotsService.createSnapshot(
      device.id,
      {
        name: snapshotName,
        description: `Auto backup created at ${new Date().toISOString()}`,
        tags: ['auto-backup'],
      },
      device.userId || 'system'
    );

    // 更新快照为自动备份，并设置到期时间
    snapshot.isAutoBackup = true;
    snapshot.retentionDays = this.config.retentionDays;
    snapshot.expiresAt = expiresAt;
    await this.snapshotRepository.save(snapshot);

    // 更新设备的最后备份时间
    device.lastBackupAt = new Date();
    await this.deviceRepository.save(device);

    // 发布备份创建事件
    this.eventBusService.publishDeviceEvent('backup_created', {
      deviceId: device.id,
      deviceName: device.name,
      userId: device.userId,
      snapshotId: snapshot.id,
      snapshotName: snapshot.name,
      timestamp: new Date(),
    });

    return snapshot;
  }

  /**
   * 查找即将到期的设备
   */
  private async findExpiringDevices(): Promise<
    Array<{
      deviceId: string;
      deviceName: string;
      userId: string;
      expiresAt: Date;
      daysRemaining: number;
    }>
  > {
    const result = [];

    for (const days of this.config.expirationWarningDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      // 查找在目标日期当天到期的设备
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const devices = await this.deviceRepository.find({
        where: {
          expiresAt: MoreThan(startOfDay) && LessThan(endOfDay),
        },
      });

      for (const device of devices) {
        // 只添加有完整信息的设备
        if (device.userId && device.expiresAt) {
          result.push({
            deviceId: device.id,
            deviceName: device.name,
            userId: device.userId,
            expiresAt: device.expiresAt,
            daysRemaining: days,
          });
        }
      }
    }

    return result;
  }

  /**
   * 查找即将到期的快照
   */
  private async findExpiringSnapshots(): Promise<
    Array<{
      snapshotId: string;
      snapshotName: string;
      deviceId: string;
      expiresAt: Date;
      daysRemaining: number;
    }>
  > {
    const result = [];

    for (const days of this.config.expirationWarningDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const snapshots = await this.snapshotRepository.find({
        where: {
          expiresAt: MoreThan(startOfDay) && LessThan(endOfDay),
        },
      });

      for (const snapshot of snapshots) {
        result.push({
          snapshotId: snapshot.id,
          snapshotName: snapshot.name,
          deviceId: snapshot.deviceId,
          expiresAt: snapshot.expiresAt,
          daysRemaining: days,
        });
      }
    }

    return result;
  }

  /**
   * 查找已过期的设备
   */
  private async findExpiredDevices(): Promise<Device[]> {
    return await this.deviceRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
      },
    });
  }

  /**
   * 查找已过期的快照
   */
  private async findExpiredSnapshots(): Promise<DeviceSnapshot[]> {
    return await this.snapshotRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
      },
    });
  }

  /**
   * 发送到期提醒通知
   */
  private async sendExpirationNotifications(result: ExpirationCheckResult): Promise<void> {
    // 发送设备到期提醒
    for (const device of result.devicesExpiring) {
      this.eventBusService.publishDeviceEvent('expiration_warning', {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        userId: device.userId,
        expiresAt: device.expiresAt,
        daysRemaining: device.daysRemaining,
        timestamp: new Date(),
      });

      this.logger.log(
        `Sent expiration warning for device ${device.deviceId}: ${device.daysRemaining} days remaining`
      );
    }

    // 发送快照到期提醒
    for (const snapshot of result.snapshotsExpiring) {
      this.eventBusService.publish('cloudphone.events', 'snapshot.expiration_warning', {
        snapshotId: snapshot.snapshotId,
        snapshotName: snapshot.snapshotName,
        deviceId: snapshot.deviceId,
        expiresAt: snapshot.expiresAt,
        daysRemaining: snapshot.daysRemaining,
        timestamp: new Date(),
      });

      this.logger.log(
        `Sent expiration warning for snapshot ${snapshot.snapshotId}: ${snapshot.daysRemaining} days remaining`
      );
    }

    // 发送已过期通知
    for (const deviceId of result.devicesExpired) {
      this.eventBusService.publishDeviceEvent('expired', {
        deviceId,
        timestamp: new Date(),
      });
    }

    for (const snapshotId of result.snapshotsExpired) {
      this.eventBusService.publish('cloudphone.events', 'snapshot.expired', {
        snapshotId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 清理已过期的快照
   */
  private async cleanupExpiredSnapshots(snapshots: DeviceSnapshot[]): Promise<void> {
    for (const snapshot of snapshots) {
      try {
        await this.snapshotsService.deleteSnapshot(snapshot.id, snapshot.createdBy);
        this.logger.log(`Deleted expired snapshot: ${snapshot.id}`);
      } catch (error) {
        this.logger.warn(`Failed to delete expired snapshot ${snapshot.id}: ${error.message}`);
      }
    }
  }

  /**
   * 手动触发备份任务
   */
  async triggerManualBackup(deviceId: string, userId: string): Promise<DeviceSnapshot> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (device.status !== 'running') {
      throw new Error('Device must be running to create backup');
    }

    return await this.createAutoBackup(device);
  }

  /**
   * 手动触发到期检查
   */
  async triggerManualExpirationCheck(): Promise<ExpirationCheckResult> {
    return await this.checkExpirations();
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<BackupScheduleConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log(`Configuration updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 获取配置
   */
  getConfig(): BackupScheduleConfig {
    return { ...this.config };
  }

  /**
   * 获取备份统计
   */
  async getBackupStatistics(): Promise<{
    totalAutoBackups: number;
    devicesWithAutoBackup: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    totalBackupSize: number;
  }> {
    const autoBackups = await this.snapshotRepository.find({
      where: { isAutoBackup: true },
      order: { createdAt: 'DESC' },
    });

    const devicesWithBackup = await this.deviceRepository.count({
      where: { autoBackupEnabled: true },
    });

    const totalSize = autoBackups.reduce((sum, b) => sum + (b.imageSize || 0), 0);

    return {
      totalAutoBackups: autoBackups.length,
      devicesWithAutoBackup: devicesWithBackup,
      oldestBackup: autoBackups.length > 0 ? autoBackups[autoBackups.length - 1].createdAt : null,
      newestBackup: autoBackups.length > 0 ? autoBackups[0].createdAt : null,
      totalBackupSize: totalSize,
    };
  }
}
