import {
  Injectable,
  Logger,
  NotImplementedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { IDeviceProvider } from '../device-provider.interface';
import {
  DeviceProviderType,
  DeviceProviderStatus,
  DeviceCapabilities,
  CaptureFormat,
  ConnectionInfo,
  DeviceCreateConfig,
  ProviderDevice,
  TouchEvent,
  SwipeEvent,
  KeyEvent,
  TextInput,
  AppInstallOptions,
  FileTransferOptions,
  DeviceProperties,
  DeviceMetrics,
} from '../provider.types';
import { HuaweiCphClient } from './huawei-cph.client';
import { HuaweiPhoneStatus, HuaweiCphConfig } from './huawei.types';

/**
 * HuaweiProvider
 *
 * 华为云手机 CPH Provider 实现
 *
 * Phase 1: 动态配置支持
 *
 * 特点：
 * - 云手机实例管理
 * - WebRTC 投屏
 * - 云端 ADB 控制
 * - 按需创建/销毁
 * - **多账号配置支持 (NEW)**
 *
 * 限制：
 * - 触控控制需要通过华为 WebRTC 协议
 * - 文件传输需要通过华为云存储
 * - 应用安装需要通过华为应用市场或预装镜像
 */
@Injectable()
export class HuaweiProvider implements IDeviceProvider {
  private readonly logger = new Logger(HuaweiProvider.name);
  readonly providerType = DeviceProviderType.HUAWEI_CPH;

  // 延迟加载的 ProvidersService 引用
  private _providersService: any;

  constructor(
    private readonly moduleRef: ModuleRef,
    private httpService: HttpService,
  ) {}

  /**
   * 延迟获取 ProvidersService，避免循环依赖
   */
  private get providersService(): any {
    if (!this._providersService) {
      // 使用 ModuleRef 延迟获取 ProvidersService
      const { ProvidersService } = require('../providers.service');
      this._providersService = this.moduleRef.get(ProvidersService, { strict: false });
    }
    return this._providersService;
  }

  /**
   * 创建华为云手机实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    try {
      this.logger.log(`Creating Huawei phone for user ${config.userId}`);

      // 获取配置 ID (优先从 providerSpecificConfig 中获取)
      const configId = config.providerSpecificConfig?.configId;

      // 获取华为云客户端 (会自动选择指定配置或默认配置)
      const cphClient = await this.getClientWithConfig(configId);

      // 解析分辨率
      let resolution = '1080x1920';
      if (typeof config.resolution === 'string') {
        resolution = config.resolution;
      } else if (config.resolution) {
        resolution = `${config.resolution.width}x${config.resolution.height}`;
      }

      // 根据配置选择规格
      const specId = this.selectSpecByConfig(config);

      // 创建云手机
      // 从 providerSpecificConfig 中获取华为特定配置
      const imageId = config.providerSpecificConfig?.imageId || '';
      const serverId = config.providerSpecificConfig?.serverId || '';

      const result = await cphClient.createPhone({
        phoneName: config.name || `huawei-${config.userId}-${Date.now()}`,
        specId,
        imageId,
        serverId,
        property: {
          userId: config.userId,
          resolution,
        },
      });

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to create Huawei phone: ${result.errorMessage}`
        );
      }

      const instance = result.data;

      // 返回标准化的 ProviderDevice
      // 在 providerConfig 中保存使用的配置 ID
      const providerDevice: ProviderDevice = {
        id: instance.instanceId,
        name: instance.instanceName,
        status: this.mapHuaweiStatusToProviderStatus(instance.status),
        connectionInfo: {
          providerType: DeviceProviderType.HUAWEI_CPH,
          huaweiCph: {
            instanceId: instance.instanceId,
            accessIp: instance.publicIp || 'unknown',
            accessPort: 8080, // 华为 WebRTC 默认端口
            sessionId: instance.instanceId,
            ticket: 'will-be-fetched-on-connect',
          },
        },
        properties: {
          manufacturer: 'Huawei',
          model: `CPH-${specId}`,
          androidVersion: '10',
          resolution,
          dpi: 480,
        },
        createdAt: new Date(instance.createTime),
        // 保存配置 ID 到 providerConfig (将被存储到 device 表的 provider_config 字段)
        providerConfig: configId ? { configId } : undefined,
      };

      return providerDevice;
    } catch (error) {
      this.logger.error(`Failed to create Huawei phone: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动云手机
   *
   * 注意: 此方法使用默认配置,因为设备已经创建,只需要有权限的账号即可操作
   */
  async start(deviceId: string): Promise<void> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.startPhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to start Huawei phone: ${result.errorMessage}`
      );
    }
  }

  /**
   * 停止云手机
   *
   * 注意: 此方法使用默认配置
   */
  async stop(deviceId: string): Promise<void> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.stopPhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop Huawei phone: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁云手机
   *
   * 注意: 此方法使用默认配置
   */
  async destroy(deviceId: string): Promise<void> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.deletePhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to delete Huawei phone: ${result.errorMessage}`
      );
    }
  }

  /**
   * 获取状态
   *
   * 注意: 此方法使用默认配置
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.getPhone(deviceId);
    if (!result.success || !result.data) {
      return DeviceProviderStatus.ERROR;
    }

    return this.mapHuaweiStatusToProviderStatus(result.data.status);
  }

  /**
   * 获取连接信息
   *
   * 注意: 此方法使用默认配置
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.getConnectionInfo(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(
        `Failed to get connection info: ${result.errorMessage}`
      );
    }

    const connInfo = result.data;

    return {
      providerType: DeviceProviderType.HUAWEI_CPH,
      huaweiCph: {
        instanceId: connInfo.instanceId,
        accessIp: connInfo.webrtc?.signaling || 'unknown',
        accessPort: 8080,
        sessionId: connInfo.webrtc?.sessionId || deviceId,
        ticket: connInfo.webrtc?.ticket || '',
      },
    };
  }

  /**
   * 获取设备属性
   *
   * 注意: 此方法使用默认配置
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.getPhone(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException('Failed to get phone details');
    }

    const instance = result.data;

    return {
      manufacturer: 'Huawei',
      model: `CPH-${instance.specId}`,
      androidVersion: '10',
      serialNumber: instance.instanceId,
      resolution: instance.property?.resolution || '1080x1920',
      dpi: 480,
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    // 华为云手机暂不支持实时指标获取
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsed: 0,
      storageUsed: 0,
      storageUsage: 0,
      networkRx: 0,
      networkTx: 0,
      temperature: 0,
      batteryLevel: 100, // 云手机不需要电池
      timestamp: new Date(),
    };
  }

  /**
   * 获取设备能力
   */
  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true, // ✅ 支持 ADB 命令执行
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC], // 华为使用 WebRTC
      maxResolution: {
        width: 1920,
        height: 1080,
      },
      supportsTouchControl: true, // 通过 WebRTC 控制
      supportsKeyboardInput: true,
      supportsFileTransfer: true, // ✅ 支持通过 OBS 文件传输 (tar 格式)
      supportsAppInstall: true, // ✅ 支持通过 OBS 批量安装 APK
      supportsScreenshot: true,
      supportsRecording: false,
      supportsLocationMocking: true,
      supportsRotation: true,
      supportsCamera: false,
      supportsMicrophone: true,
    };
  }

  /**
   * 重启设备
   *
   * 注意: 此方法使用默认配置
   */
  async rebootDevice(deviceId: string): Promise<void> {
    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.rebootPhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to reboot Huawei phone: ${result.errorMessage}`
      );
    }
  }

  // ==================== 以下方法暂不支持 ====================

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException('Touch events should be sent via Huawei WebRTC channel');
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException('Swipe events should be sent via Huawei WebRTC channel');
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException('Key events should be sent via Huawei WebRTC channel');
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException('Text input should be sent via Huawei WebRTC channel');
  }

  /**
   * 安装应用
   *
   * 使用华为云 OBS 批量安装 APK
   * APK 必须先上传到 OBS 存储桶
   *
   * 注意: 此方法使用默认配置
   *
   * @param deviceId 设备 ID
   * @param options 安装选项
   * @returns Job ID 用于查询安装进度
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on Huawei phone ${deviceId}: ${options.apkPath}`);

    try {
      const cphClient = await this.getClientWithConfig(); // 使用默认配置

      // 从 apkPath 解析 OBS 路径
      // 期望格式: obs://{bucketName}/{objectPath} 或 /{bucketName}/{objectPath}
      const { bucketName, objectPath } = this.parseObsPath(options.apkPath);

      // 调用 SDK 批量安装方法
      const result = await cphClient.installApk([deviceId], bucketName, objectPath);

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to install APK: ${result.errorMessage}`
        );
      }

      // 返回 Job ID
      return result.data.jobId;
    } catch (error) {
      this.logger.error(`Failed to install app: ${error.message}`);
      throw error;
    }
  }

  /**
   * 卸载应用
   *
   * 注意: 此方法使用默认配置
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from Huawei phone ${deviceId}: ${packageName}`);

    const cphClient = await this.getClientWithConfig(); // 使用默认配置
    const result = await cphClient.uninstallApk([deviceId], packageName);

    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to uninstall app: ${result.errorMessage}`
      );
    }
  }

  /**
   * 获取已安装应用列表
   *
   * 通过 ADB 命令执行 pm list packages
   *
   * 注意: 此方法使用默认配置
   */
  async getInstalledApps(deviceId: string): Promise<string[]> {
    this.logger.log(`Getting installed apps for Huawei phone ${deviceId}`);

    try {
      const cphClient = await this.getClientWithConfig(); // 使用默认配置

      // 执行 ADB 命令列出已安装包
      const result = await cphClient.executeAdbCommand(
        deviceId,
        'pm list packages',
        60
      );

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to get installed apps: ${result.errorMessage}`
        );
      }

      // 解析输出: "package:com.example.app\npackage:..."
      const output = result.data.output || '';
      const packages = output
        .split('\n')
        .filter((line) => line.startsWith('package:'))
        .map((line) => line.replace('package:', '').trim())
        .filter((pkg) => pkg.length > 0);

      return packages;
    } catch (error) {
      this.logger.error(`Failed to get installed apps: ${error.message}`);
      throw error;
    }
  }

  /**
   * 推送文件到设备
   *
   * 使用华为云 OBS 推送 tar 格式文件
   *
   * 注意:
   * - 只支持 tar 格式
   * - 文件大小限制 6GB
   * - 默认解压到 /data/local/tmp
   * - 此方法使用默认配置
   *
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to Huawei phone ${deviceId}: ${options.localPath}`);

    try {
      const cphClient = await this.getClientWithConfig(); // 使用默认配置

      // 从 localPath 解析 OBS 路径
      const { bucketName, objectPath } = this.parseObsPath(options.localPath);

      // 验证文件格式 (必须是 tar)
      if (!objectPath.toLowerCase().endsWith('.tar')) {
        throw new InternalServerErrorException(
          'Huawei CPH only supports tar format files. Please compress your data as .tar'
        );
      }

      // 调用 SDK 推送文件
      const result = await cphClient.pushFile(
        [deviceId],
        bucketName,
        objectPath,
        options.remotePath || '/data/local/tmp'
      );

      if (!result.success) {
        throw new InternalServerErrorException(
          `Failed to push file: ${result.errorMessage}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to push file: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从设备拉取文件
   *
   * 使用华为云导出数据到 OBS
   *
   * 注意: 此方法使用默认配置
   *
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pulling file from Huawei phone ${deviceId}: ${options.remotePath}`);

    try {
      const cphClient = await this.getClientWithConfig(); // 使用默认配置

      // 从 localPath 解析 OBS 目标路径
      const { bucketName, objectPath } = this.parseObsPath(options.localPath);

      // 调用 SDK 导出数据
      const result = await cphClient.exportData(
        deviceId,
        options.remotePath,
        bucketName,
        objectPath
      );

      if (!result.success) {
        throw new InternalServerErrorException(
          `Failed to pull file: ${result.errorMessage}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to pull file: ${error.message}`);
      throw error;
    }
  }

  async takeScreenshot(deviceId: string): Promise<Buffer> {
    throw new NotImplementedException('Screenshot should be captured from WebRTC stream');
  }

  async startRecording(deviceId: string, duration?: number): Promise<string> {
    throw new NotImplementedException('Recording should be done on WebRTC stream');
  }

  async stopRecording(deviceId: string, recordingId: string): Promise<Buffer> {
    throw new NotImplementedException('Recording should be done on WebRTC stream');
  }

  async setLocation(deviceId: string, latitude: number, longitude: number): Promise<void> {
    throw new NotImplementedException('Location simulation not yet implemented for Huawei CPH');
  }

  /**
   * 执行 Shell 命令
   *
   * 使用华为云 ADB 命令执行功能
   *
   * 注意: 此方法使用默认配置
   *
   * @param deviceId 设备 ID
   * @param command Shell 命令
   * @returns 命令输出
   */
  async executeShell(deviceId: string, command: string): Promise<string> {
    this.logger.log(`Executing shell command on Huawei phone ${deviceId}: ${command}`);

    try {
      const cphClient = await this.getClientWithConfig(); // 使用默认配置

      // 执行同步 ADB 命令
      const result = await cphClient.executeAdbCommand(deviceId, command, 60);

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to execute shell command: ${result.errorMessage}`
        );
      }

      return result.data.output || '';
    } catch (error) {
      this.logger.error(`Failed to execute shell command: ${error.message}`);
      throw error;
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取华为云配置并创建临时 HuaweiCphClient 实例
   *
   * 配置获取优先级:
   * 1. 如果提供了 configId,使用指定配置
   * 2. 否则使用该提供商类型的默认配置
   * 3. 如果都没有,抛出异常
   *
   * @param configId 可选的配置 ID
   * @returns HuaweiCphClient 实例
   */
  private async getClientWithConfig(configId?: string): Promise<HuaweiCphClient> {
    let providerConfig: any;

    try {
      if (configId) {
        // 使用指定配置
        providerConfig = await this.providersService.getProviderConfigById(configId);
        this.logger.log(`Using specified Huawei CPH config: ${providerConfig.name} (${configId})`);
      } else {
        // 使用默认配置
        providerConfig = await this.providersService.getProviderConfig(DeviceProviderType.HUAWEI_CPH);
        this.logger.log(`Using default Huawei CPH config`);
      }

      // 检查配置是否启用
      if (!providerConfig.enabled && providerConfig.enabled !== undefined) {
        throw new BadRequestException(`Huawei CPH configuration is disabled`);
      }

      // 从配置中提取华为云凭证
      const config = providerConfig.config || {};

      // 构建 HuaweiCphConfig
      const cphConfig: HuaweiCphConfig = {
        projectId: config.projectId || config.project_id || '',
        accessKeyId: config.accessKeyId || config.access_key_id || '',
        secretAccessKey: config.secretAccessKey || config.secret_access_key || config.accessKeySecret || '',
        region: config.region || 'cn-north-4',
        endpoint: config.endpoint || config.apiEndpoint || `https://cph.${config.region || 'cn-north-4'}.myhuaweicloud.com`,
        defaultServerId: config.defaultServerId || config.default_server_id || '',
        defaultImageId: config.defaultImageId || config.default_image_id || '',
      };

      // 验证必要配置
      if (!cphConfig.accessKeyId || !cphConfig.secretAccessKey) {
        throw new BadRequestException(
          `Huawei CPH configuration is incomplete: missing accessKeyId or secretAccessKey`,
        );
      }

      if (!cphConfig.projectId) {
        this.logger.warn(`Huawei CPH projectId not configured, some operations may fail`);
      }

      // 创建临时客户端实例
      return new HuaweiCphClient(cphConfig, this.httpService);
    } catch (error) {
      this.logger.error(`Failed to get Huawei CPH client: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从设备的 providerConfig 中提取配置 ID
   *
   * @param deviceProviderConfig 设备的 providerConfig 字段
   * @returns 配置 ID 或 undefined
   */
  private extractConfigId(deviceProviderConfig: Record<string, any> | null): string | undefined {
    if (!deviceProviderConfig) {
      return undefined;
    }

    return deviceProviderConfig.configId || deviceProviderConfig.config_id;
  }

  /**
   * 解析 OBS 路径
   *
   * 支持格式:
   * - obs://bucket-name/path/to/file.tar
   * - /bucket-name/path/to/file.tar
   * - bucket-name/path/to/file.tar
   *
   * @param path OBS 路径
   * @returns { bucketName, objectPath }
   */
  private parseObsPath(path: string): { bucketName: string; objectPath: string } {
    // 移除 obs:// 前缀
    let normalizedPath = path.replace(/^obs:\/\//, '');

    // 移除开头的 /
    normalizedPath = normalizedPath.replace(/^\//, '');

    // 分割桶名和对象路径
    const parts = normalizedPath.split('/');

    if (parts.length < 2) {
      throw new InternalServerErrorException(
        `Invalid OBS path: ${path}. Expected format: obs://bucket-name/path/to/file or /bucket-name/path/to/file`
      );
    }

    const bucketName = parts[0];
    const objectPath = parts.slice(1).join('/');

    return { bucketName, objectPath };
  }

  /**
   * 根据配置选择规格
   *
   * 优先级：
   * 1. 使用前端传递的 specId (providerSpecificConfig.specId)
   * 2. 如果没有指定 specId，根据 CPU 和内存自动选择规格
   */
  private selectSpecByConfig(config: DeviceCreateConfig): string {
    // ✅ 优先使用前端传递的 specId
    const specId = config.providerSpecificConfig?.specId;
    if (specId) {
      this.logger.log(`Using user-selected specId: ${specId}`);
      return specId;
    }

    // ✅ Fallback: 根据 CPU 和内存自动选择规格
    this.logger.log(
      `No specId specified, auto-selecting based on cpuCores=${config.cpuCores}, memoryMB=${config.memoryMB}`
    );

    if (config.cpuCores >= 8 && config.memoryMB >= 8192) {
      return 'cloudphone.rx1.8xlarge'; // 8核16G
    } else if (config.cpuCores >= 4 && config.memoryMB >= 4096) {
      return 'cloudphone.rx1.4xlarge'; // 4核8G
    } else {
      return 'cloudphone.rx1.2xlarge'; // 2核4G
    }
  }

  /**
   * 映射华为状态到 Provider 状态
   */
  private mapHuaweiStatusToProviderStatus(status: HuaweiPhoneStatus): DeviceProviderStatus {
    switch (status) {
      case HuaweiPhoneStatus.CREATING:
        return DeviceProviderStatus.CREATING;
      case HuaweiPhoneStatus.RUNNING:
        return DeviceProviderStatus.RUNNING;
      case HuaweiPhoneStatus.STOPPED:
        return DeviceProviderStatus.STOPPED;
      case HuaweiPhoneStatus.REBOOTING:
        return DeviceProviderStatus.CREATING; // 重启中映射到创建中
      case HuaweiPhoneStatus.DELETING:
        return DeviceProviderStatus.DESTROYING;
      case HuaweiPhoneStatus.ERROR:
      case HuaweiPhoneStatus.FROZEN:
        return DeviceProviderStatus.ERROR;
      default:
        return DeviceProviderStatus.ERROR; // 未知状态映射到错误
    }
  }
}
