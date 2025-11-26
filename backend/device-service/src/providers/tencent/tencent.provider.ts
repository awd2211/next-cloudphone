/**
 * TencentProvider - 腾讯云云游戏 GS Provider
 *
 * 腾讯云云游戏 API 集成
 * API 文档: https://cloud.tencent.com/document/product/1162/40727
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
import { TencentGsClient } from './tencent-gs.client';
import { TencentInstanceState, TENCENT_INSTANCE_SPECS } from './tencent.types';

/**
 * 腾讯云实例状态映射
 */
const TENCENT_STATUS_MAP: Record<TencentInstanceState, DeviceProviderStatus> = {
  PENDING: DeviceProviderStatus.CREATING,
  LAUNCH_FAILED: DeviceProviderStatus.ERROR,
  RUNNING: DeviceProviderStatus.RUNNING,
  STOPPED: DeviceProviderStatus.STOPPED,
  STARTING: DeviceProviderStatus.CREATING,
  STOPPING: DeviceProviderStatus.STOPPED,
  REBOOTING: DeviceProviderStatus.CREATING,
  REINSTALLING: DeviceProviderStatus.CREATING,
  SHUTDOWN: DeviceProviderStatus.STOPPED,
  EXPIRED: DeviceProviderStatus.DESTROYED,
  TERMINATING: DeviceProviderStatus.DESTROYING,
};

@Injectable()
export class TencentProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.TENCENT_GS;
  private readonly logger = new Logger(TencentProvider.name);

  constructor(private readonly gsClient: TencentGsClient) {}

  /**
   * 创建云游戏实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Tencent GS instance for user ${config.userId}: ${config.name}`);

    try {
      // 检查客户端是否初始化
      if (!this.gsClient.isInitialized()) {
        await this.gsClient.initialize();
      }

      // 根据配置选择规格
      const instanceType = this.selectSpecByConfig(config);

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      // 获取镜像 ID
      const imageId =
        config.providerSpecificConfig?.imageId ||
        process.env.TENCENT_DEFAULT_IMAGE_ID;

      if (!imageId) {
        throw new InternalServerErrorException('TENCENT_DEFAULT_IMAGE_ID is required');
      }

      const result = await this.gsClient.createAndroidInstance({
        AndroidInstanceName: config.name || `tencent-${config.userId}-${Date.now()}`,
        ImageId: imageId,
        InstanceType: instanceType,
        Zone: config.providerSpecificConfig?.zone,
        InstanceCount: 1,
        Resolution: resolution,
        Fps: config.providerSpecificConfig?.fps || 30,
      });

      if (!result.success || !result.data?.AndroidInstanceIds?.length) {
        throw new InternalServerErrorException(
          `Failed to create instance: ${result.errorMessage}`
        );
      }

      const instanceId = result.data.AndroidInstanceIds[0];

      return {
        id: instanceId,
        name: config.name || `tencent-${instanceId}`,
        status: DeviceProviderStatus.CREATING,
        connectionInfo: {
          providerType: DeviceProviderType.TENCENT_GS,
          tencentGs: {
            instanceId,
            sessionId: '',
          },
        },
        properties: {
          manufacturer: 'Tencent',
          model: `GS-${instanceType}`,
          androidVersion: '11',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: new Date(),
        providerConfig: {
          instanceType,
          imageId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Tencent instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动实例
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Tencent instance: ${deviceId}`);

    const result = await this.gsClient.startAndroidInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start: ${result.errorMessage}`);
    }
  }

  /**
   * 停止实例
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Tencent instance: ${deviceId}`);

    const result = await this.gsClient.stopAndroidInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁实例
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Tencent instance: ${deviceId}`);

    const result = await this.gsClient.destroyAndroidInstances([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }
  }

  /**
   * 获取实例状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.gsClient.describeAndroidInstances({
      AndroidInstanceIds: [deviceId],
    });

    if (!result.success || !result.data?.AndroidInstanceSet?.length) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    const state = result.data.AndroidInstanceSet[0].State as TencentInstanceState;
    return TENCENT_STATUS_MAP[state] || DeviceProviderStatus.ERROR;
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    // 创建会话获取连接信息
    const sessionResult = await this.gsClient.createSession({
      UserId: 'system',
      AndroidInstanceId: deviceId,
    });

    if (!sessionResult.success || !sessionResult.data) {
      throw new InternalServerErrorException(
        `Failed to create session: ${sessionResult.errorMessage}`
      );
    }

    return {
      providerType: DeviceProviderType.TENCENT_GS,
      tencentGs: {
        instanceId: deviceId,
        sessionId: sessionResult.data.SessionId,
        clientSession: sessionResult.data.ServerSession,
        requestId: sessionResult.data.RequestId,
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.gsClient.describeAndroidInstances({
      AndroidInstanceIds: [deviceId],
    });

    if (!result.success || !result.data?.AndroidInstanceSet?.length) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const instance = result.data.AndroidInstanceSet[0];

    return {
      manufacturer: 'Tencent',
      model: `GS-${instance.InstanceType || 'Unknown'}`,
      androidVersion: '11',
      serialNumber: instance.AndroidInstanceId,
      resolution: instance.Resolution,
      custom: {
        zone: instance.Zone || '',
        imageId: instance.ImageId || '',
        fps: instance.Fps?.toString() || '30',
        hostSerialNumber: instance.HostSerialNumber || '',
      },
    };
  }

  /**
   * 获取设备指标 (腾讯云暂不提供详细指标 API)
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
      supportsAdb: false, // 腾讯云使用 WebRTC，不直接暴露 ADB
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
      supportsCamera: false,
      supportsMicrophone: true,
    };
  }

  /**
   * 截图
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    this.logger.log(`Taking screenshot for ${deviceId}`);

    const result = await this.gsClient.captureAndroidInstanceScreen(deviceId);

    if (!result.success || !result.data?.ImageUrl) {
      throw new InternalServerErrorException(`Failed to capture screenshot: ${result.errorMessage}`);
    }

    // 下载截图
    const response = await fetch(result.data.ImageUrl);
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

    const applicationId = options.packageName || options.apkPath;

    const result = await this.gsClient.installAndroidInstancesApp([deviceId], applicationId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to install app: ${result.errorMessage}`);
    }

    return result.data.TaskId;
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from ${deviceId}: ${packageName}`);

    const result = await this.gsClient.uninstallAndroidInstancesApp([deviceId], packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to uninstall app: ${result.errorMessage}`);
    }
  }

  /**
   * 推送文件
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to ${deviceId}: ${options.localPath}`);

    const result = await this.gsClient.uploadFileToAndroidInstance(
      deviceId,
      options.localPath, // 需要是可访问的 URL
      options.remotePath
    );

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to push file: ${result.errorMessage}`);
    }
  }

  // ============================================================
  // 以下方法需要通过 WebRTC 数据通道实现
  // ============================================================

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events should be sent via Tencent GS SDK data channel.'
    );
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events should be sent via Tencent GS SDK data channel.'
    );
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events should be sent via Tencent GS SDK data channel.'
    );
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input should be sent via Tencent GS SDK data channel.'
    );
  }

  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('File pull not supported by Tencent GS');
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
      return TENCENT_INSTANCE_SPECS.BASIC_L1;
    }
    if (cpuCores >= 4 && memoryMB >= 8192) {
      return TENCENT_INSTANCE_SPECS.BASIC_M1;
    }
    return TENCENT_INSTANCE_SPECS.BASIC_S1;
  }
}
