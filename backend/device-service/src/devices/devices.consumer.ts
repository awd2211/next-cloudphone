import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AdbService } from '../adb/adb.service';
import {
  AppInstallRequestedEvent,
  AppUninstallRequestedEvent,
} from '@cloudphone/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { DevicesService } from './devices.service';

@Injectable()
export class DevicesConsumer {
  private readonly logger = new Logger(DevicesConsumer.name);

  constructor(
    private readonly adbService: AdbService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * 处理应用安装请求
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'app.install.requested',
    queue: 'device-service.app-install',
    queueOptions: {
      durable: true,
    },
  })
  async handleAppInstall(event: AppInstallRequestedEvent) {
    this.logger.log(
      `Received app install request: ${event.appId} for device ${event.deviceId}`,
    );

    try {
      // 1. 下载 APK 到临时文件
      const apkPath = await this.downloadApk(
        event.downloadUrl,
        event.appId,
      );

      // 2. 通过 ADB 安装
      await this.adbService.installApk(event.deviceId, apkPath);

      // 3. 清理临时文件
      await fs.unlink(apkPath);

      // 4. 发布安装成功事件
      await this.devicesService.publishAppInstallCompleted({
        installationId: event.installationId,
        deviceId: event.deviceId,
        appId: event.appId,
        status: 'success',
        installedAt: new Date(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `App ${event.appId} installed successfully on device ${event.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to install app ${event.appId} on device ${event.deviceId}:`,
        error.message,
      );

      // 发布安装失败事件
      await this.devicesService.publishAppInstallFailed({
        installationId: event.installationId,
        deviceId: event.deviceId,
        appId: event.appId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 处理应用卸载请求
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'app.uninstall.requested',
    queue: 'device-service.app-uninstall',
    queueOptions: {
      durable: true,
    },
  })
  async handleAppUninstall(event: AppUninstallRequestedEvent) {
    this.logger.log(
      `Received app uninstall request: ${event.packageName} from device ${event.deviceId}`,
    );

    try {
      // 通过 ADB 卸载
      await this.adbService.uninstallApp(event.deviceId, event.packageName);

      // 发布卸载成功事件
      await this.devicesService.publishAppUninstallCompleted({
        deviceId: event.deviceId,
        appId: event.appId,
        packageName: event.packageName,
        status: 'success',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `App ${event.packageName} uninstalled successfully from device ${event.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to uninstall app ${event.packageName} from device ${event.deviceId}:`,
        error.message,
      );

      // 发布卸载失败事件
      await this.devicesService.publishAppUninstallCompleted({
        deviceId: event.deviceId,
        appId: event.appId,
        packageName: event.packageName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 处理设备分配请求（Saga）
   * TODO: 定义 DeviceAllocateRequestedEvent 事件类型
   */
  // @RabbitSubscribe({
  //   exchange: 'cloudphone.events',
  //   routingKey: 'device.allocate.requested',
  //   queue: 'device-service.device-allocate',
  //   queueOptions: {
  //     durable: true,
  //   },
  // })
  // async handleDeviceAllocate(event: DeviceAllocateRequestedEvent) {
  //   this.logger.log(
  //     `Received device allocate request for order ${event.orderId}, sagaId: ${event.sagaId}`,
  //   );
  //
  //   try {
  //     // 分配一个可用设备
  //     const device = await this.devicesService.allocateDevice(
  //       event.userId,
  //       event.planId,
  //     );
  //
  //     // 发布设备分配成功事件
  //     await this.devicesService.publishDeviceAllocated({
  //       sagaId: event.sagaId,
  //       deviceId: device.id,
  //       orderId: event.orderId,
  //       userId: event.userId,
  //       success: true,
  //       timestamp: new Date().toISOString(),
  //     });
  //
  //     this.logger.log(
  //       `Device ${device.id} allocated for order ${event.orderId}`,
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to allocate device for order ${event.orderId}:`,
  //       error.message,
  //     );
  //
  //     // 发布设备分配失败事件
  //     await this.devicesService.publishDeviceAllocated({
  //       sagaId: event.sagaId,
  //       deviceId: null,
  //       orderId: event.orderId,
  //       userId: event.userId,
  //       success: false,
  //       timestamp: new Date().toISOString(),
  //     });
  //   }
  // }

  /**
   * 处理设备释放请求
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.release',
    queue: 'device-service.device-release',
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceRelease(event: any) {
    this.logger.log(`Received device release request: ${event.deviceId}`);

    try {
      await this.devicesService.releaseDevice(event.deviceId, event.reason);
      this.logger.log(`Device ${event.deviceId} released successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to release device ${event.deviceId}:`,
        error.message,
      );
    }
  }

  /**
   * 下载 APK 文件
   */
  private async downloadApk(url: string, appId: string): Promise<string> {
    const tmpDir = '/tmp/cloudphone-apks';
    await fs.mkdir(tmpDir, { recursive: true });

    const filePath = path.join(tmpDir, `${appId}-${Date.now()}.apk`);
    const file = await fs.open(filePath, 'w');

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        const stream = response.pipe(file.createWriteStream());

        stream.on('finish', () => {
          file.close();
          resolve(filePath);
        });

        stream.on('error', (error) => {
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });
      }).on('error', (error) => {
        fs.unlink(filePath).catch(() => {});
        reject(error);
      });
    });
  }
}

