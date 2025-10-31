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
import { AliyunEcpClient } from './aliyun-ecp.client';
import { AliyunPhoneStatus, ALIYUN_PHONE_SPECS } from './aliyun.types';

/**
 * AliyunProvider - 阿里云国际云手机 ECP Provider
 *
 * Phase 4: 阿里云云手机集成
 *
 * 特点：
 * - WebRTC 投屏 (Token 有效期 30 秒)
 * - 支持 ADB 连接 (需公网 IP)
 * - 多地域部署 (cn-hangzhou, ap-southeast-1, etc.)
 * - 按量付费或包年包月
 *
 * 限制：
 * - WebRTC Token 30 秒过期，需频繁刷新
 * - 触控和键盘输入通过 WebRTC 数据通道
 * - 文件传输需通过 ADB 或 OSS
 * - 应用安装需预装镜像或 ADB
 *
 * 文档：
 * - https://www.alibabacloud.com/help/en/elastic-cloud-phone
 */
@Injectable()
export class AliyunProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.ALIYUN_ECP;
  private readonly logger = new Logger(AliyunProvider.name);

  constructor(private readonly ecpClient: AliyunEcpClient) {}

  /**
   * 创建云手机实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Aliyun ECP phone for user ${config.userId}: ${config.name}`);

    try {
      // 根据配置选择规格
      const instanceType = this.selectInstanceTypeByConfig(config);

      // 从 providerSpecificConfig 获取阿里云特定配置
      const regionId =
        config.providerSpecificConfig?.regionId || process.env.ALIYUN_REGION || 'cn-hangzhou';
      const zoneId =
        config.providerSpecificConfig?.zoneId ||
        process.env.ALIYUN_DEFAULT_ZONE_ID ||
        `${regionId}-b`;
      const imageId =
        config.providerSpecificConfig?.imageId || process.env.ALIYUN_DEFAULT_IMAGE_ID || 'default';
      const chargeType = config.providerSpecificConfig?.chargeType || 'PostPaid';

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      // 创建云手机
      const result = await this.ecpClient.createPhone({
        instanceName: config.name || `aliyun-${config.userId}-${Date.now()}`,
        instanceType,
        imageId,
        regionId,
        zoneId,
        chargeType,
        amount: 1,
        securityGroupId:
          config.providerSpecificConfig?.securityGroupId ||
          process.env.ALIYUN_DEFAULT_SECURITY_GROUP_ID,
        vSwitchId:
          config.providerSpecificConfig?.vSwitchId || process.env.ALIYUN_DEFAULT_VSWITCH_ID,
        description: `Cloud phone for user ${config.userId}`,
        property: {
          userId: config.userId,
          resolution,
          createdBy: 'device-service',
        },
      });

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to create Aliyun phone: ${result.errorMessage}`
        );
      }

      const instance = result.data;

      // 返回标准化的 ProviderDevice
      return {
        id: instance.instanceId,
        name: instance.instanceName,
        status: this.mapAliyunStatusToProviderStatus(instance.status),
        connectionInfo: {
          providerType: DeviceProviderType.ALIYUN_ECP,
          aliyunEcp: {
            instanceId: instance.instanceId,
            webrtcToken: 'will-be-fetched-on-connect',
            webrtcUrl: `wss://ecp-stream.${regionId}.aliyuncs.com/stream/${instance.instanceId}`,
            tokenExpiresAt: new Date(Date.now() + 30000), // 30秒后
          },
        },
        properties: {
          manufacturer: 'Aliyun',
          model: `ECP-${instanceType}`,
          androidVersion: instance.systemVersion || '11',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: new Date(instance.creationTime),
        providerConfig: {
          regionId,
          zoneId,
          instanceType,
          chargeType,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Aliyun phone: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动云手机
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Aliyun phone: ${deviceId}`);

    const result = await this.ecpClient.startInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start: ${result.errorMessage}`);
    }
  }

  /**
   * 停止云手机
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Aliyun phone: ${deviceId}`);

    const result = await this.ecpClient.stopInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁云手机
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Aliyun phone: ${deviceId}`);

    const result = await this.ecpClient.deleteInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }
  }

  /**
   * 获取云手机状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.ecpClient.describeInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    return this.mapAliyunStatusToProviderStatus(result.data.status);
  }

  /**
   * 获取连接信息
   *
   * 注意：阿里云 ECP 的 WebRTC Token 有效期只有 30 秒，需要客户端及时使用
   * 如果 Token 过期，需要重新调用此方法获取新的 Token
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const result = await this.ecpClient.getConnectionInfo(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(
        `Failed to get connection info: ${result.errorMessage}`
      );
    }

    const connInfo = result.data;

    return {
      providerType: DeviceProviderType.ALIYUN_ECP,
      aliyunEcp: {
        instanceId: connInfo.instanceId,
        webrtcToken: connInfo.token,
        webrtcUrl: connInfo.streamUrl,
        tokenExpiresAt: new Date(connInfo.expireTime),
        adbPublicKey: connInfo.adbPublicKey,
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.ecpClient.describeInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const instance = result.data;

    return {
      manufacturer: 'Aliyun',
      model: instance.phoneModel || `ECP-${instance.instanceType}`,
      androidVersion: instance.systemVersion || '11',
      serialNumber: instance.instanceId,
      custom: {
        regionId: instance.regionId,
        zoneId: instance.zoneId,
        chargeType: instance.chargeType,
        publicIp: instance.publicIp || '',
        privateIp: instance.privateIp || '',
      },
    };
  }

  /**
   * 获取设备指标
   *
   * 阿里云 ECP 暂不支持实时指标获取
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsed: 0,
      storageUsed: 0,
      storageUsage: 0,
      networkRx: 0,
      networkTx: 0,
      batteryLevel: 100, // 云手机不需要电池
      timestamp: new Date(),
    };
  }

  /**
   * 获取设备能力
   */
  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true, // 阿里云支持 ADB (需公网 IP)
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC], // 阿里云使用 WebRTC
      maxResolution: {
        width: 1920,
        height: 1080,
      },
      supportsTouchControl: true, // 通过 WebRTC 数据通道
      supportsKeyboardInput: true,
      supportsFileTransfer: true, // 通过 ADB
      supportsAppInstall: true, // 通过 ADB
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
    this.logger.log(`Rebooting Aliyun phone: ${deviceId}`);

    const result = await this.ecpClient.rebootInstance(deviceId, {
      forceReboot: false,
    });

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to reboot: ${result.errorMessage}`);
    }
  }

  // ============================================================
  // 以下方法：阿里云 ECP 不直接支持，需通过 WebRTC 数据通道或 ADB 实现
  // ============================================================

  /**
   * 发送触摸事件
   *
   * 注意：需通过 WebRTC 数据通道发送，或通过 ADB input tap 实现
   */
  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events should be sent via Aliyun WebRTC data channel. ' +
        'Frontend should send touch events directly to WebRTC connection. ' +
        'Alternatively, use ADB: adb shell input tap x y'
    );
  }

  /**
   * 发送滑动事件
   */
  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events should be sent via Aliyun WebRTC data channel. ' +
        'Alternatively, use ADB: adb shell input swipe x1 y1 x2 y2 duration'
    );
  }

  /**
   * 发送按键事件
   */
  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events should be sent via Aliyun WebRTC data channel. ' +
        'Alternatively, use ADB: adb shell input keyevent KEYCODE'
    );
  }

  /**
   * 输入文本
   */
  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input should be sent via Aliyun WebRTC data channel. ' +
        "Alternatively, use ADB: adb shell input text 'your text'"
    );
  }

  /**
   * 执行 Shell 命令
   *
   * 需通过 ADB 实现: adb -s <instanceId> shell <command>
   */
  async executeShell(deviceId: string, command: string): Promise<string> {
    throw new NotImplementedException(
      'Shell execution requires ADB connection. ' +
        'Use ADB service: adb -s <instanceId> shell ' +
        command
    );
  }

  /**
   * 推送文件到设备
   *
   * 需通过 ADB 实现: adb push
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException(
      'File transfer requires ADB connection. ' +
        `Use ADB service: adb push ${options.localPath} ${options.remotePath}`
    );
  }

  /**
   * 从设备拉取文件
   *
   * 需通过 ADB 实现: adb pull
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException(
      'File transfer requires ADB connection. ' +
        `Use ADB service: adb pull ${options.remotePath} ${options.localPath}`
    );
  }

  /**
   * 安装应用
   *
   * 需通过 ADB 实现: adb install <apk>
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string | void> {
    throw new NotImplementedException(
      'App installation requires ADB connection. ' +
        'Use ADB service: adb -s <instanceId> install ' +
        options.apkPath
    );
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    throw new NotImplementedException(
      'App uninstallation requires ADB connection. ' +
        'Use ADB service: adb -s <instanceId> uninstall ' +
        packageName
    );
  }

  /**
   * 截图
   *
   * 可通过 WebRTC 视频帧截图，或通过 ADB screencap 实现
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    throw new NotImplementedException(
      'Screenshot can be captured from WebRTC video stream (client-side), ' +
        'or via ADB: adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png'
    );
  }

  /**
   * 开始屏幕录制
   */
  async startRecording(deviceId: string, duration?: number): Promise<string> {
    throw new NotImplementedException(
      'Screen recording should be done on WebRTC client side by recording MediaStream. ' +
        'Alternatively, use ADB: adb shell screenrecord /sdcard/recording.mp4'
    );
  }

  /**
   * 停止屏幕录制
   */
  async stopRecording(deviceId: string, recordingId: string): Promise<Buffer> {
    throw new NotImplementedException(
      'Screen recording should be stopped on client side. ' +
        'If using ADB, pull the recording file: adb pull /sdcard/recording.mp4'
    );
  }

  /**
   * 设置地理位置
   *
   * 需通过 ADB 模拟位置或阿里云控制台配置
   */
  async setLocation(deviceId: string, latitude: number, longitude: number): Promise<void> {
    throw new NotImplementedException(
      'Location mocking requires ADB commands or Aliyun console configuration. ' +
        'Use ADB: adb shell setprop mock.gps.lat ' +
        latitude +
        ' && adb shell setprop mock.gps.lng ' +
        longitude
    );
  }

  /**
   * 旋转屏幕
   */
  async rotateScreen(deviceId: string, orientation: 'portrait' | 'landscape'): Promise<void> {
    throw new NotImplementedException(
      'Screen rotation should be controlled via Aliyun WebRTC data channel. ' +
        'Alternatively, use ADB: adb shell settings put system user_rotation <0|1|2|3>'
    );
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 根据配置选择阿里云规格
   */
  private selectInstanceTypeByConfig(config: DeviceCreateConfig): string {
    const { cpuCores, memoryMB } = config;

    // 8核16G
    if (cpuCores >= 8 && memoryMB >= 16384) {
      return ALIYUN_PHONE_SPECS.FLAGSHIP_8C16G;
    }

    // 4核8G
    if (cpuCores >= 4 && memoryMB >= 8192) {
      return ALIYUN_PHONE_SPECS.PERFORMANCE_4C8G;
    }

    // 2核4G (默认)
    return ALIYUN_PHONE_SPECS.STANDARD_2C4G;
  }

  /**
   * 映射阿里云状态到 Provider 状态
   */
  private mapAliyunStatusToProviderStatus(status: AliyunPhoneStatus): DeviceProviderStatus {
    switch (status) {
      case AliyunPhoneStatus.CREATING:
      case AliyunPhoneStatus.STARTING:
        return DeviceProviderStatus.CREATING;

      case AliyunPhoneStatus.RUNNING:
        return DeviceProviderStatus.RUNNING;

      case AliyunPhoneStatus.STOPPING:
      case AliyunPhoneStatus.STOPPED:
        return DeviceProviderStatus.STOPPED;

      case AliyunPhoneStatus.RESTARTING:
        return DeviceProviderStatus.CREATING; // 重启中映射到创建中

      case AliyunPhoneStatus.DELETING:
        return DeviceProviderStatus.DESTROYING;

      case AliyunPhoneStatus.EXCEPTION:
        return DeviceProviderStatus.ERROR;

      case AliyunPhoneStatus.RELEASED:
        return DeviceProviderStatus.DESTROYED;

      default:
        return DeviceProviderStatus.ERROR;
    }
  }
}
