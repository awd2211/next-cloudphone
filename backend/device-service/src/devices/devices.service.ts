import { Injectable, Logger, Optional, HttpStatus, Inject, BadRequestException } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource, FindOptionsWhere } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ModuleRef } from "@nestjs/core";
import {
  Device,
  DeviceStatus,
  DeviceProviderType,
} from "../entities/device.entity";
import { DockerService, RedroidConfig } from "../docker/docker.service";
import { AdbService } from "../adb/adb.service";
import { PortManagerService } from "../port-manager/port-manager.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import {
  EventBusService,
  EventOutboxService,
  BusinessErrors,
  BusinessException,
  BusinessErrorCode,
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  SagaStep,
  CursorPagination,
  CursorPaginationDto,
  CursorPaginatedResponse,
} from "@cloudphone/shared";
import { QuotaClientService } from "../quota/quota-client.service";
import { CacheService } from "../cache/cache.service";
import { CacheKeys, CacheTTL } from "../cache/cache-keys";
import { DeviceProviderFactory } from "../providers/device-provider.factory";
import {
  DeviceCreateConfig,
  DeviceProviderStatus,
  DeviceMetrics,
} from "../providers/provider.types";
import { IDeviceProvider } from "../providers/device-provider.interface";
import { ScrcpyVideoCodec } from "../scrcpy/scrcpy.types";

/**
 * 设备创建 Saga State 接口
 */
interface DeviceCreationSagaState {
  userId: string;
  name: string;
  providerType: DeviceProviderType;
  cpuCores?: number;
  memoryMB?: number;
  diskSizeGB?: number;
  allocatedAdbPort?: number;
  allocatedScrcpyPort?: number;
  externalId?: string;
  containerId?: string;
  providerDeviceId?: string;
  deviceId?: string;
  device?: Device;
  // Step 1 specific
  portsAllocated?: boolean;
  ports?: { adbPort: number; scrcpyPort: number; webrtcPort?: number };
  // Step 2 specific
  providerDevice?: {
    id: string;
    connectionInfo?: {
      adb?: { port?: number; host?: string };
    };
    [key: string]: unknown;
  };
  // Step 4 specific
  quotaReported?: boolean;
  // Step 5 specific
  deviceStarted?: boolean;
  // DTO for internal use
  createDeviceDto?: CreateDeviceDto;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private providerFactory: DeviceProviderFactory, // ✅ Provider 工厂
    private dockerService: DockerService,
    private adbService: AdbService,
    private portManager: PortManagerService,
    private configService: ConfigService,
    @Optional() private eventBus: EventBusService,
    @Optional() private eventOutboxService: EventOutboxService, // ✅ Transactional Outbox
    @Optional() private quotaClient: QuotaClientService,
    private cacheService: CacheService,
    private moduleRef: ModuleRef, // ✅ 用于延迟获取服务
    private sagaOrchestrator: SagaOrchestratorService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  // ✅ 延迟获取 DevicePoolService 和 ScrcpyService (避免循环依赖)
  private async getDevicePoolService() {
    const { DevicePoolService } = await import('../providers/physical/device-pool.service');
    return this.moduleRef.get(DevicePoolService, { strict: false });
  }

  private async getScrcpyService() {
    const { ScrcpyService } = await import('../scrcpy/scrcpy.service');
    return this.moduleRef.get(ScrcpyService, { strict: false });
  }

