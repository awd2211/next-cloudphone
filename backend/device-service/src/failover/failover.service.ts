import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, FindOptionsWhere } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DeviceSnapshot, SnapshotStatus } from '../entities/device-snapshot.entity';
import { DockerService } from '../docker/docker.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import { EventBusService, DistributedLockService } from '@cloudphone/shared';
import { RetryService } from '../common/retry.service';

/**
 * 故障类型
 */
export enum FailureType {
  CONTAINER_DEAD = 'container_dead',
  CONTAINER_UNHEALTHY = 'container_unhealthy',
  HEARTBEAT_TIMEOUT = 'heartbeat_timeout',
  HIGH_ERROR_RATE = 'high_error_rate',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
}

/**
 * 迁移策略
 */
export enum MigrationStrategy {
  RECREATE = 'recreate', // 重新创建容器
  RESTORE_FROM_SNAPSHOT = 'restore_from_snapshot', // 从快照恢复
  RESTART_CONTAINER = 'restart_container', // 重启容器
}

/**
 * 故障检测结果
 */
export interface FailureDetectionResult {
  deviceId: string;
  failureType: FailureType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  deviceId: string;
  strategy: MigrationStrategy;
  newContainerId?: string;
  duration: number; // 迁移耗时（毫秒）
  error?: string;
  recoveryAttempts: number;
}

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  enabled: boolean;
  heartbeatTimeoutMinutes: number;
  maxConsecutiveFailures: number;
  autoRecreateEnabled: boolean;
  snapshotRecoveryEnabled: boolean;
  maxRecoveryAttempts: number;
  cooldownMinutes: number; // 冷却期，避免频繁迁移
}

/**
 * 设备故障自动迁移服务
 */
