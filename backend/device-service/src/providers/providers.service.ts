import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit, ConflictException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { DeviceProviderFactory } from './device-provider.factory';
import { DeviceProviderType, CaptureFormat } from './provider.types';
import {
  QueryCloudSyncDto,
  UpdateProviderConfigDto,
  CloudBillingReconciliationDto,
  ListProviderConfigsDto,
  CreateProviderConfigDto,
  UpdateProviderConfigByIdDto,
} from './dto/provider.dto';
import { ProviderConfig, CloudSyncRecord, CloudBillingReconciliation } from '../entities/provider-config.entity';
import { Device } from '../entities/device.entity';
import { AliyunEcpClient } from './aliyun/aliyun-ecp.client';

/**
 * 提供商管理服务
 * 提供提供商查询、配置管理、健康检查等功能
 */
@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);

  // 内存中存储的提供商配置（与数据库同步）
  private providerConfigs = new Map<DeviceProviderType, any>();

  constructor(
    private readonly providerFactory: DeviceProviderFactory,
    @InjectRepository(ProviderConfig)
    private configRepo: Repository<ProviderConfig>,
    @InjectRepository(CloudSyncRecord)
    private syncRecordRepo: Repository<CloudSyncRecord>,
    @InjectRepository(CloudBillingReconciliation)
    private billingReconciliationRepo: Repository<CloudBillingReconciliation>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @Optional()
    private readonly aliyunEcpClient?: AliyunEcpClient,
  ) {}

  async onModuleInit() {
    // 从数据库加载配置，如果没有则初始化默认配置
    await this.loadOrInitializeConfigs();
  }

  /**
   * 从数据库加载配置或初始化默认配置
   */
  private async loadOrInitializeConfigs() {
    const dbConfigs = await this.configRepo.find();

    if (dbConfigs.length > 0) {
      // 从数据库加载
      for (const config of dbConfigs) {
        this.providerConfigs.set(config.providerType, {
          type: config.providerType,
          enabled: config.enabled,
          priority: config.priority,
          maxDevices: config.maxDevices,
          config: config.config,
        });

        // 如果是阿里云 ECP，更新客户端配置
        if (config.providerType === DeviceProviderType.ALIYUN_ECP && this.aliyunEcpClient) {
          await this.updateAliyunClientConfig(config.config);
        }
      }
      this.logger.log(`Loaded ${dbConfigs.length} provider configurations from database`);
    } else {
      // 初始化默认配置并保存到数据库
      await this.initializeDefaultConfigs();
    }
  }

  /**
   * 更新阿里云 ECP 客户端配置
   * 当数据库配置包含有效凭证时，覆盖环境变量配置
   */
  private async updateAliyunClientConfig(dbConfig: any) {
    if (!this.aliyunEcpClient) {
      return;
    }

    try {
      await this.aliyunEcpClient.updateConfigFromDatabase(dbConfig);
      this.logger.log(
        `Aliyun ECP client config updated from database (source: ${this.aliyunEcpClient.getConfigSource()})`,
      );
    } catch (error) {
      this.logger.warn(`Failed to update Aliyun ECP client config: ${error.message}`);
    }
  }

  /**
   * 初始化默认提供商配置并保存到数据库
   */
  private async initializeDefaultConfigs() {
    const defaultConfigs = [
      {
        providerType: DeviceProviderType.REDROID,
        enabled: true,
        priority: 1,
        maxDevices: 100,
        config: {
          dockerHost: 'unix:///var/run/docker.sock',
          imageRegistry: 'registry.hub.docker.com',
          defaultImage: 'redroid/redroid',
          adbPortStart: 5555,
          adbPortEnd: 5655,
        },
        description: 'Redroid Docker container provider',
      },
      {
        providerType: DeviceProviderType.PHYSICAL,
        enabled: true,
        priority: 2,
        maxDevices: 50,
        config: {
          adbHost: 'localhost',
          adbPort: 5037,
          scrcpyEnabled: true,
          autoDiscovery: false,
        },
        description: 'Physical Android device provider',
      },
      {
        providerType: DeviceProviderType.HUAWEI_CPH,
        enabled: false,
        priority: 3,
        maxDevices: 100,
        config: {
          region: 'cn-north-4',
          accessKeyId: '',
          accessKeySecret: '',
          apiEndpoint: 'https://cph.myhuaweicloud.com',
        },
        description: 'Huawei Cloud Phone provider',
      },
      {
        providerType: DeviceProviderType.ALIYUN_ECP,
        enabled: false,
        priority: 4,
        maxDevices: 100,
        config: {
          region: 'cn-hangzhou',
          accessKeyId: '',
          accessKeySecret: '',
          apiEndpoint: 'https://ecp.aliyuncs.com',
        },
        description: 'Aliyun Elastic Cloud Phone provider',
      },
    ];

    // 保存到数据库并更新内存缓存
    for (const config of defaultConfigs) {
      const entity = this.configRepo.create(config);
      await this.configRepo.save(entity);
      this.providerConfigs.set(config.providerType, {
        type: config.providerType,
        enabled: config.enabled,
        priority: config.priority,
        maxDevices: config.maxDevices,
        config: config.config,
      });
    }

    this.logger.log(`Initialized ${defaultConfigs.length} default provider configurations`);
  }

  /**
   * 获取所有提供商规格
   */
  async getAllProviderSpecs() {
    const providers = this.providerFactory.getAllProviders();
    const specs = [];

    for (const provider of providers) {
      const config = this.providerConfigs.get(provider.providerType) || {};
      const capabilities = await provider.getCapabilities();

      specs.push({
        provider: provider.providerType,
        enabled: config.enabled !== false,
        priority: config.priority || 99,
        maxDevices: config.maxDevices || 100,
        capabilities: {
          supportsAdb: capabilities.supportsAdb,
          supportsScreenCapture: capabilities.supportsScreenCapture,
          supportsAudioCapture: capabilities.supportsAudioCapture || false,
          supportedCaptureFormats: capabilities.supportedCaptureFormats,
          maxResolution: capabilities.maxResolution,
          supportsTouchControl: capabilities.supportsTouchControl,
          supportsKeyboardInput: capabilities.supportsKeyboardInput || true,
          supportsFileTransfer: capabilities.supportsFileTransfer,
          supportsAppInstall: capabilities.supportsAppInstall,
          supportsScreenshot: capabilities.supportsScreenshot || true,
          supportsRecording: capabilities.supportsRecording || false,
          supportsLocationMocking: capabilities.supportsLocationMocking || false,
          supportsNetworkSimulation: capabilities.supportsNetworkSimulation || false,
          supportsRotation: capabilities.supportsRotation || true,
          supportsSensorSimulation: capabilities.supportsSensorSimulation || false,
          supportsCamera: capabilities.supportsCamera || false,
          supportsMicrophone: capabilities.supportsMicrophone || false,
          supportsBatterySimulation: capabilities.supportsBatterySimulation || false,
          supportsSnapshot: capabilities.supportsSnapshot || false,
          supportsAppOperation: capabilities.supportsAppOperation || false,
        },
        specs: this.getProviderSpecs(provider.providerType),
      });
    }

    return specs;
  }

  /**
   * 获取指定提供商的规格列表
   */
  async getProviderSpecsByType(providerType: DeviceProviderType) {
    if (!this.providerFactory.isProviderAvailable(providerType)) {
      throw new NotFoundException(`Provider ${providerType} is not available`);
    }

    const provider = this.providerFactory.getProvider(providerType);
    const config = this.providerConfigs.get(providerType) || {};
    const capabilities = await provider.getCapabilities();

    return {
      provider: providerType,
      enabled: config.enabled !== false,
      capabilities,
      specs: this.getProviderSpecs(providerType),
    };
  }

  /**
   * 获取提供商规格模板（不同提供商有不同的可选规格）
   */
  private getProviderSpecs(providerType: DeviceProviderType) {
    const commonSpecs = [
      { cpuCores: 2, memoryMB: 2048, storageMB: 8192, displayName: '小型' },
      { cpuCores: 4, memoryMB: 4096, storageMB: 16384, displayName: '中型' },
      { cpuCores: 8, memoryMB: 8192, storageMB: 32768, displayName: '大型' },
    ];

    switch (providerType) {
      case DeviceProviderType.REDROID:
        return [
          ...commonSpecs,
          { cpuCores: 1, memoryMB: 1024, storageMB: 4096, displayName: '超小型' },
          { cpuCores: 16, memoryMB: 16384, storageMB: 65536, displayName: '超大型' },
        ];
      case DeviceProviderType.HUAWEI_CPH:
        return [
          { cpuCores: 2, memoryMB: 2048, storageMB: 16000, displayName: 'huawei.cph.s6' },
          { cpuCores: 4, memoryMB: 4096, storageMB: 32000, displayName: 'huawei.cph.m6' },
          { cpuCores: 8, memoryMB: 8192, storageMB: 64000, displayName: 'huawei.cph.l6' },
        ];
      case DeviceProviderType.ALIYUN_ECP:
        return [
          { cpuCores: 2, memoryMB: 2048, storageMB: 8192, displayName: 'ecp.s1.small' },
          { cpuCores: 4, memoryMB: 4096, storageMB: 16384, displayName: 'ecp.s1.medium' },
          { cpuCores: 8, memoryMB: 8192, storageMB: 32768, displayName: 'ecp.s1.large' },
        ];
      case DeviceProviderType.PHYSICAL:
        return [
          { cpuCores: 0, memoryMB: 0, storageMB: 0, displayName: '物理设备（规格由设备决定）' },
        ];
      default:
        return commonSpecs;
    }
  }

  /**
   * 获取云设备同步状态
   * 仅适用于云提供商（Huawei, Aliyun）
   */
  async getCloudSyncStatus(query: QueryCloudSyncDto) {
    const { provider, page = 1, pageSize = 10 } = query;

    // 如果指定了提供商，检查是否为云提供商
    if (provider && ![DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP].includes(provider)) {
      throw new BadRequestException(`Provider ${provider} is not a cloud provider`);
    }

    // 构建查询条件
    const queryBuilder = this.syncRecordRepo.createQueryBuilder('sync');

    if (provider) {
      queryBuilder.where('sync.provider = :provider', { provider });
    } else {
      queryBuilder.where('sync.provider IN (:...providers)', {
        providers: [DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP],
      });
    }

    queryBuilder.orderBy('sync.createdAt', 'DESC');

    const [data, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // 格式化返回数据
    const formattedData = data.map((record) => ({
      id: record.id,
      provider: record.provider,
      status: record.status,
      lastSyncAt: record.completedAt?.toISOString() || record.startedAt?.toISOString(),
      syncedDevices: record.syncedDevices,
      failedDevices: record.failedDevices,
      addedDevices: record.addedDevices,
      removedDevices: record.removedDevices,
      updatedDevices: record.updatedDevices,
      message: record.message,
      durationMs: record.durationMs,
      triggeredBy: record.triggeredBy,
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 手动触发云设备同步
   */
  async triggerCloudSync(provider?: DeviceProviderType, triggeredBy = 'system') {
    if (provider && ![DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP].includes(provider)) {
      throw new BadRequestException(`Provider ${provider} is not a cloud provider`);
    }

    const providersToSync = provider
      ? [provider]
      : [DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP];

    this.logger.log(`Triggering cloud sync for providers: ${providersToSync.join(', ')}`);

    const syncResults = [];

    for (const providerType of providersToSync) {
      // 创建同步记录
      const syncRecord = this.syncRecordRepo.create({
        provider: providerType,
        status: 'running',
        startedAt: new Date(),
        triggeredBy,
        message: 'Sync in progress...',
      });
      await this.syncRecordRepo.save(syncRecord);

      try {
        // 执行同步
        const result = await this.performCloudSync(providerType, syncRecord.id);

        // 更新同步记录
        syncRecord.status = 'success';
        syncRecord.completedAt = new Date();
        syncRecord.durationMs = syncRecord.completedAt.getTime() - syncRecord.startedAt.getTime();
        syncRecord.syncedDevices = result.synced;
        syncRecord.failedDevices = result.failed;
        syncRecord.addedDevices = result.added;
        syncRecord.removedDevices = result.removed;
        syncRecord.updatedDevices = result.updated;
        syncRecord.message = `Sync completed: ${result.synced} devices synced`;
        syncRecord.details = result.details;

        await this.syncRecordRepo.save(syncRecord);
        syncResults.push({ provider: providerType, success: true, ...result });
      } catch (error) {
        // 更新同步记录为失败
        syncRecord.status = 'failed';
        syncRecord.completedAt = new Date();
        syncRecord.durationMs = syncRecord.completedAt.getTime() - syncRecord.startedAt.getTime();
        syncRecord.message = `Sync failed: ${error.message}`;
        await this.syncRecordRepo.save(syncRecord);

        syncResults.push({ provider: providerType, success: false, error: error.message });
        this.logger.error(`Cloud sync failed for ${providerType}: ${error.message}`);
      }
    }

    return {
      success: syncResults.every((r) => r.success),
      message: `Cloud sync completed for ${providersToSync.join(', ')}`,
      providers: providersToSync,
      results: syncResults,
    };
  }

  /**
   * 执行实际的云同步操作
   */
  private async performCloudSync(
    providerType: DeviceProviderType,
    syncRecordId: string,
  ): Promise<{
    synced: number;
    failed: number;
    added: number;
    removed: number;
    updated: number;
    details: any;
  }> {
    const config = this.providerConfigs.get(providerType);
    if (!config?.enabled) {
      throw new Error(`Provider ${providerType} is not enabled`);
    }

    // 获取本地数据库中该提供商的设备
    const localDevices = await this.deviceRepo.find({
      where: { providerType },
      select: ['id', 'externalId', 'status', 'updatedAt'],
    });

    const localDeviceMap = new Map(
      localDevices.map((d) => [d.externalId || d.id, d]),
    );

    // 模拟从云端获取设备列表
    // 实际应该调用 Huawei/Aliyun SDK
    const cloudDevices = await this.fetchCloudDevices(providerType, config.config);

    let added = 0;
    let removed = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ deviceId: string; error: string }> = [];

    // 检查云端设备
    for (const cloudDevice of cloudDevices) {
      const localDevice = localDeviceMap.get(cloudDevice.instanceId);

      if (!localDevice) {
        // 云端存在但本地不存在 - 需要添加
        this.logger.log(`New cloud device found: ${cloudDevice.instanceId}`);
        added++;
        // 实际应该创建本地设备记录
      } else {
        // 检查是否需要更新
        if (cloudDevice.status !== localDevice.status) {
          updated++;
        }
        localDeviceMap.delete(cloudDevice.instanceId);
      }
    }

    // 检查本地有但云端没有的设备
    for (const [instanceId] of localDeviceMap) {
      this.logger.log(`Local device not found in cloud: ${instanceId}`);
      removed++;
      // 实际应该标记或删除本地设备记录
    }

    return {
      synced: cloudDevices.length,
      failed,
      added,
      removed,
      updated,
      details: {
        cloudDeviceIds: cloudDevices.map((d) => d.instanceId),
        localDeviceIds: localDevices.map((d) => d.id),
        errors,
      },
    };
  }

  /**
   * 从云提供商获取设备列表
   */
  private async fetchCloudDevices(
    providerType: DeviceProviderType,
    config: any,
  ): Promise<Array<{ instanceId: string; status: string; metadata: any }>> {
    this.logger.log(`Fetching devices from ${providerType}`);

    // 阿里云 ECP - 使用真实 API
    if (providerType === DeviceProviderType.ALIYUN_ECP && this.aliyunEcpClient) {
      try {
        const result = await this.aliyunEcpClient.describeInstances({
          pageSize: 100,
        });

        if (result.success && result.data) {
          this.logger.log(`Fetched ${result.data.instances.length} instances from Aliyun ECP`);
          return result.data.instances.map((instance) => ({
            instanceId: instance.instanceId,
            status: instance.status,
            metadata: {
              instanceName: instance.instanceName,
              instanceGroupId: instance.instanceGroupId,
              androidVersion: instance.androidVersion,
              resolution: instance.resolution,
              regionId: instance.regionId,
              networkInterfaceIp: instance.networkInterfaceIp,
              publicIp: instance.publicIp,
              adbServletAddress: instance.adbServletAddress,
              gmtCreate: instance.gmtCreate,
            },
          }));
        } else {
          this.logger.warn(`Failed to fetch Aliyun ECP instances: ${result.errorMessage || 'Unknown error'}`);
          return [];
        }
      } catch (error) {
        this.logger.error(`Error fetching Aliyun ECP instances: ${error.message}`);
        throw error;
      }
    }

    // 华为云 CPH - 暂时返回空数组（待实现）
    if (providerType === DeviceProviderType.HUAWEI_CPH) {
      this.logger.warn('Huawei CPH sync not implemented yet');
      return [];
    }

    // 其他提供商暂不支持同步
    this.logger.warn(`Provider ${providerType} does not support cloud sync`);
    return [];
  }

  /**
   * 获取提供商健康状态
   */
  async getProviderHealth() {
    const providers = this.providerFactory.getAllProviders();
    const healthStatus = [];

    for (const provider of providers) {
      try {
        // 检查提供商是否可用
        const isAvailable = this.providerFactory.isProviderAvailable(provider.providerType);
        const config = this.providerConfigs.get(provider.providerType);

        healthStatus.push({
          provider: provider.providerType,
          healthy: isAvailable && config?.enabled !== false,
          enabled: config?.enabled !== false,
          message: isAvailable ? 'Provider is healthy' : 'Provider is not available',
          lastCheck: new Date().toISOString(),
        });
      } catch (error) {
        healthStatus.push({
          provider: provider.providerType,
          healthy: false,
          enabled: false,
          message: error.message,
          lastCheck: new Date().toISOString(),
        });
      }
    }

    return healthStatus;
  }

  /**
   * 获取提供商配置
   */
  async getProviderConfig(providerType: DeviceProviderType) {
    if (!this.providerFactory.isProviderAvailable(providerType)) {
      throw new NotFoundException(`Provider ${providerType} is not available`);
    }

    const config = this.providerConfigs.get(providerType);
    if (!config) {
      throw new NotFoundException(`Configuration for provider ${providerType} not found`);
    }

    return config;
  }

  /**
   * 更新提供商配置
   */
  async updateProviderConfig(providerType: DeviceProviderType, updateDto: UpdateProviderConfigDto) {
    if (!this.providerFactory.isProviderAvailable(providerType)) {
      throw new NotFoundException(`Provider ${providerType} is not available`);
    }

    // 从数据库获取现有配置
    let dbConfig = await this.configRepo.findOne({ where: { providerType } });
    if (!dbConfig) {
      throw new NotFoundException(`Configuration for provider ${providerType} not found in database`);
    }

    // 合并配置
    const existingConfig = this.providerConfigs.get(providerType) || {};
    const mergedConfig = {
      ...existingConfig.config,
      ...updateDto.config,
    };

    // 更新数据库
    dbConfig.enabled = updateDto.enabled ?? dbConfig.enabled;
    dbConfig.priority = updateDto.priority ?? dbConfig.priority;
    dbConfig.maxDevices = updateDto.maxDevices ?? dbConfig.maxDevices;
    dbConfig.config = mergedConfig;
    // description 可以通过 config.description 传入
    if (updateDto.config?.description) {
      dbConfig.description = updateDto.config.description;
    }

    await this.configRepo.save(dbConfig);

    // 更新内存缓存
    const updatedConfig = {
      type: providerType,
      enabled: dbConfig.enabled,
      priority: dbConfig.priority,
      maxDevices: dbConfig.maxDevices,
      config: dbConfig.config,
      description: dbConfig.description,
    };
    this.providerConfigs.set(providerType, updatedConfig);

    // 如果是阿里云 ECP，同步更新客户端配置
    if (providerType === DeviceProviderType.ALIYUN_ECP) {
      await this.updateAliyunClientConfig(mergedConfig);
    }

    this.logger.log(`Updated configuration for provider ${providerType} in database`);

    return {
      success: true,
      message: 'Provider configuration updated successfully',
      config: updatedConfig,
    };
  }

  /**
   * 测试提供商连接
   */
  async testProviderConnection(providerType: DeviceProviderType) {
    if (!this.providerFactory.isProviderAvailable(providerType)) {
      throw new NotFoundException(`Provider ${providerType} is not available`);
    }

    const config = this.providerConfigs.get(providerType);
    if (!config || !config.enabled) {
      throw new BadRequestException(`Provider ${providerType} is not enabled`);
    }

    this.logger.log(`Testing connection for provider ${providerType}`);
    const startTime = Date.now();

    try {
      const provider = this.providerFactory.getProvider(providerType);
      let testResult: { success: boolean; message: string; details?: any };

      switch (providerType) {
        case DeviceProviderType.REDROID:
          // Redroid: 测试 Docker 连接
          testResult = await this.testRedroidConnection(config.config);
          break;

        case DeviceProviderType.PHYSICAL:
          // Physical: 测试 ADB 连接
          testResult = await this.testPhysicalConnection(config.config);
          break;

        case DeviceProviderType.HUAWEI_CPH:
        case DeviceProviderType.ALIYUN_ECP:
          // 云提供商: 测试 API 密钥
          testResult = await this.testCloudProviderConnection(providerType, config.config);
          break;

        default:
          testResult = { success: true, message: 'Provider is available' };
      }

      const latency = Date.now() - startTime;

      return {
        success: testResult.success,
        provider: providerType,
        message: testResult.message,
        details: {
          latency,
          timestamp: new Date().toISOString(),
          ...testResult.details,
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: providerType,
        message: `Connection test failed: ${error.message}`,
        error: error.message,
        details: {
          latency: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * 测试 Redroid Docker 连接
   */
  private async testRedroidConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const Docker = require('dockerode');
      const docker = new Docker({ socketPath: config.dockerHost || '/var/run/docker.sock' });

      // 测试 Docker API 连接
      const info = await docker.info();

      return {
        success: true,
        message: 'Docker connection successful',
        details: {
          dockerVersion: info.ServerVersion,
          containers: info.Containers,
          images: info.Images,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Docker connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试物理设备 ADB 连接
   */
  private async testPhysicalConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // 测试 ADB 服务器
      const { stdout } = await execAsync('adb devices -l', { timeout: 5000 });
      const lines = stdout.trim().split('\n').filter((l: string) => l && !l.includes('List of'));
      const deviceCount = lines.length;

      return {
        success: true,
        message: 'ADB connection successful',
        details: {
          connectedDevices: deviceCount,
          adbHost: config.adbHost || 'localhost',
          adbPort: config.adbPort || 5037,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `ADB connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试云提供商 API 连接
   */
  private async testCloudProviderConnection(
    providerType: DeviceProviderType,
    config: any,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    // 检查必要配置
    if (!config.accessKeyId || !config.accessKeySecret) {
      return {
        success: false,
        message: 'Missing API credentials (accessKeyId or accessKeySecret)',
      };
    }

    if (!config.region) {
      return {
        success: false,
        message: 'Missing region configuration',
      };
    }

    try {
      // 模拟 API 连接测试（实际应调用云 SDK）
      // Huawei: @huaweicloud/huaweicloud-sdk-cph
      // Aliyun: @alicloud/ecp20200709
      const https = require('https');
      const apiEndpoint = config.apiEndpoint;

      // 简单的 HTTPS 连接测试
      await new Promise<void>((resolve, reject) => {
        const url = new URL(apiEndpoint);
        const req = https.request(
          {
            hostname: url.hostname,
            port: 443,
            path: '/',
            method: 'GET',
            timeout: 5000,
          },
          (res: any) => {
            resolve();
          },
        );
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Connection timeout')));
        req.end();
      });

      return {
        success: true,
        message: `${providerType} API endpoint is reachable`,
        details: {
          region: config.region,
          apiEndpoint: config.apiEndpoint,
          credentialsConfigured: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `${providerType} API connection failed: ${error.message}`,
        details: {
          region: config.region,
          apiEndpoint: config.apiEndpoint,
        },
      };
    }
  }

  /**
   * 获取云账单对账数据
   * 用于比对云提供商账单与内部使用记录
   */
  async getCloudBillingReconciliation(query: CloudBillingReconciliationDto) {
    const { provider } = query;

    if (![DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP].includes(provider)) {
      throw new BadRequestException(`Provider ${provider} is not a cloud provider`);
    }

    // 设置默认日期范围：最近30天
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    this.logger.log(`Fetching billing reconciliation for ${provider} from ${startDate} to ${endDate}`);

    // 查询数据库中是否已有对账记录
    const existingReconciliation = await this.billingReconciliationRepo.findOne({
      where: {
        provider,
        periodStart: Between(new Date(startDate), new Date(endDate)),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingReconciliation) {
      return this.formatReconciliationResult(existingReconciliation);
    }

    // 执行新的对账流程
    const reconciliationResult = await this.performBillingReconciliation(provider, startDate, endDate);
    return reconciliationResult;
  }

  /**
   * 执行账单对账流程
   */
  private async performBillingReconciliation(
    provider: DeviceProviderType,
    startDate: string,
    endDate: string,
  ) {
    const config = this.providerConfigs.get(provider);
    if (!config?.enabled) {
      throw new BadRequestException(`Provider ${provider} is not enabled`);
    }

    // 1. 获取内部使用记录
    const internalUsage = await this.getInternalUsageRecords(provider, startDate, endDate);

    // 2. 模拟获取云提供商账单（实际应调用云 SDK）
    const cloudBilling = await this.fetchCloudBilling(provider, config.config, startDate, endDate);

    // 3. 计算差异
    const discrepancy = cloudBilling.totalCost - internalUsage.estimatedCost;
    const discrepancyPercentage =
      internalUsage.estimatedCost > 0
        ? (Math.abs(discrepancy) / internalUsage.estimatedCost) * 100
        : 0;

    // 4. 确定对账状态
    let status: 'matched' | 'discrepancy' | 'error' = 'matched';
    if (discrepancyPercentage > 5) {
      status = 'discrepancy';
    }

    // 5. 保存对账记录
    const reconciliation = this.billingReconciliationRepo.create({
      provider,
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
      cloudTotalCost: cloudBilling.totalCost,
      cloudDeviceCount: cloudBilling.deviceCount,
      internalTotalHours: internalUsage.totalHours,
      internalEstimatedCost: internalUsage.estimatedCost,
      discrepancy,
      discrepancyPercentage,
      status,
      cloudBillingDetails: cloudBilling.details,
      internalRecordDetails: internalUsage.details,
      notes: status === 'matched' ? 'Billing data matched successfully' : `Discrepancy of ${discrepancyPercentage.toFixed(2)}% detected`,
    });

    await this.billingReconciliationRepo.save(reconciliation);
    this.logger.log(`Created billing reconciliation record for ${provider}: ${status}`);

    return this.formatReconciliationResult(reconciliation);
  }

  /**
   * 获取内部使用记录
   */
  private async getInternalUsageRecords(
    providerType: DeviceProviderType,
    startDate: string,
    endDate: string,
  ): Promise<{ totalHours: number; estimatedCost: number; deviceCount: number; details: any }> {
    // 查询该提供商在指定时间段内的设备使用情况
    const devices = await this.deviceRepo.find({
      where: {
        providerType,
        createdAt: Between(new Date(startDate), new Date(endDate)),
      },
      select: ['id', 'status', 'createdAt', 'updatedAt'],
    });

    // 计算使用时长（简化计算）
    const totalHours = devices.reduce((sum, device) => {
      const endTime = device.updatedAt || new Date();
      const startTime = device.createdAt;
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    // 估算成本（假设每小时 0.5 元）
    const hourlyRate = 0.5;
    const estimatedCost = totalHours * hourlyRate;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      deviceCount: devices.length,
      details: {
        deviceIds: devices.map((d) => d.id),
        hourlyRate,
      },
    };
  }

  /**
   * 从云提供商获取账单数据
   */
  private async fetchCloudBilling(
    provider: DeviceProviderType,
    config: any,
    startDate: string,
    endDate: string,
  ): Promise<{ totalCost: number; deviceCount: number; details: any }> {
    // 模拟云账单数据（实际应调用 Huawei/Aliyun Billing API）
    this.logger.log(`Fetching cloud billing for ${provider} from ${startDate} to ${endDate}`);

    // 模拟数据
    const mockTotalCost = Math.random() * 1000 + 500;
    const mockDeviceCount = Math.floor(Math.random() * 50) + 10;

    return {
      totalCost: Math.round(mockTotalCost * 100) / 100,
      deviceCount: mockDeviceCount,
      details: {
        region: config.region,
        billingPeriod: { startDate, endDate },
        currency: 'CNY',
        items: [
          { type: 'compute', cost: mockTotalCost * 0.6 },
          { type: 'storage', cost: mockTotalCost * 0.3 },
          { type: 'network', cost: mockTotalCost * 0.1 },
        ],
      },
    };
  }

  /**
   * 格式化对账结果
   */
  private formatReconciliationResult(reconciliation: CloudBillingReconciliation) {
    return {
      id: reconciliation.id,
      provider: reconciliation.provider,
      period: {
        startDate: reconciliation.periodStart,
        endDate: reconciliation.periodEnd,
      },
      cloudBilling: {
        totalCost: reconciliation.cloudTotalCost,
        deviceCount: reconciliation.cloudDeviceCount,
        details: reconciliation.cloudBillingDetails || {},
      },
      internalRecords: {
        totalUsageHours: reconciliation.internalTotalHours,
        estimatedCost: reconciliation.internalEstimatedCost,
        details: reconciliation.internalRecordDetails || {},
      },
      reconciliation: {
        status: reconciliation.status,
        matched: reconciliation.status === 'matched',
        discrepancy: reconciliation.discrepancy,
        discrepancyPercentage: reconciliation.discrepancyPercentage,
        message: reconciliation.notes,
      },
      createdAt: reconciliation.createdAt,
      updatedAt: reconciliation.updatedAt,
    };
  }

  // ==================== 多账号配置管理方法 ====================

  /**
   * 列出所有提供商配置（支持过滤）
   */
  async listProviderConfigs(query: ListProviderConfigsDto) {
    const { providerType, tenantId, enabled, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.configRepo.createQueryBuilder('config');

    // 添加过滤条件
    if (providerType) {
      queryBuilder.andWhere('config.providerType = :providerType', { providerType });
    }

    if (tenantId) {
      queryBuilder.andWhere('config.tenantId = :tenantId', { tenantId });
    }

    if (enabled !== undefined) {
      queryBuilder.andWhere('config.enabled = :enabled', { enabled });
    }

    // 排序：优先级高的在前，默认配置在前
    queryBuilder.orderBy('config.isDefault', 'DESC');
    queryBuilder.addOrderBy('config.priority', 'ASC');
    queryBuilder.addOrderBy('config.createdAt', 'DESC');

    // 分页
    const [data, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据 ID 获取单个提供商配置
   */
  async getProviderConfigById(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Provider configuration with ID ${id} not found`);
    }

    return config;
  }

  /**
   * 创建新的提供商配置
   */
  async createProviderConfig(createDto: CreateProviderConfigDto) {
    const { name, providerType, tenantId, enabled, priority, maxDevices, config, description, isDefault } = createDto;

    // 检查提供商类型是否支持
    if (!this.providerFactory.isProviderAvailable(providerType)) {
      throw new BadRequestException(`Provider type ${providerType} is not available`);
    }

    // ✅ 验证配置完整性
    this.validateProviderConfig(providerType, config);

    // 检查同名配置是否已存在
    const existingConfig = await this.configRepo.findOne({
      where: { name, providerType, tenantId: tenantId || undefined },
    });

    if (existingConfig) {
      throw new ConflictException(
        `A configuration with name "${name}" already exists for provider ${providerType}`,
      );
    }

    // 如果设置为默认配置，需要将该类型的其他默认配置取消
    if (isDefault) {
      await this.unsetDefaultConfigs(providerType, tenantId);
    }

    // 创建新配置
    const newConfig = this.configRepo.create({
      name,
      providerType,
      tenantId,
      enabled: enabled ?? true,
      priority: priority ?? 1,
      maxDevices: maxDevices ?? 100,
      config,
      description,
      isDefault: isDefault ?? false,
    });

    const savedConfig = await this.configRepo.save(newConfig);

    // 如果启用，更新内存缓存
    if (savedConfig.enabled && savedConfig.isDefault) {
      this.providerConfigs.set(providerType, {
        type: providerType,
        enabled: savedConfig.enabled,
        priority: savedConfig.priority,
        maxDevices: savedConfig.maxDevices,
        config: savedConfig.config,
      });
    }

    this.logger.log(`Created new provider configuration: ${name} (${providerType})`);

    return savedConfig;
  }

  /**
   * 通过 ID 更新提供商配置
   */
  async updateProviderConfigById(id: string, updateDto: UpdateProviderConfigByIdDto) {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Provider configuration with ID ${id} not found`);
    }

    // 如果更新为默认配置，需要将该类型的其他默认配置取消
    if (updateDto.isDefault === true && !config.isDefault) {
      await this.unsetDefaultConfigs(config.providerType, config.tenantId);
    }

    // 检查名称冲突（如果更改了名称）
    if (updateDto.name && updateDto.name !== config.name) {
      const existingConfig = await this.configRepo.findOne({
        where: {
          name: updateDto.name,
          providerType: config.providerType,
          tenantId: config.tenantId || undefined,
          id: Not(id),
        },
      });

      if (existingConfig) {
        throw new ConflictException(
          `A configuration with name "${updateDto.name}" already exists for provider ${config.providerType}`,
        );
      }
    }

    // 合并配置
    if (updateDto.config) {
      config.config = {
        ...config.config,
        ...updateDto.config,
      };
    }

    // ✅ 验证更新后的配置完整性
    if (updateDto.config) {
      this.validateProviderConfig(config.providerType, config.config);
    }

    // 更新其他字段
    if (updateDto.name !== undefined) config.name = updateDto.name;
    if (updateDto.tenantId !== undefined) config.tenantId = updateDto.tenantId;
    if (updateDto.enabled !== undefined) config.enabled = updateDto.enabled;
    if (updateDto.priority !== undefined) config.priority = updateDto.priority;
    if (updateDto.maxDevices !== undefined) config.maxDevices = updateDto.maxDevices;
    if (updateDto.description !== undefined) config.description = updateDto.description;
    if (updateDto.isDefault !== undefined) config.isDefault = updateDto.isDefault;

    const updatedConfig = await this.configRepo.save(config);

    // 更新内存缓存（如果是默认配置且启用）
    if (updatedConfig.enabled && updatedConfig.isDefault) {
      this.providerConfigs.set(updatedConfig.providerType, {
        type: updatedConfig.providerType,
        enabled: updatedConfig.enabled,
        priority: updatedConfig.priority,
        maxDevices: updatedConfig.maxDevices,
        config: updatedConfig.config,
      });
    } else if (!updatedConfig.enabled || !updatedConfig.isDefault) {
      // 如果禁用或取消默认，需要从缓存中移除或加载新的默认配置
      await this.reloadDefaultConfigForProvider(updatedConfig.providerType);
    }

    this.logger.log(`Updated provider configuration: ${updatedConfig.name} (ID: ${id})`);

    return updatedConfig;
  }

  /**
   * 删除提供商配置
   */
  async deleteProviderConfig(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Provider configuration with ID ${id} not found`);
    }

    // 检查是否有设备正在使用此配置
    const devicesUsingConfig = await this.deviceRepo.count({
      where: { providerType: config.providerType },
    });

    if (devicesUsingConfig > 0 && config.isDefault) {
      throw new BadRequestException(
        `Cannot delete default configuration: ${devicesUsingConfig} device(s) are using this provider type`,
      );
    }

    await this.configRepo.remove(config);

    // 如果删除的是默认配置，需要重新加载该提供商的配置
    if (config.isDefault) {
      await this.reloadDefaultConfigForProvider(config.providerType);
    }

    this.logger.log(`Deleted provider configuration: ${config.name} (ID: ${id})`);

    return {
      success: true,
      message: `Configuration ${config.name} deleted successfully`,
    };
  }

  /**
   * 测试特定配置的连接
   */
  async testProviderConfigById(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Provider configuration with ID ${id} not found`);
    }

    if (!config.enabled) {
      throw new BadRequestException(`Configuration ${config.name} is disabled`);
    }

    this.logger.log(`Testing connection for configuration: ${config.name} (${config.providerType})`);
    const startTime = Date.now();

    try {
      let testResult: { success: boolean; message: string; details?: any };

      switch (config.providerType) {
        case DeviceProviderType.REDROID:
          testResult = await this.testRedroidConnection(config.config);
          break;

        case DeviceProviderType.PHYSICAL:
          testResult = await this.testPhysicalConnection(config.config);
          break;

        case DeviceProviderType.HUAWEI_CPH:
        case DeviceProviderType.ALIYUN_ECP:
          testResult = await this.testCloudProviderConnection(config.providerType, config.config);
          break;

        default:
          testResult = { success: true, message: 'Provider is available' };
      }

      const latency = Date.now() - startTime;

      // 更新测试状态
      config.lastTestedAt = new Date();
      config.testStatus = testResult.success ? 'success' : 'failed';
      config.testMessage = testResult.message;
      await this.configRepo.save(config);

      return {
        success: testResult.success,
        configId: id,
        configName: config.name,
        provider: config.providerType,
        message: testResult.message,
        details: {
          latency,
          timestamp: new Date().toISOString(),
          ...testResult.details,
        },
      };
    } catch (error) {
      // 更新测试状态为失败
      config.lastTestedAt = new Date();
      config.testStatus = 'failed';
      config.testMessage = error.message;
      await this.configRepo.save(config);

      return {
        success: false,
        configId: id,
        configName: config.name,
        provider: config.providerType,
        message: `Connection test failed: ${error.message}`,
        error: error.message,
        details: {
          latency: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * 设置为默认配置
   */
  async setDefaultProviderConfig(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Provider configuration with ID ${id} not found`);
    }

    if (!config.enabled) {
      throw new BadRequestException(`Cannot set disabled configuration as default`);
    }

    if (config.isDefault) {
      return {
        success: true,
        message: `Configuration ${config.name} is already the default`,
        config,
      };
    }

    // 取消该类型的其他默认配置
    await this.unsetDefaultConfigs(config.providerType, config.tenantId);

    // 设置为默认
    config.isDefault = true;
    const updatedConfig = await this.configRepo.save(config);

    // 更新内存缓存
    this.providerConfigs.set(config.providerType, {
      type: config.providerType,
      enabled: config.enabled,
      priority: config.priority,
      maxDevices: config.maxDevices,
      config: config.config,
    });

    this.logger.log(`Set ${config.name} as default configuration for ${config.providerType}`);

    return {
      success: true,
      message: `Configuration ${config.name} set as default successfully`,
      config: updatedConfig,
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 验证提供商配置的完整性和正确性
   *
   * @param providerType 提供商类型
   * @param config 配置对象
   * @throws BadRequestException 如果配置不完整或不正确
   */
  private validateProviderConfig(providerType: DeviceProviderType, config: any): void {
    if (!config) {
      throw new BadRequestException(`Configuration is required for provider ${providerType}`);
    }

    switch (providerType) {
      case DeviceProviderType.HUAWEI_CPH:
        this.validateHuaweiCphConfig(config);
        break;

      case DeviceProviderType.ALIYUN_ECP:
        this.validateAliyunEcpConfig(config);
        break;

      case DeviceProviderType.REDROID:
        this.validateRedroidConfig(config);
        break;

      case DeviceProviderType.PHYSICAL:
        this.validatePhysicalConfig(config);
        break;

      default:
        // 未知提供商类型，不进行验证
        this.logger.warn(`No validation rules for provider type: ${providerType}`);
    }
  }

  /**
   * 验证华为云手机配置
   */
  private validateHuaweiCphConfig(config: any): void {
    const errors: string[] = [];

    // 必需字段验证
    if (!config.projectId && !config.project_id) {
      errors.push('projectId is required for Huawei CPH');
    }

    if (!config.accessKeyId && !config.access_key_id) {
      errors.push('accessKeyId is required for Huawei CPH');
    }

    if (!config.secretAccessKey && !config.secret_access_key && !config.accessKeySecret) {
      errors.push('secretAccessKey is required for Huawei CPH');
    }

    if (!config.region) {
      errors.push('region is required for Huawei CPH');
    }

    // 格式验证
    if (config.region && !config.region.match(/^[a-z]{2}-[a-z]+-\d+$/)) {
      errors.push('Invalid region format. Expected format: cn-north-4, cn-south-1, etc.');
    }

    // 抛出所有验证错误
    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid Huawei CPH configuration:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
      );
    }

    // 可选字段的警告
    if (!config.defaultServerId && !config.default_server_id) {
      this.logger.warn('Huawei CPH: defaultServerId not configured. You must specify serverId when creating devices.');
    }

    if (!config.defaultImageId && !config.default_image_id) {
      this.logger.warn('Huawei CPH: defaultImageId not configured. You must specify imageId when creating devices.');
    }
  }

  /**
   * 验证阿里云配置
   */
  private validateAliyunEcpConfig(config: any): void {
    const errors: string[] = [];

    if (!config.accessKeyId && !config.access_key_id) {
      errors.push('accessKeyId is required for Aliyun ECP');
    }

    if (!config.accessKeySecret && !config.secret_access_key) {
      errors.push('accessKeySecret is required for Aliyun ECP');
    }

    if (!config.region) {
      errors.push('region is required for Aliyun ECP');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid Aliyun ECP configuration:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
      );
    }
  }

  /**
   * 验证 Redroid 配置
   */
  private validateRedroidConfig(config: any): void {
    const errors: string[] = [];

    if (!config.dockerHost) {
      errors.push('dockerHost is required for Redroid');
    }

    if (config.dockerHost && !config.dockerHost.match(/^(unix:\/\/|tcp:\/\/|http:\/\/|https:\/\/)/)) {
      errors.push('Invalid dockerHost format. Expected: unix://, tcp://, http://, or https://');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid Redroid configuration:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
      );
    }
  }

  /**
   * 验证物理设备配置
   */
  private validatePhysicalConfig(config: any): void {
    // 物理设备配置较为灵活，只做基本验证
    if (config.adbHost && !config.adbHost.match(/^[a-zA-Z0-9\.\-]+$/)) {
      throw new BadRequestException('Invalid adbHost format for Physical device provider');
    }

    if (config.adbPort && (config.adbPort < 1 || config.adbPort > 65535)) {
      throw new BadRequestException('Invalid adbPort. Must be between 1 and 65535');
    }
  }

  /**
   * 取消指定类型的所有默认配置
   */
  private async unsetDefaultConfigs(providerType: DeviceProviderType, tenantId?: string) {
    const whereConditions: any = {
      providerType,
      isDefault: true,
    };

    if (tenantId) {
      whereConditions.tenantId = tenantId;
    }

    const defaultConfigs = await this.configRepo.find({ where: whereConditions });

    for (const config of defaultConfigs) {
      config.isDefault = false;
      await this.configRepo.save(config);
    }
  }

  /**
   * 重新加载指定提供商的默认配置到内存缓存
   */
  private async reloadDefaultConfigForProvider(providerType: DeviceProviderType) {
    const defaultConfig = await this.configRepo.findOne({
      where: {
        providerType,
        isDefault: true,
        enabled: true,
      },
    });

    if (defaultConfig) {
      this.providerConfigs.set(providerType, {
        type: providerType,
        enabled: defaultConfig.enabled,
        priority: defaultConfig.priority,
        maxDevices: defaultConfig.maxDevices,
        config: defaultConfig.config,
      });
    } else {
      // 如果没有默认配置，从缓存中移除
      this.providerConfigs.delete(providerType);
    }
  }
}
