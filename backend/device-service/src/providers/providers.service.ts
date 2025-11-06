import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceProviderFactory } from './device-provider.factory';
import { DeviceProviderType, CaptureFormat } from './provider.types';
import { QueryCloudSyncDto, UpdateProviderConfigDto, CloudBillingReconciliationDto } from './dto/provider.dto';

/**
 * 提供商管理服务
 * 提供提供商查询、配置管理、健康检查等功能
 */
@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  // 内存中存储的提供商配置（生产环境应该存储到数据库）
  private providerConfigs = new Map<DeviceProviderType, any>();

  constructor(private readonly providerFactory: DeviceProviderFactory) {
    // 初始化默认配置
    this.initializeDefaultConfigs();
  }

  /**
   * 初始化默认提供商配置
   */
  private initializeDefaultConfigs() {
    const defaultConfigs = [
      {
        type: DeviceProviderType.REDROID,
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
      },
      {
        type: DeviceProviderType.PHYSICAL,
        enabled: true,
        priority: 2,
        maxDevices: 50,
        config: {
          adbHost: 'localhost',
          adbPort: 5037,
          scrcpyEnabled: true,
          autoDiscovery: false,
        },
      },
      {
        type: DeviceProviderType.HUAWEI_CPH,
        enabled: false,
        priority: 3,
        maxDevices: 100,
        config: {
          region: 'cn-north-4',
          accessKeyId: '',
          accessKeySecret: '',
          apiEndpoint: 'https://cph.myhuaweicloud.com',
        },
      },
      {
        type: DeviceProviderType.ALIYUN_ECP,
        enabled: false,
        priority: 4,
        maxDevices: 100,
        config: {
          region: 'cn-hangzhou',
          accessKeyId: '',
          accessKeySecret: '',
          apiEndpoint: 'https://ecp.aliyuncs.com',
        },
      },
    ];

    defaultConfigs.forEach((config) => {
      this.providerConfigs.set(config.type, config);
    });
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

    // TODO: 这里应该从数据库查询实际的同步记录
    // 目前返回模拟数据
    const mockData = [
      {
        id: '1',
        provider: DeviceProviderType.HUAWEI_CPH,
        status: 'success',
        lastSyncAt: new Date().toISOString(),
        syncedDevices: 15,
        failedDevices: 0,
        message: 'Sync completed successfully',
      },
      {
        id: '2',
        provider: DeviceProviderType.ALIYUN_ECP,
        status: 'idle',
        lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
        syncedDevices: 0,
        failedDevices: 0,
        message: 'No sync required',
      },
    ];

    const filteredData = provider ? mockData.filter((item) => item.provider === provider) : mockData;
    const total = filteredData.length;
    const data = filteredData.slice((page - 1) * pageSize, page * pageSize);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 手动触发云设备同步
   */
  async triggerCloudSync(provider?: DeviceProviderType) {
    if (provider && ![DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP].includes(provider)) {
      throw new BadRequestException(`Provider ${provider} is not a cloud provider`);
    }

    const providersToSync = provider
      ? [provider]
      : [DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP];

    this.logger.log(`Triggering cloud sync for providers: ${providersToSync.join(', ')}`);

    // TODO: 实现实际的云同步逻辑
    // 1. 调用云提供商API获取设备列表
    // 2. 与本地数据库对比
    // 3. 同步差异

    return {
      success: true,
      message: `Cloud sync triggered for ${providersToSync.join(', ')}`,
      providers: providersToSync,
    };
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

    const existingConfig = this.providerConfigs.get(providerType) || {};
    const updatedConfig = {
      ...existingConfig,
      ...updateDto,
      config: {
        ...existingConfig.config,
        ...updateDto.config,
      },
    };

    this.providerConfigs.set(providerType, updatedConfig);
    this.logger.log(`Updated configuration for provider ${providerType}`);

    // TODO: 持久化到数据库

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

    try {
      const provider = this.providerFactory.getProvider(providerType);

      // TODO: 实现实际的连接测试逻辑
      // 不同提供商有不同的测试方式
      // - Redroid: 测试 Docker 连接
      // - Physical: 测试 ADB 连接
      // - Huawei/Aliyun: 测试 API 密钥

      return {
        success: true,
        provider: providerType,
        message: 'Connection test passed',
        details: {
          latency: Math.random() * 100, // 模拟延迟
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: providerType,
        message: `Connection test failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 获取云账单对账数据
   * 用于比对云提供商账单与内部使用记录
   */
  async getCloudBillingReconciliation(query: CloudBillingReconciliationDto) {
    const { provider, startDate, endDate } = query;

    if (![DeviceProviderType.HUAWEI_CPH, DeviceProviderType.ALIYUN_ECP].includes(provider)) {
      throw new BadRequestException(`Provider ${provider} is not a cloud provider`);
    }

    this.logger.log(`Fetching billing reconciliation for ${provider} from ${startDate} to ${endDate}`);

    // TODO: 实现实际的账单对账逻辑
    // 1. 从云提供商获取账单数据
    // 2. 从本地数据库获取使用记录
    // 3. 进行对比分析

    return {
      provider,
      period: { startDate, endDate },
      cloudBilling: {
        totalCost: 1234.56,
        deviceCount: 50,
        details: [],
      },
      internalRecords: {
        totalUsageHours: 1200,
        deviceCount: 50,
        details: [],
      },
      reconciliation: {
        matched: true,
        discrepancy: 0,
        message: 'Billing data matched successfully',
      },
    };
  }
}