@Injectable()
export class FailoverService {
  private readonly logger = new Logger(FailoverService.name);
  private config: FailoverConfig;
  private failureHistory: Map<string, FailureDetectionResult[]> = new Map();
  private migrationHistory: MigrationResult[] = [];
  private lastMigrationTime: Map<string, Date> = new Map();

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(DeviceSnapshot)
    private snapshotRepository: Repository<DeviceSnapshot>,
    private dockerService: DockerService,
    private snapshotsService: SnapshotsService,
    private portManagerService: PortManagerService,
    private eventBusService: EventBusService,
    private retryService: RetryService,
    private configService: ConfigService,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
  ) {
    this.config = {
      enabled: this.configService.get<boolean>('FAILOVER_ENABLED', true),
      heartbeatTimeoutMinutes: this.configService.get<number>(
        'FAILOVER_HEARTBEAT_TIMEOUT_MINUTES',
        10
      ),
      maxConsecutiveFailures: this.configService.get<number>(
        'FAILOVER_MAX_CONSECUTIVE_FAILURES',
        3
      ),
      autoRecreateEnabled: this.configService.get<boolean>('FAILOVER_AUTO_RECREATE_ENABLED', true),
      snapshotRecoveryEnabled: this.configService.get<boolean>(
        'FAILOVER_SNAPSHOT_RECOVERY_ENABLED',
        true
      ),
      maxRecoveryAttempts: this.configService.get<number>('FAILOVER_MAX_RECOVERY_ATTEMPTS', 3),
      cooldownMinutes: this.configService.get<number>('FAILOVER_COOLDOWN_MINUTES', 15),
    };

    this.logger.log(`FailoverService initialized: ${JSON.stringify(this.config)}`);
  }

  /**
   * 定期检测设备故障（每 5 分钟）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectAndRecoverFailures(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.logger.log('Starting failure detection and recovery');

    try {
      // 1. 检测心跳超时的设备
      const heartbeatFailures = await this.detectHeartbeatTimeouts();

      // 2. 检测容器状态异常的设备
      const containerFailures = await this.detectContainerFailures();

      // 3. 检测错误状态的设备
      const errorDevices = await this.detectErrorDevices();

      const allFailures = [...heartbeatFailures, ...containerFailures, ...errorDevices];

      this.logger.log(`Detected ${allFailures.length} device failures`);

      // 4. 对每个故障设备执行恢复
      for (const failure of allFailures) {
        await this.handleDeviceFailure(failure);
      }
    } catch (error) {
      this.logger.error(`Failure detection and recovery failed: ${error.message}`);
    }
  }

  /**
   * 检测心跳超时的设备
   */
  private async detectHeartbeatTimeouts(): Promise<FailureDetectionResult[]> {
    const timeoutThreshold = new Date(Date.now() - this.config.heartbeatTimeoutMinutes * 60 * 1000);

    const devices = await this.deviceRepository
      .createQueryBuilder('device')
      .where('device.status IN (:...statuses)', {
        statuses: [DeviceStatus.RUNNING, DeviceStatus.ALLOCATED],
      })
      .andWhere('(device.lastHeartbeatAt IS NULL OR device.lastHeartbeatAt < :threshold)', {
        threshold: timeoutThreshold,
      })
      .getMany();

    return devices.map((device) => ({
      deviceId: device.id,
      failureType: FailureType.HEARTBEAT_TIMEOUT,
      severity: 'high',
      details: `Device heartbeat timeout (last: ${device.lastHeartbeatAt})`,
      timestamp: new Date(),
      metadata: {
        deviceName: device.name,
        lastHeartbeat: device.lastHeartbeatAt,
      },
    }));
  }

  /**
   * 检测容器状态异常的设备
   */
  private async detectContainerFailures(): Promise<FailureDetectionResult[]> {
    const failures: FailureDetectionResult[] = [];

    // ✅ 明确类型标注 FindOptionsWhere
    const where: FindOptionsWhere<Device> = {
      status: In([DeviceStatus.RUNNING, DeviceStatus.ALLOCATED]),
      containerId: Not(IsNull()) as any,
    };

    const devices = await this.deviceRepository.find({ where });

    for (const device of devices) {
      if (!device.containerId) {
        continue; // Skip devices without containerId
      }

      try {
        const containerInfo = await this.dockerService.getContainerInfo(device.containerId);

        // 检查容器是否已停止
        if (containerInfo.State.Status === 'exited' || containerInfo.State.Dead) {
          failures.push({
            deviceId: device.id,
            failureType: FailureType.CONTAINER_DEAD,
            severity: 'critical',
            details: `Container is ${containerInfo.State.Status}`,
            timestamp: new Date(),
            metadata: {
              containerState: containerInfo.State,
              exitCode: containerInfo.State.ExitCode,
            },
          });
        }
        // 检查容器健康状态
        else if (containerInfo.State.Health && containerInfo.State.Health.Status === 'unhealthy') {
          failures.push({
            deviceId: device.id,
            failureType: FailureType.CONTAINER_UNHEALTHY,
            severity: 'high',
            details: 'Container health check failed',
            timestamp: new Date(),
            metadata: {
              healthLogs: containerInfo.State.Health.Log?.slice(-3),
            },
          });
        }
      } catch (error) {
        // 容器不存在
        this.logger.warn(`Container not found for device ${device.id}: ${error.message}`);
        failures.push({
          deviceId: device.id,
          failureType: FailureType.CONTAINER_DEAD,
          severity: 'critical',
          details: `Container not found: ${error.message}`,
          timestamp: new Date(),
        });
      }
    }

    return failures;
  }

  /**
   * 检测错误状态的设备
   */
  private async detectErrorDevices(): Promise<FailureDetectionResult[]> {
    const devices = await this.deviceRepository.find({
      where: { status: DeviceStatus.ERROR },
    });

    return devices.map((device) => ({
      deviceId: device.id,
      failureType: FailureType.HIGH_ERROR_RATE,
      severity: 'medium',
      details: 'Device is in error state',
      timestamp: new Date(),
      metadata: {
        deviceName: device.name,
        metadata: device.metadata,
      },
    }));
  }

  /**
   * 处理设备故障
   */
  private async handleDeviceFailure(failure: FailureDetectionResult): Promise<void> {
    this.logger.log(`Handling failure for device ${failure.deviceId}: ${failure.failureType}`);

    // 记录故障历史
    this.recordFailure(failure);

    // 检查是否在冷却期内
    if (this.isInCooldown(failure.deviceId)) {
      this.logger.warn(`Device ${failure.deviceId} is in cooldown period, skipping recovery`);
      return;
    }

    // 检查连续故障次数
    const consecutiveFailures = this.getConsecutiveFailures(failure.deviceId);
    if (consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.logger.error(
        `Device ${failure.deviceId} exceeded max consecutive failures (${consecutiveFailures}), marking as permanently failed`
      );

      await this.markDeviceAsFailed(failure.deviceId);
      return;
    }

    // 执行恢复
    try {
      const migrationResult = await this.recoverDevice(failure);

      // 记录迁移历史
      this.migrationHistory.push(migrationResult);
      if (this.migrationHistory.length > 100) {
        this.migrationHistory = this.migrationHistory.slice(-100);
      }

      // 更新最后迁移时间
      this.lastMigrationTime.set(failure.deviceId, new Date());

      // 发布事件
      if (migrationResult.success) {
        this.eventBusService.publishDeviceEvent('recovery_success', {
          deviceId: failure.deviceId,
          failureType: failure.failureType,
          strategy: migrationResult.strategy,
          duration: migrationResult.duration,
          timestamp: new Date(),
        });

        // 清除故障历史
        this.failureHistory.delete(failure.deviceId);
      } else {
        this.eventBusService.publishDeviceEvent('recovery_failed', {
          deviceId: failure.deviceId,
          failureType: failure.failureType,
          strategy: migrationResult.strategy,
          error: migrationResult.error,
          attempts: migrationResult.recoveryAttempts,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Recovery failed for device ${failure.deviceId}: ${error.message}`);
    }
  }

  /**
   * 恢复设备
   */
  private async recoverDevice(failure: FailureDetectionResult): Promise<MigrationResult> {
    const startTime = Date.now();
    const device = await this.deviceRepository.findOne({
      where: { id: failure.deviceId },
    });

    if (!device) {
      return {
        success: false,
        deviceId: failure.deviceId,
        strategy: MigrationStrategy.RECREATE,
        duration: Date.now() - startTime,
        error: 'Device not found',
        recoveryAttempts: 1,
      };
    }

    // 确定恢复策略
    const strategy = this.determineRecoveryStrategy(failure, device);

    this.logger.log(`Recovering device ${device.id} using strategy: ${strategy}`);

    let result: MigrationResult;

    try {
      switch (strategy) {
        case MigrationStrategy.RESTART_CONTAINER:
          result = await this.restartContainer(device);
          break;

        case MigrationStrategy.RESTORE_FROM_SNAPSHOT:
          result = await this.restoreFromSnapshot(device);
          break;

        case MigrationStrategy.RECREATE:
          result = await this.recreateDevice(device);
          break;

        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        deviceId: device.id,
        strategy,
        duration: Date.now() - startTime,
        error: error.message,
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * 确定恢复策略
   */
  private determineRecoveryStrategy(
    failure: FailureDetectionResult,
    device: Device
  ): MigrationStrategy {
    // 容器不健康但未死亡 -> 重启
    if (failure.failureType === FailureType.CONTAINER_UNHEALTHY) {
      return MigrationStrategy.RESTART_CONTAINER;
    }

    // 如果启用了快照恢复且有可用快照 -> 从快照恢复
    if (this.config.snapshotRecoveryEnabled) {
      // 这里简化处理，实际应该检查是否有最近的快照
      return MigrationStrategy.RESTORE_FROM_SNAPSHOT;
    }

    // 默认：重新创建
    return MigrationStrategy.RECREATE;
  }

  /**
   * 重启容器
   */
  private async restartContainer(device: Device): Promise<MigrationResult> {
    this.logger.log(`Restarting container for device ${device.id}`);

    if (!device.containerId) {
      throw new Error(`Device ${device.id} has no containerId`);
    }

    try {
      await this.retryService.executeWithRetry(
        async () => await this.dockerService.restartContainer(device.containerId!),
        {
          operation: 'restartContainer',
          entityId: device.id,
          entityType: 'device',
        },
        { maxAttempts: 3, baseDelayMs: 2000 }
      );

      // 更新设备状态
      device.status = DeviceStatus.RUNNING;
      await this.deviceRepository.save(device);

      return {
        success: true,
        deviceId: device.id,
        strategy: MigrationStrategy.RESTART_CONTAINER,
        duration: 0, // 将在外层计算
        recoveryAttempts: 1,
      };
    } catch (error) {
      return {
        success: false,
        deviceId: device.id,
        strategy: MigrationStrategy.RESTART_CONTAINER,
        duration: 0,
        error: error.message,
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * 从快照恢复
   */
  private async restoreFromSnapshot(device: Device): Promise<MigrationResult> {
    this.logger.log(`Restoring device ${device.id} from snapshot`);

    try {
      // 查找最新的就绪快照
      const snapshot = await this.snapshotRepository.findOne({
        where: {
          deviceId: device.id,
          status: SnapshotStatus.READY,
        },
        order: { createdAt: 'DESC' },
      });

      if (!snapshot) {
        this.logger.warn(`No snapshot available for device ${device.id}, falling back to recreate`);
        return await this.recreateDevice(device);
      }

      // 停止并删除旧容器
      if (device.containerId) {
        try {
          await this.dockerService.stopContainer(device.containerId);
          await this.dockerService.removeContainer(device.containerId);
        } catch (error) {
          this.logger.warn(`Failed to remove old container: ${error.message}`);
        }
      }

      // ✅ 验证 userId（userId 是 string | null，但 restoreSnapshot 需要 string）
      if (!device.userId) {
        throw new Error(`Device ${device.id} has no userId for snapshot restoration`);
      }

      // 从快照恢复
      const restoredDevice = await this.snapshotsService.restoreSnapshot(
        snapshot.id,
        { replaceOriginal: true },
        device.userId
      );

      // ✅ newContainerId 类型转换：string | null → string | undefined
      return {
        success: true,
        deviceId: device.id,
        strategy: MigrationStrategy.RESTORE_FROM_SNAPSHOT,
        newContainerId: restoredDevice.containerId ?? undefined,
        duration: 0,
        recoveryAttempts: 1,
      };
    } catch (error) {
      return {
        success: false,
        deviceId: device.id,
        strategy: MigrationStrategy.RESTORE_FROM_SNAPSHOT,
        duration: 0,
        error: error.message,
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * 重新创建设备
   */
  private async recreateDevice(device: Device): Promise<MigrationResult> {
    this.logger.log(`Recreating device ${device.id}`);

    try {
      // 删除旧容器
      if (device.containerId) {
        try {
          await this.dockerService.removeContainer(device.containerId);
        } catch (error) {
          this.logger.warn(`Failed to remove old container: ${error.message}`);
        }
      }

      // 分配新端口
      const ports = await this.portManagerService.allocatePorts();

      // 创建新容器
      const container = await this.retryService.executeWithRetry(
        async () =>
          await this.dockerService.createContainer({
            name: `${device.name}-recreated-${Date.now()}`,
            cpuCores: device.cpuCores,
            memoryMB: device.memoryMB,
            storageMB: device.storageMB,
            resolution: device.resolution,
            dpi: device.dpi,
            adbPort: ports.adbPort,
            androidVersion: device.androidVersion,
          }),
        {
          operation: 'recreateDevice',
          entityId: device.id,
          entityType: 'device',
        },
        { maxAttempts: 3, baseDelayMs: 3000 }
      );

      // 更新设备信息
      device.containerId = container.id;
      device.adbPort = ports.adbPort;
      device.status = DeviceStatus.RUNNING;
      await this.deviceRepository.save(device);

      return {
        success: true,
        deviceId: device.id,
        strategy: MigrationStrategy.RECREATE,
        newContainerId: container.id,
        duration: 0,
        recoveryAttempts: 1,
      };
    } catch (error) {
      // 标记设备为错误状态
      device.status = DeviceStatus.ERROR;
      await this.deviceRepository.save(device);

      return {
        success: false,
        deviceId: device.id,
        strategy: MigrationStrategy.RECREATE,
        duration: 0,
        error: error.message,
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * 记录故障
   */
  private recordFailure(failure: FailureDetectionResult): void {
    const history = this.failureHistory.get(failure.deviceId) || [];
    history.push(failure);

    // 只保留最近 10 次故障
    if (history.length > 10) {
      history.shift();
    }

    this.failureHistory.set(failure.deviceId, history);
  }

  /**
   * 获取连续故障次数
   */
  private getConsecutiveFailures(deviceId: string): number {
    const history = this.failureHistory.get(deviceId) || [];
    return history.length;
  }

  /**
   * 检查是否在冷却期内
   */
  private isInCooldown(deviceId: string): boolean {
    const lastMigration = this.lastMigrationTime.get(deviceId);
    if (!lastMigration) {
      return false;
    }

    const cooldownEnd = new Date(lastMigration.getTime() + this.config.cooldownMinutes * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * 标记设备为永久失败
   */
  private async markDeviceAsFailed(deviceId: string): Promise<void> {
    try {
      await this.deviceRepository.update({ id: deviceId }, { status: DeviceStatus.ERROR });

      this.eventBusService.publishDeviceEvent('permanent_failure', {
        deviceId,
        timestamp: new Date(),
      });

      this.logger.error(`Device ${deviceId} marked as permanently failed`);
    } catch (error) {
      this.logger.error(`Failed to mark device as failed: ${error.message}`);
    }
  }

  /**
   * 手动触发设备恢复
   */
  async triggerManualRecovery(deviceId: string): Promise<MigrationResult> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const failure: FailureDetectionResult = {
      deviceId,
      failureType: FailureType.HIGH_ERROR_RATE,
      severity: 'medium',
      details: 'Manual recovery triggered',
      timestamp: new Date(),
    };

    return await this.recoverDevice(failure);
  }

  /**
   * 获取故障历史
   */
  getFailureHistory(deviceId?: string): Map<string, FailureDetectionResult[]> {
    if (deviceId) {
      const history = this.failureHistory.get(deviceId);
      return new Map(history ? [[deviceId, history]] : []);
    }
    return this.failureHistory;
  }

  /**
   * 获取迁移历史
   */
  getMigrationHistory(): MigrationResult[] {
    return [...this.migrationHistory];
  }

  /**
   * 获取配置
   */
  getConfig(): FailoverConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<FailoverConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log(`Failover config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 获取故障转移记录列表
   * 分页返回故障转移操作记录
   */
  getFailoverRecords(params: {
    status?: string;
    deviceId?: string;
    page: number;
    limit: number;
  }): {
    data: any[];
    meta: { total: number; page: number; limit: number };
  } {
    let records: any[] = [];

    // 添加迁移历史记录
    for (const migration of this.migrationHistory) {
      records.push({
        id: `migration_${migration.deviceId}_${migration.duration}`,
        type: 'migration',
        deviceId: migration.deviceId,
        strategy: migration.strategy,
        status: migration.success ? 'success' : 'failed',
        newContainerId: migration.newContainerId,
        duration: migration.duration,
        recoveryAttempts: migration.recoveryAttempts,
        error: migration.error,
        timestamp: new Date(), // 迁移历史没有保存时间戳，用当前时间
      });
    }

    // 添加故障历史记录
    for (const [deviceId, failures] of this.failureHistory.entries()) {
      for (const failure of failures) {
        records.push({
          id: `failure_${deviceId}_${failure.timestamp.getTime()}`,
          type: 'failure',
          deviceId: failure.deviceId,
          failureType: failure.failureType,
          severity: failure.severity,
          status: 'detected',
          details: failure.details,
          metadata: failure.metadata,
          timestamp: failure.timestamp,
        });
      }
    }

    // 按时间倒序排序
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 过滤
    if (params.status) {
      records = records.filter((r) => r.status === params.status);
    }
    if (params.deviceId) {
      records = records.filter((r) => r.deviceId === params.deviceId);
    }

    // 分页
    const total = records.length;
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const paginatedRecords = records.slice(start, end);

    return {
      data: paginatedRecords,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
      },
    };
  }

  /**
   * 获取故障统计
   */
  getStatistics(): {
    totalFailures: number;
    activeFailures: number;
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    averageRecoveryTime: number;
    failuresByType: Record<FailureType, number>;
    migrationsByStrategy: Record<MigrationStrategy, number>;
  } {
    const totalFailures = Array.from(this.failureHistory.values()).reduce(
      (sum, history) => sum + history.length,
      0
    );

    const activeFailures = this.failureHistory.size;

    const totalMigrations = this.migrationHistory.length;
    const successfulMigrations = this.migrationHistory.filter((m) => m.success).length;
    const failedMigrations = totalMigrations - successfulMigrations;

    const averageRecoveryTime =
      totalMigrations > 0
        ? this.migrationHistory.reduce((sum, m) => sum + m.duration, 0) / totalMigrations
        : 0;

    const failuresByType: Record<string, number> = {};
    for (const history of this.failureHistory.values()) {
      for (const failure of history) {
        failuresByType[failure.failureType] = (failuresByType[failure.failureType] || 0) + 1;
      }
    }

    const migrationsByStrategy: Record<string, number> = {};
    for (const migration of this.migrationHistory) {
      migrationsByStrategy[migration.strategy] =
        (migrationsByStrategy[migration.strategy] || 0) + 1;
    }

    return {
      totalFailures,
      activeFailures,
      totalMigrations,
      successfulMigrations,
      failedMigrations,
      averageRecoveryTime,
      failuresByType: failuresByType as any,
      migrationsByStrategy: migrationsByStrategy as any,
    };
  }
}
