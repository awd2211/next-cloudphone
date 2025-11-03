import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  SagaStatus,
  EventBusService,
} from '@cloudphone/shared';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DockerService } from '../docker/docker.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 设备删除 Saga 状态
 */
export interface DeviceDeletionSagaState {
  deviceId: string;
  userId: string;
  tenantId?: string;

  // Step 1: STOP_DEVICE
  device?: Device;
  containerStopped?: boolean;

  // Step 2: DELETE_PROVIDER
  providerDeleted?: boolean;
  providerType?: string;

  // Step 3: RELEASE_PROXY (如果有代理)
  proxyId?: string;
  proxyReleased?: boolean;

  // Step 4: RELEASE_PORTS
  adbPort?: number;
  portsReleased?: boolean;

  // Step 5: REPORT_QUOTA
  quotaReported?: boolean;

  // Step 6: DELETE_DATABASE
  databaseDeleted?: boolean;

  // Step 7: PUBLISH_EVENT
  eventPublished?: boolean;
}

/**
 * 设备删除 Saga
 *
 * 协调设备删除的多步骤流程，确保所有资源正确释放：
 * 1. 停止容器
 * 2. 从提供商删除设备
 * 3. 释放代理资源（如果有）
 * 4. 释放端口
 * 5. 向 user-service 报告配额释放
 * 6. 从数据库删除记录
 * 7. 发布 device.deleted 事件
 *
 * 补偿逻辑：
 * - 如果删除失败，尝试恢复已删除的资源
 * - 标记设备为 error 状态而非删除（保留审计记录）
 */
@Injectable()
export class DeviceDeletionSaga {
  private readonly logger = new Logger(DeviceDeletionSaga.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly dockerService: DockerService,
    private readonly portManager: PortManagerService,
    private readonly eventBus: EventBusService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 开始设备删除 Saga
   */
  async startDeletion(deviceId: string, userId: string): Promise<{ sagaId: string }> {
    this.logger.log(`Starting device deletion Saga for device ${deviceId}`);

    const initialState: DeviceDeletionSagaState = {
      deviceId,
      userId,
    };

    const sagaDefinition = this.createSagaDefinition();
    const sagaId = await this.sagaOrchestrator.executeSaga(sagaDefinition, initialState);

    return { sagaId };
  }

  /**
   * 查询 Saga 状态
   */
  async getSagaStatus(sagaId: string) {
    return await this.sagaOrchestrator.getSagaState(sagaId);
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<DeviceDeletionSagaState> {
    return {
      type: SagaType.DEVICE_DELETION,
      timeoutMs: 5 * 60 * 1000, // 5 分钟超时
      maxRetries: 3,
      steps: [
        {
          name: 'STOP_DEVICE',
          execute: this.stopDevice.bind(this),
          compensate: this.compensateStopDevice.bind(this),
        },
        {
          name: 'DELETE_PROVIDER',
          execute: this.deleteFromProvider.bind(this),
          compensate: this.compensateDeleteProvider.bind(this),
        },
        {
          name: 'RELEASE_PROXY',
          execute: this.releaseProxy.bind(this),
          compensate: this.compensateReleaseProxy.bind(this),
        },
        {
          name: 'RELEASE_PORTS',
          execute: this.releasePorts.bind(this),
          compensate: this.compensateReleasePorts.bind(this),
        },
        {
          name: 'REPORT_QUOTA',
          execute: this.reportQuota.bind(this),
          compensate: this.compensateReportQuota.bind(this),
        },
        {
          name: 'DELETE_DATABASE',
          execute: this.deleteFromDatabase.bind(this),
          compensate: this.compensateDeleteDatabase.bind(this),
        },
        {
          name: 'PUBLISH_EVENT',
          execute: this.publishDeletedEvent.bind(this),
          compensate: this.compensatePublishEvent.bind(this),
        },
      ],
    };
  }

  // ==================== Step 1: STOP_DEVICE ====================

  private async stopDevice(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[STOP_DEVICE] Stopping device ${state.deviceId}`);

    const device = await this.deviceRepository.findOne({
      where: { id: state.deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${state.deviceId} not found`);
    }

    // 如果设备有容器且正在运行，停止容器
    if (device.containerId) {
      try {
        await this.dockerService.stopContainer(device.containerId);
        this.logger.log(`[STOP_DEVICE] Stopped container ${device.containerId}`);
      } catch (error) {
        this.logger.warn(`[STOP_DEVICE] Failed to stop container: ${error.message}`);
        // 继续执行，容器可能已经停止
      }
    }

    return {
      device,
      containerStopped: true,
      providerType: device.providerType,
      adbPort: device.adbPort ?? undefined,
      tenantId: device.tenantId ?? undefined,
    };
  }

