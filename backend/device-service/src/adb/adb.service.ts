import { Injectable, Logger, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Adb from 'adbkit';
import * as fs from 'fs';
import * as path from 'path';
import { BusinessErrors, BusinessException, BusinessErrorCode } from '@cloudphone/shared';

/**
 * 允许的 ADB Shell 命令白名单
 * 只允许执行这些安全的命令前缀
 */
const ALLOWED_SHELL_COMMANDS = [
  'pm list packages',
  'pm list features',
  'pm list permissions',
  'pm path',
  'dumpsys',
  'getprop',
  'settings get',
  'settings put',
  'settings list',
  'logcat -d',
  'logcat -c',
  'input tap',
  'input swipe',
  'input text',
  'input keyevent',
  'screenrecord',
  'pkill -SIGINT screenrecord',
  'am broadcast',
  'am start',
  'wm size',
  'wm density',
] as const;

/**
 * 允许的按键码范围（Android KeyEvent codes）
 */
const VALID_KEYCODE_RANGE = { min: 0, max: 300 };

/**
 * 允许的坐标范围（屏幕尺寸限制）
 */
const VALID_COORDINATE_RANGE = { min: 0, max: 10000 };

/**
 * 录屏会话接口
 */
interface RecordingSession {
  recordingId: string;
  deviceId: string;
  remotePath: string;
  startTime: Date;
  timeLimit: number;
  processPromise: Promise<void>;
  timeoutHandle: NodeJS.Timeout;
}

@Injectable()
export class AdbService implements OnModuleInit {
  private readonly logger = new Logger(AdbService.name);
  private client: any;
  private connections: Map<string, any> = new Map();

  /**
   * 录屏会话管理
   * Key: recordingId
   * Value: RecordingSession
   */
  private recordingSessions: Map<string, RecordingSession> = new Map();

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
   * 服务启动时清理所有孤儿录屏进程
   * 防止服务重启后遗留的录屏进程继续占用资源
   */
  async onModuleInit() {
    this.logger.log('Cleaning up orphaned recording processes...');

    for (const deviceId of this.connections.keys()) {
      try {
        await this.executeShellCommand(deviceId, 'pkill -SIGINT screenrecord', 3000);
        this.logger.debug(`Cleaned up recording processes on ${deviceId}`);
      } catch (error) {
        // Ignore errors (no recording process is expected)
      }
    }

    this.logger.log('Orphaned recording processes cleanup completed');
  }

  /**
   * 验证 Shell 命令是否在白名单中
   * @param command 要执行的命令
   * @throws BusinessException 如果命令不在白名单中
   */
  private validateCommand(command: string): void {
    const trimmedCommand = command.trim();

    // 检查命令是否以允许的前缀开头
    const isAllowed = ALLOWED_SHELL_COMMANDS.some((allowedCmd) =>
      trimmedCommand.startsWith(allowedCmd)
    );

    if (!isAllowed) {
      this.logger.error(`Blocked unauthorized command: ${command}`);
      throw BusinessErrors.adbOperationFailed('不允许执行的命令', { command: trimmedCommand });
    }

    // 检查是否包含命令注入特殊字符
    const dangerousPatterns = [
      /[;&|`$(){}[\]<>]/g, // Shell 元字符
      /\n|\r/g, // 换行符
      /\.\.\//g, // 路径遍历
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedCommand)) {
        this.logger.error(`Blocked command with dangerous characters: ${command}`);
        throw BusinessErrors.adbOperationFailed('命令包含非法字符', { command: trimmedCommand });
      }
    }
  }

  /**
   * 验证数值参数（坐标、按键码等）
   * @param value 要验证的值
   * @param min 最小值
   * @param max 最大值
   * @param paramName 参数名称（用于错误消息）
   * @throws BusinessException 如果值超出范围
   */
  private validateNumericParameter(
    value: number,
    min: number,
    max: number,
    paramName: string
  ): void {
    if (!Number.isFinite(value) || value < min || value > max) {
      this.logger.error(`Invalid ${paramName}: ${value} (valid range: ${min}-${max})`);
      throw BusinessErrors.adbOperationFailed(`参数 ${paramName} 超出有效范围`, {
        value,
        min,
        max,
      });
    }
  }

  /**
   * 转义文本输入中的特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  private escapeTextInput(text: string): string {
    // 只允许字母、数字、常见标点符号
    const allowedChars = /^[a-zA-Z0-9\s.,!?@#%^&*()_+=\-[\]{}:;"'<>/\\]*$/;

    if (!allowedChars.test(text)) {
      this.logger.error(`Text contains disallowed characters: ${text}`);
      throw BusinessErrors.adbOperationFailed('文本包含非法字符', { text });
    }

    // 转义特殊字符
    return text
      .replace(/\\/g, '\\\\') // 反斜杠
      .replace(/"/g, '\\"') // 双引号
      .replace(/'/g, "\\'") // 单引号
      .replace(/ /g, '%s'); // 空格替换为 %s (ADB 要求)
  }

  /**
   * 验证包名格式
   * @param packageName 包名
   * @throws BusinessException 如果包名格式不正确
   */
  private validatePackageName(packageName: string): void {
    // Android 包名格式：com.example.app
    const packageNamePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

    if (!packageNamePattern.test(packageName)) {
      this.logger.error(`Invalid package name: ${packageName}`);
      throw BusinessErrors.adbOperationFailed('包名格式不正确', { packageName });
    }
  }

  /**
   * 验证设备文件路径（防止路径遍历攻击）
   * @param remotePath 设备上的文件路径
   * @param allowedDirs 允许的目录列表（如 ['/sdcard/', '/data/local/tmp/']）
   * @throws BusinessException 如果路径不安全
   */
  private validateDeviceFilePath(
    remotePath: string,
    allowedDirs: string[] = ['/sdcard/', '/data/local/tmp/']
  ): void {
    // 检查路径是否在允许的目录中
    const isAllowed = allowedDirs.some((dir) => remotePath.startsWith(dir));
    if (!isAllowed) {
      this.logger.error(`Unauthorized path access attempt: ${remotePath}`);
      throw BusinessErrors.adbOperationFailed(
        `文件路径必须在以下目录之一: ${allowedDirs.join(', ')}`,
        { remotePath }
      );
    }

    // 防止路径遍历攻击
    if (remotePath.includes('..') || remotePath.includes('//')) {
      this.logger.error(`Path traversal attempt detected: ${remotePath}`);
      throw BusinessErrors.adbOperationFailed('文件路径包含非法字符', { remotePath });
    }

    // 防止访问敏感文件
    const blockedPatterns = [
      /\/etc\//,
      /\/proc\//,
      /\/sys\//,
      /\/root\//,
      /\/system\//,
      /password/i,
      /shadow/i,
      /\.ssh\//,
      /\.key$/,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(remotePath)) {
        this.logger.error(`Blocked access to sensitive path: ${remotePath}`);
        throw BusinessErrors.adbOperationFailed('不允许访问系统敏感文件', { remotePath });
      }
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
   *
   * ⚠️ SECURITY: 所有命令都会经过白名单验证
   */
  async executeShellCommand(
    deviceId: string,
    command: string,
    timeout: number = 5000
  ): Promise<string> {
    try {
      // 🔒 安全验证：检查命令是否在白名单中
      this.validateCommand(command);

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
      throw BusinessErrors.adbOperationFailed(`命令执行失败: ${error.message}`, {
        deviceId,
        command,
      });
    }
  }

  /**
   * 安装 APK
   */
  async installApk(
    deviceId: string,
    apkPath: string,
    reinstall: boolean = false
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
      throw BusinessErrors.adbOperationFailed(`APK 安装失败: ${error.message}`, {
        deviceId,
        apkPath,
      });
    }
  }

  /**
   * 卸载应用
   *
   * ⚠️ SECURITY: 验证包名格式
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<boolean> {
    try {
      // 🔒 安全验证：检查包名格式
      this.validatePackageName(packageName);

      const connection = this.connections.get(deviceId);
      if (!connection) {
        throw BusinessErrors.adbDeviceOffline(deviceId);
      }

      await this.client.uninstall(connection.address, packageName);

      this.logger.log(`App uninstalled from device ${deviceId}: ${packageName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to uninstall app from ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`应用卸载失败: ${error.message}`, {
        deviceId,
        packageName,
      });
    }
  }

  /**
   * 推送文件到设备
   *
   * ⚠️ SECURITY: 验证目标路径安全性
   */
  async pushFile(deviceId: string, localPath: string, remotePath: string): Promise<boolean> {
    try {
      // 🔒 安全验证：检查目标路径
      this.validateDeviceFilePath(remotePath);

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
      throw BusinessErrors.adbOperationFailed(`文件推送失败: ${error.message}`, {
        deviceId,
        localPath,
        remotePath,
      });
    }
  }

  /**
   * 从设备拉取文件
   *
   * ⚠️ SECURITY: 验证源路径安全性
   */
  async pullFile(deviceId: string, remotePath: string, localPath: string): Promise<boolean> {
    try {
      // 🔒 安全验证：检查源路径
      this.validateDeviceFilePath(remotePath);

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
      throw BusinessErrors.adbOperationFailed(`文件拉取失败: ${error.message}`, {
        deviceId,
        remotePath,
        localPath,
      });
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
        screencap.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        screencap.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(
            `Screenshot captured for device ${deviceId}, size: ${buffer.length} bytes`
          );
          resolve(buffer);
        });

        screencap.on('error', (error: Error) => {
          this.logger.error(`Failed to capture screenshot stream on ${deviceId}`, error);
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
        .filter((line) => line.startsWith('package:'))
        .map((line) => line.replace('package:', '').trim())
        .filter((pkg) => pkg.length > 0);

      return packages;
    } catch (error) {
      this.logger.error(`Failed to get installed packages for ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`获取应用列表失败: ${error.message}`, { deviceId });
    }
  }

  /**
   * 读取 logcat
   *
   * ⚠️ SECURITY FIX: 在应用层过滤，不在 shell 中使用 grep
   */
  async readLogcat(
    deviceId: string,
    options: { filter?: string; lines?: number } = {}
  ): Promise<string> {
    try {
      const { filter = '', lines = 100 } = options;

      // 🔒 安全验证：验证行数参数
      this.validateNumericParameter(lines, 1, 10000, 'lines');

      // 🔒 安全修复：只执行 logcat 命令，不使用 shell 管道
      const command = `logcat -d -t ${lines}`;
      const output = await this.executeShellCommand(deviceId, command, 10000);

      // 🔒 在应用层进行过滤（如果需要）
      if (filter && filter.trim().length > 0) {
        // 转义正则表达式特殊字符
        const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filterRegex = new RegExp(escapedFilter, 'i');

        const filteredLines = output.split('\n').filter((line) => filterRegex.test(line));

        return filteredLines.join('\n');
      }

      return output;
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

  /**
   * 触控点击
   * @param deviceId 设备 ID
   * @param x X 坐标
   * @param y Y 坐标
   *
   * ⚠️ SECURITY: 验证坐标范围
   */
  async tap(deviceId: string, x: number, y: number): Promise<void> {
    try {
      // 🔒 安全验证：检查坐标范围
      this.validateNumericParameter(x, VALID_COORDINATE_RANGE.min, VALID_COORDINATE_RANGE.max, 'x');
      this.validateNumericParameter(y, VALID_COORDINATE_RANGE.min, VALID_COORDINATE_RANGE.max, 'y');

      const command = `input tap ${x} ${y}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(`Tap executed on ${deviceId}: (${x}, ${y})`);
    } catch (error) {
      this.logger.error(`Failed to tap on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`触控点击失败: ${error.message}`, { deviceId, x, y });
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
   *
   * ⚠️ SECURITY: 验证所有坐标和时长参数
   */
  async swipe(
    deviceId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number = 300
  ): Promise<void> {
    try {
      // 🔒 安全验证：检查所有坐标
      this.validateNumericParameter(
        startX,
        VALID_COORDINATE_RANGE.min,
        VALID_COORDINATE_RANGE.max,
        'startX'
      );
      this.validateNumericParameter(
        startY,
        VALID_COORDINATE_RANGE.min,
        VALID_COORDINATE_RANGE.max,
        'startY'
      );
      this.validateNumericParameter(
        endX,
        VALID_COORDINATE_RANGE.min,
        VALID_COORDINATE_RANGE.max,
        'endX'
      );
      this.validateNumericParameter(
        endY,
        VALID_COORDINATE_RANGE.min,
        VALID_COORDINATE_RANGE.max,
        'endY'
      );
      this.validateNumericParameter(durationMs, 1, 10000, 'durationMs');

      const command = `input swipe ${startX} ${startY} ${endX} ${endY} ${durationMs}`;
      await this.executeShellCommand(deviceId, command, 5000);
      this.logger.debug(
        `Swipe executed on ${deviceId}: (${startX},${startY}) → (${endX},${endY}) [${durationMs}ms]`
      );
    } catch (error) {
      this.logger.error(`Failed to swipe on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`滑动操作失败: ${error.message}`, {
        deviceId,
        startX,
        startY,
        endX,
        endY,
      });
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
   *
   * ⚠️ SECURITY: 验证按键码范围
   */
  async sendKey(deviceId: string, keyCode: number): Promise<void> {
    try {
      // 🔒 安全验证：检查按键码范围
      this.validateNumericParameter(
        keyCode,
        VALID_KEYCODE_RANGE.min,
        VALID_KEYCODE_RANGE.max,
        'keyCode'
      );

      const command = `input keyevent ${keyCode}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(`Key event sent to ${deviceId}: keyCode=${keyCode}`);
    } catch (error) {
      this.logger.error(`Failed to send key event to ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`发送按键失败: ${error.message}`, {
        deviceId,
        keyCode,
      });
    }
  }

  /**
   * 输入文本
   * @param deviceId 设备 ID
   * @param text 要输入的文本（会自动转义空格为 %s）
   *
   * ⚠️ SECURITY: 严格转义和验证输入文本
   */
  async inputText(deviceId: string, text: string): Promise<void> {
    try {
      // 🔒 安全验证：转义和验证文本输入
      const escapedText = this.escapeTextInput(text);

      const command = `input text "${escapedText}"`;
      await this.executeShellCommand(deviceId, command, 5000);
      this.logger.debug(`Text input executed on ${deviceId}: ${text}`);
    } catch (error) {
      this.logger.error(`Failed to input text on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`文本输入失败: ${error.message}`, { deviceId, text });
    }
  }

  /**
   * 开始录屏
   * @param deviceId 设备 ID
   * @param remotePath 设备上的录屏文件路径（如 /sdcard/recording.mp4）
   * @param options 录屏选项
   * @returns 录屏进程 ID（用于停止录屏）
   *
   * ⚠️ SECURITY: 验证录屏参数
   * ✅ FIXED: 添加会话管理，防止资源泄漏
   */
  async startRecording(
    deviceId: string,
    remotePath: string = '/sdcard/recording.mp4',
    options: {
      timeLimit?: number; // 录屏时长限制（秒），默认 180 秒
      bitRate?: number; // 比特率（Mbps），默认 4
      size?: string; // 视频尺寸（如 "1280x720"）
    } = {}
  ): Promise<string> {
    try {
      // 1. 检查设备是否已有活跃的录屏会话
      const existingSession = Array.from(this.recordingSessions.values()).find(
        (session) => session.deviceId === deviceId
      );

      if (existingSession) {
        this.logger.warn(
          `Device ${deviceId} already has an active recording session: ${existingSession.recordingId}`
        );
        throw BusinessErrors.adbOperationFailed('设备已有活跃的录屏会话，请先停止当前录屏', {
          deviceId,
          existingRecordingId: existingSession.recordingId,
        });
      }

      const { timeLimit = 180, bitRate = 4, size } = options;

      // 2. 🔒 安全验证：验证录屏参数
      this.validateNumericParameter(timeLimit, 1, 600, 'timeLimit'); // 最长 10 分钟
      this.validateNumericParameter(bitRate, 1, 50, 'bitRate'); // 最高 50Mbps

      // 🔒 验证文件路径（使用通用路径验证）
      this.validateDeviceFilePath(remotePath, ['/sdcard/']);

      // 🔒 验证文件扩展名（只允许 .mp4）
      if (!remotePath.endsWith('.mp4')) {
        this.logger.error(`Invalid recording file extension: ${remotePath}`);
        throw BusinessErrors.adbOperationFailed('录屏文件必须是 .mp4 格式', { remotePath });
      }

      // 验证视频尺寸格式（如果提供）
      if (size) {
        const sizePattern = /^\d{3,4}x\d{3,4}$/;
        if (!sizePattern.test(size)) {
          this.logger.error(`Invalid video size format: ${size}`);
          throw BusinessErrors.adbOperationFailed('视频尺寸格式不正确（应为 WIDTHxHEIGHT）', {
            size,
          });
        }
      }

      // 3. 构建录屏命令
      let command = `screenrecord --time-limit ${timeLimit} --bit-rate ${bitRate * 1000000}`;
      if (size) {
        command += ` --size ${size}`;
      }
      command += ` ${remotePath}`;

      // 4. 生成唯一的录屏 ID（使用 UUID 会更好，但为简化使用时间戳）
      const recordingId = `recording_${deviceId}_${Date.now()}`;

      // 5. 异步执行录屏命令并捕获 Promise
      const processPromise = this.executeShellCommand(deviceId, command, timeLimit * 1000 + 5000)
        .then(() => {
          this.logger.log(`Recording completed naturally on ${deviceId}: ${recordingId}`);
          // 录屏正常结束，清理会话
          this.cleanupRecordingSession(recordingId);
        })
        .catch((error) => {
          this.logger.error(`Recording failed for ${deviceId}: ${recordingId}`, error);
          // 录屏失败，也需要清理会话
          this.cleanupRecordingSession(recordingId);
        });

      // 6. 设置超时自动清理（timeLimit + 10秒缓冲）
      const timeoutHandle = setTimeout(
        () => {
          this.logger.warn(`Recording session ${recordingId} exceeded timeout, auto-stopping...`);
          this.stopRecording(deviceId, recordingId).catch((error) => {
            this.logger.error(`Failed to auto-stop recording ${recordingId}`, error);
          });
        },
        timeLimit * 1000 + 10000
      );

      // 7. 注册会话
      const session: RecordingSession = {
        recordingId,
        deviceId,
        remotePath,
        startTime: new Date(),
        timeLimit,
        processPromise,
        timeoutHandle,
      };

      this.recordingSessions.set(recordingId, session);

      this.logger.log(
        `Recording started on ${deviceId}: ${remotePath} (recordingId: ${recordingId}, timeLimit: ${timeLimit}s, bitRate: ${bitRate}Mbps)`
      );

      return recordingId;
    } catch (error) {
      this.logger.error(`Failed to start recording on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`开始录屏失败: ${error.message}`, {
        deviceId,
        remotePath,
      });
    }
  }

  /**
   * 停止录屏
   * @param deviceId 设备 ID
   * @param recordingId 录屏 ID（由 startRecording 返回）
   *
   * ✅ FIXED: 现在可以精确停止指定的录屏会话
   */
  async stopRecording(deviceId: string, recordingId?: string): Promise<void> {
    try {
      // 1. 查找要停止的会话
      let session: RecordingSession | undefined;

      if (recordingId) {
        // 如果提供了 recordingId，精确查找
        session = this.recordingSessions.get(recordingId);
        if (!session) {
          this.logger.warn(`Recording session ${recordingId} not found (may have already stopped)`);
          return;
        }
        // 验证 deviceId 匹配
        if (session.deviceId !== deviceId) {
          throw BusinessErrors.adbOperationFailed(
            `录屏会话 ${recordingId} 不属于设备 ${deviceId}`,
            { deviceId, recordingId }
          );
        }
      } else {
        // 如果没有提供 recordingId，查找该设备的会话
        session = Array.from(this.recordingSessions.values()).find((s) => s.deviceId === deviceId);

        if (!session) {
          this.logger.warn(`No active recording found for device ${deviceId}`);
          return;
        }
      }

      // 2. 清理超时定时器
      if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
      }

      // 3. 终止录屏进程
      await this.executeShellCommand(deviceId, 'pkill -SIGINT screenrecord', 3000);

      // 4. 等待进程退出（最多3秒）
      await Promise.race([
        session.processPromise,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      // 5. 删除会话记录
      this.recordingSessions.delete(session.recordingId);

      this.logger.log(`Recording stopped successfully: ${session.recordingId} on ${deviceId}`);
    } catch (error) {
      // 如果进程不存在，pkill 会返回错误，这是正常的
      if (error.message && !error.message.includes('No such process')) {
        this.logger.error(`Failed to stop recording on ${deviceId}`, error);
        throw BusinessErrors.adbOperationFailed(`停止录屏失败: ${error.message}`, {
          deviceId,
          recordingId,
        });
      }
      this.logger.log(`Recording stopped on ${deviceId} (process already terminated)`);
    }
  }

  /**
   * 清理录屏会话（内部方法）
   * @param recordingId 录屏 ID
   */
  private cleanupRecordingSession(recordingId: string): void {
    const session = this.recordingSessions.get(recordingId);
    if (!session) {
      return;
    }

    // 清理超时定时器
    if (session.timeoutHandle) {
      clearTimeout(session.timeoutHandle);
    }

    // 删除会话
    this.recordingSessions.delete(recordingId);

    this.logger.debug(`Recording session cleaned up: ${recordingId}`);
  }

  /**
   * 获取所有活跃的录屏会话（用于监控）
   */
  getActiveRecordingSessions(): Array<{
    recordingId: string;
    deviceId: string;
    remotePath: string;
    startTime: Date;
    timeLimit: number;
    duration: number;
  }> {
    return Array.from(this.recordingSessions.values()).map((session) => ({
      recordingId: session.recordingId,
      deviceId: session.deviceId,
      remotePath: session.remotePath,
      startTime: session.startTime,
      timeLimit: session.timeLimit,
      duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
    }));
  }

  /**
   * 设置地理位置（需要 mock location 权限）
   * @param deviceId 设备 ID
   * @param latitude 纬度
   * @param longitude 经度
   *
   * ⚠️ SECURITY: 验证经纬度范围
   */
  async setLocation(deviceId: string, latitude: number, longitude: number): Promise<void> {
    try {
      // 🔒 安全验证：验证经纬度范围
      this.validateNumericParameter(latitude, -90, 90, 'latitude');
      this.validateNumericParameter(longitude, -180, 180, 'longitude');

      // 使用 geo 命令模拟位置（仅在模拟器上有效）
      // 物理设备需要使用第三方 Mock Location 应用
      const command = `am broadcast -a android.location.providers.gps.mock -e lat ${latitude} -e lon ${longitude}`;
      await this.executeShellCommand(deviceId, command, 3000);
      this.logger.debug(`Location set on ${deviceId}: (${latitude}, ${longitude})`);
    } catch (error) {
      this.logger.error(`Failed to set location on ${deviceId}`, error);
      throw BusinessErrors.adbOperationFailed(`设置位置失败: ${error.message}`, {
        deviceId,
        latitude,
        longitude,
      });
    }
  }
}