  /**
   * ✅ 创建设备（使用 Saga 模式保证原子性）
   *
   * 流程：
   * 1. ALLOCATE_PORTS - 分配端口（仅 Redroid）
   * 2. CREATE_PROVIDER_DEVICE - 调用 Provider 创建设备
   * 3. CREATE_DATABASE_RECORD - 创建数据库记录
   * 4. REPORT_QUOTA_USAGE - 上报配额使用
   * 5. START_DEVICE - 启动设备
   */
  async create(createDeviceDto: CreateDeviceDto): Promise<{ sagaId: string; device: Device }> {
    // ✅ 验证 userId 必须存在
    if (!createDeviceDto.userId) {
      throw new BadRequestException('userId is required for device creation');
    }

    this.logger.log(`Creating device for user ${createDeviceDto.userId}`);

    // 确定 Provider 类型（默认 Redroid）
    const providerType = createDeviceDto.providerType || DeviceProviderType.REDROID;
    const provider = this.providerFactory.getProvider(providerType);

    this.logger.debug(`Using provider: ${providerType}`);

    // 定义设备创建 Saga
    const deviceCreationSaga: SagaDefinition<DeviceCreationSagaState> = {
      type: SagaType.DEVICE_CREATION,
      timeoutMs: 600000, // 10 分钟超时
      maxRetries: 3,
      steps: [
        // ========== Step 1: 分配端口（仅 Redroid） ==========
        {
          name: 'ALLOCATE_PORTS',
          execute: async (state: DeviceCreationSagaState) => {
            if (providerType !== DeviceProviderType.REDROID) {
              this.logger.debug(`Skipping port allocation for ${providerType}`);
              return { portsAllocated: false, ports: null };
            }

            this.logger.log(`[SAGA] Step 1: Allocating ports for Redroid device`);

            const ports = await this.portManager.allocatePorts();

            this.logger.log(
              `[SAGA] Ports allocated: ADB=${ports.adbPort}, WebRTC=${ports.webrtcPort}`,
            );

            return { portsAllocated: true, ports };
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.portsAllocated || !state.ports) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Releasing allocated ports`);

            try {
              this.portManager.releasePorts(state.ports);
              this.logger.log(`[SAGA] Ports released: ADB=${state.ports.adbPort}`);
            } catch (error) {
              this.logger.error(`[SAGA] Failed to release ports`, error.stack);
            }
          },
        } as SagaStep,

        // ========== Step 2: 调用 Provider 创建设备 ==========
        {
          name: 'CREATE_PROVIDER_DEVICE',
          execute: async (state: DeviceCreationSagaState) => {
            this.logger.log(`[SAGA] Step 2: Creating device via ${providerType} provider`);

            const providerConfig: DeviceCreateConfig = {
              name: `cloudphone-${createDeviceDto.name}`,
              userId: createDeviceDto.userId!,  // ✅ Guaranteed by validation
              cpuCores: createDeviceDto.cpuCores || 2,
              memoryMB: createDeviceDto.memoryMB || 4096,
              storageMB: createDeviceDto.storageMB || 10240,
              resolution: createDeviceDto.resolution || "1920x1080",
              dpi: createDeviceDto.dpi || 240,
              androidVersion: createDeviceDto.androidVersion || "11",
              deviceType: createDeviceDto.type === "tablet" ? "tablet" : "phone",
              // Redroid 特定配置
              adbPort: state.ports?.adbPort,
              enableGpu: this.configService.get("REDROID_ENABLE_GPU", "false") === "true",
              enableAudio: this.configService.get("REDROID_ENABLE_AUDIO", "false") === "true",
              // Provider 特定配置
              providerSpecificConfig: createDeviceDto.providerSpecificConfig,
            };

            const providerDevice = await provider.create(providerConfig);

            this.logger.log(
              `[SAGA] Provider device created: ${providerDevice.id} (status: ${providerDevice.status})`,
            );

            return { providerDevice };
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.providerDevice) {
              return;
            }

            this.logger.warn(
              `[SAGA] Compensate: Destroying provider device ${state.providerDevice.id}`,
            );

            try {
              // 物理设备：释放回池
              if (providerType === DeviceProviderType.PHYSICAL) {
                const poolService = await this.getDevicePoolService();
                await poolService.releaseDevice(state.providerDevice.id);
                this.logger.log(`[SAGA] Released physical device back to pool`);
              }
              // 其他设备：调用 Provider 销毁
              else {
                await provider.destroy(state.providerDevice.id);
                this.logger.log(`[SAGA] Provider device destroyed`);
              }
            } catch (error) {
              this.logger.error(
                `[SAGA] Failed to destroy provider device ${state.providerDevice.id}`,
                error.stack,
              );
            }
          },
        } as SagaStep,

        // ========== Step 3: 创建数据库记录 ==========
        {
          name: 'CREATE_DATABASE_RECORD',
          execute: async (state: DeviceCreationSagaState) => {
            this.logger.log(`[SAGA] Step 3: Creating database record`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const deviceRepository = queryRunner.manager.getRepository(Device);

              const device = deviceRepository.create({
                ...createDeviceDto,
                providerType,
                externalId: state.providerDevice!.id,
                connectionInfo: state.providerDevice!.connectionInfo as Record<string, unknown>,
                providerConfig: (state.providerDevice as Record<string, unknown>).providerConfig as Record<string, unknown>,
                status: DeviceStatus.CREATING, // 初始状态 CREATING
                // Redroid 兼容字段
                containerId:
                  providerType === DeviceProviderType.REDROID
                    ? state.providerDevice!.id
                    : null,
                containerName:
                  providerType === DeviceProviderType.REDROID
                    ? (state.providerDevice as Record<string, unknown>).name as string
                    : null,
                adbPort: state.providerDevice!.connectionInfo?.adb?.port || null,
                adbHost: state.providerDevice!.connectionInfo?.adb?.host || null,
                metadata: {
                  ...createDeviceDto.metadata,
                  webrtcPort: state.ports?.webrtcPort,
                  createdBy: "system",
                },
              });

              const savedDevice = await deviceRepository.save(device);

              // ✅ 在同一事务内写入事件到 Outbox
              if (this.eventOutboxService) {
                await this.eventOutboxService.writeEvent(
                  queryRunner,
                  'device',
                  savedDevice.id,
                  'device.created',
                  {
                    deviceId: savedDevice.id,
                    userId: savedDevice.userId,
                    deviceName: savedDevice.name,
                    status: savedDevice.status,
                    tenantId: savedDevice.tenantId,
                    providerType: savedDevice.providerType,
                    sagaId,
                    timestamp: new Date().toISOString(),
                  },
                );
                this.logger.debug(`[SAGA] Event written to outbox: device.created`);
              }

              await queryRunner.commitTransaction();

              this.logger.log(`[SAGA] Database record created: ${savedDevice.id}`);

              return { deviceId: savedDevice.id as string };
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            } finally {
              await queryRunner.release();
            }
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.deviceId) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Deleting database record ${state.deviceId}`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              await queryRunner.manager.delete(Device, { id: state.deviceId });
              await queryRunner.commitTransaction();

              this.logger.log(`[SAGA] Database record deleted`);

              // 清除缓存
              await this.cacheService.del(CacheKeys.device(state.deviceId));
            } catch (error) {
              await queryRunner.rollbackTransaction();
              this.logger.error(
                `[SAGA] Failed to delete database record ${state.deviceId}`,
                error.stack,
              );
            } finally {
              await queryRunner.release();
            }
          },
        } as SagaStep,

        // ========== Step 4: 上报配额使用 ==========
        {
          name: 'REPORT_QUOTA_USAGE',
          execute: async (state: DeviceCreationSagaState) => {
            if (!this.quotaClient || !createDeviceDto.userId) {
              this.logger.debug(`[SAGA] Skipping quota reporting (no quota client or userId)`);
              return { quotaReported: false };
            }

            this.logger.log(`[SAGA] Step 4: Reporting quota usage`);

            await this.quotaClient.reportDeviceUsage(createDeviceDto.userId!, {  // ✅ Guaranteed by validation
              deviceId: state.deviceId!,  // ✅ Guaranteed by step 3
              cpuCores: createDeviceDto.cpuCores || 2,
              memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
              storageGB: (createDeviceDto.storageMB || 10240) / 1024,
              operation: "increment",
            });

            this.logger.log(`[SAGA] Quota usage reported`);

            return { quotaReported: true };
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.quotaReported || !this.quotaClient || !createDeviceDto.userId) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Rolling back quota usage`);

            try {
              await this.quotaClient.reportDeviceUsage(createDeviceDto.userId!, {  // ✅ Guaranteed by validation
                deviceId: state.deviceId!,  // ✅ Should exist if we're compensating
                cpuCores: createDeviceDto.cpuCores || 2,
                memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
                storageGB: (createDeviceDto.storageMB || 10240) / 1024,
                operation: "decrement",
              });

              this.logger.log(`[SAGA] Quota usage rolled back`);
            } catch (error) {
              this.logger.error(`[SAGA] Failed to rollback quota usage`, error.stack);
            }
          },
        } as SagaStep,

        // ========== Step 5: 启动设备 ==========
        {
          name: 'START_DEVICE',
          execute: async (state: DeviceCreationSagaState) => {
            this.logger.log(`[SAGA] Step 5: Starting device ${state.deviceId}`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const deviceRepository = queryRunner.manager.getRepository(Device);
              const device = await deviceRepository.findOne({ where: { id: state.deviceId } });

              if (!device) {
                throw new Error(`Device ${state.deviceId} not found`);
              }

              // 启动设备逻辑（异步执行）
              if (providerType === DeviceProviderType.REDROID) {
                // Redroid: 异步启动容器
                this.startDeviceAsync(device, provider).catch(async (error) => {
                  this.logger.error(
                    `Failed to start device ${device.id}`,
                    error.stack,
                  );
                  await this.updateDeviceStatus(device.id, DeviceStatus.ERROR);
                });
              } else if (providerType === DeviceProviderType.PHYSICAL) {
                // 物理设备: 启动 SCRCPY 会话
                this.startPhysicalDeviceAsync(device).catch(async (error) => {
                  this.logger.error(
                    `Failed to start SCRCPY for physical device ${device.id}`,
                    error.stack,
                  );
                  await this.updateDeviceStatus(device.id, DeviceStatus.ERROR);
                });
              }

              await queryRunner.commitTransaction();

              this.logger.log(`[SAGA] Device ${state.deviceId} start initiated`);

              return { deviceStarted: true };
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            } finally {
              await queryRunner.release();
            }
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.deviceStarted || !state.deviceId) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Stopping device ${state.deviceId}`);

            try {
              // 尝试停止设备
              const device = await this.devicesRepository.findOne({
                where: { id: state.deviceId },
              });

              if (device && device.externalId) {
                // 物理设备：停止 SCRCPY 会话
                if (providerType === DeviceProviderType.PHYSICAL) {
                  const scrcpyService = await this.getScrcpyService();
                  await scrcpyService.stopSession(device.id);
                }

                // 调用 Provider 停止设备
                await provider.stop(device.externalId);

                this.logger.log(`[SAGA] Device stopped`);
              }

              // 更新设备状态为 STOPPED
              await this.devicesRepository.update(state.deviceId, {
                status: DeviceStatus.STOPPED,
              });
            } catch (error) {
              this.logger.error(
                `[SAGA] Failed to stop device ${state.deviceId}`,
                error.stack,
              );
            }
          },
        } as SagaStep,
      ],
    };

    // 执行 Saga
    const sagaId = await this.sagaOrchestrator.executeSaga(deviceCreationSaga, {
      userId: createDeviceDto.userId,
      name: createDeviceDto.name,
      providerType,
      createDeviceDto,
    });

    this.logger.log(`Device creation Saga initiated: ${sagaId}`);

    // 等待数据库记录创建完成（Step 3）
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 查询创建的设备（可能还在 CREATING 状态）
    let device: Device | null = null;

    try {
      // 尝试通过 externalId 查找（因为 deviceId 在 state 中）
      device = await this.devicesRepository.findOne({
        where: {
          userId: createDeviceDto.userId,
          name: createDeviceDto.name,
          status: DeviceStatus.CREATING,
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.warn(`Failed to find newly created device`, error.message);
    }

    if (!device) {
      this.logger.warn(`Device not found immediately after Saga initiation, returning placeholder`);

      // 返回一个占位符设备对象
      device = {
        id: 'pending',
        name: createDeviceDto.name,
        status: DeviceStatus.CREATING,
        userId: createDeviceDto.userId,
        tenantId: createDeviceDto.tenantId,
        providerType,
      } as Partial<Device> as Device;
    }

    // ✅ 事件已在 Saga Step 3 中通过 Outbox 发布（在数据库事务内）
    // 不再需要 setImmediate 异步发布，避免事件丢失风险

    return { sagaId, device };
  }

  /**
   * 异步启动设备（用于 Redroid）
   */
  private async startDeviceAsync(device: Device, provider: IDeviceProvider): Promise<void> {
    try {
      this.logger.log(`Starting device ${device.id}`);

      // 调用 Provider 启动设备
      if (!device.externalId) {
        throw new BusinessException(
          BusinessErrorCode.DEVICE_START_FAILED,
          `Device ${device.id} has no externalId`,
        );
      }
      await provider.start(device.externalId);

      // 等待 ADB 连接
      if (device.adbHost && device.adbPort) {
        await this.adbService.connectToDevice(
          device.id,
          device.adbHost,
          device.adbPort,
        );

        // 等待 Android 启动
        await this.waitForAndroidBoot(device.id, 60);

        // 初始化设备
        await this.initializeDevice(device.id);
      }

      // 更新状态为运行中
      device.status = DeviceStatus.RUNNING;
      device.lastActiveAt = new Date();
      await this.devicesRepository.save(device);

      this.logger.log(`Device ${device.id} started successfully`);
    } catch (error) {
      this.logger.error(`Failed to start device ${device.id}`, error.stack);
      throw error;
    }
  }

  /**
   * ✅ 异步启动物理设备（启动 SCRCPY 会话）
   */
  private async startPhysicalDeviceAsync(device: Device): Promise<void> {
    try {
      this.logger.log(`Starting physical device ${device.id} (${device.externalId})`);

      // 1. 建立 ADB 连接
      if (device.adbHost && device.adbPort) {
        await this.adbService.connectToDevice(
          device.id,
          device.adbHost,
          device.adbPort,
        );
        this.logger.debug(`ADB connected to ${device.adbHost}:${device.adbPort}`);
      }

      // 2. 启动 SCRCPY 会话
      const scrcpyService = await this.getScrcpyService();
      const serial = `${device.adbHost}:${device.adbPort}`;
      const session = await scrcpyService.startSession(device.id, serial, {
        videoBitRate: 8_000_000, // 8 Mbps
        videoCodec: ScrcpyVideoCodec.H264,
        maxSize: 1920,
        maxFps: 60,
      });

      this.logger.log(`SCRCPY session started: ${session.sessionId}`);

      // 3. 更新 connectionInfo 包含 SCRCPY 信息
      device.connectionInfo = {
        ...device.connectionInfo,
        scrcpy: {
          sessionId: session.sessionId,
          videoUrl: session.videoUrl,
          audioUrl: session.audioUrl,
          controlUrl: session.controlUrl,
        }
      };

      // 4. 更新状态为运行中
      device.status = DeviceStatus.RUNNING;
      device.lastActiveAt = new Date();
      await this.devicesRepository.save(device);

      this.logger.log(`Physical device ${device.id} started successfully with SCRCPY`);
    } catch (error) {
      this.logger.error(`Failed to start physical device ${device.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 映射 Provider 状态到 Device 状态
   */
  private mapProviderStatusToDeviceStatus(
    providerStatus: DeviceProviderStatus,
  ): DeviceStatus {
    switch (providerStatus) {
      case DeviceProviderStatus.CREATING:
        return DeviceStatus.CREATING;
      case DeviceProviderStatus.RUNNING:
        return DeviceStatus.RUNNING;
      case DeviceProviderStatus.STOPPED:
        return DeviceStatus.STOPPED;
      case DeviceProviderStatus.ERROR:
        return DeviceStatus.ERROR;
      case DeviceProviderStatus.ALLOCATED:
        return DeviceStatus.ALLOCATED;
      case DeviceProviderStatus.AVAILABLE:
        return DeviceStatus.IDLE;
      default:
        return DeviceStatus.CREATING;
    }
  }

  /**
   * 创建 Redroid 容器（优化版）
   */
  private async createRedroidContainer(device: Device): Promise<void> {
    try {
      this.logger.log(`Creating Redroid container for device ${device.id}`);

      // ✅ 验证 adbPort 存在（Redroid 设备必需）
      if (!device.adbPort) {
        throw new BusinessException(
          BusinessErrorCode.DEVICE_START_FAILED,
          `Redroid device ${device.id} has no adbPort assigned`,
        );
      }

      // 构建 Redroid 配置
      const redroidConfig: RedroidConfig = {
        name: `cloudphone-${device.id}`,
        cpuCores: device.cpuCores,
        memoryMB: device.memoryMB,
        storageMB: device.storageMB,
        resolution: device.resolution,
        dpi: device.dpi,
        adbPort: device.adbPort,
        webrtcPort: device.metadata?.webrtcPort,
        androidVersion: device.androidVersion,
        enableGpu:
          this.configService.get("REDROID_ENABLE_GPU", "false") === "true",
        enableAudio:
          this.configService.get("REDROID_ENABLE_AUDIO", "false") === "true",
      };

      // 创建容器
      const container = await this.dockerService.createContainer(redroidConfig);

      // 更新设备信息
      device.containerId = container.id;
      device.containerName = redroidConfig.name;
      device.imageTag = this.getRedroidImageTag(device.androidVersion);

      // 等待容器就绪
      await this.waitForContainerReady(container.id, 120); // 最多等待120秒

      // 建立 ADB 连接
      this.logger.log(`Connecting to device ${device.id} via ADB`);

      // ✅ 验证 ADB 连接信息存在
      if (!device.adbHost || !device.adbPort) {
        throw new BusinessException(
          BusinessErrorCode.DEVICE_START_FAILED,
          `Device ${device.id} missing ADB connection info (host: ${device.adbHost}, port: ${device.adbPort})`,
        );
      }

      await this.adbService.connectToDevice(
        device.id,
        device.adbHost,
        device.adbPort,
      );

      // 等待 Android 启动完成
      await this.waitForAndroidBoot(device.id, 60); // 最多等待60秒

      // 初始化设备设置
      await this.initializeDevice(device.id);

      // 更新状态为运行中
      device.status = DeviceStatus.RUNNING;
      device.lastActiveAt = new Date();

      await this.devicesRepository.save(device);
      this.logger.log(`Device ${device.id} created successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to create Redroid container for device ${device.id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 等待容器就绪
   */
  private async waitForContainerReady(
    containerId: string,
    maxWaitSeconds: number,
  ): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const info = await this.dockerService.getContainerInfo(containerId);

        if (info.State.Running) {
          this.logger.debug(`Container ${containerId} is running`);
          return;
        }
      } catch (error) {
        this.logger.warn(`Error checking container status: ${error.message}`);
      }

      // 等待2秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(
      `Container ${containerId} failed to start within ${maxWaitSeconds}s`,
    );
  }

  /**
   * 等待 Android 启动完成
   */
  private async waitForAndroidBoot(
    deviceId: string,
    maxWaitSeconds: number,
  ): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const output = await this.adbService.executeShellCommand(
          deviceId,
          "getprop sys.boot_completed",
          3000,
        );

        if (output.trim() === "1") {
          this.logger.debug(`Android boot completed for device ${deviceId}`);
          return;
        }
      } catch (error) {
        // ADB 可能还未就绪，继续等待
      }

      // 等待3秒后重试
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error(
      `Android failed to boot within ${maxWaitSeconds}s for device ${deviceId}`,
    );
  }

  /**
   * 初始化设备设置
   */
  private async initializeDevice(deviceId: string): Promise<void> {
    try {
      this.logger.log(`Initializing device ${deviceId}`);

      // 设置设备属性
      const commands = [
        // 禁用屏幕休眠
        "settings put system screen_off_timeout 2147483647",

        // 禁用屏幕锁定
        "settings put secure lockscreen.disabled 1",

        // 设置默认输入法（如果需要）
        // 'ime set com.android.adbkeyboard/.AdbIME',

        // 禁用系统更新
        "pm disable com.android.vending",
      ];

      for (const command of commands) {
        try {
          await this.adbService.executeShellCommand(deviceId, command, 5000);
          this.logger.debug(`Executed: ${command}`);
        } catch (error) {
          this.logger.warn(`Failed to execute: ${command}`, error.message);
        }
      }

      this.logger.log(`Device ${deviceId} initialized`);
    } catch (error) {
      this.logger.error(`Failed to initialize device ${deviceId}`, error.stack);
      // 初始化失败不影响设备创建
    }
  }

  /**
   * 获取 Redroid 镜像标签
   */
  private getRedroidImageTag(androidVersion?: string): string {
    const version = androidVersion || "11";
    const imageMap: Record<string, string> = {
      "11": "redroid/redroid:11.0.0-latest",
      "12": "redroid/redroid:12.0.0-latest",
      "13": "redroid/redroid:13.0.0-latest",
    };
    return imageMap[version] || imageMap["11"];
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    // 生成缓存键
    let cacheKey: string | undefined;
    if (userId) {
      cacheKey = CacheKeys.deviceList(userId, status, page, limit);
    } else if (tenantId) {
      cacheKey = CacheKeys.tenantDeviceList(tenantId, status, page, limit);
    } else {
      // 全局列表不缓存（管理员查询）
      cacheKey = undefined;
    }

    // 如果有缓存键，使用缓存
    if (cacheKey) {
      return this.cacheService.wrap(
        cacheKey,
        async () => this.queryDeviceList(page, limit, userId, tenantId, status),
        CacheTTL.DEVICE_LIST, // 1 分钟 TTL
      );
    }

    // 无缓存键，直接查询
    return this.queryDeviceList(page, limit, userId, tenantId, status);
  }

  // 提取查询逻辑为私有方法
  private async queryDeviceList(
    page: number,
    limit: number,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Device> = {};
    if (userId) where.userId = userId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [data, total] = await this.devicesRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return { data, total, page, limit };
  }

  /**
   * Cursor-based pagination for efficient large dataset queries
   *
   * @param dto - Cursor pagination parameters
   * @param userId - Optional user ID filter
   * @param tenantId - Optional tenant ID filter
   * @param status - Optional device status filter
   * @returns Cursor paginated response with next cursor
   *
   * @example
   * ```typescript
   * // First page
   * const page1 = await service.findAllCursor({ limit: 20 });
   *
   * // Next page
   * const page2 = await service.findAllCursor({
   *   cursor: page1.nextCursor,
   *   limit: 20
   * });
   * ```
   */
  async findAllCursor(
    dto: CursorPaginationDto,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
  ): Promise<CursorPaginatedResponse<Device>> {
    const { cursor, limit = 20 } = dto;

    const qb = this.devicesRepository.createQueryBuilder('device');

    // Apply filters
    if (userId) {
      qb.andWhere('device.userId = :userId', { userId });
    }
    if (tenantId) {
      qb.andWhere('device.tenantId = :tenantId', { tenantId });
    }
    if (status) {
      qb.andWhere('device.status = :status', { status });
    }

    // Apply cursor condition if provided
    if (cursor) {
      const cursorCondition = CursorPagination.applyCursorCondition(cursor, 'device');
      if (cursorCondition) {
        qb.andWhere(cursorCondition.condition, cursorCondition.parameters);
      }
    }

    // Order by createdAt DESC and fetch limit + 1 to check if there's more
    qb.orderBy('device.createdAt', 'DESC')
      .limit(limit + 1);

    const devices = await qb.getMany();

    // Use CursorPagination utility to paginate results
    return CursorPagination.paginate(devices, limit);
  }

  async findOne(id: string): Promise<Device> {
    // 使用缓存包装器：先查缓存，未命中则查数据库并缓存
    return this.cacheService.wrap(
      CacheKeys.device(id),
      async () => {
        const device = await this.devicesRepository.findOne({ where: { id } });

        if (!device) {
          throw BusinessErrors.deviceNotFound(id);
        }

        return device;
      },
      CacheTTL.DEVICE, // 5 分钟 TTL
    );
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);

    Object.assign(device, updateDeviceDto);
    const updatedDevice = await this.devicesRepository.save(device);

    // 清除缓存
    await this.invalidateDeviceCache(device);

    return updatedDevice;
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);

    this.logger.log(`Removing device ${id} (Provider: ${device.providerType})`);

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // 上报用量减少到配额系统
    if (this.quotaClient && device.userId) {
      await this.quotaClient
        .reportDeviceUsage(device.userId, {
          deviceId: device.id,
          cpuCores: device.cpuCores,
          memoryGB: device.memoryMB / 1024,
          storageGB: device.storageMB / 1024,
          operation: "decrement",
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to report usage decrease for device ${id}`,
            error.message,
          );
        });
    }

    // 断开 ADB 连接（如果有）
    if (device.adbPort) {
      try {
        await this.adbService.disconnectFromDevice(id);
      } catch (error) {
        this.logger.warn(
          `Failed to disconnect ADB for device ${id}`,
          error.message,
        );
      }
    }

    // ✅ 物理设备：释放回池（而不是销毁）
    if (device.providerType === DeviceProviderType.PHYSICAL && device.externalId) {
      try {
        // 停止 SCRCPY 会话
        const scrcpyService = await this.getScrcpyService();
        await scrcpyService.stopSession(device.id);
        this.logger.debug(`Stopped SCRCPY session for device ${device.id}`);

        // 释放设备回池
        const poolService = await this.getDevicePoolService();
        await poolService.releaseDevice(device.externalId);
        this.logger.log(`Released physical device ${device.externalId} back to pool`);
      } catch (error) {
        this.logger.warn(
          `Failed to release physical device ${device.externalId} back to pool`,
          error.message,
        );
      }
    }
    // ✅ 非物理设备：调用 Provider 销毁设备
    else if (device.externalId) {
      try {
        await provider.destroy(device.externalId);
        this.logger.debug(`Provider destroyed device: ${device.externalId}`);
      } catch (error) {
        this.logger.warn(
          `Failed to destroy device via provider ${id}`,
          error.message,
        );
      }
    }

    // 释放端口（仅 Redroid）
    if (
      device.providerType === DeviceProviderType.REDROID &&
      (device.adbPort || device.metadata?.webrtcPort)
    ) {
      this.portManager.releasePorts({
        adbPort: device.adbPort ?? undefined,  // Convert null to undefined
        webrtcPort: device.metadata?.webrtcPort,
      });
      this.logger.debug(`Released ports for device ${id}`);
    }

    // ✅ 使用事务更新设备状态并发布事件到 Outbox
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新设备状态
      device.status = DeviceStatus.DELETED;
      await queryRunner.manager.save(Device, device);

      // ✅ 在同一事务内写入事件到 Outbox
      if (this.eventOutboxService) {
        await this.eventOutboxService.writeEvent(
          queryRunner,
          'device',
          id,
          'device.deleted',
          {
            deviceId: id,
            userId: device.userId,
            deviceName: device.name,
            tenantId: device.tenantId,
            providerType: device.providerType,
            timestamp: new Date().toISOString(),
          },
        );
      }

      await queryRunner.commitTransaction();
      this.logger.debug(`Device ${id} status updated and event written to outbox`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update device status and write event`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 清除缓存（在事务外，失败不影响主流程）
    await this.invalidateDeviceCache(device);

    this.logger.log(`Device ${id} removed successfully`);
  }

  /**
   * 健康检查定时任务 - 每30秒执行一次
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performHealthCheck() {
    try {
      const runningDevices = await this.devicesRepository.find({
        where: { status: DeviceStatus.RUNNING },
      });

      if (runningDevices.length === 0) {
        return;
      }

      this.logger.debug(
        `Performing health check on ${runningDevices.length} devices`,
      );

      for (const device of runningDevices) {
        this.checkDeviceHealth(device).catch((error) => {
          this.logger.error(
            `Health check failed for device ${device.id}`,
            error.stack,
          );
        });
      }
    } catch (error) {
      this.logger.error("Health check task failed", error.stack);
    }
  }

  /**
   * 检查单个设备健康状态
   */
  private async checkDeviceHealth(device: Device): Promise<void> {
    // ✅ 物理设备：使用 DevicePoolService 的健康检查
    if (device.providerType === DeviceProviderType.PHYSICAL && device.externalId) {
      try {
        const poolService = await this.getDevicePoolService();
        const healthResult = await poolService.checkDeviceHealth(device.externalId);

        // 更新设备的健康评分
        if (device.healthScore !== healthResult.healthScore) {
          await this.devicesRepository.update(device.id, {
            healthScore: healthResult.healthScore,
          });
        }

        if (!healthResult.healthy) {
          this.logger.warn(
            `Physical device ${device.id} is unhealthy. Score: ${healthResult.healthScore}, Checks: ${JSON.stringify(healthResult.checks)}`,
          );
          await this.handleUnhealthyDevice(device, {
            container: true, // 物理设备没有容器
            adb: healthResult.checks.adbConnected,
            android: healthResult.checks.androidBooted,
          });
        } else {
          // 更新心跳
          await this.updateHeartbeat(device.id);
        }
      } catch (error) {
        this.logger.error(
          `Health check failed for physical device ${device.id}`,
          error.stack,
        );
      }
      return;
    }

    // ✅ Redroid/云设备：原有健康检查逻辑
    const checks = {
      container: false,
      adb: false,
      android: false,
    };

    // 1. 检查容器状态（仅 Redroid）
    if (device.providerType === DeviceProviderType.REDROID && device.containerId) {
      try {
        const info = await this.dockerService.getContainerInfo(
          device.containerId,
        );
        checks.container =
          info.State.Running && info.State.Health?.Status !== "unhealthy";
      } catch (error) {
        this.logger.warn(`Container check failed for device ${device.id}`);
      }
    } else {
      // 云设备默认容器检查通过
      checks.container = true;
    }

    // 2. 检查 ADB 连接
    try {
      const devices = await this.adbService.executeShellCommand(
        device.id,
        "echo test",
        3000,
      );
      checks.adb = devices.includes("test");
    } catch (error) {
      this.logger.warn(`ADB check failed for device ${device.id}`);
    }

    // 3. 检查 Android 系统
    try {
      const output = await this.adbService.executeShellCommand(
        device.id,
        "getprop sys.boot_completed",
        3000,
      );
      checks.android = output.trim() === "1";
    } catch (error) {
      this.logger.warn(`Android check failed for device ${device.id}`);
    }

    // 判断设备是否健康
    const isHealthy = checks.container && checks.adb && checks.android;

    if (!isHealthy) {
      this.logger.warn(
        `Device ${device.id} is unhealthy. Checks: ${JSON.stringify(checks)}`,
      );
      await this.handleUnhealthyDevice(device, checks);
    } else {
      // 更新心跳
      await this.updateHeartbeat(device.id);
    }
  }

  /**
   * 处理不健康的设备
   */
  private async handleUnhealthyDevice(
    device: Device,
    checks: { container: boolean; adb: boolean; android: boolean },
  ): Promise<void> {
    this.logger.warn(`Attempting to recover device ${device.id}`);

    try {
      // 如果容器未运行，尝试重启容器
      if (!checks.container && device.containerId) {
        this.logger.log(`Restarting container for device ${device.id}`);
        await this.dockerService.restartContainer(device.containerId);
        await this.waitForContainerReady(device.containerId, 30);
      }

      // 如果 ADB 未连接，尝试重新连接
      if (!checks.adb && device.adbHost && device.adbPort) {
        this.logger.log(`Reconnecting ADB for device ${device.id}`);
        await this.adbService.connectToDevice(
          device.id,
          device.adbHost,
          device.adbPort,
        );
        await this.waitForAndroidBoot(device.id, 30);
      }

      // 再次检查
      const recheckOutput = await this.adbService.executeShellCommand(
        device.id,
        "echo test",
        3000,
      );

      if (recheckOutput.includes("test")) {
        this.logger.log(`Device ${device.id} recovered successfully`);
        device.status = DeviceStatus.RUNNING;
        device.lastActiveAt = new Date();
        await this.devicesRepository.save(device);
      } else {
        throw new Error("Recovery check failed");
      }
    } catch (error) {
      this.logger.error(`Failed to recover device ${device.id}`, error.stack);

      // 标记为错误状态
      device.status = DeviceStatus.ERROR;
      await this.devicesRepository.save(device);

      // 可选：发送告警通知
      // await this.notificationService.sendAlert(...)
    }
  }

  async start(id: string): Promise<Device> {
    const device = await this.findOne(id);

    this.logger.log(
      `Starting device ${id} (Provider: ${device.providerType})`,
    );

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 启动设备
    if (device.externalId) {
      try {
        await provider.start(device.externalId);
        this.logger.debug(
          `Provider started device: ${device.externalId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to start device via provider ${id}`,
          error.stack,
        );

        // 发布严重错误事件（设备启动失败）
        if (this.eventBus) {
          try {
            // ✅ 使用非空断言，因为已经检查过
            await this.eventBus!.publishSystemError(
              'high',
              'DEVICE_START_FAILED',
              `Device start failed: ${error.message} (deviceId: ${id}, provider: ${device.providerType})`,
              'device-service',
              {
                userMessage: '设备启动失败，请稍后重试',
                // ✅ null → undefined 转换
                userId: device.userId ?? undefined,
                stackTrace: error.stack,
                metadata: {
                  deviceId: id,
                  deviceName: device.name,
                  providerType: device.providerType,
                  errorMessage: error.message,
                },
              }
            );
          } catch (eventError) {
            this.logger.error('Failed to publish device start failed event', eventError);
          }
        }

        throw new BusinessException(
          BusinessErrorCode.DEVICE_START_FAILED,
          `Failed to start device ${id}: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          undefined,
          {
            userMessage: '设备启动失败，请稍后重试',
            technicalMessage: `Device provider failed to start device: ${error.message}`,
            details: {
              deviceId: id,
              providerType: device.providerType,
              errorMessage: error.message,
              errorStack: error.stack,
            },
            recoverySuggestions: [
              {
                action: '重新启动',
                description: '尝试重新启动设备',
                actionUrl: `/devices/${id}/start`,
              },
              {
                action: '检查日志',
                description: '查看设备日志了解具体原因',
                actionUrl: `/devices/${id}/logs`,
              },
              {
                action: '删除重建',
                description: '如果问题持续，可以删除设备并重新创建',
                actionUrl: `/devices/${id}`,
              },
            ],
            documentationUrl: 'https://docs.cloudphone.com/troubleshooting/device-start-failed',
            retryable: true,
          },
        );
      }
    }

    // ✅ 物理设备：启动 SCRCPY 会话
    if (device.providerType === DeviceProviderType.PHYSICAL) {
      try {
        await this.startPhysicalDeviceAsync(device);
        this.logger.log(`SCRCPY session started for physical device ${device.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to start SCRCPY session for device ${id}`,
          error.stack,
        );
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          `无法启动 SCRCPY 会话: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    // ✅ 使用事务保存设备状态并发布事件到 Outbox
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedDevice: Device;
    try {
      savedDevice = await queryRunner.manager.save(Device, device);

      // ✅ 在同一事务内写入事件到 Outbox
      if (this.eventOutboxService) {
        await this.eventOutboxService.writeEvent(
          queryRunner,
          'device',
          id,
          'device.started',
          {
            deviceId: id,
            userId: device.userId,
            tenantId: device.tenantId,
            startedAt: new Date().toISOString(),
            providerType: device.providerType,
          },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 建立 ADB 连接（如果支持且非物理设备，因为物理设备在 startPhysicalDeviceAsync 中已连接）
    if (
      device.providerType !== DeviceProviderType.PHYSICAL &&
      device.adbHost &&
      device.adbPort
    ) {
      try {
        await this.adbService.connectToDevice(
          id,
          device.adbHost,
          device.adbPort,
        );
      } catch (error) {
        this.logger.warn(`Failed to connect ADB for device ${id}:`, error.message);
      }
    }

    // 上报并发设备增加（设备启动）
    if (this.quotaClient && device.userId) {
      await this.quotaClient
        .incrementConcurrentDevices(device.userId)
        .catch((error) => {
          this.logger.warn(
            `Failed to increment concurrent devices for user ${device.userId}`,
            error.message,
          );
        });
    }

    return savedDevice;
  }

  async stop(id: string): Promise<Device> {
    const device = await this.findOne(id);

    this.logger.log(
      `Stopping device ${id} (Provider: ${device.providerType})`,
    );

    const startTime = device.lastActiveAt || device.createdAt;
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

    // ✅ 物理设备：停止 SCRCPY 会话
    if (device.providerType === DeviceProviderType.PHYSICAL) {
      try {
        const scrcpyService = await this.getScrcpyService();
        await scrcpyService.stopSession(device.id);
        this.logger.debug(`Stopped SCRCPY session for device ${device.id}`);
      } catch (error) {
        this.logger.warn(
          `Failed to stop SCRCPY session for device ${id}:`,
          error.message,
        );
      }
    }

    // 断开 ADB 连接（如果有）
    if (device.adbPort) {
      try {
        await this.adbService.disconnectFromDevice(id);
      } catch (error) {
        this.logger.warn(`Failed to disconnect ADB for device ${id}:`, error.message);
      }
    }

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 停止设备
    if (device.externalId) {
      try {
        await provider.stop(device.externalId);
        this.logger.debug(
          `Provider stopped device: ${device.externalId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to stop device via provider ${id}`,
          error.stack,
        );

        // 发布严重错误事件（设备停止失败）
        if (this.eventBus) {
          try {
            // ✅ 使用非空断言，因为已经检查过
            await this.eventBus!.publishSystemError(
              'high',
              'DEVICE_STOP_FAILED',
              `Device stop failed: ${error.message} (deviceId: ${id}, provider: ${device.providerType})`,
              'device-service',
              {
                userMessage: '设备停止失败，请稍后重试',
                // ✅ null → undefined 转换
                userId: device.userId ?? undefined,
                stackTrace: error.stack,
                metadata: {
                  deviceId: id,
                  deviceName: device.name,
                  providerType: device.providerType,
                  errorMessage: error.message,
                },
              }
            );
          } catch (eventError) {
            this.logger.error('Failed to publish device stop failed event', eventError);
          }
        }

        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          `无法停止设备: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    device.status = DeviceStatus.STOPPED;

    // ✅ 使用事务保存设备状态并发布事件到 Outbox
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedDevice: Device;
    try {
      savedDevice = await queryRunner.manager.save(Device, device);

      // ✅ 在同一事务内写入事件到 Outbox
      if (this.eventOutboxService) {
        await this.eventOutboxService.writeEvent(
          queryRunner,
          'device',
          id,
          'device.stopped',
          {
            deviceId: id,
            userId: device.userId,
            tenantId: device.tenantId,
            stoppedAt: new Date().toISOString(),
            duration, // 运行时长（秒）
            providerType: device.providerType,
          },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 上报并发设备减少（设备停止）
    if (this.quotaClient && device.userId) {
      await this.quotaClient
        .decrementConcurrentDevices(device.userId)
        .catch((error) => {
          this.logger.warn(
            `Failed to decrement concurrent devices for user ${device.userId}`,
            error.message,
          );
        });
    }

    return savedDevice;
  }

  async restart(id: string): Promise<Device> {
    const device = await this.findOne(id);

    this.logger.log(
      `Restarting device ${id} (Provider: ${device.providerType})`,
    );

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 重启设备
    if (device.externalId) {
      try {
        // 某些 Provider 可能有 rebootDevice 方法，否则用 stop + start
        const providerWithReboot = provider as IDeviceProvider & { rebootDevice?: (id: string) => Promise<void> };
        if (typeof providerWithReboot.rebootDevice === 'function') {
          await providerWithReboot.rebootDevice(device.externalId);
        } else {
          await provider.stop(device.externalId);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒
          await provider.start(device.externalId);
        }
        this.logger.debug(
          `Provider restarted device: ${device.externalId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to restart device via provider ${id}`,
          error.stack,
        );
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          `无法重启设备: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    return await this.devicesRepository.save(device);
  }

  async updateHeartbeat(id: string, stats?: DeviceMetrics): Promise<void> {
    const update: Partial<Device> & {
      lastHeartbeatAt: Date;
      lastActiveAt: Date;
      cpuUsage?: number;
      memoryUsage?: number;
      storageUsage?: number;
    } = {
      lastHeartbeatAt: new Date(),
      lastActiveAt: new Date(),
    };

    if (stats) {
      if (stats.cpuUsage !== undefined) update.cpuUsage = stats.cpuUsage;
      if (stats.memoryUsage !== undefined)
        update.memoryUsage = stats.memoryUsage;
      if (stats.storageUsage !== undefined)
        update.storageUsage = stats.storageUsage;
    }

    await this.devicesRepository.update(id, update);
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    await this.devicesRepository.update(id, { status });
  }

  async getStats(id: string): Promise<DeviceMetrics & { deviceId: string; providerType: string; timestamp: Date; error?: string; message?: string }> {
    const device = await this.findOne(id);

    this.logger.debug(
      `Getting stats for device ${id} (Provider: ${device.providerType})`,
    );

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 获取指标（如果支持）
    if (device.externalId && provider.getMetrics) {
      try {
        const metrics = await provider.getMetrics(device.externalId);
        return {
          deviceId: device.id,
          providerType: device.providerType,
          timestamp: metrics.timestamp || new Date(),
          cpuUsage: metrics.cpuUsage || 0,
          memoryUsage: metrics.memoryUsage || 0,
          memoryUsed: metrics.memoryUsed || 0,
          storageUsed: metrics.storageUsed || 0,
          storageUsage: metrics.storageUsage || 0,
          networkRx: metrics.networkRx || 0,
          networkTx: metrics.networkTx || 0,
          fps: metrics.fps,
          batteryLevel: metrics.batteryLevel,
          temperature: metrics.temperature,
        };
      } catch (error) {
        this.logger.warn(
          `Failed to get metrics from provider for device ${id}`,
          error.message,
        );
        // 返回默认值
        return {
          deviceId: device.id,
          providerType: device.providerType,
          timestamp: new Date(),
          cpuUsage: 0,
          memoryUsage: 0,
          error: error.message,
        };
      }
    }

    // 降级：如果 Provider 不支持 getMetrics，返回空数据
    return {
      deviceId: device.id,
      providerType: device.providerType,
      timestamp: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      message: "Provider does not support metrics",
    };
  }

  // ADB 相关方法

  async executeShellCommand(
    id: string,
    command: string,
    timeout?: number,
  ): Promise<string> {
    await this.findOne(id); // 验证设备存在
    return await this.adbService.executeShellCommand(id, command, timeout);
  }

  async takeScreenshot(id: string): Promise<string> {
    await this.findOne(id);
    const outputDir = this.configService.get(
      "SCREENSHOT_DIR",
      "/tmp/screenshots",
    );
    const outputPath = `${outputDir}/${id}_${Date.now()}.png`;
    return await this.adbService.takeScreenshotToFile(id, outputPath);
  }

  async pushFile(
    id: string,
    localPath: string,
    remotePath: string,
  ): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pushFile(id, localPath, remotePath);
  }

  async pullFile(
    id: string,
    remotePath: string,
    localPath: string,
  ): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pullFile(id, remotePath, localPath);
  }

  async installApk(
    id: string,
    apkPath: string,
    reinstall?: boolean,
  ): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.installApk(id, apkPath, reinstall);
  }

  async uninstallApp(id: string, packageName: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.uninstallApp(id, packageName);
  }

  async getInstalledPackages(id: string): Promise<string[]> {
    await this.findOne(id);
    return await this.adbService.getInstalledPackages(id);
  }

  async readLogcat(
    id: string,
    filter?: string,
    lines?: number,
  ): Promise<string> {
    await this.findOne(id);
    return await this.adbService.readLogcat(id, { filter, lines });
  }

  async clearLogcat(id: string): Promise<void> {
    await this.findOne(id);
    return await this.adbService.clearLogcat(id);
  }

  async getDeviceProperties(id: string): Promise<Record<string, string>> {
    await this.findOne(id);
    return await this.adbService.getDeviceProperties(id);
  }

  // ========== 事件发布方法 ==========

  /**
   * 发布应用安装完成事件
   */
  async publishAppInstallCompleted(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishAppEvent("install.completed", event);
  }

  /**
   * 发布应用安装失败事件
   */
  async publishAppInstallFailed(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishAppEvent("install.failed", event);
  }

  /**
   * 发布应用卸载完成事件
   */
  async publishAppUninstallCompleted(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishAppEvent("uninstall.completed", event);
  }

  /**
   * 发布设备分配事件
   */
  async publishDeviceAllocated(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishDeviceEvent(`allocate.${(event as Record<string, string>).sagaId}`, event);
  }

  /**
   * 分配设备（用于 Saga）
   */
  async allocateDevice(userId: string, planId: string): Promise<Device> {
    // 查找一个可用的设备
    const device = await this.devicesRepository.findOne({
      where: {
        status: DeviceStatus.IDLE,
      },
    });

    if (!device) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        "没有可用的设备",
        HttpStatus.BAD_REQUEST,
      );
    }

    // 分配给用户
    device.userId = userId;
    device.status = DeviceStatus.ALLOCATED;
    await this.devicesRepository.save(device);

    return device;
  }

  /**
   * 释放设备
   */
  async releaseDevice(deviceId: string, reason?: string): Promise<void> {
    const device = await this.findOne(deviceId);

    // 停止设备
    if (device.status === DeviceStatus.RUNNING) {
      await this.stop(deviceId);
    }

    // 重置状态
    device.userId = null;
    device.status = DeviceStatus.IDLE;
    await this.devicesRepository.save(device);

    this.logger.log(`Device ${deviceId} released. Reason: ${reason || "N/A"}`);
  }

  /**
   * 获取设备流信息（供 Media Service 使用）
   */
  async getStreamInfo(deviceId: string): Promise<{
    deviceId: string;
    containerName: string;
    adbPort: number;
    screenResolution: { width: number; height: number };
  }> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ 验证流所需的字段存在
    if (!device.containerName || !device.adbPort) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `Device ${deviceId} missing streaming info (containerName: ${device.containerName}, adbPort: ${device.adbPort})`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 获取屏幕分辨率
    let screenResolution = { width: 1080, height: 1920 }; // 默认值
    try {
      // 通过 adb shell wm size 获取精确分辨率
      const sizeOutput = await this.adbService.executeShellCommand(
        deviceId,
        "wm size",
      );
      const match = sizeOutput.match(/Physical size: (\d+)x(\d+)/);
      if (match) {
        screenResolution = {
          width: parseInt(match[1]),
          height: parseInt(match[2]),
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get screen resolution for device ${deviceId}: ${error.message}`,
      );
    }

    return {
      deviceId: device.id,
      containerName: device.containerName,
      adbPort: device.adbPort,
      screenResolution,
    };
  }

  /**
   * 获取设备截图
   */
  async getScreenshot(deviceId: string): Promise<Buffer> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 使用 ADB 截图
    try {
      const screenshot = await this.adbService.takeScreenshot(deviceId);
      return screenshot;
    } catch (error) {
      this.logger.error(
        `Failed to take screenshot for device ${deviceId}: ${error.message}`,
      );
      throw BusinessErrors.adbOperationFailed(`截图失败: ${error.message}`, {
        deviceId,
      });
    }
  }

  /**
   * 缓存失效辅助方法 - 清除设备相关的所有缓存
   * @param device 设备实体
   */
  private async invalidateDeviceCache(device: Device): Promise<void> {
    try {
      // 1. 清除设备详情缓存
      await this.cacheService.del(CacheKeys.device(device.id));

      // 2. 清除用户设备列表缓存（所有分页）
      if (device.userId) {
        await this.cacheService.delPattern(
          CacheKeys.userListPattern(device.userId),
        );
      }

      // 3. 清除租户设备列表缓存
      if (device.tenantId) {
        await this.cacheService.delPattern(
          CacheKeys.tenantListPattern(device.tenantId),
        );
      }

      // 4. 清除容器映射缓存
      if (device.containerId) {
        await this.cacheService.del(
          CacheKeys.deviceByContainer(device.containerId),
        );
      }

      this.logger.debug(`Cache invalidated for device ${device.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for device ${device.id}:`,
        error.message,
      );
      // 缓存失效失败不应该影响主流程
    }
  }
}
