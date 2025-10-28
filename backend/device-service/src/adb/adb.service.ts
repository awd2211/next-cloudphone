import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Adb from 'adbkit';
import * as fs from 'fs';
import * as path from 'path';
import { BusinessErrors, BusinessException, BusinessErrorCode } from '@cloudphone/shared';

@Injectable()
export class AdbService {
  private readonly logger = new Logger(AdbService.name);
  private client: any;
  private connections: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    const adbHost = this.configService.get('ADB_HOST', 'localhost');
    const adbPort = this.configService.get('ADB_PORT', 5037);

    try {
      this.client = Adb.createClient({
        host: adbHost,
        port: adbPort,
      });
      this.logger.log(`ADB Client initialized: ${adbHost}:${adbPort}`);
    } catch (error) {
      this.logger.error('Failed to initialize ADB client', error);
    }
  }

  /**
   * 连接到设备
   */
  async connectToDevice(deviceId: string, host: string, port: number): Promise<void> {
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
      throw BusinessErrors.adbOperationFailed(`连接失败: ${error.message}`, { deviceId, host, port });
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
        .then((buffer: Buffer) => buffer.toString('utf8'))
        .timeout(timeout);

      this.logger.debug(`Command executed on ${deviceId}: ${command}`);
      return output;
    } catch (error) {
      this.logger.error(`Failed to execute command on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`命令执行失败: ${error.message}`, { deviceId, command });
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
      throw BusinessErrors.adbOperationFailed(`APK 安装失败: ${error.message}`, { deviceId, apkPath });
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

      this.logger.log(`App uninstalled from device ${deviceId}: ${packageName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to uninstall app from ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`应用卸载失败: ${error.message}`, { deviceId, packageName });
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

      const transfer = await this.client.push(connection.address, localPath, remotePath);

      // 等待传输完成
      await new Promise((resolve, reject) => {
        transfer.on('end', resolve);
        transfer.on('error', reject);
      });

      this.logger.log(`File pushed to device ${deviceId}: ${localPath} -> ${remotePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to push file to ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`文件推送失败: ${error.message}`, { deviceId, localPath, remotePath });
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
        transfer.on('end', resolve);
        transfer.on('error', reject);
        writeStream.on('error', reject);
      });

      this.logger.log(`File pulled from device ${deviceId}: ${remotePath} -> ${localPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to pull file from ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`文件拉取失败: ${error.message}`, { deviceId, remotePath, localPath });
    }
  }

  /**
   * 截屏保存到文件
   */
  async takeScreenshotToFile(deviceId: string, outputPath: string): Promise<string> {
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
        screencap.on('end', resolve);
        screencap.on('error', reject);
        writeStream.on('error', reject);
      });

      this.logger.log(`Screenshot saved for device ${deviceId}: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to take screenshot on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`截屏失败: ${error.message}`, { deviceId, outputPath });
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
        screencap.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        screencap.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(`Screenshot captured for device ${deviceId}, size: ${buffer.length} bytes`);
          resolve(buffer);
        });

        screencap.on('error', (error) => {
          this.logger.error(`Failed to capture screenshot stream on ${deviceId}`, error);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to take screenshot on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`截屏失败: ${error.message}`, { deviceId });
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
      throw BusinessErrors.adbOperationFailed(`获取设备属性失败: ${error.message}`, { deviceId });
    }
  }

  /**
   * 获取已安装的应用列表
   */
  async getInstalledPackages(deviceId: string): Promise<string[]> {
    try {
      const output = await this.executeShellCommand(deviceId, 'pm list packages');

      // 解析输出，每行格式为 "package:com.example.app"
      const packages = output
        .split('\n')
        .filter(line => line.startsWith('package:'))
        .map(line => line.replace('package:', '').trim())
        .filter(pkg => pkg.length > 0);

      return packages;
    } catch (error) {
      this.logger.error(`Failed to get installed packages for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`获取应用列表失败: ${error.message}`, { deviceId });
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
      const { filter = '', lines = 100 } = options;

      let command = `logcat -d -t ${lines}`;
      if (filter) {
        command += ` | grep "${filter}"`;
      }

      return await this.executeShellCommand(deviceId, command, 10000);
    } catch (error) {
      this.logger.error(`Failed to read logcat for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`读取日志失败: ${error.message}`, { deviceId });
    }
  }

  /**
   * 清空 logcat
   */
  async clearLogcat(deviceId: string): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, 'logcat -c');
      this.logger.log(`Logcat cleared for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to clear logcat for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`清空日志失败: ${error.message}`, { deviceId });
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
      throw BusinessErrors.adbOperationFailed(`重启设备失败: ${error.message}`, { deviceId });
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
}
