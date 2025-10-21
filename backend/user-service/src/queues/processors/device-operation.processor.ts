import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { QueueName } from '../../common/config/queue.config';

/**
 * 设备操作任务数据接口
 */
export interface DeviceOperationJobData {
  deviceId: string;
  operation: 'start' | 'stop' | 'restart' | 'reset' | 'install' | 'uninstall';
  userId?: string;
  params?: Record<string, any>;
}

/**
 * 设备操作队列处理器
 *
 * 功能：
 * - 异步处理设备操作（启动、停止、重启等）
 * - 长时间操作不阻塞主线程
 * - 操作失败自动重试
 * - 操作进度追踪
 */
@Processor(QueueName.DEVICE_OPERATION)
export class DeviceOperationProcessor {
  private readonly logger = new Logger(DeviceOperationProcessor.name);

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {}

  /**
   * 处理设备启动操作
   */
  @Process('start-device')
  async handleStartDevice(job: Job<DeviceOperationJobData>): Promise<void> {
    const { id, data } = job;

    this.winstonLogger.info({
      type: 'queue_job_start',
      queue: QueueName.DEVICE_OPERATION,
      jobId: id,
      jobType: 'start-device',
      deviceId: data.deviceId,
      userId: data.userId,
    });

    try {
      // 步骤 1: 检查设备状态
      await job.progress(10);
      await this.checkDeviceStatus(data.deviceId);

      // 步骤 2: 分配资源
      await job.progress(30);
      await this.allocateResources(data.deviceId);

      // 步骤 3: 启动 Android 容器
      await job.progress(50);
      await this.startAndroidContainer(data.deviceId);

      // 步骤 4: 初始化设备配置
      await job.progress(70);
      await this.initializeDeviceConfig(data.deviceId, data.params);

      // 步骤 5: 验证设备就绪
      await job.progress(90);
      await this.verifyDeviceReady(data.deviceId);

      await job.progress(100);

      this.winstonLogger.info({
        type: 'queue_job_complete',
        queue: QueueName.DEVICE_OPERATION,
        jobId: id,
        message: `✅ Device ${data.deviceId} started successfully`,
      });
    } catch (error) {
      this.winstonLogger.error({
        type: 'queue_job_failed',
        queue: QueueName.DEVICE_OPERATION,
        jobId: id,
        deviceId: data.deviceId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * 处理设备停止操作
   */
  @Process('stop-device')
  async handleStopDevice(job: Job<DeviceOperationJobData>): Promise<void> {
    const { id, data } = job;

    this.logger.log(`🛑 Stopping device ${data.deviceId}`);

    try {
      // 步骤 1: 保存设备状态
      await job.progress(20);
      await this.saveDeviceState(data.deviceId);

      // 步骤 2: 优雅关闭应用
      await job.progress(40);
      await this.gracefullyShutdownApps(data.deviceId);

      // 步骤 3: 停止 Android 容器
      await job.progress(70);
      await this.stopAndroidContainer(data.deviceId);

      // 步骤 4: 释放资源
      await job.progress(90);
      await this.releaseResources(data.deviceId);

      await job.progress(100);

      this.logger.log(`✅ Device ${data.deviceId} stopped successfully`);
    } catch (error) {
      this.logger.error(`Failed to stop device ${data.deviceId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理设备重启操作
   */
  @Process('restart-device')
  async handleRestartDevice(job: Job<DeviceOperationJobData>): Promise<void> {
    const { id, data } = job;

    this.logger.log(`🔄 Restarting device ${data.deviceId}`);

    try {
      // 先停止
      await job.progress(10);
      await this.stopAndroidContainer(data.deviceId);

      // 等待 2 秒
      await job.progress(50);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 再启动
      await job.progress(70);
      await this.startAndroidContainer(data.deviceId);

      await job.progress(100);

      this.logger.log(`✅ Device ${data.deviceId} restarted successfully`);
    } catch (error) {
      this.logger.error(`Failed to restart device ${data.deviceId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理应用安装操作
   */
  @Process('install-app')
  async handleInstallApp(
    job: Job<{ deviceId: string; appPackage: string; apkUrl: string }>,
  ): Promise<void> {
    const { id, data } = job;

    this.logger.log(`📦 Installing app ${data.appPackage} on device ${data.deviceId}`);

    try {
      // 步骤 1: 下载 APK
      await job.progress(20);
      const apkPath = await this.downloadApk(data.apkUrl);

      // 步骤 2: 验证 APK
      await job.progress(40);
      await this.verifyApk(apkPath);

      // 步骤 3: 推送 APK 到设备
      await job.progress(60);
      await this.pushApkToDevice(data.deviceId, apkPath);

      // 步骤 4: 安装 APK
      await job.progress(80);
      await this.installApkOnDevice(data.deviceId, apkPath);

      // 步骤 5: 验证安装
      await job.progress(95);
      await this.verifyAppInstalled(data.deviceId, data.appPackage);

      await job.progress(100);

      this.logger.log(
        `✅ App ${data.appPackage} installed on device ${data.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to install app on device ${data.deviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 处理应用卸载操作
   */
  @Process('uninstall-app')
  async handleUninstallApp(
    job: Job<{ deviceId: string; appPackage: string }>,
  ): Promise<void> {
    const { id, data } = job;

    this.logger.log(
      `🗑️ Uninstalling app ${data.appPackage} from device ${data.deviceId}`,
    );

    try {
      await this.uninstallAppFromDevice(data.deviceId, data.appPackage);

      this.logger.log(
        `✅ App ${data.appPackage} uninstalled from device ${data.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to uninstall app from device ${data.deviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // 辅助方法（模拟实现，实际项目中调用真实的设备服务）
  // ============================================================================

  private async checkDeviceStatus(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Checked device ${deviceId} status`);
  }

  private async allocateResources(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.debug(`Allocated resources for device ${deviceId}`);
  }

  private async startAndroidContainer(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.debug(`Started Android container for device ${deviceId}`);
  }

  private async stopAndroidContainer(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    this.logger.debug(`Stopped Android container for device ${deviceId}`);
  }

  private async initializeDeviceConfig(
    deviceId: string,
    params?: Record<string, any>,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.logger.debug(`Initialized config for device ${deviceId}`, params);
  }

  private async verifyDeviceReady(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Verified device ${deviceId} is ready`);
  }

  private async saveDeviceState(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Saved state for device ${deviceId}`);
  }

  private async gracefullyShutdownApps(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.debug(`Shutdown apps on device ${deviceId}`);
  }

  private async releaseResources(deviceId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Released resources for device ${deviceId}`);
  }

  private async downloadApk(url: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return `/tmp/app-${Date.now()}.apk`;
  }

  private async verifyApk(path: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Verified APK at ${path}`);
  }

  private async pushApkToDevice(deviceId: string, apkPath: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    this.logger.debug(`Pushed APK to device ${deviceId}`);
  }

  private async installApkOnDevice(
    deviceId: string,
    apkPath: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    this.logger.debug(`Installed APK on device ${deviceId}`);
  }

  private async verifyAppInstalled(
    deviceId: string,
    appPackage: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug(`Verified app ${appPackage} installed on device ${deviceId}`);
  }

  private async uninstallAppFromDevice(
    deviceId: string,
    appPackage: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.debug(`Uninstalled app ${appPackage} from device ${deviceId}`);
  }
}
