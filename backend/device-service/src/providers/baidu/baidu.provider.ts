/**
 * BaiduProvider - 百度智能云云手机 BAC Provider
 *
 * 百度云手机 API 集成
 * API 文档: https://cloud.baidu.com/doc/ARMCM/s/2kei7tyr3
 */

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotImplementedException,
} from '@nestjs/common';
import { IDeviceProvider } from '../device-provider.interface';
import {
  DeviceProviderType,
  DeviceProviderStatus,
  DeviceCreateConfig,
  ProviderDevice,
  ConnectionInfo,
  DeviceProperties,
  DeviceMetrics,
  DeviceCapabilities,
  TouchEvent,
  SwipeEvent,
  KeyEvent,
  TextInput,
  FileTransferOptions,
  AppInstallOptions,
  CaptureFormat,
} from '../provider.types';
import { BaiduBacClient } from './baidu-bac.client';
import { BaiduInstanceStatus, BAIDU_INSTANCE_SPECS } from './baidu.types';

/**
 * 百度云实例状态映射
 */
const BAIDU_STATUS_MAP: Record<BaiduInstanceStatus, DeviceProviderStatus> = {
  Creating: DeviceProviderStatus.CREATING,
  Starting: DeviceProviderStatus.CREATING,
  Running: DeviceProviderStatus.RUNNING,
  Stopping: DeviceProviderStatus.STOPPED,
  Stopped: DeviceProviderStatus.STOPPED,
  Restarting: DeviceProviderStatus.CREATING,
  Releasing: DeviceProviderStatus.DESTROYING,
  Released: DeviceProviderStatus.DESTROYED,
  Error: DeviceProviderStatus.ERROR,
};

