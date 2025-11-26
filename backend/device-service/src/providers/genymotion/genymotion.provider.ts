/**
 * GenymotionProvider - Genymotion Cloud (SaaS) Provider
 *
 * Genymotion 云端 Android 模拟器
 * 文档: https://docs.genymotion.com/paas/
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
import { GenymotionClient } from './genymotion.client';
import { GenymotionInstanceState, GENYMOTION_RECIPES } from './genymotion.types';

/**
 * Genymotion 状态映射
 */
const GENYMOTION_STATUS_MAP: Record<GenymotionInstanceState, DeviceProviderStatus> = {
  CREATING: DeviceProviderStatus.CREATING,
  STARTING: DeviceProviderStatus.CREATING,
  RUNNING: DeviceProviderStatus.RUNNING,
  STOPPING: DeviceProviderStatus.STOPPED,
  STOPPED: DeviceProviderStatus.STOPPED,
  DELETING: DeviceProviderStatus.DESTROYING,
  DELETED: DeviceProviderStatus.DESTROYED,
  ERROR: DeviceProviderStatus.ERROR,
};

@Injectable()
export class GenymotionProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.GENYMOTION;
  private readonly logger = new Logger(GenymotionProvider.name);

  constructor(private readonly gmClient: GenymotionClient) {}

  /**
   * 创建实例
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Genymotion instance for user ${config.userId}: ${config.name}`);

    try {
      // 检查客户端是否初始化
      if (!this.gmClient.isInitialized()) {
        await this.gmClient.initialize();
      }

      // 获取配方 UUID
      let recipeUuid = config.providerSpecificConfig?.recipeUuid;

      if (!recipeUuid) {
        // 使用默认配方 (Android 11)
        const recipesResult = await this.gmClient.listRecipes();
        if (recipesResult.success && recipesResult.data?.length) {
          // 查找 Android 11 配方
          const recipe = recipesResult.data.find((r) =>
            r.android_version?.includes('11')
          );
          recipeUuid = recipe?.uuid || recipesResult.data[0].uuid;
        }
      }

      if (!recipeUuid) {
        throw new InternalServerErrorException('No recipe available');
      }

      const result = await this.gmClient.createInstance({
        recipe_uuid: recipeUuid,
        name: config.name || `genymotion-${config.userId}-${Date.now()}`,
        region: config.providerSpecificConfig?.region,
        adb_enabled: true,
      });

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to create instance: ${result.errorMessage}`
        );
      }

      const instance = result.data;

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      return {
        id: instance.uuid,
        name: instance.name || config.name || `genymotion-${instance.uuid}`,
        status: DeviceProviderStatus.CREATING,
        connectionInfo: {
          providerType: DeviceProviderType.GENYMOTION,
          genymotion: {
            instanceUuid: instance.uuid,
            adbSerial: instance.adb_serial || '',
            state: instance.state,
          },
          // Genymotion 提供 ADB 连接
          adb: instance.adb_serial
            ? {
                host: instance.ip_address || 'localhost',
                port: instance.adb_port || 5555,
                serial: instance.adb_serial,
              }
            : undefined,
        },
        properties: {
          manufacturer: 'Genymotion',
          model: instance.recipe || 'Virtual Device',
          androidVersion: instance.android_version || '11',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: instance.created_at ? new Date(instance.created_at) : new Date(),
        providerConfig: {
          recipeUuid,
          region: instance.region,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Genymotion instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动实例
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Genymotion instance: ${deviceId}`);

    const result = await this.gmClient.startInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start: ${result.errorMessage}`);
    }
  }

  /**
   * 停止实例
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Genymotion instance: ${deviceId}`);

    const result = await this.gmClient.stopInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁实例
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Genymotion instance: ${deviceId}`);

    const result = await this.gmClient.deleteInstance(deviceId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }
  }

  /**
   * 获取实例状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.gmClient.getInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    const state = result.data.state as GenymotionInstanceState;
    return GENYMOTION_STATUS_MAP[state] || DeviceProviderStatus.ERROR;
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const instanceResult = await this.gmClient.getInstance(deviceId);

    if (!instanceResult.success || !instanceResult.data) {
      throw new InternalServerErrorException(
        `Failed to get instance: ${instanceResult.errorMessage}`
      );
    }

    const instance = instanceResult.data;

    // 尝试获取 ADB 信息
    let adbInfo: { adb_serial: string; adb_port: number } | undefined;
    const adbResult = await this.gmClient.getAdbInfo(deviceId);
    if (adbResult.success && adbResult.data) {
      adbInfo = adbResult.data;
    }

    return {
      providerType: DeviceProviderType.GENYMOTION,
      genymotion: {
        instanceUuid: instance.uuid,
        adbSerial: adbInfo?.adb_serial || instance.adb_serial || '',
        state: instance.state,
        connectUrl: `https://cloud.geny.io/instances/${instance.uuid}`,
      },
      adb: adbInfo
        ? {
            host: instance.ip_address || 'localhost',
            port: adbInfo.adb_port,
            serial: adbInfo.adb_serial,
          }
        : undefined,
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.gmClient.getInstance(deviceId);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const instance = result.data;

    return {
      manufacturer: 'Genymotion',
      model: instance.recipe || 'Virtual Device',
      androidVersion: instance.android_version || 'Unknown',
      serialNumber: instance.adb_serial || instance.uuid,
      custom: {
        region: instance.region || '',
        ipAddress: instance.ip_address || '',
        createdAt: instance.created_at || '',
        startedAt: instance.started_at || '',
      },
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    // Genymotion 不直接提供指标 API
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
      supportsAdb: true, // Genymotion 完全支持 ADB
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.SCREENCAP, CaptureFormat.SCRCPY],
      maxResolution: { width: 2560, height: 1440 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsScreenshot: true,
      supportsRecording: true,
      supportsLocationMocking: true, // Genymotion 支持 GPS 模拟
      supportsRotation: true,
      supportsCamera: true,
      supportsMicrophone: true,
      supportsSensorSimulation: true, // 支持传感器模拟
    };
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on ${deviceId}`);

    const result = await this.gmClient.installApk(deviceId, options.apkPath);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to install app: ${result.errorMessage}`);
    }

    return 'installed';
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from ${deviceId}: ${packageName}`);

    const result = await this.gmClient.uninstallApp(deviceId, packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to uninstall app: ${result.errorMessage}`);
    }
  }

  /**
   * 推送文件
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to ${deviceId}: ${options.localPath}`);

    const result = await this.gmClient.pushFile(
      deviceId,
      options.localPath, // 需要是可访问的 URL
      options.remotePath
    );

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to push file: ${result.errorMessage}`);
    }
  }

  /**
   * 启用 ADB
   */
  async enableAdb(deviceId: string): Promise<void> {
    this.logger.log(`Enabling ADB for ${deviceId}`);

    const result = await this.gmClient.enableAdb(deviceId);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to enable ADB: ${result.errorMessage}`);
    }
  }

  /**
   * 禁用 ADB
   */
  async disableAdb(deviceId: string): Promise<void> {
    this.logger.log(`Disabling ADB for ${deviceId}`);

    const result = await this.gmClient.disableAdb(deviceId);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to disable ADB: ${result.errorMessage}`);
    }
  }

  // ============================================================
  // 以下方法需要通过 ADB 实现
  // ============================================================

  async takeScreenshot(deviceId: string): Promise<Buffer> {
    throw new NotImplementedException(
      'Use ADB to capture screenshots: adb exec-out screencap -p'
    );
  }

  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    throw new NotImplementedException('Use ADB to pull files.');
  }

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException('Use ADB input tap command.');
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException('Use ADB input swipe command.');
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException('Use ADB input keyevent command.');
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException('Use ADB input text command.');
  }
}
