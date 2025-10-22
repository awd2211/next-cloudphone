import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DockerService } from '../docker/docker.service';
import { EventBusService } from '@cloudphone/shared';

/**
 * 状态不一致类型
 */
export enum StateInconsistencyType {
  DATABASE_DOCKER_MISMATCH = 'database_docker_mismatch', // 数据库和Docker状态不一致
  ORPHANED_CONTAINER = 'orphaned_container', // 孤儿容器
  MISSING_CONTAINER = 'missing_container', // 容器丢失
  STATUS_MISMATCH = 'status_mismatch', // 状态不匹配
  PORT_CONFLICT = 'port_conflict', // 端口冲突
}

/**
 * 状态不一致记录
 */
export interface StateInconsistency {
  type: StateInconsistencyType;
  deviceId?: string;
  containerId?: string;
  expectedState: any;
  actualState: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  timestamp: Date;
  autoFixable: boolean;
}

/**
 * 操作记录（用于回滚）
 */
export interface OperationRecord {
  id: string;
  operationType: string;
  entityType: string;
  entityId: string;
  beforeState: any;
  afterState: any;
  executedBy: string;
  timestamp: Date;
  rollbackable: boolean;
  rolledBack: boolean;
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  operationId: string;
  entityId: string;
  error?: string;
  timestamp: Date;
}

/**
 * 自愈结果
 */
export interface SelfHealingResult {
  success: boolean;
  inconsistency: StateInconsistency;
  action: string;
  error?: string;
}

/**
 * 状态恢复配置
 */
export interface StateRecoveryConfig {
  enabled: boolean;
  autoHealEnabled: boolean;
  recordOperations: boolean;
  maxOperationHistory: number;
  checkIntervalMinutes: number;
}

/**
 * 状态自愈和回滚服务
 */
@Injectable()
export class StateRecoveryService {
  private readonly logger = new Logger(StateRecoveryService.name);
  private config: StateRecoveryConfig;
  private operationHistory: OperationRecord[] = [];
  private inconsistencyHistory: StateInconsistency[] = [];

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
    private eventBusService: EventBusService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.config = {
      enabled: this.configService.get<boolean>('STATE_RECOVERY_ENABLED', true),
      autoHealEnabled: this.configService.get<boolean>(
        'STATE_RECOVERY_AUTO_HEAL_ENABLED',
        true,
      ),
      recordOperations: this.configService.get<boolean>(
        'STATE_RECOVERY_RECORD_OPERATIONS',
        true,
      ),
      maxOperationHistory: this.configService.get<number>(
        'STATE_RECOVERY_MAX_OPERATION_HISTORY',
        1000,
      ),
      checkIntervalMinutes: this.configService.get<number>(
        'STATE_RECOVERY_CHECK_INTERVAL_MINUTES',
        15,
      ),
    };

