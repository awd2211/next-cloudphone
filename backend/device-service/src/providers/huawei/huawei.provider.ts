import {
  Injectable,
  Logger,
  NotImplementedException,
  InternalServerErrorException,
} from '@nestjs/common';
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
import { HuaweiPhoneStatus } from './huawei.types';

/**
 * HuaweiProvider
 *
 * 华为云手机 CPH Provider 实现
 *
 * Phase 3: 基础实现
 *
 * 特点：
 * - 云手机实例管理
 * - WebRTC 投屏
 * - 云端 ADB 控制
 * - 按需创建/销毁
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

  constructor(private cphClient: HuaweiCphClient) {}

  /**
   * 创建华为云手机实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    try {
      this.logger.log(`Creating Huawei phone for user ${config.userId}`);

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
      const imageId =
        config.providerSpecificConfig?.imageId || process.env.HUAWEI_DEFAULT_IMAGE_ID || 'default';
      const serverId =
        config.providerSpecificConfig?.serverId ||
        process.env.HUAWEI_DEFAULT_SERVER_ID ||
        'default';

      const result = await this.cphClient.createPhone({
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
      return {
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
      };
    } catch (error) {
      this.logger.error(`Failed to create Huawei phone: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动云手机
   */
  async start(deviceId: string): Promise<void> {
    const result = await this.cphClient.startPhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to start Huawei phone: ${result.errorMessage}`
      );
    }
  }

  /**
   * 停止云手机
   */
  async stop(deviceId: string): Promise<void> {
    const result = await this.cphClient.stopPhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop Huawei phone: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁云手机
   */
  async destroy(deviceId: string): Promise<void> {
    const result = await this.cphClient.deletePhone(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Failed to delete Huawei phone: ${result.errorMessage}`
      );
    }
  }

  /**
   * 获取状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.cphClient.getPhone(deviceId);
    if (!result.success || !result.data) {
      return DeviceProviderStatus.ERROR;
    }

    return this.mapHuaweiStatusToProviderStatus(result.data.status);
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const result = await this.cphClient.getConnectionInfo(deviceId);

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
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.cphClient.getPhone(deviceId);

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
      supportsAdb: false, // 华为云手机不直接支持 ADB
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC], // 华为使用 WebRTC
      maxResolution: {
        width: 1920,
        height: 1080,
      },
      supportsTouchControl: true, // 通过 WebRTC 控制
      supportsKeyboardInput: true,
      supportsFileTransfer: false, // 需要通过华为云存储
      supportsAppInstall: false, // 需要通过预装镜像
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
   */
  async rebootDevice(deviceId: string): Promise<void> {
    const result = await this.cphClient.rebootPhone(deviceId);
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

  async installApp(deviceId: string, options: AppInstallOptions): Promise<void> {
    throw new NotImplementedException(
      'App installation requires pre-configured image or Huawei app market'
    );
  }

  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    throw new NotImplementedException('App uninstallation not supported for Huawei CPH');
  }

  async getInstalledApps(deviceId: string): Promise<string[]> {
    throw new NotImplementedException('Listing installed apps not supported for Huawei CPH');
  }

  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('File transfer should use Huawei cloud storage');
  }

  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('File transfer should use Huawei cloud storage');
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

  // ==================== 私有辅助方法 ====================

  /**
   * 根据配置选择规格
   */
  private selectSpecByConfig(config: DeviceCreateConfig): string {
    // 根据 CPU 和内存选择合适的规格
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
