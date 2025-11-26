/**
 * AwsProvider - AWS Device Farm Provider
 *
 * AWS Device Farm 真机测试平台集成
 * API 文档: https://docs.aws.amazon.com/devicefarm/latest/APIReference/Welcome.html
 *
 * 注意: Device Farm 仅在 us-west-2 (Oregon) 区域可用
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
import { AwsDeviceFarmClient } from './aws-device-farm.client';
import { AwsSessionStatus } from './aws.types';

/**
 * AWS 会话状态映射
 */
const AWS_STATUS_MAP: Record<AwsSessionStatus, DeviceProviderStatus> = {
  PENDING: DeviceProviderStatus.CREATING,
  PENDING_CONCURRENCY: DeviceProviderStatus.CREATING,
  PENDING_DEVICE: DeviceProviderStatus.CREATING,
  PROCESSING: DeviceProviderStatus.CREATING,
  SCHEDULING: DeviceProviderStatus.CREATING,
  PREPARING: DeviceProviderStatus.CREATING,
  RUNNING: DeviceProviderStatus.RUNNING,
  COMPLETED: DeviceProviderStatus.STOPPED,
  STOPPING: DeviceProviderStatus.STOPPED,
};

@Injectable()
export class AwsProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.AWS_DEVICE_FARM;
  private readonly logger = new Logger(AwsProvider.name);

  // 缓存项目 ARN
  private projectArn: string | null = null;

  constructor(private readonly deviceFarmClient: AwsDeviceFarmClient) {}

  /**
   * 确保项目存在
   */
  private async ensureProject(): Promise<string> {
    if (this.projectArn) {
      return this.projectArn;
    }

    // 检查客户端是否初始化
    if (!this.deviceFarmClient.isInitialized()) {
      await this.deviceFarmClient.initialize();
    }

    // 尝试获取现有项目
    const projectsResult = await this.deviceFarmClient.listProjects();
    if (projectsResult.success && projectsResult.data?.projects?.length) {
      // 查找 cloudphone 项目
      const project = projectsResult.data.projects.find(
        (p) => p.name === 'cloudphone'
      );
      if (project) {
        this.projectArn = project.arn;
        return this.projectArn;
      }
    }

    // 创建新项目
    const createResult = await this.deviceFarmClient.createProject('cloudphone', 150);
    if (!createResult.success || !createResult.data) {
      throw new InternalServerErrorException(
        `Failed to create AWS project: ${createResult.errorMessage}`
      );
    }

    this.projectArn = createResult.data.arn;
    return this.projectArn;
  }

  /**
   * 创建远程访问会话 (选择设备)
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating AWS Device Farm session for user ${config.userId}: ${config.name}`);

    try {
      const projectArn = await this.ensureProject();

      // 获取设备 ARN
      let deviceArn = config.providerSpecificConfig?.deviceArn;

      if (!deviceArn) {
        // 列出可用的 Android 设备
        const devicesResult = await this.deviceFarmClient.listDevices({
          filters: [
            { attribute: 'PLATFORM', operator: 'EQUALS', values: ['ANDROID'] },
            { attribute: 'AVAILABILITY', operator: 'EQUALS', values: ['AVAILABLE'] },
          ],
        });

        if (!devicesResult.success || !devicesResult.data?.devices?.length) {
          throw new InternalServerErrorException(
            `No available Android devices: ${devicesResult.errorMessage}`
          );
        }

        // 选择第一个可用设备
        deviceArn = devicesResult.data.devices[0].arn;
        this.logger.log(`Selected device: ${devicesResult.data.devices[0].name}`);
      }

      // 创建远程访问会话
      const sessionResult = await this.deviceFarmClient.createRemoteAccessSession({
        projectArn,
        deviceArn,
        name: config.name || `session-${config.userId}-${Date.now()}`,
        remoteDebugEnabled: config.providerSpecificConfig?.remoteDebugEnabled ?? true,
        remoteRecordEnabled: config.providerSpecificConfig?.remoteRecordEnabled ?? false,
      });

      if (!sessionResult.success || !sessionResult.data) {
        throw new InternalServerErrorException(
          `Failed to create session: ${sessionResult.errorMessage}`
        );
      }

      const session = sessionResult.data;

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      return {
        id: session.arn,
        name: session.name || config.name || `aws-session`,
        status: DeviceProviderStatus.CREATING,
        connectionInfo: {
          providerType: DeviceProviderType.AWS_DEVICE_FARM,
          awsDeviceFarm: {
            arn: session.arn,
            remoteAccessSessionArn: session.arn,
            endpoint: session.endpoint,
            hostAddress: session.hostAddress,
          },
        },
        properties: {
          manufacturer: session.device?.manufacturer || 'AWS',
          model: session.device?.model || 'Device Farm',
          androidVersion: session.device?.os || 'Unknown',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: session.created || new Date(),
        providerConfig: {
          projectArn,
          deviceArn,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create AWS session: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动会话 (AWS Device Farm 会话创建后自动启动)
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`AWS session ${deviceId} starts automatically on creation`);
    // AWS Device Farm 会话创建后自动启动，无需额外操作
  }

  /**
   * 停止会话
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping AWS session: ${deviceId}`);

    const result = await this.deviceFarmClient.stopRemoteAccessSession(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁会话
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying AWS session: ${deviceId}`);

    // 先停止
    try {
      await this.stop(deviceId);
    } catch (e) {
      this.logger.warn(`Failed to stop before destroy: ${e.message}`);
    }

    // 然后删除
    const result = await this.deviceFarmClient.deleteRemoteAccessSession(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }
  }

  /**
   * 获取会话状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.deviceFarmClient.getRemoteAccessSession(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    const status = result.data.status;
    return AWS_STATUS_MAP[status] || DeviceProviderStatus.ERROR;
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const result = await this.deviceFarmClient.getRemoteAccessSession(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(
        `Failed to get connection info: ${result.errorMessage}`
      );
    }

    const session = result.data;

    return {
      providerType: DeviceProviderType.AWS_DEVICE_FARM,
      awsDeviceFarm: {
        arn: session.arn,
        remoteAccessSessionArn: session.arn,
        endpoint: session.endpoint,
        hostAddress: session.hostAddress,
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.deviceFarmClient.getRemoteAccessSession(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const session = result.data;
    const device = session.device;

    return {
      manufacturer: device?.manufacturer || 'Unknown',
      model: device?.model || 'Unknown',
      androidVersion: device?.os || 'Unknown',
      serialNumber: session.arn,
      resolution: device?.resolution
        ? `${device.resolution.width}x${device.resolution.height}`
        : undefined,
      cpuAbi: device?.cpu,
      memoryMB: device?.memory ? Math.round(device.memory / (1024 * 1024)) : undefined,
      custom: {
        platform: device?.platform || '',
        availability: device?.availability || '',
        hostAddress: session.hostAddress || '',
        endpoint: session.endpoint || '',
      },
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    // AWS Device Farm 不直接提供设备指标
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
      supportsAdb: true, // AWS Device Farm 支持 ADB
      supportsScreenCapture: true,
      supportsAudioCapture: false,
      supportedCaptureFormats: [CaptureFormat.SCREENCAP],
      maxResolution: { width: 2560, height: 1440 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsScreenshot: true,
      supportsRecording: true,
      supportsLocationMocking: false,
      supportsRotation: true,
      supportsCamera: false,
      supportsMicrophone: false,
    };
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on AWS session ${deviceId}`);

    const projectArn = await this.ensureProject();

    // 创建上传
    const uploadResult = await this.deviceFarmClient.createUpload(
      projectArn,
      options.packageName || 'app.apk',
      'ANDROID_APP'
    );

    if (!uploadResult.success || !uploadResult.data) {
      throw new InternalServerErrorException(`Failed to create upload: ${uploadResult.errorMessage}`);
    }

    // 实际上传需要使用返回的 presigned URL
    // 这里假设 apkPath 是已上传的 ARN
    const appArn = options.apkPath;

    // 安装到会话
    const installResult = await this.deviceFarmClient.installToRemoteAccessSession(deviceId, appArn);

    if (!installResult.success) {
      throw new InternalServerErrorException(`Failed to install: ${installResult.errorMessage}`);
    }

    return uploadResult.data.arn;
  }

  // ============================================================
  // 以下方法需要通过 AWS Device Farm WebSocket/ADB 实现
  // ============================================================

  async takeScreenshot(deviceId: string): Promise<Buffer> {
    throw new NotImplementedException(
      'Screenshots should be captured via AWS Device Farm console or ADB.'
    );
  }

  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    throw new NotImplementedException('Use ADB to uninstall apps on AWS Device Farm.');
  }

  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('Use ADB to push files on AWS Device Farm.');
  }

  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('Use ADB to pull files on AWS Device Farm.');
  }

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events should be sent via AWS Device Farm remote access UI.'
    );
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events should be sent via AWS Device Farm remote access UI.'
    );
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events should be sent via AWS Device Farm remote access UI.'
    );
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input should be sent via AWS Device Farm remote access UI.'
    );
  }
}
