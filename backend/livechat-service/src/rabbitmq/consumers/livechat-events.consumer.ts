import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { runInTraceContext } from '@cloudphone/shared';

@Injectable()
export class LivechatEventsConsumer {
  private readonly logger = new Logger(LivechatEventsConsumer.name);

  constructor(private eventEmitter: EventEmitter2) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.*',
    queue: 'livechat-service.device.events',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
      durable: true,
    },
  })
  async handleDeviceEvent(event: any) {
    return runInTraceContext(event, async () => {
      this.logger.debug(`Received device event: ${event.type}`);

      // 设备状态变更时，可以通知相关的会话
      if (event.type === 'device.error' || event.type === 'device.stopped') {
        this.eventEmitter.emit('device.status_changed', {
          deviceId: event.deviceId,
          status: event.status,
          userId: event.userId,
        });
      }
    });
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.*',
    queue: 'livechat-service.user.events',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
      durable: true,
    },
  })
  async handleUserEvent(event: any) {
    return runInTraceContext(event, async () => {
      this.logger.debug(`Received user event: ${event.type}`);

      // 处理用户相关事件
      if (event.type === 'user.vip_upgraded') {
        this.eventEmitter.emit('user.vip_changed', {
          userId: event.userId,
          vipLevel: event.vipLevel,
        });
      }
    });
  }
}
