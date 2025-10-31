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
import { DevicePoolService } from './device-pool.service';
import { DeviceDiscoveryService } from './device-discovery.service';
import { AdbService } from '../../adb/adb.service';
import { ScrcpyService } from '../../scrcpy/scrcpy.service';
import { DevicePoolStatus } from './physical.types';

/**
 * PhysicalProvider
 *
 * 物理设备 (网络连接的真实 Android 设备) 的 Provider 实现
 *
 * 特点：
 * - 设备池管理（预先注册的设备）
 * - 网络 ADB 连接
 * - SCRCPY 高性能投屏（Phase 2A 下一步）
 * - 设备健康监控
 *
 * 当前实现状态 (Phase 2A):
 * ✅ create - 从设备池分配设备
 * ✅ start - 确保 ADB 连接
 * ✅ stop - 断开连接但保留在池中
 * ✅ destroy - 释放回设备池
 * ✅ getStatus, getConnectionInfo - 状态查询
 * ✅ getCapabilities - 能力声明
 * ✅ getMetrics - 设备指标
 * ⏳ 控制方法 - 待 Phase 2A 下一步实现
 *
 * 底层依赖：
 * - DevicePoolService: 设备池管理
 * - DeviceDiscoveryService: 设备发现
 * - AdbService: Android 设备控制
 */
@Injectable()
export class PhysicalProvider implements IDeviceProvider {
  private readonly logger = new Logger(PhysicalProvider.name);
  readonly providerType = DeviceProviderType.PHYSICAL;

  constructor(
    private devicePool: DevicePoolService,
    private deviceDiscovery: DeviceDiscoveryService,
    private adbService: AdbService,
    private scrcpyService: ScrcpyService
  ) {}

