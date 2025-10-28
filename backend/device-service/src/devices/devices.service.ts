import {
  Injectable,
  Logger,
  Optional,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DockerService, RedroidConfig } from '../docker/docker.service';
import { AdbService } from '../adb/adb.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import {
  EventBusService,
  BusinessErrors,
  BusinessException,
  BusinessErrorCode,
} from '@cloudphone/shared';
import { QuotaClientService } from '../quota/quota-client.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private dockerService: DockerService,
    private adbService: AdbService,
    private portManager: PortManagerService,
    private configService: ConfigService,
    @Optional() private eventBus: EventBusService,
    @Optional() private quotaClient: QuotaClientService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    this.logger.log(`Creating device for user ${createDeviceDto.userId}`);

    // 1. 分配端口
    const ports = await this.portManager.allocatePorts();
    this.logger.debug(`Allocated ports: ADB=${ports.adbPort}, WebRTC=${ports.webrtcPort}`);

    try {
      // 2. 创建设备记录
      const device = this.devicesRepository.create({
        ...createDeviceDto,
        status: DeviceStatus.CREATING,
        adbPort: ports.adbPort,
        adbHost: 'localhost',
        metadata: {
          ...createDeviceDto.metadata,
          webrtcPort: ports.webrtcPort,
          createdBy: 'system',
        },
      });

      const savedDevice = await this.devicesRepository.save(device);
      this.logger.log(`Device record created: ${savedDevice.id}`);

      // 3. 上报用量到配额系统
      if (this.quotaClient && savedDevice.userId) {
        await this.quotaClient
          .reportDeviceUsage(savedDevice.userId, {
            deviceId: savedDevice.id,
            cpuCores: savedDevice.cpuCores,
            memoryGB: savedDevice.memoryMB / 1024,
            storageGB: savedDevice.storageMB / 1024,
            operation: 'increment',
          })
          .catch((error) => {
            this.logger.warn(
              `Failed to report usage for device ${savedDevice.id}`,
              error.message,
            );
          });
      }

      // 4. 异步创建 Docker 容器
      this.createRedroidContainer(savedDevice).catch(async (error) => {
        this.logger.error(
          `Failed to create container for device ${savedDevice.id}`,
          error.stack,
        );

        // 释放端口
        this.portManager.releasePorts(ports);

        // 更新状态
        await this.updateDeviceStatus(savedDevice.id, DeviceStatus.ERROR);
      });

      // 发布设备创建事件
      if (this.eventBus) {
        await this.eventBus.publishDeviceEvent('created', {
          deviceId: savedDevice.id,
          userId: savedDevice.userId,
          deviceName: savedDevice.name,
          status: savedDevice.status,
          tenantId: savedDevice.tenantId,
        });
      }

      return savedDevice;
    } catch (error) {
      // 创建失败，释放端口
      this.portManager.releasePorts(ports);
      throw error;
    }
  }

  /**
   * 创建 Redroid 容器（优化版）
   */
  private async createRedroidContainer(device: Device): Promise<void> {
    try {
      this.logger.log(`Creating Redroid container for device ${device.id}`);

      // 构建 Redroid 配置
      const redroidConfig: RedroidConfig = {
        name: `cloudphone-${device.id}`,
        cpuCores: device.cpuCores,
        memoryMB: device.memoryMB,
        storageMB: device.storageMB,
        resolution: device.resolution,
        dpi: device.dpi,
        adbPort: device.adbPort,
        webrtcPort: device.metadata?.webrtcPort,
        androidVersion: device.androidVersion,
        enableGpu: this.configService.get('REDROID_ENABLE_GPU', 'false') === 'true',
        enableAudio: this.configService.get('REDROID_ENABLE_AUDIO', 'false') === 'true',
      };

      // 创建容器
      const container = await this.dockerService.createContainer(redroidConfig);

      // 更新设备信息
      device.containerId = container.id;
      device.containerName = redroidConfig.name;
      device.imageTag = this.getRedroidImageTag(device.androidVersion);

      // 等待容器就绪
      await this.waitForContainerReady(container.id, 120); // 最多等待120秒

      // 建立 ADB 连接
      this.logger.log(`Connecting to device ${device.id} via ADB`);
      await this.adbService.connectToDevice(
        device.id,
        device.adbHost,
        device.adbPort,
      );

      // 等待 Android 启动完成
      await this.waitForAndroidBoot(device.id, 60); // 最多等待60秒

      // 初始化设备设置
      await this.initializeDevice(device.id);

      // 更新状态为运行中
      device.status = DeviceStatus.RUNNING;
      device.lastActiveAt = new Date();

      await this.devicesRepository.save(device);
      this.logger.log(`Device ${device.id} created successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to create Redroid container for device ${device.id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 等待容器就绪
   */
  private async waitForContainerReady(
    containerId: string,
    maxWaitSeconds: number,
  ): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const info = await this.dockerService.getContainerInfo(containerId);

        if (info.State.Running) {
          this.logger.debug(`Container ${containerId} is running`);
          return;
        }
      } catch (error) {
        this.logger.warn(`Error checking container status: ${error.message}`);
      }

      // 等待2秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Container ${containerId} failed to start within ${maxWaitSeconds}s`);
  }

  /**
   * 等待 Android 启动完成
   */
  private async waitForAndroidBoot(
    deviceId: string,
    maxWaitSeconds: number,
  ): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const output = await this.adbService.executeShellCommand(
          deviceId,
          'getprop sys.boot_completed',
          3000,
        );

        if (output.trim() === '1') {
          this.logger.debug(`Android boot completed for device ${deviceId}`);
          return;
        }
      } catch (error) {
        // ADB 可能还未就绪，继续等待
      }

      // 等待3秒后重试
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error(`Android failed to boot within ${maxWaitSeconds}s for device ${deviceId}`);
  }

  /**
   * 初始化设备设置
   */
  private async initializeDevice(deviceId: string): Promise<void> {
    try {
      this.logger.log(`Initializing device ${deviceId}`);

      // 设置设备属性
      const commands = [
        // 禁用屏幕休眠
        'settings put system screen_off_timeout 2147483647',

        // 禁用屏幕锁定
        'settings put secure lockscreen.disabled 1',

        // 设置默认输入法（如果需要）
        // 'ime set com.android.adbkeyboard/.AdbIME',

        // 禁用系统更新
        'pm disable com.android.vending',
      ];

      for (const command of commands) {
        try {
          await this.adbService.executeShellCommand(deviceId, command, 5000);
          this.logger.debug(`Executed: ${command}`);
        } catch (error) {
          this.logger.warn(`Failed to execute: ${command}`, error.message);
        }
      }

      this.logger.log(`Device ${deviceId} initialized`);
    } catch (error) {
      this.logger.error(`Failed to initialize device ${deviceId}`, error.stack);
      // 初始化失败不影响设备创建
    }
  }

  /**
   * 获取 Redroid 镜像标签
   */
  private getRedroidImageTag(androidVersion?: string): string {
    const version = androidVersion || '11';
    const imageMap: Record<string, string> = {
      '11': 'redroid/redroid:11.0.0-latest',
      '12': 'redroid/redroid:12.0.0-latest',
      '13': 'redroid/redroid:13.0.0-latest',
    };
    return imageMap[version] || imageMap['11'];
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [data, total] = await this.devicesRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({ where: { id } });

    if (!device) {
      throw BusinessErrors.deviceNotFound(id);
    }

    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);

    Object.assign(device, updateDeviceDto);
    return await this.devicesRepository.save(device);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);

    this.logger.log(`Removing device ${id}`);

    // 上报用量减少到配额系统
    if (this.quotaClient && device.userId) {
      await this.quotaClient
        .reportDeviceUsage(device.userId, {
          deviceId: device.id,
          cpuCores: device.cpuCores,
          memoryGB: device.memoryMB / 1024,
          storageGB: device.storageMB / 1024,
          operation: 'decrement',
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to report usage decrease for device ${id}`,
            error.message,
          );
        });
    }

    // 断开 ADB 连接
    if (device.adbPort) {
      try {
        await this.adbService.disconnectFromDevice(id);
      } catch (error) {
        this.logger.warn(`Failed to disconnect ADB for device ${id}`, error.message);
      }
    }

    // 删除容器
    if (device.containerId) {
      try {
        await this.dockerService.removeContainer(device.containerId);
      } catch (error) {
        this.logger.warn(`Failed to remove container for device ${id}`, error.message);
      }
    }

    // 释放端口
    if (device.adbPort || device.metadata?.webrtcPort) {
      this.portManager.releasePorts({
        adbPort: device.adbPort,
        webrtcPort: device.metadata?.webrtcPort,
      });
      this.logger.debug(`Released ports for device ${id}`);
    }

    // 更新设备状态
    device.status = DeviceStatus.DELETED;
    await this.devicesRepository.save(device);

    // 发布设备删除事件
    if (this.eventBus) {
      await this.eventBus.publishDeviceEvent('deleted', {
        deviceId: id,
        userId: device.userId,
        deviceName: device.name,
        tenantId: device.tenantId,
      });
    }

    this.logger.log(`Device ${id} removed successfully`);
  }

  /**
   * 健康检查定时任务 - 每30秒执行一次
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performHealthCheck() {
    try {
      const runningDevices = await this.devicesRepository.find({
        where: { status: DeviceStatus.RUNNING },
      });

      if (runningDevices.length === 0) {
        return;
      }

      this.logger.debug(`Performing health check on ${runningDevices.length} devices`);

      for (const device of runningDevices) {
        this.checkDeviceHealth(device).catch((error) => {
          this.logger.error(
            `Health check failed for device ${device.id}`,
            error.stack,
          );
        });
      }
    } catch (error) {
      this.logger.error('Health check task failed', error.stack);
    }
  }

  /**
   * 检查单个设备健康状态
   */
  private async checkDeviceHealth(device: Device): Promise<void> {
    const checks = {
      container: false,
      adb: false,
      android: false,
    };

    // 1. 检查容器状态
    if (device.containerId) {
      try {
        const info = await this.dockerService.getContainerInfo(device.containerId);
        checks.container = info.State.Running && info.State.Health?.Status !== 'unhealthy';
      } catch (error) {
        this.logger.warn(`Container check failed for device ${device.id}`);
      }
    }

    // 2. 检查 ADB 连接
    try {
      const devices = await this.adbService.executeShellCommand(
        device.id,
        'echo test',
        3000,
      );
      checks.adb = devices.includes('test');
    } catch (error) {
      this.logger.warn(`ADB check failed for device ${device.id}`);
    }

    // 3. 检查 Android 系统
    try {
      const output = await this.adbService.executeShellCommand(
        device.id,
        'getprop sys.boot_completed',
        3000,
      );
      checks.android = output.trim() === '1';
    } catch (error) {
      this.logger.warn(`Android check failed for device ${device.id}`);
    }

    // 判断设备是否健康
    const isHealthy = checks.container && checks.adb && checks.android;

    if (!isHealthy) {
      this.logger.warn(
        `Device ${device.id} is unhealthy. Checks: ${JSON.stringify(checks)}`,
      );
      await this.handleUnhealthyDevice(device, checks);
    } else {
      // 更新心跳
      await this.updateHeartbeat(device.id);
    }
  }

  /**
   * 处理不健康的设备
   */
  private async handleUnhealthyDevice(
    device: Device,
    checks: { container: boolean; adb: boolean; android: boolean },
  ): Promise<void> {
    this.logger.warn(`Attempting to recover device ${device.id}`);

    try {
      // 如果容器未运行，尝试重启容器
      if (!checks.container && device.containerId) {
        this.logger.log(`Restarting container for device ${device.id}`);
        await this.dockerService.restartContainer(device.containerId);
        await this.waitForContainerReady(device.containerId, 30);
      }

      // 如果 ADB 未连接，尝试重新连接
      if (!checks.adb && device.adbHost && device.adbPort) {
        this.logger.log(`Reconnecting ADB for device ${device.id}`);
        await this.adbService.connectToDevice(
          device.id,
          device.adbHost,
          device.adbPort,
        );
        await this.waitForAndroidBoot(device.id, 30);
      }

      // 再次检查
      const recheckOutput = await this.adbService.executeShellCommand(
        device.id,
        'echo test',
        3000,
      );

      if (recheckOutput.includes('test')) {
        this.logger.log(`Device ${device.id} recovered successfully`);
        device.status = DeviceStatus.RUNNING;
        device.lastActiveAt = new Date();
        await this.devicesRepository.save(device);
      } else {
        throw new Error('Recovery check failed');
      }
    } catch (error) {
      this.logger.error(`Failed to recover device ${device.id}`, error.stack);

      // 标记为错误状态
      device.status = DeviceStatus.ERROR;
      await this.devicesRepository.save(device);

      // 可选：发送告警通知
      // await this.notificationService.sendAlert(...)
    }
  }

  async start(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '设备没有关联的容器',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.dockerService.startContainer(device.containerId);

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    const savedDevice = await this.devicesRepository.save(device);

    // 建立 ADB 连接
    if (device.adbHost && device.adbPort) {
      try {
        await this.adbService.connectToDevice(id, device.adbHost, device.adbPort);
      } catch (error) {
        console.error(`Failed to connect ADB for device ${id}:`, error);
      }
    }

    // 上报并发设备增加（设备启动）
    if (this.quotaClient && device.userId) {
      await this.quotaClient.incrementConcurrentDevices(device.userId).catch((error) => {
        this.logger.warn(`Failed to increment concurrent devices for user ${device.userId}`, error.message);
      });
    }

    // 发布设备启动事件
    await this.eventBus.publishDeviceEvent('started', {
      deviceId: id,
      userId: device.userId,
      tenantId: device.tenantId,
      startedAt: new Date(),
    });

    return savedDevice;
  }

  async stop(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '设备没有关联的容器',
        HttpStatus.BAD_REQUEST,
      );
    }

    const startTime = device.lastActiveAt || device.createdAt;
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

    // 断开 ADB 连接
    await this.adbService.disconnectFromDevice(id);

    await this.dockerService.stopContainer(device.containerId);

    device.status = DeviceStatus.STOPPED;

    const savedDevice = await this.devicesRepository.save(device);

    // 上报并发设备减少（设备停止）
    if (this.quotaClient && device.userId) {
      await this.quotaClient.decrementConcurrentDevices(device.userId).catch((error) => {
        this.logger.warn(`Failed to decrement concurrent devices for user ${device.userId}`, error.message);
      });
    }

    // 发布设备停止事件
    await this.eventBus.publishDeviceEvent('stopped', {
      deviceId: id,
      userId: device.userId,
      stoppedAt: new Date(),
      duration, // 运行时长（秒）
    });

    return savedDevice;
  }

  async restart(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '设备没有关联的容器',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.dockerService.restartContainer(device.containerId);

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    return await this.devicesRepository.save(device);
  }

  async updateHeartbeat(id: string, stats?: any): Promise<void> {
    const update: any = {
      lastHeartbeatAt: new Date(),
      lastActiveAt: new Date(),
    };

    if (stats) {
      if (stats.cpuUsage !== undefined) update.cpuUsage = stats.cpuUsage;
      if (stats.memoryUsage !== undefined) update.memoryUsage = stats.memoryUsage;
      if (stats.storageUsage !== undefined) update.storageUsage = stats.storageUsage;
    }

    await this.devicesRepository.update(id, update);
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    await this.devicesRepository.update(id, { status });
  }

  async getStats(id: string): Promise<any> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '设备没有关联的容器',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.dockerService.getContainerStats(device.containerId);
  }

  // ADB 相关方法

  async executeShellCommand(id: string, command: string, timeout?: number): Promise<string> {
    await this.findOne(id); // 验证设备存在
    return await this.adbService.executeShellCommand(id, command, timeout);
  }

  async takeScreenshot(id: string): Promise<string> {
    await this.findOne(id);
    const outputDir = this.configService.get('SCREENSHOT_DIR', '/tmp/screenshots');
    const outputPath = `${outputDir}/${id}_${Date.now()}.png`;
    return await this.adbService.takeScreenshot(id, outputPath);
  }

  async pushFile(id: string, localPath: string, remotePath: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pushFile(id, localPath, remotePath);
  }

  async pullFile(id: string, remotePath: string, localPath: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.pullFile(id, remotePath, localPath);
  }

  async installApk(id: string, apkPath: string, reinstall?: boolean): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.installApk(id, apkPath, reinstall);
  }

  async uninstallApp(id: string, packageName: string): Promise<boolean> {
    await this.findOne(id);
    return await this.adbService.uninstallApp(id, packageName);
  }

  async getInstalledPackages(id: string): Promise<string[]> {
    await this.findOne(id);
    return await this.adbService.getInstalledPackages(id);
  }

  async readLogcat(id: string, filter?: string, lines?: number): Promise<string> {
    await this.findOne(id);
    return await this.adbService.readLogcat(id, { filter, lines });
  }

  async clearLogcat(id: string): Promise<void> {
    await this.findOne(id);
    return await this.adbService.clearLogcat(id);
  }

  async getDeviceProperties(id: string): Promise<any> {
    await this.findOne(id);
    return await this.adbService.getDeviceProperties(id);
  }

  // ========== 事件发布方法 ==========

  /**
   * 发布应用安装完成事件
   */
  async publishAppInstallCompleted(event: any): Promise<void> {
    await this.eventBus.publishAppEvent('install.completed', event);
  }

  /**
   * 发布应用安装失败事件
   */
  async publishAppInstallFailed(event: any): Promise<void> {
    await this.eventBus.publishAppEvent('install.failed', event);
  }

  /**
   * 发布应用卸载完成事件
   */
  async publishAppUninstallCompleted(event: any): Promise<void> {
    await this.eventBus.publishAppEvent('uninstall.completed', event);
  }

  /**
   * 发布设备分配事件
   */
  async publishDeviceAllocated(event: any): Promise<void> {
    await this.eventBus.publishDeviceEvent(`allocate.${event.sagaId}`, event);
  }

  /**
   * 分配设备（用于 Saga）
   */
  async allocateDevice(userId: string, planId: string): Promise<Device> {
    // 查找一个可用的设备
    const device = await this.devicesRepository.findOne({
      where: {
        status: DeviceStatus.IDLE,
      },
    });

    if (!device) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '没有可用的设备',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 分配给用户
    device.userId = userId;
    device.status = DeviceStatus.ALLOCATED;
    await this.devicesRepository.save(device);

    return device;
  }

  /**
   * 释放设备
   */
  async releaseDevice(deviceId: string, reason?: string): Promise<void> {
    const device = await this.findOne(deviceId);
    
    // 停止设备
    if (device.status === DeviceStatus.RUNNING) {
      await this.stop(deviceId);
    }

    // 重置状态
    device.userId = null;
    device.status = DeviceStatus.IDLE;
    await this.devicesRepository.save(device);

    this.logger.log(`Device ${deviceId} released. Reason: ${reason || 'N/A'}`);
  }
}
