/**
 * BrowserStackProvider - BrowserStack App Live / App Automate Provider
 *
 * BrowserStack 提供真实设备云测试平台
 * App Live: https://www.browserstack.com/app-live/rest-api
 * App Automate: https://www.browserstack.com/docs/app-automate/api-reference
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
import { BrowserStackClient } from './browserstack.client';
import { BrowserStackDevice, BROWSERSTACK_DEVICES, BROWSERSTACK_OS_VERSIONS } from './browserstack.types';

@Injectable()
export class BrowserStackProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.BROWSERSTACK;
  private readonly logger = new Logger(BrowserStackProvider.name);

  // BrowserStack 会话映射 (内存缓存)
  private sessions: Map<string, {
    device: string;
    osVersion: string;
    appUrl?: string;
    createdAt: Date;
  }> = new Map();

  constructor(private readonly bsClient: BrowserStackClient) {}

  /**
   * 创建设备会话
   *
   * 注意: BrowserStack App Live 是手动测试平台，不提供自动化创建会话的 API
   * 此方法主要用于记录设备配置，实际设备访问通过 BrowserStack 网页界面
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating BrowserStack session for user ${config.userId}: ${config.name}`);

    try {
      // 检查客户端是否初始化
      if (!this.bsClient.isInitialized()) {
        await this.bsClient.initialize();
      }

      // 获取设备配置
      const deviceName = config.providerSpecificConfig?.device || BROWSERSTACK_DEVICES.SAMSUNG_GALAXY_S23;
      const osVersion = config.providerSpecificConfig?.osVersion || BROWSERSTACK_OS_VERSIONS.ANDROID_13;

      // 验证设备是否可用
      const devicesResult = await this.bsClient.getDevices();
      if (!devicesResult.success) {
        throw new InternalServerErrorException(
          `Failed to get devices: ${devicesResult.errorMessage}`
        );
      }

      const availableDevice = devicesResult.data?.find(
        (d) => d.device === deviceName && d.os_version === osVersion && d.os === 'Android'
      );

      if (!availableDevice) {
        this.logger.warn(`Device ${deviceName} with OS ${osVersion} not found, using first available`);
      }

      // 生成会话 ID
      const sessionId = `bs-${config.userId}-${Date.now()}`;

      // 如果有 APK URL，先上传
      let appUrl: string | undefined;
      if (config.providerSpecificConfig?.appUrl) {
        const uploadResult = await this.bsClient.uploadApp({
          url: config.providerSpecificConfig.appUrl,
          custom_id: `app-${sessionId}`,
        });
        if (uploadResult.success && uploadResult.data) {
          appUrl = uploadResult.data.app_url;
        }
      }

      // 保存会话信息
      this.sessions.set(sessionId, {
        device: deviceName,
        osVersion,
        appUrl,
        createdAt: new Date(),
      });

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      return {
        id: sessionId,
        name: config.name || `browserstack-${sessionId}`,
        status: DeviceProviderStatus.RUNNING, // BrowserStack 设备始终可用
        connectionInfo: {
          providerType: DeviceProviderType.BROWSERSTACK,
          browserstack: {
            sessionId,
            device: deviceName,
            osVersion,
            appUrl: appUrl || '',
            // App Live 访问 URL
            liveUrl: 'https://app-live.browserstack.com/',
          },
        },
        properties: {
          manufacturer: this.getManufacturer(deviceName),
          model: deviceName,
          androidVersion: osVersion,
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: new Date(),
        providerConfig: {
          device: deviceName,
          osVersion,
          appUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create BrowserStack session: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动会话 (BrowserStack 设备始终运行)
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`BrowserStack session ${deviceId} is always running`);
    // BrowserStack 设备不需要启动，始终可用
  }

  /**
   * 停止会话
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping BrowserStack session: ${deviceId}`);
    // 清理本地会话记录
    this.sessions.delete(deviceId);
  }

  /**
   * 销毁会话
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying BrowserStack session: ${deviceId}`);

    // 如果是 App Automate 会话，尝试删除
    if (deviceId.startsWith('bs-automate-')) {
      const result = await this.bsClient.deleteSession(deviceId);
      if (!result.success) {
        this.logger.warn(`Failed to delete App Automate session: ${result.errorMessage}`);
      }
    }

    // 清理本地会话记录
    this.sessions.delete(deviceId);
  }

  /**
   * 获取会话状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const session = this.sessions.get(deviceId);

    if (!session) {
      return DeviceProviderStatus.DESTROYED;
    }

    // BrowserStack 设备始终可用
    return DeviceProviderStatus.RUNNING;
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const session = this.sessions.get(deviceId);

    if (!session) {
      throw new InternalServerErrorException(`Session ${deviceId} not found`);
    }

    return {
      providerType: DeviceProviderType.BROWSERSTACK,
      browserstack: {
        sessionId: deviceId,
        device: session.device,
        osVersion: session.osVersion,
        appUrl: session.appUrl || '',
        liveUrl: 'https://app-live.browserstack.com/',
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const session = this.sessions.get(deviceId);

    if (!session) {
      throw new InternalServerErrorException(`Session ${deviceId} not found`);
    }

    return {
      manufacturer: this.getManufacturer(session.device),
      model: session.device,
      androidVersion: session.osVersion,
      serialNumber: deviceId,
      custom: {
        appUrl: session.appUrl || '',
        createdAt: session.createdAt.toISOString(),
      },
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    // BrowserStack 不提供实时指标 API
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
      supportsAdb: false, // BrowserStack 不提供 ADB 访问
      supportsScreenCapture: true,
      supportsAudioCapture: false,
      supportedCaptureFormats: [CaptureFormat.WEBRTC],
      maxResolution: { width: 1440, height: 3200 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true, // 通过上传 APK
      supportsAppInstall: true,
      supportsScreenshot: true,
      supportsRecording: true, // App Automate 支持
      supportsLocationMocking: true,
      supportsRotation: true,
      supportsCamera: false,
      supportsMicrophone: false,
      supportsSensorSimulation: false,
    };
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Uploading app for ${deviceId}`);

    // 上传 APK 到 BrowserStack (apkPath 可以是本地路径或 URL)
    const result = await this.bsClient.uploadApp({
      url: options.apkPath,
      custom_id: `app-${deviceId}`,
    });

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to upload app: ${result.errorMessage}`);
    }

    // 更新会话的 app URL
    const session = this.sessions.get(deviceId);
    if (session) {
      session.appUrl = result.data.app_url;
    }

    return result.data.app_url;
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Deleting app from BrowserStack: ${packageName}`);

    // 通过 custom_id 获取应用
    const appsResult = await this.bsClient.getAppByCustomId(`app-${deviceId}`);

    if (appsResult.success && appsResult.data?.length) {
      for (const app of appsResult.data) {
        if (app.app_id) {
          await this.bsClient.deleteApp(app.app_id);
        }
      }
    }
  }

  /**
   * 获取账户计划信息
   */
  async getPlan(): Promise<any> {
    const result = await this.bsClient.getPlan();
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to get plan: ${result.errorMessage}`);
    }
    return result.data;
  }

  /**
   * 获取可用设备列表
   */
  async getAvailableDevices(): Promise<BrowserStackDevice[]> {
    const result = await this.bsClient.getDevices();
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to get devices: ${result.errorMessage}`);
    }
    return result.data || [];
  }

  // ============================================================
  // 以下方法 BrowserStack 不支持
  // ============================================================

  async takeScreenshot(deviceId: string): Promise<Buffer> {
    throw new NotImplementedException(
      'BrowserStack does not provide screenshot API. Use the web interface.'
    );
  }

  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException(
      'BrowserStack does not support direct file push. Upload as APK instead.'
    );
  }

  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException(
      'BrowserStack does not support file pull.'
    );
  }

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events are handled through BrowserStack web interface.'
    );
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events are handled through BrowserStack web interface.'
    );
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events are handled through BrowserStack web interface.'
    );
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input is handled through BrowserStack web interface.'
    );
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 从设备名称推断制造商
   */
  private getManufacturer(deviceName: string): string {
    const name = deviceName.toLowerCase();
    if (name.includes('samsung') || name.includes('galaxy')) return 'Samsung';
    if (name.includes('google') || name.includes('pixel')) return 'Google';
    if (name.includes('oneplus')) return 'OnePlus';
    if (name.includes('xiaomi') || name.includes('redmi')) return 'Xiaomi';
    if (name.includes('huawei')) return 'Huawei';
    if (name.includes('oppo')) return 'OPPO';
    if (name.includes('vivo')) return 'Vivo';
    return 'Unknown';
  }
}