  /**
   * 创建物理设备（从设备池分配）
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Allocating physical device for user ${config.userId}`);

    try {
      // 从设备池分配设备
      const pooledDevice = await this.devicePool.allocateDevice({
        userId: config.userId,
        requirements: {
          minHealthScore: 60, // 最低健康评分
          androidVersion: config.androidVersion,
        },
      });

      // 构建连接信息
      const connectionInfo: ConnectionInfo = {
        providerType: DeviceProviderType.PHYSICAL,
        adb: {
          host: pooledDevice.ipAddress,
          port: pooledDevice.adbPort,
          serial: `${pooledDevice.ipAddress}:${pooledDevice.adbPort}`,
        },
        scrcpy: {
          host: pooledDevice.ipAddress,
          port: 27183, // SCRCPY 默认端口
          maxBitrate: 8000000, // 8 Mbps
          codec: 'h264', // 视频编码器
        },
      };

      // 构建 ProviderDevice
      const device: ProviderDevice = {
        id: pooledDevice.id,
        name: pooledDevice.name || `Physical-${pooledDevice.id}`,
        status: DeviceProviderStatus.ALLOCATED,
        connectionInfo,
        properties: {
          manufacturer: pooledDevice.properties?.manufacturer,
          model: pooledDevice.properties?.model,
          androidVersion: pooledDevice.properties?.androidVersion,
          serialNumber: pooledDevice.properties?.serialNumber,
        },
        createdAt: pooledDevice.allocatedAt || new Date(),
      };

      this.logger.log(
        `Physical device allocated: ${device.id} (${pooledDevice.ipAddress}:${pooledDevice.adbPort})`
      );

      return device;
    } catch (error) {
      this.logger.error(`Failed to allocate physical device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to allocate physical device: ${error.message}`
      );
    }
  }

  /**
   * 启动物理设备（确保 ADB 连接）
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting physical device: ${deviceId}`);

    try {
      const device = await this.devicePool.getDevice(deviceId);
      if (!device) {
        throw new InternalServerErrorException(`Device ${deviceId} not found in pool`);
      }

      const serial = `${device.ipAddress}:${device.adbPort}`;

      // 确保 ADB 连接
      await this.adbService.connectToDevice(deviceId, device.ipAddress, device.adbPort);

      // 检查 Android 启动状态
      const bootOutput = await this.adbService.executeShellCommand(
        deviceId,
        'getprop sys.boot_completed',
        5000
      );

      if (bootOutput.trim() !== '1') {
        throw new InternalServerErrorException('Android not fully booted');
      }

      this.logger.log(`Physical device started: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to start physical device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to start physical device: ${error.message}`);
    }
  }

  /**
   * 停止物理设备（断开连接但保留在池中）
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping physical device: ${deviceId}`);

    try {
      // 断开 ADB 连接
      await this.adbService.disconnectFromDevice(deviceId);

      this.logger.log(`Physical device stopped: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to stop physical device: ${error.message}`, error.stack);
      // 不抛出错误，允许部分失败
    }
  }

  /**
   * 销毁物理设备（释放回设备池）
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying physical device: ${deviceId}`);

    try {
      // 断开 ADB 连接
      try {
        await this.adbService.disconnectFromDevice(deviceId);
      } catch (error) {
        this.logger.warn(`Failed to disconnect ADB: ${error.message}`);
      }

      // 释放回设备池
      await this.devicePool.releaseDevice(deviceId);

      this.logger.log(`Physical device destroyed (released to pool): ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy physical device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to destroy physical device: ${error.message}`);
    }
  }

  /**
   * 获取设备状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    try {
      const device = await this.devicePool.getDevice(deviceId);
      if (!device) {
        return DeviceProviderStatus.ERROR;
      }

      // 映射池状态到 Provider 状态
      switch (device.poolStatus) {
        case DevicePoolStatus.AVAILABLE:
          return DeviceProviderStatus.AVAILABLE;
        case DevicePoolStatus.ALLOCATED:
          return DeviceProviderStatus.ALLOCATED;
        case DevicePoolStatus.OFFLINE:
          return DeviceProviderStatus.OFFLINE;
        case DevicePoolStatus.MAINTENANCE:
          return DeviceProviderStatus.STOPPED;
        case DevicePoolStatus.ERROR:
          return DeviceProviderStatus.ERROR;
        default:
          return DeviceProviderStatus.ERROR;
      }
    } catch (error) {
      this.logger.error(`Failed to get status for device ${deviceId}: ${error.message}`);
      return DeviceProviderStatus.ERROR;
    }
  }

  /**
   * 获取连接信息
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    try {
      const device = await this.devicePool.getDevice(deviceId);
      if (!device) {
        throw new InternalServerErrorException(`Device ${deviceId} not found in pool`);
      }

      const connectionInfo: ConnectionInfo = {
        providerType: DeviceProviderType.PHYSICAL,
        adb: {
          host: device.ipAddress,
          port: device.adbPort,
          serial: `${device.ipAddress}:${device.adbPort}`,
        },
      };

      // 如果存在 SCRCPY 会话，添加 SCRCPY 连接信息
      const scrcpySession = this.scrcpyService.getSession(deviceId);
      if (scrcpySession) {
        connectionInfo.scrcpy = {
          host: device.ipAddress,
          port: scrcpySession.config.port!,
          maxBitrate: scrcpySession.config.videoBitRate!,
          codec: scrcpySession.config.videoCodec as 'h264' | 'h265',
        };
      }

      return connectionInfo;
    } catch (error) {
      this.logger.error(`Failed to get connection info for device ${deviceId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get connection info: ${error.message}`);
    }
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const device = await this.devicePool.getDevice(deviceId);
    if (!device) {
      throw new InternalServerErrorException(`Device ${deviceId} not found in pool`);
    }

    return {
      manufacturer: device.properties?.manufacturer,
      model: device.properties?.model,
      androidVersion: device.properties?.androidVersion,
      serialNumber: device.properties?.serialNumber,
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    const device = await this.devicePool.getDevice(deviceId);
    if (!device) {
      throw new InternalServerErrorException(`Device ${deviceId} not found in pool`);
    }

    // 执行健康检查获取实时指标
    const healthResult = await this.devicePool.checkDeviceHealth(deviceId);

    return {
      cpuUsage: 0, // 需要额外查询
      memoryUsage: 0, // 需要额外查询
      storageUsage: 0,
      batteryLevel: healthResult.checks.batteryLevel,
      temperature: healthResult.checks.temperature,
      timestamp: new Date(),
    };
  }

  /**
   * 获取设备能力
   */
  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true,
      supportsScreenCapture: true,
      supportedCaptureFormats: [
        CaptureFormat.SCREENCAP,
        CaptureFormat.SCREENRECORD,
        CaptureFormat.SCRCPY, // ✅ 物理设备的核心优势
      ],
      maxResolution: { width: 3840, height: 2160 }, // 取决于真实设备
      supportsTouchControl: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsScreenshot: true,
      supportsRecording: true,
      supportsLocationMocking: true,
      supportsNetworkSimulation: false,
      supportsBatterySimulation: false,
      supportsRotation: true,
    };
  }

  /**
   * 发送触摸事件
   */
  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    await this.adbService.tap(deviceId, event.x, event.y);
  }

  /**
   * 发送滑动事件
   */
  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    await this.adbService.swipe(
      deviceId,
      event.startX,
      event.startY,
      event.endX,
      event.endY,
      event.durationMs
    );
  }

  /**
   * 发送按键事件
   */
  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    await this.adbService.sendKey(deviceId, event.keyCode);
  }

  /**
   * 输入文本
   */
  async inputText(deviceId: string, input: TextInput): Promise<void> {
    await this.adbService.inputText(deviceId, input.text);
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    if (!connectionInfo.adb) {
      throw new InternalServerErrorException('ADB connection not available');
    }

    await this.adbService.installApk(connectionInfo.adb.serial, options.apkPath);

    return options.packageName || 'unknown';
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    if (!connectionInfo.adb) {
      throw new InternalServerErrorException('ADB connection not available');
    }

    await this.adbService.uninstallApp(connectionInfo.adb.serial, packageName);
  }

  /**
   * 推送文件到设备
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    if (!connectionInfo.adb) {
      throw new InternalServerErrorException('ADB connection not available');
    }

    await this.adbService.pushFile(
      connectionInfo.adb.serial,
      options.localPath,
      options.remotePath
    );
  }

  /**
   * 从设备拉取文件
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    if (!connectionInfo.adb) {
      throw new InternalServerErrorException('ADB connection not available');
    }

    await this.adbService.pullFile(
      connectionInfo.adb.serial,
      options.remotePath,
      options.localPath
    );
  }

  /**
   * 截图
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    return await this.adbService.takeScreenshot(deviceId);
  }

  /**
   * 开始录制屏幕
   */
  async startRecording(deviceId: string, duration?: number): Promise<string> {
    const remotePath = `/sdcard/recording_${Date.now()}.mp4`;
    const recordingId = await this.adbService.startRecording(deviceId, remotePath, {
      timeLimit: duration || 180,
      bitRate: 4,
    });
    return recordingId;
  }

  /**
   * 停止录制屏幕
   */
  async stopRecording(deviceId: string, recordingId: string): Promise<Buffer> {
    // 停止录屏
    await this.adbService.stopRecording(deviceId, recordingId);

    // 提取录屏文件路径（从 recordingId 解析或使用约定路径）
    // recordingId 格式: recording_{deviceId}_{timestamp}
    const timestamp = recordingId.split('_').pop();
    const remotePath = `/sdcard/recording_${timestamp}.mp4`;
    const localPath = `/tmp/${recordingId}.mp4`;

    // 拉取录屏文件
    await this.adbService.pullFile(deviceId, remotePath, localPath);

    // 读取文件为 Buffer
    const fs = await import('fs');
    const buffer = fs.readFileSync(localPath);

    // 清理临时文件
    fs.unlinkSync(localPath);

    return buffer;
  }

  /**
   * 设置地理位置
   */
  async setLocation(deviceId: string, latitude: number, longitude: number): Promise<void> {
    await this.adbService.setLocation(deviceId, latitude, longitude);
  }
}