    this.logger.log(
      `StateRecoveryService initialized: ${JSON.stringify(this.config)}`,
    );
  }

  /**
   * 定期检查状态一致性（每 15 分钟）
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async performConsistencyCheck(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.logger.log('Starting state consistency check');

    try {
      const inconsistencies = await this.detectInconsistencies();

      this.logger.log(`Detected ${inconsistencies.length} state inconsistencies`);

      // 记录不一致
      for (const inconsistency of inconsistencies) {
        this.recordInconsistency(inconsistency);
      }

      // 自动修复（如果启用）
      if (this.config.autoHealEnabled) {
        for (const inconsistency of inconsistencies) {
          if (inconsistency.autoFixable) {
            await this.autoHeal(inconsistency);
          }
        }
      }

      // 发布事件
      if (inconsistencies.length > 0) {
        this.eventBusService.publish('cloudphone.events', 'state.inconsistencies_detected', {
          count: inconsistencies.length,
          types: this.groupByType(inconsistencies),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Consistency check failed: ${error.message}`);
    }
  }

  /**
   * 检测状态不一致
   */
  private async detectInconsistencies(): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = [];

    // 1. 检查数据库中的设备与Docker容器的一致性
    const dbDockerInconsistencies = await this.checkDatabaseDockerConsistency();
    inconsistencies.push(...dbDockerInconsistencies);

    // 2. 检查孤儿容器
    const orphanedContainers = await this.checkOrphanedContainers();
    inconsistencies.push(...orphanedContainers);

    // 3. 检查容器丢失
    const missingContainers = await this.checkMissingContainers();
    inconsistencies.push(...missingContainers);

    return inconsistencies;
  }

  /**
   * 检查数据库和Docker状态一致性
   */
  private async checkDatabaseDockerConsistency(): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = [];

    const devices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.RUNNING,
      },
    });

    for (const device of devices) {
      if (!device.containerId) {
        continue;
      }

      try {
        const containerInfo = await this.dockerService.getContainerInfo(
          device.containerId,
        );

        // 检查容器运行状态
        const containerRunning = containerInfo.State.Running;
        const dbSaysRunning = device.status === DeviceStatus.RUNNING;

        if (dbSaysRunning && !containerRunning) {
          inconsistencies.push({
            type: StateInconsistencyType.STATUS_MISMATCH,
            deviceId: device.id,
            containerId: device.containerId,
            expectedState: { status: DeviceStatus.RUNNING },
            actualState: {
              status: containerInfo.State.Status,
              running: containerRunning,
            },
            severity: 'high',
            details: `Database says device is running, but container is ${containerInfo.State.Status}`,
            timestamp: new Date(),
            autoFixable: true,
          });
        }
      } catch (error) {
        // 容器不存在
        inconsistencies.push({
          type: StateInconsistencyType.MISSING_CONTAINER,
          deviceId: device.id,
          containerId: device.containerId,
          expectedState: { containerExists: true },
          actualState: { containerExists: false, error: error.message },
          severity: 'critical',
          details: `Container ${device.containerId} not found for device ${device.id}`,
          timestamp: new Date(),
          autoFixable: true,
        });
      }
    }

    return inconsistencies;
  }

  /**
   * 检查孤儿容器（存在于Docker但不在数据库中）
   */
  private async checkOrphanedContainers(): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = [];

    try {
      const allContainers = await this.dockerService.listContainers(true);

      // 过滤出cloudphone管理的容器
      const cloudphoneContainers = allContainers.filter((container) => {
        return container.Labels && container.Labels['com.cloudphone.managed'] === 'true';
      });

      // 获取所有设备的容器ID
      const devices = await this.deviceRepository.find({
        select: ['containerId'],
      });
      const knownContainerIds = new Set(devices.map((d) => d.containerId).filter(Boolean));

      // 检查孤儿容器
      for (const container of cloudphoneContainers) {
        if (!knownContainerIds.has(container.Id)) {
          inconsistencies.push({
            type: StateInconsistencyType.ORPHANED_CONTAINER,
            containerId: container.Id,
            expectedState: { inDatabase: true },
            actualState: { inDatabase: false },
            severity: 'medium',
            details: `Container ${container.Id} (${container.Names[0]}) exists but has no database record`,
            timestamp: new Date(),
            autoFixable: true,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check orphaned containers: ${error.message}`);
    }

    return inconsistencies;
  }

  /**
   * 检查容器丢失（数据库中有记录但Docker中不存在）
   */
  private async checkMissingContainers(): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = [];

    const devices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.RUNNING,
      },
    });

    for (const device of devices) {
      if (!device.containerId) {
        continue;
      }

      try {
        await this.dockerService.getContainerInfo(device.containerId);
      } catch (error) {
        inconsistencies.push({
          type: StateInconsistencyType.MISSING_CONTAINER,
          deviceId: device.id,
          containerId: device.containerId,
          expectedState: { containerExists: true },
          actualState: { containerExists: false },
          severity: 'high',
          details: `Container ${device.containerId} missing for device ${device.id}`,
          timestamp: new Date(),
          autoFixable: true,
        });
      }
    }

    return inconsistencies;
  }

  /**
   * 自动修复状态不一致
   */
  private async autoHeal(inconsistency: StateInconsistency): Promise<SelfHealingResult> {
    this.logger.log(
      `Auto-healing inconsistency: ${inconsistency.type} for device ${inconsistency.deviceId}`,
    );

    try {
      let action: string;

      switch (inconsistency.type) {
        case StateInconsistencyType.STATUS_MISMATCH:
          action = await this.healStatusMismatch(inconsistency);
          break;

        case StateInconsistencyType.MISSING_CONTAINER:
          action = await this.healMissingContainer(inconsistency);
          break;

        case StateInconsistencyType.ORPHANED_CONTAINER:
          action = await this.healOrphanedContainer(inconsistency);
          break;

        default:
          throw new Error(`Unknown inconsistency type: ${inconsistency.type}`);
      }

      // 发布自愈成功事件
      this.eventBusService.publish('cloudphone.events', 'state.self_healing_success', {
        inconsistency: inconsistency.type,
        deviceId: inconsistency.deviceId,
        action,
        timestamp: new Date(),
      });

      return {
        success: true,
        inconsistency,
        action,
      };
    } catch (error) {
      this.logger.error(`Auto-healing failed: ${error.message}`);

      // 发布自愈失败事件
      this.eventBusService.publish('cloudphone.events', 'state.self_healing_failed', {
        inconsistency: inconsistency.type,
        deviceId: inconsistency.deviceId,
        error: error.message,
        timestamp: new Date(),
      });

      return {
        success: false,
        inconsistency,
        action: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * 修复状态不匹配
   */
  private async healStatusMismatch(
    inconsistency: StateInconsistency,
  ): Promise<string> {
    if (!inconsistency.deviceId) {
      throw new Error('Device ID is required');
    }

    const device = await this.deviceRepository.findOne({
      where: { id: inconsistency.deviceId },
    });

    if (!device) {
      throw new Error(`Device ${inconsistency.deviceId} not found`);
    }

    // 数据库说running，但容器已停止 -> 更新数据库状态
    device.status = DeviceStatus.STOPPED;
    await this.deviceRepository.save(device);

    return 'Updated database status to match container state';
  }

  /**
   * 修复容器丢失
   */
  private async healMissingContainer(
    inconsistency: StateInconsistency,
  ): Promise<string> {
    if (!inconsistency.deviceId) {
      throw new Error('Device ID is required');
    }

    const device = await this.deviceRepository.findOne({
      where: { id: inconsistency.deviceId },
    });

    if (!device) {
      throw new Error(`Device ${inconsistency.deviceId} not found`);
    }

    // 标记设备为错误状态，等待故障转移服务处理
    device.status = DeviceStatus.ERROR;
    device.metadata = {
      ...device.metadata,
      lastError: 'Container missing',
      lastErrorAt: new Date().toISOString(),
    };
    await this.deviceRepository.save(device);

    return 'Marked device as ERROR for failover service to handle';
  }

  /**
   * 修复孤儿容器
   */
  private async healOrphanedContainer(
    inconsistency: StateInconsistency,
  ): Promise<string> {
    if (!inconsistency.containerId) {
      throw new Error('Container ID is required');
    }

    // 删除孤儿容器
    await this.dockerService.removeContainer(inconsistency.containerId);

    return `Removed orphaned container ${inconsistency.containerId}`;
  }

  /**
   * 记录操作（用于回滚）
   */
  recordOperation(operation: Omit<OperationRecord, 'id' | 'timestamp'>): string {
    if (!this.config.recordOperations) {
      return '';
    }

    const record: OperationRecord = {
      id: this.generateOperationId(),
      ...operation,
      timestamp: new Date(),
      rolledBack: false,
    };

    this.operationHistory.push(record);

    // 限制历史记录数量
    if (this.operationHistory.length > this.config.maxOperationHistory) {
      this.operationHistory = this.operationHistory.slice(
        -this.config.maxOperationHistory,
      );
    }

    this.logger.log(
      `Recorded operation: ${record.operationType} on ${record.entityType} ${record.entityId}`,
    );

    return record.id;
  }

  /**
   * 回滚操作
   */
  async rollbackOperation(operationId: string): Promise<RollbackResult> {
    const operation = this.operationHistory.find((op) => op.id === operationId);

    if (!operation) {
      return {
        success: false,
        operationId,
        entityId: '',
        error: 'Operation not found',
        timestamp: new Date(),
      };
    }

    if (operation.rolledBack) {
      return {
        success: false,
        operationId,
        entityId: operation.entityId,
        error: 'Operation already rolled back',
        timestamp: new Date(),
      };
    }

    if (!operation.rollbackable) {
      return {
        success: false,
        operationId,
        entityId: operation.entityId,
        error: 'Operation is not rollbackable',
        timestamp: new Date(),
      };
    }

    this.logger.log(`Rolling back operation ${operationId}`);

    try {
      // 执行回滚（使用事务）
      await this.dataSource.transaction(async (manager) => {
        // 根据操作类型执行回滚
        switch (operation.entityType) {
          case 'device':
            await this.rollbackDeviceOperation(operation, manager);
            break;

          default:
            throw new Error(`Unknown entity type: ${operation.entityType}`);
        }
      });

      // 标记为已回滚
      operation.rolledBack = true;

      // 发布回滚成功事件
      this.eventBusService.publish('cloudphone.events', 'state.rollback_success', {
        operationId,
        operationType: operation.operationType,
        entityId: operation.entityId,
        timestamp: new Date(),
      });

      return {
        success: true,
        operationId,
        entityId: operation.entityId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Rollback failed: ${error.message}`);

      return {
        success: false,
        operationId,
        entityId: operation.entityId,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 回滚设备操作
   */
  private async rollbackDeviceOperation(
    operation: OperationRecord,
    manager: any,
  ): Promise<void> {
    const deviceRepo = manager.getRepository(Device);

    switch (operation.operationType) {
      case 'update':
        // 恢复到之前的状态
        await deviceRepo.update(
          { id: operation.entityId },
          operation.beforeState,
        );
        break;

      case 'delete':
        // 恢复已删除的设备
        const device = deviceRepo.create({
          id: operation.entityId,
          ...operation.beforeState,
        });
        await deviceRepo.save(device);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.operationType}`);
    }
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录不一致
   */
  private recordInconsistency(inconsistency: StateInconsistency): void {
    this.inconsistencyHistory.push(inconsistency);

    // 只保留最近 100 条
    if (this.inconsistencyHistory.length > 100) {
      this.inconsistencyHistory = this.inconsistencyHistory.slice(-100);
    }
  }

  /**
   * 按类型分组
   */
  private groupByType(
    inconsistencies: StateInconsistency[],
  ): Record<StateInconsistencyType, number> {
    const grouped: any = {};

    for (const inconsistency of inconsistencies) {
      grouped[inconsistency.type] = (grouped[inconsistency.type] || 0) + 1;
    }

    return grouped;
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(entityId?: string): OperationRecord[] {
    if (entityId) {
      return this.operationHistory.filter((op) => op.entityId === entityId);
    }
    return [...this.operationHistory];
  }

  /**
   * 获取不一致历史
   */
  getInconsistencyHistory(): StateInconsistency[] {
    return [...this.inconsistencyHistory];
  }

  /**
   * 获取配置
   */
  getConfig(): StateRecoveryConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<StateRecoveryConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log(`State recovery config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalInconsistencies: number;
    inconsistenciesByType: Record<StateInconsistencyType, number>;
    totalOperations: number;
    rollbackableOperations: number;
    rolledBackOperations: number;
    recentInconsistencies: number;
  } {
    const inconsistenciesByType = this.groupByType(this.inconsistencyHistory);

    const rollbackableOperations = this.operationHistory.filter(
      (op) => op.rollbackable,
    ).length;

    const rolledBackOperations = this.operationHistory.filter(
      (op) => op.rolledBack,
    ).length;

    // 最近1小时的不一致
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInconsistencies = this.inconsistencyHistory.filter(
      (inc) => inc.timestamp > oneHourAgo,
    ).length;

    return {
      totalInconsistencies: this.inconsistencyHistory.length,
      inconsistenciesByType: inconsistenciesByType as any,
      totalOperations: this.operationHistory.length,
      rollbackableOperations,
      rolledBackOperations,
      recentInconsistencies,
    };
  }
}
