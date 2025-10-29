import { Injectable, Logger, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Adb from "adbkit";
import * as fs from "fs";
import * as path from "path";
import {
  BusinessErrors,
  BusinessException,
  BusinessErrorCode,
} from "@cloudphone/shared";

@Injectable()
export class AdbService {
  private readonly logger = new Logger(AdbService.name);
  private client: any;
  private connections: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    const adbHost = this.configService.get("ADB_HOST", "localhost");
    const adbPort = this.configService.get("ADB_PORT", 5037);

    try {
      this.client = Adb.createClient({
        host: adbHost,
        port: adbPort,
      });
      this.logger.log(`ADB Client initialized: ${adbHost}:${adbPort}`);
    } catch (error) {
      this.logger.error("Failed to initialize ADB client", error);
    }
  }

  /**
   * 连接到设备
   */
  async connectToDevice(
    deviceId: string,
    host: string,
    port: number,
  ): Promise<void> {
    try {
      const address = `${host}:${port}`;

      // 检查是否已连接
      if (this.connections.has(deviceId)) {
        this.logger.log(`Device ${deviceId} already connected`);
        return;
      }

      // 连接设备
      await this.client.connect(host, port);
      this.connections.set(deviceId, { host, port, address });

      this.logger.log(`Connected to device ${deviceId} at ${address}`);
    } catch (error) {
      this.logger.error(`Failed to connect to device ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`连接失败: ${error.message}`, {
        deviceId,
        host,
        port,
      });
    }
  }

  /**
   * 断开设备连接
   */
  async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        this.logger.warn(`Device ${deviceId} not connected`);
        return;
      }

      await this.client.disconnect(connection.host, connection.port);
      this.connections.delete(deviceId);

      this.logger.log(`Disconnected from device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect from device ${deviceId}`, error);
    }
  }

  /**
   * 执行 Shell 命令
   */
  async executeShellCommand(
    deviceId: string,
    command: string,
    timeout: number = 5000,
  ): Promise<string> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      const output = await this.client
        .shell(connection.address, command)
        .then(Adb.util.readAll)
        .then((buffer: Buffer) => buffer.toString("utf8"))
        .timeout(timeout);

      this.logger.debug(`Command executed on ${deviceId}: ${command}`);
      return output;
    } catch (error) {
      this.logger.error(`Failed to execute command on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `命令执行失败: ${error.message}`,
        { deviceId, command },
      );
    }
  }

  /**
   * 安装 APK
   */
  async installApk(
    deviceId: string,
    apkPath: string,
    reinstall: boolean = false,
  ): Promise<boolean> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      // 检查文件是否存在
      if (!fs.existsSync(apkPath)) {
        throw BusinessErrors.adbFileNotFound(apkPath);
      }

      // 安装 APK
      await this.client.install(connection.address, apkPath, {
        reinstall,
      });

      this.logger.log(`APK installed on device ${deviceId}: ${apkPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to install APK on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `APK 安装失败: ${error.message}`,
        { deviceId, apkPath },
      );
    }
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<boolean> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      await this.client.uninstall(connection.address, packageName);

      this.logger.log(
        `App uninstalled from device ${deviceId}: ${packageName}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to uninstall app from ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `应用卸载失败: ${error.message}`,
        { deviceId, packageName },
      );
    }
  }

  /**
   * 推送文件到设备
   */
  async pushFile(
    deviceId: string,
    localPath: string,
    remotePath: string,
  ): Promise<boolean> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      if (!fs.existsSync(localPath)) {
        throw BusinessErrors.adbFileNotFound(localPath);
      }

      const transfer = await this.client.push(
        connection.address,
        localPath,
        remotePath,
      );

      // 等待传输完成
      await new Promise((resolve, reject) => {
        transfer.on("end", resolve);
        transfer.on("error", reject);
      });

      this.logger.log(
        `File pushed to device ${deviceId}: ${localPath} -> ${remotePath}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to push file to ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `文件推送失败: ${error.message}`,
        { deviceId, localPath, remotePath },
      );
    }
  }

  /**
   * 从设备拉取文件
   */
  async pullFile(
    deviceId: string,
    remotePath: string,
    localPath: string,
  ): Promise<boolean> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      const transfer = await this.client.pull(connection.address, remotePath);

      // 创建写入流
      const writeStream = fs.createWriteStream(localPath);
      transfer.pipe(writeStream);

      // 等待传输完成
      await new Promise((resolve, reject) => {
        transfer.on("end", resolve);
        transfer.on("error", reject);
        writeStream.on("error", reject);
      });

      this.logger.log(
        `File pulled from device ${deviceId}: ${remotePath} -> ${localPath}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to pull file from ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `文件拉取失败: ${error.message}`,
        { deviceId, remotePath, localPath },
      );
    }
  }

  /**
   * 截屏保存到文件
   */
  async takeScreenshotToFile(
    deviceId: string,
    outputPath: string,
  ): Promise<string> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      const screencap = await this.client.screencap(connection.address);

      // 保存截图
      const writeStream = fs.createWriteStream(outputPath);
      screencap.pipe(writeStream);

      await new Promise((resolve, reject) => {
        screencap.on("end", resolve);
        screencap.on("error", reject);
        writeStream.on("error", reject);
      });

      this.logger.log(`Screenshot saved for device ${deviceId}: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to take screenshot on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`截屏失败: ${error.message}`, {
        deviceId,
        outputPath,
      });
    }
  }

  /**
   * 截屏并返回 Buffer（用于 API 响应）
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      const screencap = await this.client.screencap(connection.address);

      // 收集数据到 Buffer
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        screencap.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        screencap.on("end", () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(
            `Screenshot captured for device ${deviceId}, size: ${buffer.length} bytes`,
          );
          resolve(buffer);
        });

        screencap.on("error", (error) => {
          this.logger.error(
            `Failed to capture screenshot stream on ${deviceId}`,
            error,
          );
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to take screenshot on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`截屏失败: ${error.message}`, {
        deviceId,
      });
    }
  }

  /**
   * 获取设备属性
   */
  async getDeviceProperties(deviceId: string): Promise<any> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      const properties = await this.client.getProperties(connection.address);
      return properties;
    } catch (error) {
      this.logger.error(`Failed to get properties for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `获取设备属性失败: ${error.message}`,
        { deviceId },
      );
    }
  }

  /**
   * 获取已安装的应用列表
   */
  async getInstalledPackages(deviceId: string): Promise<string[]> {
    try {
      const output = await this.executeShellCommand(
        deviceId,
        "pm list packages",
      );

      // 解析输出，每行格式为 "package:com.example.app"
      const packages = output
        .split("\n")
        .filter((line) => line.startsWith("package:"))
        .map((line) => line.replace("package:", "").trim())
        .filter((pkg) => pkg.length > 0);

      return packages;
    } catch (error) {
      this.logger.error(
        `Failed to get installed packages for ${deviceId}`,
        error,
      );
      throw BusinessErrors.adbOperationFailed(
        `获取应用列表失败: ${error.message}`,
        { deviceId },
      );
    }
  }

  /**
   * 读取 logcat
   */
  async readLogcat(
    deviceId: string,
    options: { filter?: string; lines?: number } = {},
  ): Promise<string> {
    try {
      const { filter = "", lines = 100 } = options;

      let command = `logcat -d -t ${lines}`;
      if (filter) {
        command += ` | grep "${filter}"`;
      }

      return await this.executeShellCommand(deviceId, command, 10000);
    } catch (error) {
      this.logger.error(`Failed to read logcat for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `读取日志失败: ${error.message}`,
        { deviceId },
      );
    }
  }

  /**
   * 清空 logcat
   */
  async clearLogcat(deviceId: string): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, "logcat -c");
      this.logger.log(`Logcat cleared for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to clear logcat for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `清空日志失败: ${error.message}`,
        { deviceId },
      );
    }
  }

  /**
   * 重启设备
   */
  async rebootDevice(deviceId: string): Promise<void> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      await this.client.reboot(connection.address);

      // 重启后需要重新连接
      this.connections.delete(deviceId);

      this.logger.log(`Device ${deviceId} rebooted`);
    } catch (error) {
      this.logger.error(`Failed to reboot device ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `重启设备失败: ${error.message}`,
        { deviceId },
      );
    }
  }

  /**
   * 检查设备是否在线
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.connections.has(deviceId);
  }

  /**
   * 获取所有已连接设备
   */
  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 触控点击
   * @param deviceId 设备 ID
   * @param x X 坐标
   * @param y Y 坐标
   */
  async tap(deviceId: string, x: number, y: number): Promise<void> {
    try {
      const command = `input tap ${x} ${y}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(`Tap executed on ${deviceId}: (${x}, ${y})`);
    } catch (error) {
      this.logger.error(`Failed to tap on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `触控点击失败: ${error.message}`,
        { deviceId, x, y },
      );
    }
  }

  /**
   * 滑动操作
   * @param deviceId 设备 ID
   * @param startX 起始 X 坐标
   * @param startY 起始 Y 坐标
   * @param endX 结束 X 坐标
   * @param endY 结束 Y 坐标
   * @param durationMs 滑动持续时间（毫秒），默认 300ms
   */
  async swipe(
    deviceId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number = 300,
  ): Promise<void> {
    try {
      const command = `input swipe ${startX} ${startY} ${endX} ${endY} ${durationMs}`;
      await this.executeShellCommand(deviceId, command, 5000);
      this.logger.debug(
        `Swipe executed on ${deviceId}: (${startX},${startY}) → (${endX},${endY}) [${durationMs}ms]`,
      );
    } catch (error) {
      this.logger.error(`Failed to swipe on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `滑动操作失败: ${error.message}`,
        {
          deviceId,
          startX,
          startY,
          endX,
          endY,
        },
      );
    }
  }

  /**
   * 发送按键事件
   * @param deviceId 设备 ID
   * @param keyCode 按键码（如 3=HOME, 4=BACK, 26=POWER）
   *
   * 常用按键码：
   * - KEYCODE_HOME = 3
   * - KEYCODE_BACK = 4
   * - KEYCODE_MENU = 82
   * - KEYCODE_POWER = 26
   * - KEYCODE_VOLUME_UP = 24
   * - KEYCODE_VOLUME_DOWN = 25
   * - KEYCODE_ENTER = 66
   */
  async sendKey(deviceId: string, keyCode: number): Promise<void> {
    try {
      const command = `input keyevent ${keyCode}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(`Key event sent to ${deviceId}: keyCode=${keyCode}`);
    } catch (error) {
      this.logger.error(`Failed to send key event to ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `发送按键失败: ${error.message}`,
        { deviceId, keyCode },
      );
    }
  }

  /**
   * 输入文本
   * @param deviceId 设备 ID
   * @param text 要输入的文本（会自动转义空格为 %s）
   */
  async inputText(deviceId: string, text: string): Promise<void> {
    try {
      // 转义特殊字符，空格替换为 %s
      const escapedText = text.replace(/ /g, "%s");
      const command = `input text "${escapedText}"`;
      await this.executeShellCommand(deviceId, command, 5000);
      this.logger.debug(`Text input executed on ${deviceId}: ${text}`);
    } catch (error) {
      this.logger.error(`Failed to input text on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `文本输入失败: ${error.message}`,
        { deviceId, text },
      );
    }
  }

  /**
   * 开始录屏
   * @param deviceId 设备 ID
   * @param remotePath 设备上的录屏文件路径（如 /sdcard/recording.mp4）
   * @param options 录屏选项
   * @returns 录屏进程 ID（用于停止录屏）
   */
  async startRecording(
    deviceId: string,
    remotePath: string = "/sdcard/recording.mp4",
    options: {
      timeLimit?: number; // 录屏时长限制（秒），默认 180 秒
      bitRate?: number; // 比特率（Mbps），默认 4
      size?: string; // 视频尺寸（如 "1280x720"）
    } = {},
  ): Promise<string> {
    try {
      const { timeLimit = 180, bitRate = 4, size } = options;

      let command = `screenrecord --time-limit ${timeLimit} --bit-rate ${bitRate * 1000000}`;
      if (size) {
        command += ` --size ${size}`;
      }
      command += ` ${remotePath}`;

      // 异步执行，不等待完成（录屏会持续进行）
      this.executeShellCommand(
        deviceId,
        command,
        timeLimit * 1000 + 5000,
      ).catch((error) => {
        this.logger.error(`Recording failed for ${deviceId}`, error);
      });

      const recordingId = `recording_${deviceId}_${Date.now()}`;
      this.logger.log(
        `Recording started on ${deviceId}: ${remotePath} (timeLimit: ${timeLimit}s, bitRate: ${bitRate}Mbps)`,
      );

      return recordingId;
    } catch (error) {
      this.logger.error(`Failed to start recording on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `开始录屏失败: ${error.message}`,
        { deviceId, remotePath },
      );
    }
  }

  /**
   * 停止录屏
   * @param deviceId 设备 ID
   * @param recordingId 录屏 ID（由 startRecording 返回，当前版本未使用）
   *
   * 注意：停止录屏通过发送 Ctrl+C 信号实现，由于 adbkit 限制，
   * 实际上是通过杀死 screenrecord 进程来停止的
   */
  async stopRecording(deviceId: string, _recordingId?: string): Promise<void> {
    try {
      // 杀死所有 screenrecord 进程
      await this.executeShellCommand(
        deviceId,
        "pkill -SIGINT screenrecord",
        3000,
      );
      this.logger.log(`Recording stopped on ${deviceId}`);
    } catch (error) {
      // 如果进程不存在，pkill 会返回错误，这是正常的
      if (error.message && !error.message.includes("No such process")) {
        this.logger.error(`Failed to stop recording on ${deviceId}`, error);
        throw BusinessErrors.adbOperationFailed(
          `停止录屏失败: ${error.message}`,
          { deviceId },
        );
      }
      this.logger.log(
        `Recording stopped on ${deviceId} (no active recording found)`,
      );
    }
  }

  /**
   * 设置地理位置（需要 mock location 权限）
   * @param deviceId 设备 ID
   * @param latitude 纬度
   * @param longitude 经度
   */
  async setLocation(
    deviceId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    try {
      // 使用 geo 命令模拟位置（仅在模拟器上有效）
      // 物理设备需要使用第三方 Mock Location 应用
      const command = `am broadcast -a android.location.providers.gps.mock -e lat ${latitude} -e lon ${longitude}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(
        `Location set on ${deviceId}: (${latitude}, ${longitude})`,
      );
    } catch (error) {
      this.logger.error(`Failed to set location on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(
        `设置位置失败: ${error.message}`,
        {
          deviceId,
          latitude,
          longitude,
        },
      );
    }
  }
}
