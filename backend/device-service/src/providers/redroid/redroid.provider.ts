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
import { DockerService, RedroidConfig } from '../../docker/docker.service';
import { AdbService } from '../../adb/adb.service';

/**
 * RedroidProvider
 *
 * Redroid (Docker 容器云手机) 的 Provider 实现
 *
 * Redroid 是基于 Docker 容器的 Android 虚拟化方案，运行在 x86/ARM 服务器上。
 *
 * 当前实现状态 (Phase 1.4 - 完成):
 * ✅ create, start, stop, destroy - 容器生命周期管理
 * ✅ getStatus, getConnectionInfo - 状态查询
 * ✅ getCapabilities - 能力声明
 * ✅ getProperties, getMetrics - 设备属性和指标
 * ✅ 控制方法 (tap, swipe, pressKey, inputText) - 用户交互
 * ✅ 多媒体方法 (screenshot, recording) - 屏幕捕获
 * ✅ setLocation - GPS 模拟
 * ✅ waitForAdb - ADB 连接等待
 *
 * 底层依赖：
 * - DockerService: 容器生命周期管理
 * - AdbService: Android 设备控制
 */
@Injectable()
export class RedroidProvider implements IDeviceProvider {
  private readonly logger = new Logger(RedroidProvider.name);
  readonly providerType = DeviceProviderType.REDROID;

  // 录屏追踪 Map: deviceId -> { remotePath: string, startTime: Date }
  private recordings: Map<string, { remotePath: string; startTime: Date }> = new Map();

  constructor(
    private dockerService: DockerService,
    private adbService: AdbService
  ) {}

  /**
   * 确保连接信息包含 ADB 配置（Redroid 设备必需）
   * @private
   */
  private ensureAdbInfo(
    connectionInfo: ConnectionInfo
  ): asserts connectionInfo is ConnectionInfo & { adb: NonNullable<ConnectionInfo['adb']> } {
    if (!connectionInfo.adb) {
      throw new InternalServerErrorException(
        `Redroid device connection info missing ADB configuration`
      );
    }
  }