@Injectable()
export class BaiduProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.BAIDU_BAC;
  private readonly logger = new Logger(BaiduProvider.name);

  constructor(private readonly bacClient: BaiduBacClient) {}

  /**
   * 创建云手机实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Baidu BAC instance for user ${config.userId}: ${config.name}`);

    try {
      // 检查客户端是否初始化
      if (!this.bacClient.isInitialized()) {
        await this.bacClient.initialize();
      }

      // 根据配置选择规格
      const spec = this.selectSpecByConfig(config);

      // 获取镜像 ID
      const imageId =
        config.providerSpecificConfig?.imageId ||
        process.env.BAIDU_DEFAULT_IMAGE_ID;

      if (!imageId) {
        throw new InternalServerErrorException('BAIDU_DEFAULT_IMAGE_ID is required');
      }

      const result = await this.bacClient.createInstance({
        instanceName: config.name || `baidu-${config.userId}-${Date.now()}`,
        spec,
        imageId,
        zone: config.providerSpecificConfig?.zone,
        purchaseCount: 1,
        billing: {
          paymentTiming: config.providerSpecificConfig?.paymentTiming || 'Postpaid',
        },
      });

      if (!result.success || !result.data?.instanceIds?.length) {
        throw new InternalServerErrorException(
          `Failed to create instance: ${result.errorMessage}`
        );
      }

      const instanceId = result.data.instanceIds[0];

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      return {
        id: instanceId,
        name: config.name || `baidu-${instanceId}`,
        status: DeviceProviderStatus.CREATING,
        connectionInfo: {
          providerType: DeviceProviderType.BAIDU_BAC,
          baiduBac: {
            instanceId,
            serverToken: '',
            connectUrl: '',
            expiresAt: new Date(),
          },
        },
        properties: {
          manufacturer: 'Baidu',
          model: `BAC-${spec}`,
          androidVersion: '11',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: new Date(),
        providerConfig: {
          spec,
          imageId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Baidu instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动实例
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Baidu instance: ${deviceId}`);

    const result = await this.bacClient.startInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start: ${result.errorMessage}`);
    }
  }

  /**
   * 停止实例
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Baidu instance: ${deviceId}`);

    const result = await this.bacClient.stopInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁实例
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Baidu instance: ${deviceId}`);

    const result = await this.bacClient.releaseInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }
  }

  /**
   * 获取实例状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.bacClient.getInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    const status = result.data.status as BaiduInstanceStatus;
    return BAIDU_STATUS_MAP[status] || DeviceProviderStatus.ERROR;
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    // 获取 Server Token
    const tokenResult = await this.bacClient.getServerToken(deviceId);

    if (!tokenResult.success || !tokenResult.data) {
      throw new InternalServerErrorException(
        `Failed to get server token: ${tokenResult.errorMessage}`
      );
    }

    return {
      providerType: DeviceProviderType.BAIDU_BAC,
      baiduBac: {
        instanceId: deviceId,
        serverToken: tokenResult.data.serverToken,
        connectUrl: tokenResult.data.connectUrl,
        expiresAt: new Date(tokenResult.data.expireTime),
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.bacClient.getInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const instance = result.data;

    return {
      manufacturer: 'Baidu',
      model: `BAC-${instance.spec || 'Unknown'}`,
      androidVersion: '11',
      serialNumber: instance.instanceId,
      custom: {
        zone: instance.zone || '',
        imageId: instance.imageId || '',
        internalIp: instance.internalIp || '',
        publicIp: instance.publicIp || '',
        createTime: instance.createTime || '',
        expireTime: instance.expireTime || '',
      },
    };
  }

  /**
   * 获取设备指标 (百度云暂不提供详细指标 API)
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsed: 0,
      storageUsed: 0,
      batteryLevel: 100,
      timestamp: new Date(),
    };
  }

  /**
   * 获取设备能力
   */
  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: false, // 百度云使用自有 SDK
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsScreenshot: true,
      supportsRecording: false,
      supportsLocationMocking: false,
      supportsRotation: true,
      supportsCamera: true,
      supportsMicrophone: true,
    };
  }

  /**
   * 截图
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    this.logger.log(`Taking screenshot for ${deviceId}`);

    const result = await this.bacClient.screenshot(deviceId);

    if (!result.success || !result.data?.imageUrl) {
      throw new InternalServerErrorException(`Failed to capture screenshot: ${result.errorMessage}`);
    }

    // 下载截图
    const response = await fetch(result.data.imageUrl);
    if (!response.ok) {
      throw new InternalServerErrorException(`Failed to download screenshot`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on ${deviceId}`);

    // 百度云需要 APK 先上传到 BOS
    const bosPath = options.apkPath;

    const result = await this.bacClient.installApp([deviceId], bosPath);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to install app: ${result.errorMessage}`);
    }

    return result.data.taskId;
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from ${deviceId}: ${packageName}`);

    const result = await this.bacClient.uninstallApp([deviceId], packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to uninstall app: ${result.errorMessage}`);
    }
  }

  /**
   * 启动应用
   */
  async startApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Starting app on ${deviceId}: ${packageName}`);

    const result = await this.bacClient.startApp(deviceId, packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start app: ${result.errorMessage}`);
    }
  }

  /**
   * 停止应用
   */
  async stopApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Stopping app on ${deviceId}: ${packageName}`);

    const result = await this.bacClient.stopApp(deviceId, packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop app: ${result.errorMessage}`);
    }
  }

  /**
   * 推送文件
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to ${deviceId}: ${options.localPath}`);

    const result = await this.bacClient.uploadFile(
      deviceId,
      options.localPath, // 需要是 BOS 路径
      options.remotePath
    );

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to push file: ${result.errorMessage}`);
    }
  }

  /**
   * 拉取文件
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pulling file from ${deviceId}: ${options.remotePath}`);

    const result = await this.bacClient.downloadFile(
      deviceId,
      options.remotePath,
      options.localPath // 需要是 BOS 路径
    );

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to pull file: ${result.errorMessage}`);
    }
  }

  // ============================================================
  // 以下方法需要通过百度 SDK 数据通道实现
  // ============================================================

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events should be sent via Baidu BAC SDK data channel.'
    );
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events should be sent via Baidu BAC SDK data channel.'
    );
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events should be sent via Baidu BAC SDK data channel.'
    );
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input should be sent via Baidu BAC SDK data channel.'
    );
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 根据配置选择规格
   */
  private selectSpecByConfig(config: DeviceCreateConfig): string {
    const { cpuCores, memoryMB } = config;

    if (cpuCores >= 8 && memoryMB >= 16384) {
      return BAIDU_INSTANCE_SPECS.BASIC_LARGE;
    }
    if (cpuCores >= 4 && memoryMB >= 8192) {
      return BAIDU_INSTANCE_SPECS.BASIC_MEDIUM;
    }
    return BAIDU_INSTANCE_SPECS.BASIC_SMALL;
  }
}
