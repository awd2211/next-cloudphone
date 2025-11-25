import {
  Injectable,
  Logger,
  Optional,
  HttpStatus,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ModuleRef } from '@nestjs/core';
import { Device, DeviceStatus, DeviceProviderType } from '../entities/device.entity';
import { DockerService, RedroidConfig } from '../docker/docker.service';
import { AdbService } from '../adb/adb.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import {
  RequestSmsDto,
  CancelSmsDto,
  SmsNumberResponse,
  SmsMessageDto,
} from './dto/sms-request.dto';
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
  ProxyClientService, // ✅ 导入代理客户端服务
  HttpClientService, // ✅ 导入 HTTP 客户端服务（用于调用 SMS Receive Service）
  DistributedLockService,
  UnifiedCacheService,
} from '@cloudphone/shared';
import { QuotaClientService } from '../quota/quota-client.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';
import { DeviceProviderFactory } from '../providers/device-provider.factory';
import {
  DeviceCreateConfig,
  DeviceProviderStatus,
  DeviceMetrics,
} from '../providers/provider.types';
import { IDeviceProvider } from '../providers/device-provider.interface';
import { ScrcpyVideoCodec } from '../scrcpy/scrcpy.types';
import { ProxyStatsService } from '../proxy/proxy-stats.service';
import { ProxySelectionService, ProxySelectionStrategy, ProxySelectionResult } from '../proxy/proxy-selection.service';
import { ProxyReleaseReason } from '../entities/proxy-usage.entity';
import { trace, SpanStatusCode } from '@opentelemetry/api';

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
  // Step 2 specific (代理分配)
  proxyAllocated?: boolean;
  proxy?: {
    proxyId: string;
    proxyHost: string;
    proxyPort: number;
    proxyType?: string;
    proxyUsername?: string;
    proxyPassword?: string;
    proxyCountry?: string;
  };
  // Step 3 specific
  providerDevice?: {
    id: string;
    connectionInfo?: {
      adb?: { port?: number; host?: string };
    };
    [key: string]: unknown;
  };
  // Step 5 specific
  quotaReported?: boolean;
  // Step 6 specific
  deviceStarted?: boolean;
  // DTO for internal use
  createDeviceDto?: CreateDeviceDto;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private readonly tracer = trace.getTracer('device-service');

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
    @Optional() private proxyClient: ProxyClientService, // ✅ 代理客户端服务
    @Optional() private proxyStats: ProxyStatsService, // ✅ 代理统计服务
    @Optional() private proxySelection: ProxySelectionService, // ✅ 智能代理选择服务
    @Optional() private httpClient: HttpClientService, // ✅ HTTP 客户端服务（用于调用 SMS Receive Service）
    private cacheService: UnifiedCacheService,
    private moduleRef: ModuleRef, // ✅ 用于延迟获取服务
    private sagaOrchestrator: SagaOrchestratorService,
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
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
    // 创建自定义 span 用于追踪设备创建
    return await this.tracer.startActiveSpan(
      'device.create',
      {
        attributes: {
          'user.id': createDeviceDto.userId || 'unknown',
          'device.name': createDeviceDto.name,
          'device.provider_type': createDeviceDto.providerType || DeviceProviderType.REDROID,
          'device.cpu_cores': createDeviceDto.cpuCores || 2,
          'device.memory_mb': createDeviceDto.memoryMB || 4096,
        },
      },
      async (span) => {
        try {
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
              `[SAGA] Ports allocated: ADB=${ports.adbPort}, WebRTC=${ports.webrtcPort}`
            );

            return { portsAllocated: true, ports };
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.portsAllocated || !state.ports) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Releasing allocated ports`);

            try {
              await this.portManager.releasePorts(state.ports);
              this.logger.log(`[SAGA] Ports released: ADB=${state.ports.adbPort}`);
            } catch (error) {
              this.logger.error(`[SAGA] Failed to release ports`, error.stack);
            }
          },
        } as SagaStep,

        // ========== Step 2: 分配家宽代理（为云手机提供独立 IP） - Phase 3 智能选择 ==========
        {
          name: 'ALLOCATE_PROXY',
          execute: async (state: DeviceCreationSagaState) => {
            // ✅ 仅为 Redroid 云手机分配代理（物理设备/华为云/阿里云不需要）
            if (providerType !== DeviceProviderType.REDROID || !this.proxyClient) {
              this.logger.debug(`[SAGA] Skipping proxy allocation for ${providerType}`);
              return { proxyAllocated: false, proxy: null };
            }

            this.logger.log(`[SAGA] Step 2: Allocating proxy for cloud phone (intelligent selection)`);

            try {
              // ✅ Phase 3 MVP: 智能选择作为推荐，实际分配仍用 acquireProxy
              let recommendedProxyId: string | undefined;

              if (this.proxySelection) {
                this.logger.debug(`[SAGA] Getting proxy recommendation from intelligent selection`);

                // 1. 智能推荐最佳代理（仅作参考）
                const selectionResult = await this.proxySelection.selectProxy({
                  preferredCountry: createDeviceDto.proxyCountry, // 用户指定的国家
                  strategy: (createDeviceDto.proxyStrategy as ProxySelectionStrategy) || ProxySelectionStrategy.HIGHEST_SCORE,
                  minScore: 50, // 最低评分要求
                  userId: createDeviceDto.userId,
                }).catch(err => {
                  this.logger.warn(`Proxy selection service error: ${err.message}`);
                  return {
                    success: false,
                    proxy: null,
                    strategy: ProxySelectionStrategy.HIGHEST_SCORE,
                    reason: `Selection service error: ${err.message}`,
                  } as ProxySelectionResult;
                });

                if (selectionResult.success && selectionResult.proxy) {
                  recommendedProxyId = selectionResult.proxy.proxyId;
                  this.logger.log(
                    `[SAGA] Recommended proxy: ${recommendedProxyId} (score: ${selectionResult.proxy.score}, strategy: ${selectionResult.strategy})`
                  );
                } else {
                  this.logger.debug(
                    `[SAGA] No proxy recommendation available: ${selectionResult.reason || 'unknown'}`
                  );
                }
              }

              // 2. 使用推荐的代理进行分配（如果有），否则使用 acquireProxy
              let proxySession: any;

              if (recommendedProxyId) {
                // ✅ Phase 3.1: 使用智能选择推荐的代理
                this.logger.debug(`[SAGA] Assigning recommended proxy: ${recommendedProxyId}`);
                proxySession = await this.proxyClient.assignProxy({
                  proxyId: recommendedProxyId,
                  validate: true, // 验证代理可用性
                });
                this.logger.log(
                  `[SAGA] Intelligent proxy assigned: ${recommendedProxyId}`
                );
              } else {
                // ⚠️ Fallback: 智能选择不可用时，使用 acquireProxy
                this.logger.debug(`[SAGA] No recommendation, using acquireProxy fallback`);
                proxySession = await this.proxyClient.acquireProxy({
                  criteria: {
                    minQuality: 70, // 最低质量评分
                    country: createDeviceDto.proxyCountry, // 用户指定的国家
                  },
                });
              }

              const proxyInfo = proxySession.proxy;

              this.logger.log(
                `[SAGA] Proxy allocated: ${proxyInfo.id} (${proxyInfo.host}:${proxyInfo.port}) country=${proxyInfo.location.countryCode || 'any'}` +
                (recommendedProxyId ? ` [via intelligent selection]` : ` [via fallback]`)
              );

              return {
                proxyAllocated: true,
                proxy: {
                  proxyId: proxyInfo.id,
                  proxyHost: proxyInfo.host,
                  proxyPort: proxyInfo.port,
                  proxyType: proxyInfo.protocol.toUpperCase(),
                  proxyUsername: proxyInfo.username,
                  proxyPassword: proxyInfo.password,
                  proxyCountry: proxyInfo.location.countryCode,
                },
              };
            } catch (error) {
              // ✅ 代理分配失败不阻塞设备创建（降级模式）
              this.logger.warn(
                `[SAGA] Failed to allocate proxy, continuing without proxy: ${error.message}`
              );
              return { proxyAllocated: false, proxy: null };
            }
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.proxyAllocated || !state.proxy || !this.proxyClient) {
              return;
            }

            this.logger.warn(`[SAGA] Compensate: Releasing proxy ${state.proxy.proxyId}`);

            try {
              await this.proxyClient.releaseProxy(state.proxy.proxyId);
              this.logger.log(`[SAGA] Proxy released: ${state.proxy.proxyId}`);
            } catch (error) {
              this.logger.error(
                `[SAGA] Failed to release proxy ${state.proxy.proxyId}`,
                error.stack
              );
            }
          },
        } as SagaStep,

        // ========== Step 3: 调用 Provider 创建设备 ==========
        {
          name: 'CREATE_PROVIDER_DEVICE',
          execute: async (state: DeviceCreationSagaState) => {
            this.logger.log(`[SAGA] Step 2: Creating device via ${providerType} provider`);

            const providerConfig: DeviceCreateConfig = {
              name: `cloudphone-${createDeviceDto.name}`,
              userId: createDeviceDto.userId!, // ✅ Guaranteed by validation
              cpuCores: createDeviceDto.cpuCores || 2,
              memoryMB: createDeviceDto.memoryMB || 4096,
              storageMB: createDeviceDto.storageMB || 10240,
              resolution: createDeviceDto.resolution || '1920x1080',
              dpi: createDeviceDto.dpi || 240,
              androidVersion: createDeviceDto.androidVersion || '11',
              deviceType: createDeviceDto.type === 'tablet' ? 'tablet' : 'phone',
              // Redroid 特定配置
              adbPort: state.ports?.adbPort,
              enableGpu: this.configService.get('REDROID_ENABLE_GPU', 'false') === 'true',
              enableAudio: this.configService.get('REDROID_ENABLE_AUDIO', 'false') === 'true',
              // ✅ 代理配置（家宽代理，每台云手机独立 IP）
              proxyHost: state.proxy?.proxyHost,
              proxyPort: state.proxy?.proxyPort,
              proxyType: state.proxy?.proxyType,
              proxyUsername: state.proxy?.proxyUsername,
              proxyPassword: state.proxy?.proxyPassword,
              // Provider 特定配置
              providerSpecificConfig: createDeviceDto.providerSpecificConfig,
            };

            const providerDevice = await provider.create(providerConfig);

            this.logger.log(
              `[SAGA] Provider device created: ${providerDevice.id} (status: ${providerDevice.status})`
            );

            return { providerDevice };
          },
          compensate: async (state: DeviceCreationSagaState) => {
            if (!state.providerDevice) {
              return;
            }

            this.logger.warn(
              `[SAGA] Compensate: Destroying provider device ${state.providerDevice.id}`
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
                error.stack
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
                providerConfig: (state.providerDevice as Record<string, unknown>)
                  .providerConfig as Record<string, unknown>,
                status: DeviceStatus.CREATING, // 初始状态 CREATING
                // Redroid 兼容字段
                containerId:
                  providerType === DeviceProviderType.REDROID ? state.providerDevice!.id : null,
                containerName:
                  providerType === DeviceProviderType.REDROID
                    ? ((state.providerDevice as Record<string, unknown>).name as string)
                    : null,
                adbPort: state.providerDevice!.connectionInfo?.adb?.port || null,
                adbHost: state.providerDevice!.connectionInfo?.adb?.host || null,
                // ✅ 代理配置（家宽代理，每台云手机独立 IP）
                proxyId: state.proxy?.proxyId || null,
                proxyHost: state.proxy?.proxyHost || null,
                proxyPort: state.proxy?.proxyPort || null,
                proxyType: state.proxy?.proxyType || null,
                proxyUsername: state.proxy?.proxyUsername || null,
                proxyPassword: state.proxy?.proxyPassword || null,
                proxyCountry: state.proxy?.proxyCountry || null,
                proxyAssignedAt: state.proxy ? new Date() : null,
                metadata: {
                  ...createDeviceDto.metadata,
                  webrtcPort: state.ports?.webrtcPort,
                  createdBy: 'system',
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
                  }
                );
                this.logger.debug(`[SAGA] Event written to outbox: device.created`);
              }

              await queryRunner.commitTransaction();

              this.logger.log(`[SAGA] Database record created: ${savedDevice.id}`);

              // ✅ 记录代理分配统计（异步，不阻塞 Saga）
              if (state.proxy && this.proxyStats) {
                this.proxyStats
                  .recordProxyAssignment({
                    deviceId: savedDevice.id,
                    deviceName: savedDevice.name,
                    userId: savedDevice.userId ?? undefined, // ✅ null → undefined
                    proxyId: state.proxy.proxyId,
                    proxyHost: state.proxy.proxyHost,
                    proxyPort: state.proxy.proxyPort,
                    proxyType: state.proxy.proxyType,
                    proxyCountry: state.proxy.proxyCountry,
                  })
                  .catch((error) => {
                    this.logger.warn(
                      `Failed to record proxy assignment: ${error.message}`,
                    );
                  });
                this.logger.debug(
                  `[SAGA] Proxy assignment statistics recorded for ${state.proxy.proxyId}`,
                );
              }

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
                error.stack
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

            await this.quotaClient.reportDeviceUsage(createDeviceDto.userId!, {
              // ✅ Guaranteed by validation
              deviceId: state.deviceId!, // ✅ Guaranteed by step 3
              cpuCores: createDeviceDto.cpuCores || 2,
              memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
              storageGB: (createDeviceDto.storageMB || 10240) / 1024,
              operation: 'increment',
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
              await this.quotaClient.reportDeviceUsage(createDeviceDto.userId!, {
                // ✅ Guaranteed by validation
                deviceId: state.deviceId!, // ✅ Should exist if we're compensating
                cpuCores: createDeviceDto.cpuCores || 2,
                memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
                storageGB: (createDeviceDto.storageMB || 10240) / 1024,
                operation: 'decrement',
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
                  this.logger.error(`Failed to start device ${device.id}`, error.stack);
                  await this.updateDeviceStatus(device.id, DeviceStatus.ERROR);
                });
              } else if (providerType === DeviceProviderType.PHYSICAL) {
                // 物理设备: 启动 SCRCPY 会话
                this.startPhysicalDeviceAsync(device).catch(async (error) => {
                  this.logger.error(
                    `Failed to start SCRCPY for physical device ${device.id}`,
                    error.stack
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
              this.logger.error(`[SAGA] Failed to stop device ${state.deviceId}`, error.stack);
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

          // 添加设备 ID 到 span attributes
          span.setAttributes({
            'saga.id': sagaId,
            'device.id': device?.id || 'pending',
            'device.status': device?.status || 'creating',
          });

          // 设置成功状态
          span.setStatus({ code: SpanStatusCode.OK });

          return { sagaId, device };
        } catch (error) {
          // 记录错误
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Device creation failed',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
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
          `Device ${device.id} has no externalId`
        );
      }
      await provider.start(device.externalId);

      // 等待 ADB 连接
      if (device.adbHost && device.adbPort) {
        await this.adbService.connectToDevice(device.id, device.adbHost, device.adbPort);

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
        await this.adbService.connectToDevice(device.id, device.adbHost, device.adbPort);
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
        },
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
  private mapProviderStatusToDeviceStatus(providerStatus: DeviceProviderStatus): DeviceStatus {
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
          `Redroid device ${device.id} has no adbPort assigned`
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
        enableGpu: this.configService.get('REDROID_ENABLE_GPU', 'false') === 'true',
        enableAudio: this.configService.get('REDROID_ENABLE_AUDIO', 'false') === 'true',
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
          `Device ${device.id} missing ADB connection info (host: ${device.adbHost}, port: ${device.adbPort})`
        );
      }

      await this.adbService.connectToDevice(device.id, device.adbHost, device.adbPort);

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
      this.logger.error(`Failed to create Redroid container for device ${device.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 等待容器就绪
   */
  private async waitForContainerReady(containerId: string, maxWaitSeconds: number): Promise<void> {
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

    throw new Error(`Container ${containerId} failed to start within ${maxWaitSeconds}s`);
  }

  /**
   * 等待 Android 启动完成
   */
  private async waitForAndroidBoot(deviceId: string, maxWaitSeconds: number): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const output = await this.adbService.executeShellCommand(
          deviceId,
          'getprop sys.boot_completed',
          3000
        );

        if (output.trim() === '1') {
          this.logger.debug(`Android boot completed for device ${deviceId}`);
          return;
        }
      } catch (error) {
        // ADB 可能还未就绪，继续等待
      }

      // 等待3秒后重试
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error(`Android failed to boot within ${maxWaitSeconds}s for device ${deviceId}`);
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
        'settings put system screen_off_timeout 2147483647',

        // 禁用屏幕锁定
        'settings put secure lockscreen.disabled 1',

        // 设置默认输入法（如果需要）
        // 'ime set com.android.adbkeyboard/.AdbIME',

        // 禁用系统更新
        'pm disable com.android.vending',
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
    const version = androidVersion || '11';
    const imageMap: Record<string, string> = {
      '11': 'redroid/redroid:11.0.0-latest',
      '12': 'redroid/redroid:12.0.0-latest',
      '13': 'redroid/redroid:13.0.0-latest',
    };
    return imageMap[version] || imageMap['11'];
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    // 生成缓存键（包含排序参数）
    let cacheKey: string | undefined;
    const sortSuffix = sortBy ? `:${sortBy}:${sortOrder || 'desc'}` : '';
    if (userId) {
      cacheKey = CacheKeys.deviceList(userId, status, page, limit) + sortSuffix;
    } else if (tenantId) {
      cacheKey = CacheKeys.tenantDeviceList(tenantId, status, page, limit) + sortSuffix;
    } else {
      // 全局列表不缓存（管理员查询）
      cacheKey = undefined;
    }

    // 如果有缓存键，使用缓存
    if (cacheKey) {
      return this.cacheService.wrap(
        cacheKey,
        async () => this.queryDeviceList(page, limit, userId, tenantId, status, sortBy, sortOrder),
        CacheTTL.DEVICE_LIST // 1 分钟 TTL
      );
    }

    // 无缓存键，直接查询
    return this.queryDeviceList(page, limit, userId, tenantId, status, sortBy, sortOrder);
  }

  // 提取查询逻辑为私有方法
  private async queryDeviceList(
    page: number,
    limit: number,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Device> = {};
    if (userId) where.userId = userId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    // 构建排序条件
    const allowedSortFields = ['name', 'status', 'androidVersion', 'createdAt', 'lastStartedAt', 'updatedAt'];
    const orderField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const [data, total] = await this.devicesRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [orderField]: orderDirection },
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
    status?: DeviceStatus
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
    qb.orderBy('device.createdAt', 'DESC').limit(limit + 1);

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
      CacheTTL.DEVICE // 5 分钟 TTL
    );
  }

  /**
   * 批量查询设备（根据ID列表）
   * 用于服务间调用，返回基本信息
   */
  async findByIds(ids: string[]): Promise<Device[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    try {
      // 使用 In 查询批量获取设备
      const devices = await this.devicesRepository.find({
        where: { id: In(ids) },
        select: ['id', 'name', 'type', 'providerType', 'status', 'userId'],
      });

      return devices;
    } catch (error) {
      this.logger.error(`Failed to batch find devices: ${error.message}`, error.stack);
      return [];
    }
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
          operation: 'decrement',
        })
        .catch((error) => {
          this.logger.warn(`Failed to report usage decrease for device ${id}`, error.message);
        });
    }

    // 断开 ADB 连接（如果有）
    if (device.adbPort) {
      try {
        await this.adbService.disconnectFromDevice(id);
      } catch (error) {
        this.logger.warn(`Failed to disconnect ADB for device ${id}`, error.message);
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
          error.message
        );
      }
    }
    // ✅ 非物理设备：调用 Provider 销毁设备
    else if (device.externalId) {
      try {
        await provider.destroy(device.externalId);
        this.logger.debug(`Provider destroyed device: ${device.externalId}`);
      } catch (error) {
        this.logger.warn(`Failed to destroy device via provider ${id}`, error.message);
      }
    }

    // 释放端口（仅 Redroid）
    if (
      device.providerType === DeviceProviderType.REDROID &&
      (device.adbPort || device.metadata?.webrtcPort)
    ) {
      await this.portManager.releasePorts({
        adbPort: device.adbPort ?? undefined, // Convert null to undefined
        webrtcPort: device.metadata?.webrtcPort,
      });
      this.logger.debug(`Released ports for device ${id}`);
    }

    // ✅ 释放代理（仅 Redroid，如果有分配代理）
    if (device.providerType === DeviceProviderType.REDROID && device.proxyId && this.proxyClient) {
      try {
        await this.proxyClient.releaseProxy(device.proxyId);
        this.logger.log(`Released proxy ${device.proxyId} for device ${id}`);

        // ✅ 记录代理释放统计（异步，不阻塞删除流程）
        if (this.proxyStats) {
          this.proxyStats
            .recordProxyRelease(
              device.id,
              device.proxyId,
              ProxyReleaseReason.DEVICE_DELETED,
            )
            .catch((error) => {
              this.logger.warn(
                `Failed to record proxy release: ${error.message}`,
              );
            });
          this.logger.debug(
            `[ProxyStats] Recorded proxy release for ${device.proxyId}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to release proxy ${device.proxyId} for device ${id}`,
          error.message
        );
      }
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
        await this.eventOutboxService.writeEvent(queryRunner, 'device', id, 'device.deleted', {
          deviceId: id,
          userId: device.userId,
          deviceName: device.name,
          tenantId: device.tenantId,
          providerType: device.providerType,
          timestamp: new Date().toISOString(),
        });
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

      this.logger.debug(`Performing health check on ${runningDevices.length} devices`);

      for (const device of runningDevices) {
        this.checkDeviceHealth(device).catch((error) => {
          this.logger.error(`Health check failed for device ${device.id}`, error.stack);
        });
      }
    } catch (error) {
      this.logger.error('Health check task failed', error.stack);
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
            `Physical device ${device.id} is unhealthy. Score: ${healthResult.healthScore}, Checks: ${JSON.stringify(healthResult.checks)}`
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
        this.logger.error(`Health check failed for physical device ${device.id}`, error.stack);
      }
      return;
    }

    // ✅ Redroid/云设备：原有健康检查逻辑（并行优化）
    const checks = {
      container: false,
      adb: false,
      android: false,
    };

    // 并行执行所有健康检查（性能优化）
    const checkTasks: Promise<void>[] = [];

    // 1. 检查容器状态（仅 Redroid）
    if (device.providerType === DeviceProviderType.REDROID && device.containerId) {
      const containerId = device.containerId; // 类型缩小
      checkTasks.push(
        (async () => {
          try {
            const info = await this.dockerService.getContainerInfo(containerId);
            checks.container = info.State.Running && info.State.Health?.Status !== 'unhealthy';
          } catch (error) {
            this.logger.warn(`Container check failed for device ${device.id}`);
          }
        })()
      );
    } else {
      // 云设备默认容器检查通过
      checks.container = true;
    }

    // 2. 检查 ADB 连接
    checkTasks.push(
      (async () => {
        try {
          const devices = await this.adbService.executeShellCommand(device.id, 'echo test', 3000);
          checks.adb = devices.includes('test');
        } catch (error) {
          this.logger.warn(`ADB check failed for device ${device.id}`);
        }
      })()
    );

    // 3. 检查 Android 系统
    checkTasks.push(
      (async () => {
        try {
          const output = await this.adbService.executeShellCommand(
            device.id,
            'getprop sys.boot_completed',
            3000
          );
          checks.android = output.trim() === '1';
        } catch (error) {
          this.logger.warn(`Android check failed for device ${device.id}`);
        }
      })()
    );

    // 等待所有检查完成
    await Promise.all(checkTasks);

    // 判断设备是否健康
    const isHealthy = checks.container && checks.adb && checks.android;

    if (!isHealthy) {
      this.logger.warn(`Device ${device.id} is unhealthy. Checks: ${JSON.stringify(checks)}`);
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
    checks: { container: boolean; adb: boolean; android: boolean }
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
        await this.adbService.connectToDevice(device.id, device.adbHost, device.adbPort);
        await this.waitForAndroidBoot(device.id, 30);
      }

      // 再次检查
      const recheckOutput = await this.adbService.executeShellCommand(device.id, 'echo test', 3000);

      if (recheckOutput.includes('test')) {
        this.logger.log(`Device ${device.id} recovered successfully`);
        device.status = DeviceStatus.RUNNING;
        device.lastActiveAt = new Date();
        await this.devicesRepository.save(device);
      } else {
        throw new Error('Recovery check failed');
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
    // 创建自定义 span 用于追踪设备启动
    return await this.tracer.startActiveSpan(
      'device.start',
      {
        attributes: {
          'device.id': id,
        },
      },
      async (span) => {
        try {
          const device = await this.findOne(id);

          // 添加设备详细信息到 attributes
          span.setAttributes({
            'device.name': device.name,
            'device.provider_type': device.providerType,
            'device.status': device.status,
            'user.id': device.userId || 'unknown',
          });

          this.logger.log(`Starting device ${id} (Provider: ${device.providerType})`);

          // 获取 Provider
          const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 启动设备
    if (device.externalId) {
      try {
        await provider.start(device.externalId);
        this.logger.debug(`Provider started device: ${device.externalId}`);
      } catch (error) {
        this.logger.error(`Failed to start device via provider ${id}`, error.stack);

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
            documentationUrl: 'https://docs.cloudphone.run/troubleshooting/device-start-failed',
            retryable: true,
          }
        );
      }
    }

    // ✅ 物理设备：启动 SCRCPY 会话
    if (device.providerType === DeviceProviderType.PHYSICAL) {
      try {
        await this.startPhysicalDeviceAsync(device);
        this.logger.log(`SCRCPY session started for physical device ${device.id}`);
      } catch (error) {
        this.logger.error(`Failed to start SCRCPY session for device ${id}`, error.stack);
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          `无法启动 SCRCPY 会话: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
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
        await this.eventOutboxService.writeEvent(queryRunner, 'device', id, 'device.started', {
          deviceId: id,
          userId: device.userId,
          tenantId: device.tenantId,
          startedAt: new Date().toISOString(),
          providerType: device.providerType,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 建立 ADB 连接（如果支持且非物理设备，因为物理设备在 startPhysicalDeviceAsync 中已连接）
    if (device.providerType !== DeviceProviderType.PHYSICAL && device.adbHost && device.adbPort) {
      try {
        await this.adbService.connectToDevice(id, device.adbHost, device.adbPort);
      } catch (error) {
        this.logger.warn(`Failed to connect ADB for device ${id}:`, error.message);
      }
    }

          // 上报并发设备增加（设备启动）
          if (this.quotaClient && device.userId) {
            await this.quotaClient.incrementConcurrentDevices(device.userId).catch((error) => {
              this.logger.warn(
                `Failed to increment concurrent devices for user ${device.userId}`,
                error.message
              );
            });
          }

          // 添加最终状态到 span
          span.setAttributes({
            'device.final_status': savedDevice.status,
          });

          // 设置成功状态
          span.setStatus({ code: SpanStatusCode.OK });

          return savedDevice;
        } catch (error) {
          // 记录错误
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Device start failed',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async stop(id: string): Promise<Device> {
    // 创建自定义 span 用于追踪设备停止
    return await this.tracer.startActiveSpan(
      'device.stop',
      {
        attributes: {
          'device.id': id,
        },
      },
      async (span) => {
        try {
          const device = await this.findOne(id);

          // 添加设备详细信息到 attributes
          span.setAttributes({
            'device.name': device.name,
            'device.provider_type': device.providerType,
            'device.status': device.status,
            'user.id': device.userId || 'unknown',
          });

          this.logger.log(`Stopping device ${id} (Provider: ${device.providerType})`);

          const startTime = device.lastActiveAt || device.createdAt;
          const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

          // 记录设备运行时长
          span.setAttributes({
            'device.runtime_seconds': duration,
          });

    // ✅ 物理设备：停止 SCRCPY 会话
    if (device.providerType === DeviceProviderType.PHYSICAL) {
      try {
        const scrcpyService = await this.getScrcpyService();
        await scrcpyService.stopSession(device.id);
        this.logger.debug(`Stopped SCRCPY session for device ${device.id}`);
      } catch (error) {
        this.logger.warn(`Failed to stop SCRCPY session for device ${id}:`, error.message);
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
        this.logger.debug(`Provider stopped device: ${device.externalId}`);
      } catch (error) {
        this.logger.error(`Failed to stop device via provider ${id}`, error.stack);

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
          HttpStatus.INTERNAL_SERVER_ERROR
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
        await this.eventOutboxService.writeEvent(queryRunner, 'device', id, 'device.stopped', {
          deviceId: id,
          userId: device.userId,
          tenantId: device.tenantId,
          stoppedAt: new Date().toISOString(),
          duration, // 运行时长（秒）
          providerType: device.providerType,
        });
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
            await this.quotaClient.decrementConcurrentDevices(device.userId).catch((error) => {
              this.logger.warn(
                `Failed to decrement concurrent devices for user ${device.userId}`,
                error.message
              );
            });
          }

          // 添加最终状态到 span
          span.setAttributes({
            'device.final_status': savedDevice.status,
          });

          // 设置成功状态
          span.setStatus({ code: SpanStatusCode.OK });

          return savedDevice;
        } catch (error) {
          // 记录错误
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Device stop failed',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async restart(id: string): Promise<Device> {
    const device = await this.findOne(id);

    this.logger.log(`Restarting device ${id} (Provider: ${device.providerType})`);

    // 获取 Provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // ✅ 调用 Provider 重启设备
    if (device.externalId) {
      try {
        // 某些 Provider 可能有 rebootDevice 方法，否则用 stop + start
        const providerWithReboot = provider as IDeviceProvider & {
          rebootDevice?: (id: string) => Promise<void>;
        };
        if (typeof providerWithReboot.rebootDevice === 'function') {
          await providerWithReboot.rebootDevice(device.externalId);
        } else {
          await provider.stop(device.externalId);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒
          await provider.start(device.externalId);
        }
        this.logger.debug(`Provider restarted device: ${device.externalId}`);
      } catch (error) {
        this.logger.error(`Failed to restart device via provider ${id}`, error.stack);
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          `无法重启设备: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
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
      if (stats.memoryUsage !== undefined) update.memoryUsage = stats.memoryUsage;
      if (stats.storageUsage !== undefined) update.storageUsage = stats.storageUsage;
    }

    await this.devicesRepository.update(id, update);
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    await this.devicesRepository.update(id, { status });
  }

  async getStats(id: string): Promise<
    DeviceMetrics & {
      deviceId: string;
      providerType: string;
      timestamp: Date;
      error?: string;
      message?: string;
    }
  > {
    // 使用缓存包装器：先查缓存，未命中则调用 Provider API
    return this.cacheService.wrap(
      CacheKeys.deviceMetrics(id),
      async () => {
        const device = await this.findOne(id);

        this.logger.debug(`Getting stats for device ${id} (Provider: ${device.providerType})`);

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
            this.logger.warn(`Failed to get metrics from provider for device ${id}`, error.message);
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
          message: 'Provider does not support metrics',
        };
      },
      CacheTTL.DEVICE_METRICS // 30 秒 TTL（Provider API 调用）
    );
  }

  /**
   * 批量获取设备统计信息
   * ✅ N+1 查询优化：一次性获取多个设备的统计数据
   *
   * @param deviceIds - 设备 ID 列表
   * @returns 设备统计信息映射（deviceId => stats）
   */
  async getStatsBatch(deviceIds: string[]): Promise<Record<string, any>> {
    if (!deviceIds || deviceIds.length === 0) {
      return {};
    }

    this.logger.debug(`Getting stats for ${deviceIds.length} devices in batch`);

    try {
      // ✅ 批量查询设备（使用 In 操作符，避免 N+1）
      const devices = await this.devicesRepository.find({
        where: { id: In(deviceIds) },
      });

      if (devices.length === 0) {
        this.logger.warn(`No devices found for batch stats query`);
        return {};
      }

      // ✅ 并行获取所有设备的统计（Promise.allSettled 确保部分失败不影响整体）
      const statsPromises = devices.map(async (device) => {
        try {
          const provider = this.providerFactory.getProvider(device.providerType);

          // 如果 Provider 支持 getMetrics
          if (device.externalId && provider.getMetrics) {
            const metrics = await provider.getMetrics(device.externalId);
            return {
              deviceId: device.id,
              stats: {
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
              },
            };
          }

          // Provider 不支持 getMetrics，返回默认值
          return {
            deviceId: device.id,
            stats: {
              deviceId: device.id,
              providerType: device.providerType,
              timestamp: new Date(),
              cpuUsage: 0,
              memoryUsage: 0,
              message: 'Provider does not support metrics',
            },
          };
        } catch (error) {
          this.logger.warn(`Failed to get stats for device ${device.id}`, error.message);
          return {
            deviceId: device.id,
            stats: {
              deviceId: device.id,
              providerType: device.providerType,
              timestamp: new Date(),
              cpuUsage: 0,
              memoryUsage: 0,
              error: error.message,
            },
          };
        }
      });

      const results = await Promise.allSettled(statsPromises);

      // 构建结果映射
      const statsMap: Record<string, any> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          statsMap[result.value.deviceId] = result.value.stats;
        }
      });

      this.logger.debug(
        `Retrieved stats for ${Object.keys(statsMap).length}/${deviceIds.length} devices`
      );

      return statsMap;
    } catch (error) {
      this.logger.error('Failed to get batch stats', error);
      return {};
    }
  }

  // ADB 相关方法

  /**
   * 测试远程 ADB 连接
   * 用于验证云手机设备的 ADB 连接是否可用
   */
  async testAdbConnection(host: string, port: number): Promise<{
    success: boolean;
    message: string;
    deviceInfo?: {
      model?: string;
      androidVersion?: string;
      serialNumber?: string;
    };
  }> {
    const connectionString = `${host}:${port}`;
    this.logger.log(`Testing ADB connection to ${connectionString}`);

    try {
      // 使用 adbkit 连接测试
      const client = this.adbService.getClient();

      // 尝试连接
      const connectResult = await client.connect(host, port);
      this.logger.log(`ADB connect result: ${connectResult}`);

      // 获取设备信息
      const devices = await client.listDevices();
      const device = devices.find((d: any) => d.id === connectionString || d.id.includes(host));

      if (device) {
        // 尝试获取设备详细信息
        let deviceInfo: any = {};

        try {
          const props = await client.getProperties(device.id);
          deviceInfo = {
            model: props['ro.product.model'] || props['ro.product.name'],
            androidVersion: props['ro.build.version.release'],
            serialNumber: props['ro.serialno'] || device.id,
          };
        } catch (propError) {
          this.logger.warn(`Could not get device properties: ${propError.message}`);
        }

        return {
          success: true,
          message: `成功连接到设备 ${connectionString}`,
          deviceInfo,
        };
      }

      // 设备已连接但未在列表中
      return {
        success: true,
        message: `连接成功，设备 ${connectionString} 已响应`,
      };
    } catch (error) {
      this.logger.error(`ADB connection test failed: ${error.message}`);

      let message = '连接失败';
      if (error.message.includes('ECONNREFUSED')) {
        message = '连接被拒绝，请检查端口是否开放';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        message = '连接超时，请检查网络和防火墙设置';
      } else if (error.message.includes('ENOTFOUND')) {
        message = '无法解析主机地址';
      } else {
        message = `连接失败: ${error.message}`;
      }

      return {
        success: false,
        message,
      };
    }
  }

  async executeShellCommand(id: string, command: string, timeout?: number): Promise<string> {
    await this.findOne(id); // 验证设备存在
    return await this.adbService.executeShellCommand(id, command, timeout);
  }

  async takeScreenshot(id: string): Promise<string> {
    await this.findOne(id);
    const outputDir = this.configService.get('SCREENSHOT_DIR', '/tmp/screenshots');
    const outputPath = `${outputDir}/${id}_${Date.now()}.png`;
    return await this.adbService.takeScreenshotToFile(id, outputPath);
  }

  async pushFile(id: string, localPath: string, remotePath: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pushFile(id, localPath, remotePath);
  }

  async pullFile(id: string, remotePath: string, localPath: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pullFile(id, remotePath, localPath);
  }

  async installApk(id: string, apkPath: string, reinstall?: boolean): Promise<boolean> {
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

  async readLogcat(id: string, filter?: string, lines?: number): Promise<string> {
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
    await this.eventBus.publishAppEvent('install.completed', event);
  }

  /**
   * 发布应用安装失败事件
   */
  async publishAppInstallFailed(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishAppEvent('install.failed', event);
  }

  /**
   * 发布应用卸载完成事件
   */
  async publishAppUninstallCompleted(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishAppEvent('uninstall.completed', event);
  }

  /**
   * 发布设备分配事件
   */
  async publishDeviceAllocated(event: Record<string, unknown>): Promise<void> {
    await this.eventBus.publishDeviceEvent(
      `allocate.${(event as Record<string, string>).sagaId}`,
      event
    );
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
        '没有可用的设备',
        HttpStatus.BAD_REQUEST
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

    this.logger.log(`Device ${deviceId} released. Reason: ${reason || 'N/A'}`);
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
        HttpStatus.BAD_REQUEST
      );
    }

    // ✅ 验证流所需的字段存在
    if (!device.containerName || !device.adbPort) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `Device ${deviceId} missing streaming info (containerName: ${device.containerName}, adbPort: ${device.adbPort})`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // 获取屏幕分辨率
    let screenResolution = { width: 1080, height: 1920 }; // 默认值
    try {
      // 通过 adb shell wm size 获取精确分辨率
      const sizeOutput = await this.adbService.executeShellCommand(deviceId, 'wm size');
      const match = sizeOutput.match(/Physical size: (\d+)x(\d+)/);
      if (match) {
        screenResolution = {
          width: parseInt(match[1]),
          height: parseInt(match[2]),
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get screen resolution for device ${deviceId}: ${error.message}`);
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
        HttpStatus.BAD_REQUEST
      );
    }

    // 使用 ADB 截图
    try {
      const screenshot = await this.adbService.takeScreenshot(deviceId);
      return screenshot;
    } catch (error) {
      this.logger.error(`Failed to take screenshot for device ${deviceId}: ${error.message}`);
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
        await this.cacheService.delPattern(CacheKeys.userListPattern(device.userId));
      }

      // 3. 清除租户设备列表缓存
      if (device.tenantId) {
        await this.cacheService.delPattern(CacheKeys.tenantListPattern(device.tenantId));
      }

      // 4. 清除容器映射缓存
      if (device.containerId) {
        await this.cacheService.del(CacheKeys.deviceByContainer(device.containerId));
      }

      this.logger.debug(`Cache invalidated for device ${device.id}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for device ${device.id}:`, error.message);
      // 缓存失效失败不应该影响主流程
    }
  }

  // ============================================================
  // 应用操作 (阿里云专属)
  // ============================================================

  /**
   * 启动应用
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async startApp(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 获取 provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.startApp) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 startApp 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 调用 provider 方法
      await provider.startApp(device.externalId, packageName);

      this.logger.log(`App ${packageName} started on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to start app ${packageName} on device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `启动应用失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 停止应用
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async stopApp(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.stopApp) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 stopApp 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await provider.stopApp(device.externalId, packageName);

      this.logger.log(`App ${packageName} stopped on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to stop app ${packageName} on device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `停止应用失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 清除应用数据
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async clearAppData(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.clearAppData) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 clearAppData 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await provider.clearAppData(device.externalId, packageName);

      this.logger.log(`App data cleared for ${packageName} on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to clear app data for ${packageName} on device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `清除应用数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 快照管理 (阿里云专属)
  // ============================================================

  /**
   * 创建设备快照
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param name 快照名称
   * @param description 快照描述
   * @returns 快照 ID
   */
  async createSnapshot(deviceId: string, name: string, description?: string): Promise<string> {
    const device = await this.findOne(deviceId);

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 快照可以在任何状态下创建
    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.createSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 createSnapshot 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const snapshotId = await provider.createSnapshot(device.externalId, name, description);

      this.logger.log(`Snapshot ${snapshotId} created for device ${deviceId}`);

      return snapshotId;
    } catch (error) {
      this.logger.error(`Failed to create snapshot for device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.SNAPSHOT_CREATION_FAILED,
        `创建快照失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 恢复设备快照
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  async restoreSnapshot(deviceId: string, snapshotId: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.restoreSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 restoreSnapshot 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await provider.restoreSnapshot(device.externalId, snapshotId);

      this.logger.log(`Snapshot ${snapshotId} restored for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to restore snapshot for device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.SNAPSHOT_RESTORE_FAILED,
        `恢复快照失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取设备快照列表
   * @param deviceId 设备 ID
   * @returns 快照列表
   */
  async listSnapshots(deviceId: string): Promise<any[]> {
    const device = await this.findOne(deviceId);

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.listSnapshots) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 listSnapshots 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const snapshots = await provider.listSnapshots(device.externalId);

      this.logger.log(`Listed ${snapshots.length} snapshots for device ${deviceId}`);
      return snapshots;
    } catch (error) {
      this.logger.error(`Failed to list snapshots for device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `获取快照列表失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除设备快照
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  async deleteSnapshot(deviceId: string, snapshotId: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (!device.externalId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备缺少 externalId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!provider.deleteSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 未实现 deleteSnapshot 方法`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await provider.deleteSnapshot(device.externalId, snapshotId);

      this.logger.log(`Snapshot ${snapshotId} deleted for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to delete snapshot for device ${deviceId}: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `删除快照失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新设备元数据
   * @param deviceId 设备 ID
   * @param metadataUpdate 要更新的元数据（部分更新）
   *
   * 用途：
   * - 记录 SMS 短信号码和验证码信息
   * - 记录设备使用情况和统计信息
   * - 记录自定义标签和配置
   *
   * 示例：
   * ```typescript
   * await this.devicesService.updateDeviceMetadata(deviceId, {
   *   lastSmsReceived: {
   *     messageId: '123',
   *     phoneNumber: '+79123456789',
   *     verificationCode: '654321',
   *     service: 'telegram',
   *     receivedAt: '2025-11-02T10:30:00Z',
   *     pushedAt: '2025-11-02T10:30:01Z'
   *   }
   * });
   * ```
   */
  async updateDeviceMetadata(
    deviceId: string,
    metadataUpdate: Record<string, any>,
  ): Promise<Device> {
    try {
      // 1. 查找设备
      const device = await this.findOne(deviceId);

      // 2. 合并元数据（保留原有数据，更新或添加新字段）
      const updatedMetadata = {
        ...(device.metadata || {}),
        ...metadataUpdate,
      };

      // 3. 更新数据库
      await this.devicesRepository.update(deviceId, {
        metadata: updatedMetadata,
      });

      // 4. 清除缓存
      await this.cacheService.del(CacheKeys.device(deviceId));

      this.logger.log(
        `设备元数据已更新: deviceId=${deviceId}, keys=[${Object.keys(metadataUpdate).join(', ')}]`,
      );

      // 5. 返回更新后的设备
      return this.findOne(deviceId);
    } catch (error) {
      this.logger.error(`更新设备元数据失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `更新设备元数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== SMS 虚拟号码管理 ====================

  /**
   * 为设备请求虚拟 SMS 号码
   * @param deviceId 设备 ID
   * @param dto 请求参数
   * @returns 虚拟号码信息
   */
  async requestSms(deviceId: string, dto: RequestSmsDto): Promise<SmsNumberResponse> {
    try {
      // 1. 检查设备是否存在且状态为 RUNNING
      const device = await this.findOne(deviceId);
      if (device.status !== DeviceStatus.RUNNING) {
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          '设备必须处于运行状态才能请求虚拟号码',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 获取 SMS Receive Service 的 URL
      const smsServiceUrl = this.configService.get('SMS_RECEIVE_SERVICE_URL', 'http://localhost:30008');

      // 3. 调用 SMS Receive Service API
      const response = await this.httpClient.post<{ data: SmsNumberResponse }>(
        `${smsServiceUrl}/sms-numbers/request`,
        {
          deviceId,
          userId: device.userId,
          country: dto.country,
          service: dto.service,
          operator: dto.operator,
        },
        {},
        {
          timeout: 15000, // 15 秒超时
          retries: 2,
          serviceName: 'sms-receive-service',
        },
      );

      const smsNumber = response.data;

      // 4. 更新设备元数据
      await this.updateDeviceMetadata(deviceId, {
        smsNumberRequest: smsNumber,
      });

      this.logger.log(
        `虚拟号码请求成功: deviceId=${deviceId}, phone=${smsNumber.phoneNumber}, requestId=${smsNumber.requestId}`,
      );

      return smsNumber;
    } catch (error) {
      this.logger.error(`请求虚拟号码失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `请求虚拟号码失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取消设备的虚拟 SMS 号码
   * @param deviceId 设备 ID
   * @param dto 取消参数
   */
  async cancelSms(deviceId: string, dto?: CancelSmsDto): Promise<void> {
    try {
      // 1. 检查设备是否存在
      const device = await this.findOne(deviceId);

      // 2. 检查是否有分配的虚拟号码
      const smsNumberRequest = device.metadata?.smsNumberRequest;
      if (!smsNumberRequest || !smsNumberRequest.requestId) {
        throw new BusinessException(
          BusinessErrorCode.DEVICE_NOT_AVAILABLE,
          '设备未分配虚拟号码',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. 获取 SMS Receive Service 的 URL
      const smsServiceUrl = this.configService.get('SMS_RECEIVE_SERVICE_URL', 'http://localhost:30008');

      // 4. 调用 SMS Receive Service 取消 API
      await this.httpClient.post(
        `${smsServiceUrl}/sms-numbers/${smsNumberRequest.requestId}/cancel`,
        {
          reason: dto?.reason || 'User cancelled',
        },
        {},
        {
          timeout: 10000,
          retries: 2,
          serviceName: 'sms-receive-service',
        },
      );

      // 5. 更新设备元数据（标记为已取消）
      await this.updateDeviceMetadata(deviceId, {
        smsNumberRequest: {
          ...smsNumberRequest,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          reason: dto?.reason,
        },
      });

      this.logger.log(
        `虚拟号码已取消: deviceId=${deviceId}, requestId=${smsNumberRequest.requestId}`,
      );
    } catch (error) {
      this.logger.error(`取消虚拟号码失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `取消虚拟号码失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取设备收到的 SMS 消息历史
   * @param deviceId 设备 ID
   * @returns SMS 消息列表
   */
  async getSmsMessages(deviceId: string): Promise<SmsMessageDto[]> {
    try {
      // 1. 检查设备是否存在
      const device = await this.findOne(deviceId);

      // 2. 从设备元数据中获取最后一条 SMS
      const lastSmsReceived = device.metadata?.lastSmsReceived;
      if (!lastSmsReceived) {
        return [];
      }

      // 返回最后一条 SMS 消息
      // 完整历史获取说明：
      // 如需完整 SMS 历史，应通过 HttpClientService 调用：
      // GET sms-receive-service/devices/:deviceId/messages?page=1&limit=50
      // 当前仅返回元数据中缓存的最后一条消息（性能优化）
      return [lastSmsReceived as SmsMessageDto];
    } catch (error) {
      this.logger.error(`获取 SMS 消息失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `获取 SMS 消息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== 快速列表和筛选元数据 ====================

  /**
   * 获取设备快速列表（轻量级，用于下拉框等UI组件）
   * 带缓存优化
   */
  async getQuickList(query: {
    status?: string;
    search?: string;
    limit?: number;
    userId?: string;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      status: string;
      extra: Record<string, any>;
    }>;
    total: number;
    cached: boolean;
  }> {
    const { status, search, limit = 100, userId } = query;

    // 构建查询条件
    const queryBuilder = this.devicesRepository
      .createQueryBuilder('device')
      .select([
        'device.id',
        'device.name',
        'device.status',
        'device.providerType',
        'device.deviceGroup',
        'device.androidVersion',
      ]);

    if (userId) {
      queryBuilder.andWhere('device.userId = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(device.name ILIKE :search OR device.id::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('device.name', 'ASC').take(limit);

    const [devices, total] = await queryBuilder.getManyAndCount();

    const items = devices.map((device) => ({
      id: device.id,
      name: device.name,
      status: device.status,
      extra: {
        provider: device.providerType,
        deviceGroup: device.deviceGroup,
        androidVersion: device.androidVersion,
      },
    }));

    return {
      items,
      total,
      cached: false, // 可以后续添加 Redis 缓存
    };
  }

  /**
   * 获取设备筛选元数据
   * 用于生成动态筛选表单
   */
  async getFiltersMetadata(query: {
    includeCount?: boolean;
    onlyWithData?: boolean;
    userId?: string;
  }): Promise<{
    filters: Array<{
      field: string;
      label: string;
      type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
      options?: Array<{ value: string; label: string; count?: number }>;
      required: boolean;
      defaultValue?: any;
    }>;
    total: number;
  }> {
    const { includeCount = true, onlyWithData = false, userId } = query;

    // 基础查询条件
    const baseWhere = userId ? { userId } : {};

    // 获取状态分布
    const statusCounts = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere)
      .groupBy('device.status')
      .getRawMany();

    const statusOptions = [
      { value: 'idle', label: '空闲', count: 0 },
      { value: 'running', label: '运行中', count: 0 },
      { value: 'stopped', label: '已停止', count: 0 },
      { value: 'error', label: '错误', count: 0 },
      { value: 'starting', label: '启动中', count: 0 },
      { value: 'stopping', label: '停止中', count: 0 },
      { value: 'creating', label: '创建中', count: 0 },
      { value: 'deleting', label: '删除中', count: 0 },
    ];

    statusCounts.forEach((item: { status: string; count: string }) => {
      const option = statusOptions.find((o) => o.value === item.status);
      if (option) {
        option.count = parseInt(item.count, 10);
      }
    });

    // 获取提供商分布
    const providerCounts = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.providerType', 'provider')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere)
      .groupBy('device.providerType')
      .getRawMany();

    const providerOptions = providerCounts.map((item: { provider: string; count: string }) => ({
      value: item.provider,
      label: this.getProviderLabel(item.provider),
      count: includeCount ? parseInt(item.count, 10) : undefined,
    }));

    // 获取 Android 版本分布
    const androidVersionCounts = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.androidVersion', 'version')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere)
      .andWhere('device.androidVersion IS NOT NULL')
      .groupBy('device.androidVersion')
      .getRawMany();

    const androidVersionOptions = androidVersionCounts.map((item: { version: string; count: string }) => ({
      value: item.version,
      label: `Android ${item.version}`,
      count: includeCount ? parseInt(item.count, 10) : undefined,
    }));

    // 获取设备分组分布
    const groupCounts = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.deviceGroup', 'deviceGroup')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere)
      .andWhere('device.deviceGroup IS NOT NULL')
      .groupBy('device.deviceGroup')
      .getRawMany();

    const groupOptions = groupCounts.map((item: { deviceGroup: string; count: string }) => ({
      value: item.deviceGroup,
      label: item.deviceGroup,
      count: includeCount ? parseInt(item.count, 10) : undefined,
    }));

    // 构建筛选器配置
    let filters: Array<{
      field: string;
      label: string;
      type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
      options?: Array<{ value: string; label: string; count?: number }>;
      required: boolean;
      defaultValue?: any;
    }> = [
      {
        field: 'status',
        label: '设备状态',
        type: 'multiselect',
        options: includeCount
          ? statusOptions
          : statusOptions.map(({ value, label }) => ({ value, label })),
        required: false,
      },
      {
        field: 'providerType',
        label: '提供商',
        type: 'multiselect',
        options: providerOptions,
        required: false,
      },
      {
        field: 'androidVersion',
        label: 'Android 版本',
        type: 'multiselect',
        options: androidVersionOptions,
        required: false,
      },
      {
        field: 'deviceGroup',
        label: '设备分组',
        type: 'multiselect',
        options: groupOptions,
        required: false,
      },
      {
        field: 'name',
        label: '设备名称',
        type: 'search',
        required: false,
      },
      {
        field: 'createdAt',
        label: '创建时间',
        type: 'date',
        required: false,
      },
    ];

    // 如果只返回有数据的选项
    if (onlyWithData) {
      filters = filters.filter((f) => {
        if (f.options) {
          return f.options.some((o) => (o.count ?? 1) > 0);
        }
        return true;
      });
    }

    // 获取设备总数
    const total = await this.devicesRepository.count({ where: baseWhere as any });

    return {
      filters,
      total,
    };
  }

  /**
   * 获取提供商显示名称
   */
  private getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      redroid: 'Redroid 容器',
      physical: '物理设备',
      huawei: '华为云手机',
      aliyun: '阿里云手机',
    };
    return labels[provider] || provider;
  }

  /**
   * 高效获取设备统计信息（使用 SQL GROUP BY，避免加载全量数据）
   * 性能优化：原方法加载 9999 条记录，优化后仅返回聚合结果
   */
  async getDeviceStats(userId?: string, tenantId?: string): Promise<{
    total: number;
    idle: number;
    running: number;
    stopped: number;
    error: number;
  }> {
    // 缓存键
    const cacheKey = userId
      ? `device:stats:user:${userId}`
      : tenantId
        ? `device:stats:tenant:${tenantId}`
        : 'device:stats:all';

    // 尝试从缓存获取（60秒 TTL）
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        // 使用 SQL GROUP BY 直接统计，避免加载所有设备数据
        // 注意：devices 表没有软删除（deletedAt），直接按 status 分组统计
        const qb = this.devicesRepository
          .createQueryBuilder('d')
          .select('d.status', 'status')
          .addSelect('COUNT(*)', 'count');

        if (userId) {
          qb.where('d.userId = :userId', { userId });
        }
        if (tenantId) {
          if (userId) {
            qb.andWhere('d.tenantId = :tenantId', { tenantId });
          } else {
            qb.where('d.tenantId = :tenantId', { tenantId });
          }
        }

        qb.groupBy('d.status');

        const stats = await qb.getRawMany<{ status: string; count: string }>();

        // 初始化结果
        const result = {
          total: 0,
          idle: 0,
          running: 0,
          stopped: 0,
          error: 0,
        };

        // 填充统计结果
        for (const stat of stats) {
          const count = parseInt(stat.count, 10);
          result.total += count;

          switch (stat.status) {
            case DeviceStatus.IDLE:
              result.idle = count;
              break;
            case DeviceStatus.RUNNING:
              result.running = count;
              break;
            case DeviceStatus.STOPPED:
              result.stopped = count;
              break;
            case DeviceStatus.ERROR:
              result.error = count;
              break;
          }
        }

        return result;
      },
      60000 // 60秒缓存
    );
  }

  /**
   * 获取设备数量（支持过滤条件）
   */
  async getCount(options: {
    status?: string;
    userId?: string;
    tenantId?: string;
  }): Promise<number> {
    const qb = this.devicesRepository.createQueryBuilder('device');

    if (options.status) {
      qb.andWhere('device.status = :status', { status: options.status });
    }

    if (options.userId) {
      qb.andWhere('device.userId = :userId', { userId: options.userId });
    }

    if (options.tenantId) {
      qb.andWhere('device.tenantId = :tenantId', { tenantId: options.tenantId });
    }

    return qb.getCount();
  }

  /**
   * 获取设备状态分布
   */
  async getStatusDistribution(): Promise<{
    idle: number;
    running: number;
    stopped: number;
    error: number;
  }> {
    const stats = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.status')
      .getRawMany<{ status: string; count: string }>();

    const result = {
      idle: 0,
      running: 0,
      stopped: 0,
      error: 0,
    };

    for (const stat of stats) {
      const count = parseInt(stat.count, 10);
      switch (stat.status) {
        case DeviceStatus.IDLE:
          result.idle = count;
          break;
        case DeviceStatus.RUNNING:
          result.running = count;
          break;
        case DeviceStatus.STOPPED:
          result.stopped = count;
          break;
        case DeviceStatus.ERROR:
          result.error = count;
          break;
      }
    }

    return result;
  }

  /**
   * 获取设备使用统计
   */
  async getUsageStats(): Promise<{
    totalHours: number;
    avgSessionDuration: number;
    peakConcurrent: number;
    utilizationRate: number;
    statusDistribution: { name: string; value: number }[];
  }> {
    // 获取状态分布
    const distribution = await this.getStatusDistribution();
    const total = distribution.idle + distribution.running + distribution.stopped + distribution.error;

    // 计算利用率（运行中设备占比）
    const utilizationRate = total > 0 ? (distribution.running / total) * 100 : 0;

    // 转换为图表友好的格式
    const statusDistribution = [
      { name: '运行中', value: distribution.running },
      { name: '空闲', value: distribution.idle },
      { name: '已停止', value: distribution.stopped },
      { name: '错误', value: distribution.error },
    ].filter(item => item.value > 0);

    return {
      totalHours: 0, // TODO: 需要从使用记录表计算
      avgSessionDuration: 0, // TODO: 需要从使用记录表计算
      peakConcurrent: distribution.running, // 当前并发数
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      statusDistribution,
    };
  }

  // ==================== 设备分组管理 ====================

  /**
   * 获取设备分组列表
   * 从设备的 metadata.groupName 字段聚合分组信息
   */
  async getDeviceGroups(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    deviceCount: number;
    tags?: string[];
    createdAt: string;
  }>> {
    const devices = await this.devicesRepository.find({
      select: ['id', 'metadata', 'createdAt'],
    });

    // 聚合分组信息
    const groupMap = new Map<string, {
      deviceCount: number;
      description?: string;
      tags?: string[];
      earliestCreatedAt: Date;
    }>();

    devices.forEach((device) => {
      const groupName = device.metadata?.groupName;
      if (!groupName) return; // 跳过未分组的设备

      const existing = groupMap.get(groupName);
      if (existing) {
        existing.deviceCount++;
        if (device.createdAt < existing.earliestCreatedAt) {
          existing.earliestCreatedAt = device.createdAt;
        }
      } else {
        groupMap.set(groupName, {
          deviceCount: 1,
          description: device.metadata?.groupDescription,
          tags: device.metadata?.groupTags,
          earliestCreatedAt: device.createdAt,
        });
      }
    });

    // 转换为数组格式
    const groups = Array.from(groupMap.entries()).map(([name, data]) => ({
      id: this.generateGroupId(name),
      name,
      description: data.description,
      deviceCount: data.deviceCount,
      tags: data.tags,
      createdAt: data.earliestCreatedAt.toISOString(),
    }));

    // 按设备数量降序排序
    return groups.sort((a, b) => b.deviceCount - a.deviceCount);
  }

  /**
   * 创建设备分组
   * 由于分组是基于 metadata 的虚拟概念，这里只是返回新分组信息
   */
  async createDeviceGroup(data: {
    name: string;
    description?: string;
    tags?: string[];
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    deviceCount: number;
    tags?: string[];
    createdAt: string;
  }> {
    // 检查分组名称是否已存在
    const existingDevices = await this.devicesRepository.findOne({
      where: {
        metadata: { groupName: data.name } as any,
      },
    });

    if (existingDevices) {
      throw new BadRequestException('分组名称已存在');
    }

    return {
      id: this.generateGroupId(data.name),
      name: data.name,
      description: data.description,
      deviceCount: 0,
      tags: data.tags,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 更新设备分组
   * 更新分组内所有设备的 metadata
   */
  async updateDeviceGroup(
    groupId: string,
    data: { name?: string; description?: string; tags?: string[] }
  ): Promise<{ message: string; affectedDevices: number }> {
    // 从 ID 还原分组名称
    const originalName = this.decodeGroupId(groupId);

    // 查找该分组的所有设备
    const devices = await this.devicesRepository
      .createQueryBuilder('device')
      .where("device.metadata->>'groupName' = :groupName", { groupName: originalName })
      .getMany();

    if (devices.length === 0) {
      throw new NotFoundException('分组不存在或没有设备');
    }

    // 更新所有设备的 metadata
    for (const device of devices) {
      device.metadata = {
        ...device.metadata,
        ...(data.name && { groupName: data.name }),
        ...(data.description !== undefined && { groupDescription: data.description }),
        ...(data.tags !== undefined && { groupTags: data.tags }),
      };
    }

    await this.devicesRepository.save(devices);

    return {
      message: `分组更新成功`,
      affectedDevices: devices.length,
    };
  }

  /**
   * 删除设备分组
   * 将分组内所有设备的 groupName 清空
   */
  async deleteDeviceGroup(groupId: string): Promise<{ message: string; affectedDevices: number }> {
    const originalName = this.decodeGroupId(groupId);

    // 查找该分组的所有设备
    const devices = await this.devicesRepository
      .createQueryBuilder('device')
      .where("device.metadata->>'groupName' = :groupName", { groupName: originalName })
      .getMany();

    if (devices.length === 0) {
      throw new NotFoundException('分组不存在或没有设备');
    }

    // 清空分组信息
    for (const device of devices) {
      const { groupName, groupDescription, groupTags, ...restMetadata } = device.metadata || {};
      device.metadata = restMetadata;
    }

    await this.devicesRepository.save(devices);

    return {
      message: `分组删除成功，${devices.length} 个设备已移出分组`,
      affectedDevices: devices.length,
    };
  }

  /**
   * 生成分组 ID（基于名称的 base64 编码）
   */
  private generateGroupId(name: string): string {
    return Buffer.from(name).toString('base64').replace(/=/g, '');
  }

  /**
   * 解码分组 ID 为名称
   */
  private decodeGroupId(id: string): string {
    // 补齐 base64 padding
    const paddedId = id + '='.repeat((4 - (id.length % 4)) % 4);
    return Buffer.from(paddedId, 'base64').toString('utf8');
  }

  // ==================== 阿里云云手机连接管理 (V2 API) ====================

  /**
   * 获取阿里云云手机连接凭证
   * 用于 Web SDK 投屏连接
   *
   * @param deviceId 设备 ID
   * @returns 连接凭证信息，包含 ticket（30秒有效期）
   */
  async getAliyunConnectionTicket(deviceId: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      instanceId: string;
      ticket: string;
      taskId: string;
      taskStatus: string;
      expiresAt: string;
    };
  }> {
    try {
      // 1. 检查设备是否存在且为阿里云云手机
      const device = await this.findOne(deviceId);

      if (device.providerType !== DeviceProviderType.ALIYUN_ECP) {
        return {
          success: false,
          message: '此功能仅适用于阿里云云手机设备',
        };
      }

      if (device.status !== DeviceStatus.RUNNING) {
        return {
          success: false,
          message: '设备必须处于运行状态才能获取连接凭证',
        };
      }

      // 2. 获取 Provider 并调用 getConnectionInfo
      const provider = this.providerFactory.getProvider(device.providerType) as any;

      // 检查 provider 是否有 getConnectionInfo 方法
      if (typeof provider.getConnectionInfo !== 'function') {
        return {
          success: false,
          message: '当前 Provider 不支持连接凭证功能',
        };
      }

      const connectionInfo = await provider.getConnectionInfo(device.externalId || device.id);

      // 提取阿里云连接信息
      const aliyunEcp = connectionInfo.aliyunEcp;
      if (!aliyunEcp) {
        return {
          success: false,
          message: '无法获取阿里云连接信息',
        };
      }

      return {
        success: true,
        data: {
          instanceId: aliyunEcp.instanceId,
          ticket: aliyunEcp.webrtcToken,
          taskId: '',
          taskStatus: 'SUCCESS',
          expiresAt: aliyunEcp.tokenExpiresAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`获取阿里云连接凭证失败: deviceId=${deviceId}, error=${error.message}`);
      return {
        success: false,
        message: `获取连接凭证失败: ${error.message}`,
      };
    }
  }

  /**
   * 直接测试获取阿里云云手机连接凭证
   *
   * 此方法用于测试页面，不需要在数据库中创建设备
   * 直接使用阿里云实例 ID 获取连接凭证
   *
   * @param instanceId 阿里云云手机实例 ID
   * @returns 连接凭证信息
   */
  async testAliyunConnectionTicket(instanceId: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      instanceId: string;
      ticket: string;
      taskId: string;
      taskStatus: string;
      expiresAt: string;
    };
  }> {
    try {
      // 直接获取阿里云 Provider
      const provider = this.providerFactory.getProvider(DeviceProviderType.ALIYUN_ECP) as any;

      if (!provider) {
        return {
          success: false,
          message: '阿里云云手机 Provider 未配置',
        };
      }

      // 检查 provider 是否有 getConnectionInfo 方法
      if (typeof provider.getConnectionInfo !== 'function') {
        return {
          success: false,
          message: '当前 Provider 不支持连接凭证功能',
        };
      }

      // 直接调用 provider 的 getConnectionInfo 方法（传入 instanceId）
      const connectionInfo = await provider.getConnectionInfo(instanceId);

      // 提取阿里云连接信息
      const aliyunEcp = connectionInfo.aliyunEcp;
      if (!aliyunEcp) {
        return {
          success: false,
          message: '无法获取阿里云连接信息',
        };
      }

      return {
        success: true,
        data: {
          instanceId: aliyunEcp.instanceId,
          ticket: aliyunEcp.webrtcToken,
          taskId: '',
          taskStatus: 'SUCCESS',
          expiresAt: aliyunEcp.tokenExpiresAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`测试获取阿里云连接凭证失败: instanceId=${instanceId}, error=${error.message}`);
      return {
        success: false,
        message: `获取连接凭证失败: ${error.message}`,
      };
    }
  }

  /**
   * 开启阿里云云手机 ADB 连接
   *
   * @param deviceId 设备 ID
   */
  async enableAliyunAdb(deviceId: string): Promise<void> {
    try {
      // 1. 检查设备是否存在且为阿里云云手机
      const device = await this.findOne(deviceId);

      if (device.providerType !== DeviceProviderType.ALIYUN_ECP) {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '此功能仅适用于阿里云云手机设备',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 获取 Provider 并调用 enableAdb
      const provider = this.providerFactory.getProvider(device.providerType) as any;

      if (typeof provider.enableAdb !== 'function') {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '当前 Provider 不支持 ADB 管理功能',
          HttpStatus.BAD_REQUEST,
        );
      }

      await provider.enableAdb(device.externalId || device.id);

      this.logger.log(`阿里云 ADB 已开启: deviceId=${deviceId}`);
    } catch (error) {
      this.logger.error(`开启阿里云 ADB 失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `开启 ADB 失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 关闭阿里云云手机 ADB 连接
   *
   * @param deviceId 设备 ID
   */
  async disableAliyunAdb(deviceId: string): Promise<void> {
    try {
      // 1. 检查设备是否存在且为阿里云云手机
      const device = await this.findOne(deviceId);

      if (device.providerType !== DeviceProviderType.ALIYUN_ECP) {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '此功能仅适用于阿里云云手机设备',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 获取 Provider 并调用 disableAdb
      const provider = this.providerFactory.getProvider(device.providerType) as any;

      if (typeof provider.disableAdb !== 'function') {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '当前 Provider 不支持 ADB 管理功能',
          HttpStatus.BAD_REQUEST,
        );
      }

      await provider.disableAdb(device.externalId || device.id);

      this.logger.log(`阿里云 ADB 已关闭: deviceId=${deviceId}`);
    } catch (error) {
      this.logger.error(`关闭阿里云 ADB 失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `关闭 ADB 失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取阿里云云手机 ADB 连接信息
   *
   * @param deviceId 设备 ID
   * @returns ADB 连接信息
   */
  async getAliyunAdbInfo(deviceId: string): Promise<{
    adbServletAddress: string;
    adbEnabled: boolean;
  }> {
    try {
      // 1. 检查设备是否存在且为阿里云云手机
      const device = await this.findOne(deviceId);

      if (device.providerType !== DeviceProviderType.ALIYUN_ECP) {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '此功能仅适用于阿里云云手机设备',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 获取 Provider 并调用 getAdbInfo
      const provider = this.providerFactory.getProvider(device.providerType) as any;

      if (typeof provider.getAdbInfo !== 'function') {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_FAILED,
          '当前 Provider 不支持 ADB 信息查询功能',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await provider.getAdbInfo(device.externalId || device.id);
    } catch (error) {
      this.logger.error(`获取阿里云 ADB 信息失败: deviceId=${deviceId}, error=${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        `获取 ADB 信息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