  private async compensateStopDevice(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_STOP_DEVICE] Restoring device ${state.deviceId} status`);

    // 将设备标记为 error 状态而非恢复运行
    if (state.device) {
      await this.deviceRepository.update(state.deviceId, {
        status: DeviceStatus.ERROR,
      });
    }
  }

  // ==================== Step 2: DELETE_PROVIDER ====================

  private async deleteFromProvider(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[DELETE_PROVIDER] Deleting device from provider: ${state.providerType}`);

    if (!state.device?.containerId) {
      this.logger.log(`[DELETE_PROVIDER] No container to delete`);
      return { providerDeleted: true };
    }

    try {
      // 删除 Docker 容器
      await this.dockerService.removeContainer(state.device.containerId);
      this.logger.log(`[DELETE_PROVIDER] Removed container ${state.device.containerId}`);
    } catch (error) {
      this.logger.warn(`[DELETE_PROVIDER] Failed to remove container: ${error.message}`);
      // 继续执行，容器可能已经被删除
    }

    return { providerDeleted: true };
  }

  private async compensateDeleteProvider(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_DELETE_PROVIDER] Cannot restore container, marking device as error`);

    // 无法恢复已删除的容器，只能标记设备状态
    if (state.device) {
      await this.deviceRepository.update(state.deviceId, {
        status: DeviceStatus.ERROR,
      });
    }
  }

  // ==================== Step 3: RELEASE_PROXY ====================

  private async releaseProxy(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[RELEASE_PROXY] Releasing proxy for device ${state.deviceId}`);

    // 检查设备是否使用了代理
    const proxyId = state.device?.proxyId;
    if (!proxyId) {
      this.logger.log(`[RELEASE_PROXY] Device has no proxy assigned`);
      return { proxyReleased: true };
    }

    try {
      // 调用 proxy-service 释放代理
      const proxyServiceUrl = process.env.PROXY_SERVICE_URL || 'http://localhost:30007';
      await firstValueFrom(
        this.httpService.delete(`${proxyServiceUrl}/api/proxy/release/${proxyId}`, {
          timeout: 5000,
        })
      );
      this.logger.log(`[RELEASE_PROXY] Released proxy ${proxyId}`);
    } catch (error) {
      this.logger.warn(`[RELEASE_PROXY] Failed to release proxy: ${error.message}`);
      // 继续执行，代理服务可能已经释放或不存在
    }

    return { proxyId, proxyReleased: true };
  }

  private async compensateReleaseProxy(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_RELEASE_PROXY] Cannot restore proxy ${state.proxyId}`);
    // 代理已释放无法恢复，记录即可
  }

  // ==================== Step 4: RELEASE_PORTS ====================

  private async releasePorts(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[RELEASE_PORTS] Releasing port ${state.adbPort} for device ${state.deviceId}`);

    if (!state.adbPort) {
      this.logger.log(`[RELEASE_PORTS] No port to release`);
      return { portsReleased: true };
    }

    try {
      await this.portManager.releasePorts({ adbPort: state.adbPort });
      this.logger.log(`[RELEASE_PORTS] Released port ${state.adbPort}`);
    } catch (error) {
      this.logger.warn(`[RELEASE_PORTS] Failed to release port: ${error.message}`);
      // 继续执行，端口管理器可能已经释放
    }

    return { portsReleased: true };
  }

  private async compensateReleasePorts(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_RELEASE_PORTS] Cannot restore port ${state.adbPort}`);
    // 端口已释放无法恢复
  }

  // ==================== Step 5: REPORT_QUOTA ====================

  private async reportQuota(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[REPORT_QUOTA] Reporting quota release for user ${state.userId}`);

    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
      await firstValueFrom(
        this.httpService.post(
          `${userServiceUrl}/quotas/user/${state.userId}/usage`,
          {
            deviceId: state.deviceId,
            action: 'delete',
            usageData: {
              cpuCores: state.device?.cpuCores || 0,
              memoryMB: state.device?.memoryMB || 0,
            },
          },
          { timeout: 5000 }
        )
      );
      this.logger.log(`[REPORT_QUOTA] Quota reported successfully`);
    } catch (error) {
      this.logger.error(`[REPORT_QUOTA] Failed to report quota: ${error.message}`);
      throw error; // 这一步失败需要重试
    }

    return { quotaReported: true };
  }

  private async compensateReportQuota(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_REPORT_QUOTA] Restoring quota for user ${state.userId}`);

    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
      await firstValueFrom(
        this.httpService.post(
          `${userServiceUrl}/quotas/user/${state.userId}/usage`,
          {
            deviceId: state.deviceId,
            action: 'create', // 恢复配额（相当于重新创建）
            usageData: {
              cpuCores: state.device?.cpuCores || 0,
              memoryMB: state.device?.memoryMB || 0,
            },
          },
          { timeout: 5000 }
        )
      );
      this.logger.log(`[COMPENSATE_REPORT_QUOTA] Quota restored`);
    } catch (error) {
      this.logger.error(`[COMPENSATE_REPORT_QUOTA] Failed to restore quota: ${error.message}`);
      // 继续补偿其他步骤
    }
  }

  // ==================== Step 6: DELETE_DATABASE ====================

  private async deleteFromDatabase(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[DELETE_DATABASE] Deleting device ${state.deviceId} from database`);

    await this.deviceRepository.delete(state.deviceId);
    this.logger.log(`[DELETE_DATABASE] Device deleted from database`);

    return { databaseDeleted: true };
  }

  private async compensateDeleteDatabase(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_DELETE_DATABASE] Restoring device ${state.deviceId} to database`);

    if (state.device) {
      try {
        // 尝试恢复设备记录（标记为 error 状态）
        await this.deviceRepository.save({
          ...state.device,
          status: DeviceStatus.ERROR,
        });
        this.logger.log(`[COMPENSATE_DELETE_DATABASE] Device record restored`);
      } catch (error) {
        this.logger.error(`[COMPENSATE_DELETE_DATABASE] Failed to restore device: ${error.message}`);
      }
    }
  }

  // ==================== Step 7: PUBLISH_EVENT ====================

  private async publishDeletedEvent(state: DeviceDeletionSagaState): Promise<Partial<DeviceDeletionSagaState>> {
    this.logger.log(`[PUBLISH_EVENT] Publishing device.deleted event`);

    await this.eventBus.publishDeviceEvent('deleted', {
      deviceId: state.deviceId,
      userId: state.userId,
      tenantId: state.tenantId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[PUBLISH_EVENT] Event published successfully`);
    return { eventPublished: true };
  }

  private async compensatePublishEvent(state: DeviceDeletionSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_PUBLISH_EVENT] Cannot compensate event publishing`);
    // 无法撤销已发布的事件，但可以发布补偿事件
    try {
      await this.eventBus.publishDeviceEvent('deletion_failed', {
        deviceId: state.deviceId,
        userId: state.userId,
        tenantId: state.tenantId,
        reason: 'Saga compensation triggered',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`[COMPENSATE_PUBLISH_EVENT] Failed to publish compensation event: ${error.message}`);
    }
  }
}
