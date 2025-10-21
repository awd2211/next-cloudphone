import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MeteringService } from './metering.service';
import { DeviceStartedEvent, DeviceStoppedEvent } from '@cloudphone/shared';

@Injectable()
export class MeteringConsumer {
  private readonly logger = new Logger(MeteringConsumer.name);

  constructor(private readonly meteringService: MeteringService) {}

  /**
   * 监听设备启动事件 - 开始计量
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.started',
    queue: 'billing-service.device-started',
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceStarted(event: DeviceStartedEvent) {
    this.logger.log(
      `Device started event received: ${event.deviceId}, starting usage metering`,
    );

    try {
      // 开始计量
      await this.meteringService.startUsageTracking({
        deviceId: event.deviceId,
        userId: event.userId,
        tenantId: event.tenantId,
      });

      this.logger.log(`Usage metering started for device ${event.deviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start metering for device ${event.deviceId}:`,
        error.message,
      );
    }
  }

  /**
   * 监听设备停止事件 - 结束计量
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.stopped',
    queue: 'billing-service.device-stopped',
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceStopped(event: DeviceStoppedEvent) {
    this.logger.log(
      `Device stopped event received: ${event.deviceId}, stopping usage metering. Duration: ${event.duration}s`,
    );

    try {
      // 结束计量
      await this.meteringService.stopUsageTracking(
        event.deviceId,
        event.duration,
      );

      this.logger.log(`Usage metering stopped for device ${event.deviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop metering for device ${event.deviceId}:`,
        error.message,
      );
    }
  }
}

