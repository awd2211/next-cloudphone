import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppInstallCompletedEvent,
  AppInstallFailedEvent,
  AppUninstallCompletedEvent,
} from '@cloudphone/shared';
import { DeviceApplication, InstallStatus } from '../entities/device-application.entity';

@Injectable()
export class AppsConsumer {
  private readonly logger = new Logger(AppsConsumer.name);

  constructor(
    @InjectRepository(DeviceApplication)
    private deviceAppsRepository: Repository<DeviceApplication>
  ) {}

  /**
   * 监听应用安装完成事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'app.install.completed',
    queue: 'app-service.install-status',
    queueOptions: {
      durable: true,
    },
  })
  async handleInstallCompleted(event: AppInstallCompletedEvent) {
    this.logger.log(`App install completed: ${event.appId} on device ${event.deviceId}`);

    try {
      // 更新安装记录状态
      await this.deviceAppsRepository.update(event.installationId, {
        status: InstallStatus.INSTALLED,
        installedAt: event.installedAt || new Date(),
      });

      this.logger.log(`Installation record ${event.installationId} updated to INSTALLED`);
    } catch (error) {
      this.logger.error(
        `Failed to update installation record ${event.installationId}:`,
        error.message
      );
    }
  }

  /**
   * 监听应用安装失败事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'app.install.failed',
    queue: 'app-service.install-status',
    queueOptions: {
      durable: true,
    },
  })
  async handleInstallFailed(event: AppInstallFailedEvent) {
    this.logger.log(
      `App install failed: ${event.appId} on device ${event.deviceId}. Error: ${event.error}`
    );

    try {
      // 更新安装记录状态为失败
      await this.deviceAppsRepository.update(event.installationId, {
        status: InstallStatus.FAILED,
        errorMessage: event.error,
      } as any);

      this.logger.log(`Installation record ${event.installationId} updated to FAILED`);
    } catch (error) {
      this.logger.error(
        `Failed to update installation record ${event.installationId}:`,
        error.message
      );
    }
  }

  /**
   * 监听应用卸载完成事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'app.uninstall.completed',
    queue: 'app-service.uninstall-status',
    queueOptions: {
      durable: true,
    },
  })
  async handleUninstallCompleted(event: AppUninstallCompletedEvent) {
    this.logger.log(`App uninstall completed: ${event.appId} from device ${event.deviceId}`);

    try {
      if (event.status === 'success') {
        // 删除设备应用关联记录
        await this.deviceAppsRepository.delete({
          deviceId: event.deviceId,
          applicationId: event.appId,
        } as any);

        this.logger.log(
          `Device-app relation deleted for device ${event.deviceId}, app ${event.appId}`
        );
      } else {
        // 卸载失败，记录错误
        await this.deviceAppsRepository.update(
          {
            deviceId: event.deviceId,
            applicationId: event.appId,
          } as any,
          {
            errorMessage: event.error,
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle uninstall completed event:`, error.message);
    }
  }
}