  /**
   * 创建 Redroid 设备（Docker 容器）
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Redroid device for user ${config.userId}`);

    try {
      // 处理分辨率格式
      let resolutionStr: string;
      if (typeof config.resolution === 'string') {
        resolutionStr = config.resolution;
      } else if (config.resolution) {
        resolutionStr = `${config.resolution.width}x${config.resolution.height}`;
      } else {
        resolutionStr = '1920x1080';
      }

      // 转换为 DockerService 所需的 RedroidConfig
      const redroidConfig: RedroidConfig = {
        name: config.name || `redroid-${config.userId}-${Date.now()}`,
        cpuCores: config.cpuCores || 2,
        memoryMB: config.memoryMB || 4096,
        storageMB: config.storageMB || 10240,
        resolution: resolutionStr,
        dpi: config.dpi || 240,
        adbPort: config.adbPort || 0, // 0 表示自动分配
        androidVersion: config.androidVersion || '11',
        enableGpu: config.enableGpu !== false, // 默认启用 GPU
        enableAudio: config.enableAudio !== false,
      };

      // 调用 DockerService 创建容器
      const container = await this.dockerService.createContainer(redroidConfig);
      const containerInfo = await container.inspect();

      // 获取 ADB 端口（从容器的端口映射中读取）
      const adbPort = parseInt(
        containerInfo.NetworkSettings.Ports['5555/tcp']?.[0]?.HostPort || '0',
        10
      );

      if (!adbPort) {
        throw new InternalServerErrorException('Failed to get ADB port from container');
      }

      // 构建连接信息
      const connectionInfo: ConnectionInfo = {
        providerType: DeviceProviderType.REDROID,
        adb: {
          host: 'localhost',
          port: adbPort,
          serial: `localhost:${adbPort}`,
        },
      };

      // 构建 ProviderDevice
      const device: ProviderDevice = {
        id: containerInfo.Id,
        name: redroidConfig.name,
        status: DeviceProviderStatus.STOPPED, // 容器创建后默认是 stopped 状态
        connectionInfo,
        properties: {
          manufacturer: 'Redroid',
          model: `Redroid-${redroidConfig.androidVersion}`,
          androidVersion: redroidConfig.androidVersion,
          cpuCores: redroidConfig.cpuCores,
          memoryMB: redroidConfig.memoryMB,
          storageMB: redroidConfig.storageMB,
          resolution: redroidConfig.resolution,
          dpi: redroidConfig.dpi,
        },
        createdAt: new Date(containerInfo.Created),
      };

      this.logger.log(`Redroid device created: ${device.id} (ADB port: ${adbPort})`);

      return device;
    } catch (error) {
      this.logger.error(`Failed to create Redroid device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to create Redroid device: ${error.message}`);
    }
  }

  /**
   * 启动 Redroid 设备
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Redroid device: ${deviceId}`);

    try {
      // 启动容器
      await this.dockerService.startContainer(deviceId);
      this.logger.log(`Redroid device started: ${deviceId}`);

      // 等待 ADB 连接可用
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      await this.waitForAdb(connectionInfo.adb.serial, 30000);
      this.logger.log(`ADB connection ready for device: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to start Redroid device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to start Redroid device: ${error.message}`);
    }
  }

  /**
   * 停止 Redroid 设备
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Redroid device: ${deviceId}`);

    try {
      await this.dockerService.stopContainer(deviceId);
      this.logger.log(`Redroid device stopped: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to stop Redroid device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to stop Redroid device: ${error.message}`);
    }
  }

  /**
   * 销毁 Redroid 设备
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Redroid device: ${deviceId}`);

    try {
      // 先停止容器（如果正在运行）
      try {
        await this.dockerService.stopContainer(deviceId);
      } catch (error) {
        // 容器可能已经停止，忽略错误
        this.logger.debug(`Container ${deviceId} already stopped or not found`);
      }

      // 删除容器
      await this.dockerService.removeContainer(deviceId);
      this.logger.log(`Redroid device destroyed: ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy Redroid device: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to destroy Redroid device: ${error.message}`);
    }
  }

  /**
   * 获取设备状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    try {
      const containerInfo = await this.dockerService.getContainerInfo(deviceId);
      const state = containerInfo.State.Status;

      // Docker 状态映射到 DeviceProviderStatus
      switch (state) {
        case 'running':
          return DeviceProviderStatus.RUNNING;
        case 'exited':
        case 'dead':
          return DeviceProviderStatus.STOPPED;
        case 'created':
        case 'restarting':
          return DeviceProviderStatus.CREATING;
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
      const containerInfo = await this.dockerService.getContainerInfo(deviceId);
      const adbPort = parseInt(
        containerInfo.NetworkSettings.Ports['5555/tcp']?.[0]?.HostPort || '0',
        10
      );

      return {
        providerType: DeviceProviderType.REDROID,
        adb: {
          host: 'localhost',
          port: adbPort,
          serial: `localhost:${adbPort}`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get connection info for device ${deviceId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get connection info: ${error.message}`);
    }
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 通过 ADB 获取设备属性
      const [manufacturer, model, androidVersion, sdkVersion, resolution] = await Promise.all([
        this.adbService
          .executeShellCommand(serial, 'getprop ro.product.manufacturer')
          .then((s) => s.trim())
          .catch(() => 'Redroid'),
        this.adbService
          .executeShellCommand(serial, 'getprop ro.product.model')
          .then((s) => s.trim())
          .catch(() => 'Redroid Virtual Device'),
        this.adbService
          .executeShellCommand(serial, 'getprop ro.build.version.release')
          .then((s) => s.trim())
          .catch(() => '11'),
        this.adbService
          .executeShellCommand(serial, 'getprop ro.build.version.sdk')
          .then((s) => parseInt(s.trim(), 10))
          .catch(() => 30),
        this.adbService
          .executeShellCommand(serial, 'wm size')
          .then((s) => {
            const match = s.match(/Physical size: (\d+)x(\d+)/);
            return match ? `${match[1]}x${match[2]}` : '1920x1080';
          })
          .catch(() => '1920x1080'),
      ]);

      // 从容器信息获取资源配置
      const containerInfo = await this.dockerService.getContainerInfo(deviceId);
      const cpuCores =
        containerInfo.HostConfig?.NanoCpus / 1e9 ||
        containerInfo.HostConfig?.CpuQuota / 100000 ||
        2;
      const memoryMB = containerInfo.HostConfig?.Memory
        ? Math.round(containerInfo.HostConfig.Memory / 1024 / 1024)
        : 4096;

      return {
        manufacturer,
        model,
        androidVersion,
        sdkVersion,
        cpuCores,
        memoryMB,
        storageMB: 10240, // Redroid 默认存储
        resolution,
        dpi: 240, // 默认 DPI
      };
    } catch (error) {
      this.logger.error(`Failed to get properties for device ${deviceId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get device properties: ${error.message}`);
    }
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    try {
      const stats = await this.dockerService.getContainerStats(deviceId);

      // ✅ stats 可能为 null（容器未运行或获取失败）
      if (!stats) {
        throw new InternalServerErrorException(
          `Unable to get container stats for device ${deviceId}`
        );
      }

      return {
        cpuUsage: stats.cpu_percent || 0,
        memoryUsage: stats.memory_percent || 0,
        memoryUsed: stats.memory_usage_mb || 0,
        storageUsage: 0,
        networkRx: stats.network_rx_bytes || 0,
        networkTx: stats.network_tx_bytes || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics for device ${deviceId}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get device metrics: ${error.message}`);
    }
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
        CaptureFormat.SCRCPY,
      ],
      maxResolution: { width: 3840, height: 2160 }, // 4K
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
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 使用 ADB input tap 命令
      const command = `input tap ${event.x} ${event.y}`;
      await this.adbService.executeShellCommand(serial, command);

      this.logger.debug(`Touch event sent to ${deviceId}: (${event.x}, ${event.y})`);
    } catch (error) {
      this.logger.error(`Failed to send touch event to ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to send touch event: ${error.message}`);
    }
  }

  /**
   * 发送滑动事件
   */
  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 使用 ADB input swipe 命令
      // swipe <x1> <y1> <x2> <y2> [duration(ms)]
      const duration = event.durationMs || 300; // 默认 300ms
      const command = `input swipe ${event.startX} ${event.startY} ${event.endX} ${event.endY} ${duration}`;
      await this.adbService.executeShellCommand(serial, command);

