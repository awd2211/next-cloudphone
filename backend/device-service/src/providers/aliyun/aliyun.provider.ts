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
      supportsAdb: true, // ✅ 支持 ADB 和远程命令执行
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC], // 阿里云使用 WebRTC
      maxResolution: {
        width: 1920,
        height: 1080,
      },
      supportsTouchControl: true, // 通过 WebRTC 数据通道
      supportsKeyboardInput: true,
      supportsFileTransfer: true, // ✅ 支持通过 OSS 文件传输
      supportsAppInstall: true, // ✅ 支持应用管理 (CreateApp + InstallApp)
      supportsSnapshot: true, // ✅ 支持快照备份和恢复
      supportsAppOperation: true, // ✅ 支持应用启动/停止/清除数据
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
   * 使用阿里云 RunCommand API 远程执行脚本
   *
   * @param deviceId 设备 ID
   * @param command Shell 命令
   * @returns 命令输出
   */
  async executeShell(deviceId: string, command: string): Promise<string> {
    this.logger.log(`Executing shell command on Aliyun phone ${deviceId}`);

    try {
      // 使用 RunCommand API 执行命令
      const result = await this.ecpClient.runCommand([deviceId], command, 120);

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to execute shell command: ${result.errorMessage}`
        );
      }

      const invokeId = result.data.invokeId;

      // 等待命令执行完成并获取结果
      // 简单实现: 等待 3 秒后查询结果
      await this.sleep(3000);

      const cmdResult = await this.ecpClient.getCommandResult(invokeId);

      if (!cmdResult.success || !cmdResult.data || cmdResult.data.length === 0) {
        throw new InternalServerErrorException(
          `Failed to get command result: ${cmdResult.errorMessage}`
        );
      }

      const output = cmdResult.data[0];

      // 检查执行状态
      if (output.invokeStatus === 'Failed') {
        throw new InternalServerErrorException(
          `Command execution failed: ${output.errorOutput || 'Unknown error'}`
        );
      }

      return output.output || '';
    } catch (error) {
      this.logger.error(`Failed to execute shell command: ${error.message}`);
      throw error;
    }
  }

  /**
   * 推送文件到设备
   *
   * 使用阿里云 SendFile API,从 OSS 推送文件到云手机
   *
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   *
   * localPath 格式: oss://bucket-name/path/to/file 或 /bucket-name/path/to/file
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to Aliyun phone ${deviceId}: ${options.localPath}`);

    try {
      // 从 localPath 解析 OSS 路径
      const ossFileUrl = this.normalizeOssPath(options.localPath);

      // 提取文件名
      const fileName = options.remotePath.split('/').pop() || 'file';

      // 调用 SDK 发送文件
      const result = await this.ecpClient.sendFile(
        [deviceId],
        ossFileUrl,
        options.remotePath,
        fileName
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
   * 使用阿里云 FetchFile API,从云手机拉取文件到 OSS
   *
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   *
   * localPath 格式: oss://bucket-name/path/to/file 或 /bucket-name/path/to/file
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pulling file from Aliyun phone ${deviceId}: ${options.remotePath}`);

    try {
      // 从 localPath 解析 OSS 目标路径
      const ossPath = this.normalizeOssPath(options.localPath);

      // 调用 SDK 拉取文件
      const result = await this.ecpClient.fetchFile(deviceId, options.remotePath, ossPath);

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

  /**
   * 安装应用
   *
   * 使用阿里云应用管理 API 安装应用
   *
   * 流程:
   * 1. 如果 APK 未注册,先调用 CreateApp 注册
   * 2. 然后调用 InstallApp 安装到实例
   *
   * @param deviceId 设备 ID
   * @param options 安装选项
   * @returns Task ID 用于查询安装进度
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on Aliyun phone ${deviceId}: ${options.apkPath}`);

    try {
      // 从 apkPath 解析 OSS 路径
      const ossAppUrl = this.normalizeOssPath(options.apkPath);

      // 提取应用名称 (从 APK 文件名)
      const appName = options.apkPath.split('/').pop()?.replace('.apk', '') || 'unknown-app';

      // 1. 创建应用 (注册 APK 到 ECP 平台)
      const createResult = await this.ecpClient.createApp(ossAppUrl, appName, options.packageName);

      if (!createResult.success || !createResult.data) {
        throw new InternalServerErrorException(
          `Failed to create app: ${createResult.errorMessage}`
        );
      }

      const appId = createResult.data.appId;

      // 2. 安装应用到实例
      const installResult = await this.ecpClient.installApp([deviceId], appId, 'install');

      if (!installResult.success || !installResult.data) {
        throw new InternalServerErrorException(
          `Failed to install app: ${installResult.errorMessage}`
        );
      }

      // 返回 Task ID
      return installResult.data.taskId;
    } catch (error) {
      this.logger.error(`Failed to install app: ${error.message}`);
      throw error;
    }
  }

  /**
   * 卸载应用
   *
   * 使用阿里云 UninstallApp API
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from Aliyun phone ${deviceId}: ${packageName}`);

    const result = await this.ecpClient.uninstallApp([deviceId], packageName);

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to uninstall app: ${result.errorMessage}`);
    }
  }

  /**
   * 启动应用
   *
   * 使用阿里云 OperateApp API 启动应用
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async startApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Starting app on Aliyun phone ${deviceId}: ${packageName}`);

    const result = await this.ecpClient.operateApp(deviceId, packageName, 'START');

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start app: ${result.errorMessage}`);
    }
  }

  /**
   * 停止应用
   *
   * 使用阿里云 OperateApp API 停止应用
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async stopApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Stopping app on Aliyun phone ${deviceId}: ${packageName}`);

    const result = await this.ecpClient.operateApp(deviceId, packageName, 'STOP');

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop app: ${result.errorMessage}`);
    }
  }

  /**
   * 清除应用数据
   *
   * 使用阿里云 OperateApp API 清除应用数据
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async clearAppData(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Clearing app data on Aliyun phone ${deviceId}: ${packageName}`);

    const result = await this.ecpClient.operateApp(deviceId, packageName, 'CLEAR_DATA');

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to clear app data: ${result.errorMessage}`);
    }
  }

  /**
   * 创建快照
   *
   * 使用阿里云 CreateSnapshot API 创建设备完整备份
   *
   * @param deviceId 设备 ID
   * @param name 快照名称
   * @param description 快照描述
   * @returns 快照 ID
   */
  async createSnapshot(deviceId: string, name: string, description?: string): Promise<string> {
    this.logger.log(`Creating snapshot for Aliyun phone ${deviceId}: ${name}`);

    try {
      const result = await this.ecpClient.createSnapshot(deviceId, name, description);

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to create snapshot: ${result.errorMessage}`
        );
      }

      return result.data.snapshotId;
    } catch (error) {
      this.logger.error(`Failed to create snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 恢复快照
   *
   * 使用阿里云 RestoreSnapshot API 从快照恢复设备
   *
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  async restoreSnapshot(deviceId: string, snapshotId: string): Promise<void> {
    this.logger.log(`Restoring snapshot ${snapshotId} for Aliyun phone ${deviceId}`);

    try {
      const result = await this.ecpClient.restoreSnapshot(deviceId, snapshotId);

      if (!result.success) {
        throw new InternalServerErrorException(
          `Failed to restore snapshot: ${result.errorMessage}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to restore snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取快照列表
   *
   * 使用阿里云 ListSnapshots API 获取设备的快照列表
   *
   * @param deviceId 设备 ID
   * @returns 快照列表
   */
  async listSnapshots(deviceId: string): Promise<import('../provider.types').DeviceSnapshot[]> {
    this.logger.log(`Listing snapshots for Aliyun phone ${deviceId}`);

    try {
      const result = await this.ecpClient.listSnapshots(deviceId);

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to list snapshots: ${result.errorMessage}`
        );
      }

      // 转换阿里云快照格式到统一格式
      return result.data.map((snapshot) => ({
        id: snapshot.snapshotId,
        name: snapshot.snapshotName,
        description: undefined, // 阿里云快照可能没有描述字段
        deviceId,
        createdAt: snapshot.gmtCreate,
        status: this.mapSnapshotStatus(snapshot.status),
        size: snapshot.size ? snapshot.size * 1024 * 1024 * 1024 : undefined, // GB 转 bytes
      }));
    } catch (error) {
      this.logger.error(`Failed to list snapshots: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除快照
   *
   * 使用阿里云 DeleteSnapshot API 删除快照
   *
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  async deleteSnapshot(deviceId: string, snapshotId: string): Promise<void> {
    this.logger.log(`Deleting snapshot ${snapshotId} for Aliyun phone ${deviceId}`);

    try {
      const result = await this.ecpClient.deleteSnapshot(deviceId, snapshotId);

      if (!result.success) {
        throw new InternalServerErrorException(
          `Failed to delete snapshot: ${result.errorMessage}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to delete snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 映射阿里云快照状态到统一状态
   */
  private mapSnapshotStatus(status: 'CREATING' | 'AVAILABLE' | 'FAILED'): 'creating' | 'available' | 'error' {
    const statusMap = {
      CREATING: 'creating' as const,
      AVAILABLE: 'available' as const,
      FAILED: 'error' as const,
    };
    return statusMap[status] || 'error';
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
   * 标准化 OSS 路径
   *
   * 支持格式:
   * - oss://bucket-name/path/to/file
   * - /bucket-name/path/to/file
   * - bucket-name/path/to/file
   *
   * 统一转换为: oss://bucket-name/path/to/file
   *
   * @param path OSS 路径
   * @returns 标准化的 OSS URL
   */
  private normalizeOssPath(path: string): string {
    // 如果已经是 oss:// 格式,直接返回
    if (path.startsWith('oss://')) {
      return path;
    }

    // 移除开头的 /
    const normalizedPath = path.replace(/^\//, '');

    // 返回 oss:// 格式
    return `oss://${normalizedPath}`;
  }

  /**
   * 睡眠指定毫秒数
   *
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