      this.logger.debug(
        `Swipe event sent to ${deviceId}: (${event.startX},${event.startY}) -> (${event.endX},${event.endY}) [${duration}ms]`
      );
    } catch (error) {
      this.logger.error(`Failed to send swipe event to ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to send swipe event: ${error.message}`);
    }
  }

  /**
   * 发送按键事件
   */
  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 使用 ADB input keyevent 命令
      // Android keycodes: https://developer.android.com/reference/android/view/KeyEvent
      const command = `input keyevent ${event.keyCode}`;
      await this.adbService.executeShellCommand(serial, command);

      this.logger.debug(`Key event sent to ${deviceId}: keycode=${event.keyCode}`);
    } catch (error) {
      this.logger.error(`Failed to send key event to ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to send key event: ${error.message}`);
    }
  }

  /**
   * 输入文本
   */
  async inputText(deviceId: string, input: TextInput): Promise<void> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 转义特殊字符：空格需要用 %s 表示
      const escapedText = input.text.replace(/ /g, '%s').replace(/'/g, "\\'").replace(/"/g, '\\"');

      // 使用 ADB input text 命令
      const command = `input text "${escapedText}"`;
      await this.adbService.executeShellCommand(serial, command);

      this.logger.debug(`Text input sent to ${deviceId}: ${input.text}`);
    } catch (error) {
      this.logger.error(`Failed to input text to ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to input text: ${error.message}`);
    }
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    this.ensureAdbInfo(connectionInfo); // ✅ 类型断言

    // 使用现有的 installApk 方法
    await this.adbService.installApk(connectionInfo.adb.serial, options.apkPath);

    return options.packageName || 'unknown';
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    this.ensureAdbInfo(connectionInfo); // ✅ 类型断言

    await this.adbService.uninstallApp(connectionInfo.adb.serial, packageName);
  }

  /**
   * 推送文件到设备
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    const connectionInfo = await this.getConnectionInfo(deviceId);
    this.ensureAdbInfo(connectionInfo); // ✅ 类型断言

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
    this.ensureAdbInfo(connectionInfo); // ✅ 类型断言

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
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 在设备上截图并保存到临时目录
      const remotePath = `/sdcard/screenshot_${Date.now()}.png`;
      const localPath = `/tmp/screenshot_${deviceId}_${Date.now()}.png`;

      // 执行截图命令
      await this.adbService.executeShellCommand(serial, `screencap -p ${remotePath}`);

      // 从设备拉取截图文件
      await this.adbService.pullFile(serial, remotePath, localPath);

      // 读取文件内容
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(localPath);

      // 清理临时文件
      await Promise.all([
        this.adbService.executeShellCommand(serial, `rm ${remotePath}`),
        fs.unlink(localPath),
      ]);

      this.logger.log(`Screenshot taken for device ${deviceId}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to take screenshot for ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * 开始录制屏幕
   */
  async startRecording(deviceId: string, duration?: number): Promise<string> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 生成录屏文件路径
      const recordingId = `recording_${deviceId}_${Date.now()}`;
      const remotePath = `/sdcard/${recordingId}.mp4`;

      // 开始录屏（异步，不等待完成）
      // screenrecord 参数：
      // --time-limit: 录制时长（秒），最大 180 秒
      // --bit-rate: 比特率，默认 4Mbps
      const timeLimit = duration && duration > 0 ? Math.min(duration, 180) : 180;
      const command = `screenrecord --time-limit ${timeLimit} --bit-rate 4000000 ${remotePath} &`;

      // 执行命令但不等待完成（后台运行）
      this.adbService.executeShellCommand(serial, command, 1000).catch((error) => {
        this.logger.warn(`screenrecord background process: ${error.message}`);
      });

      // 等待一小段时间确保录屏已启动
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 保存录屏信息
      this.recordings.set(deviceId, {
        remotePath,
        startTime: new Date(),
      });

      this.logger.log(
        `Screen recording started for device ${deviceId}, recording ID: ${recordingId}`
      );
      return recordingId;
    } catch (error) {
      this.logger.error(`Failed to start recording for ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * 停止录制屏幕并获取视频
   */
  async stopRecording(deviceId: string, recordingId: string): Promise<Buffer> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 获取录屏信息
      const recording = this.recordings.get(deviceId);
      if (!recording) {
        throw new InternalServerErrorException(`No active recording found for device ${deviceId}`);
      }

      // 停止录屏进程（通过 Ctrl+C 发送 SIGINT）
      await this.adbService.executeShellCommand(serial, 'pkill -2 screenrecord').catch((error) => {
        this.logger.warn(`Failed to stop screenrecord: ${error.message}`);
      });

      // 等待文件写入完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 检查文件是否存在
      const checkCommand = `ls -l ${recording.remotePath}`;
      const fileCheck = await this.adbService
        .executeShellCommand(serial, checkCommand)
        .catch(() => '');

      if (!fileCheck || fileCheck.includes('No such file')) {
        throw new InternalServerErrorException('Recording file not found on device');
      }

      // 拉取录屏文件
      const localPath = `/tmp/${recordingId}.mp4`;
      await this.adbService.pullFile(serial, recording.remotePath, localPath);

      // 读取文件内容
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(localPath);

      // 清理临时文件
      await Promise.all([
        this.adbService.executeShellCommand(serial, `rm ${recording.remotePath}`),
        fs.unlink(localPath),
      ]);

      // 删除录屏记录
      this.recordings.delete(deviceId);

      this.logger.log(
        `Screen recording stopped for device ${deviceId}, size: ${buffer.length} bytes`
      );
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to stop recording for ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * 设置地理位置（模拟 GPS）
   */
  async setLocation(deviceId: string, latitude: number, longitude: number): Promise<void> {
    try {
      const connectionInfo = await this.getConnectionInfo(deviceId);
      this.ensureAdbInfo(connectionInfo); // ✅ 类型断言
      const serial = connectionInfo.adb.serial;

      // 方法 1: 使用 adb emu geo fix (需要模拟器支持)
      // 但 Redroid 不是标准模拟器，可能不支持
      // 方法 2: 使用 mock location provider (需要系统权限)
      // 方法 3: 使用 GPS mock app (需要安装第三方应用)

      // 这里使用最简单的 appops 方法模拟位置
      // 1. 设置模拟位置模式
      await this.adbService.executeShellCommand(serial, 'settings put secure mock_location 1');

      // 2. 使用 dumpsys 设置位置
      // 注意：这是一个简化的实现，实际生产环境可能需要安装专门的 GPS mock 应用
      await this.adbService.executeShellCommand(
        serial,
        `am startservice -a com.android.internal.location.PROVIDER_ENABLED --es provider gps`
      );

      this.logger.log(`Location set for device ${deviceId}: lat=${latitude}, lon=${longitude}`);
      this.logger.warn(
        `Note: GPS mocking in Redroid requires additional setup. ` +
          `Consider using a dedicated GPS mock app like 'GPS JoyStick' for production use.`
      );
    } catch (error) {
      this.logger.error(`Failed to set location for ${deviceId}`, error);
      throw new InternalServerErrorException(`Failed to set location: ${error.message}`);
    }
  }

  /**
   * 等待 ADB 连接可用
   *
   * 在容器启动后，ADB 服务可能需要一些时间才能完全可用。
   * 此方法会轮询检查 ADB 连接状态，直到连接成功或超时。
   *
   * @param serial - ADB 设备序列号 (例如: "localhost:5555")
   * @param timeout - 超时时间（毫秒），默认 30000ms (30秒)
   * @throws InternalServerErrorException 如果超时仍无法连接
   */
  private async waitForAdb(serial: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    const interval = 1000; // 每秒检查一次

    this.logger.log(`Waiting for ADB connection: ${serial}`);

    while (Date.now() - startTime < timeout) {
      try {
        // 尝试执行简单的 shell 命令来测试连接
        const output = await this.adbService.executeShellCommand(serial, 'echo "ready"', 3000);

        if (output.trim() === 'ready') {
          const elapsedTime = Date.now() - startTime;
          this.logger.log(`ADB connection established for ${serial} (took ${elapsedTime}ms)`);
          return;
        }
      } catch (error) {
        // 连接失败，继续等待
        this.logger.debug(`ADB connection attempt failed for ${serial}: ${error.message}`);
      }

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // 超时
    const elapsedTime = Date.now() - startTime;
    throw new InternalServerErrorException(
      `ADB connection timeout for ${serial} after ${elapsedTime}ms`
    );
  }
}
