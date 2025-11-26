// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PurchasePlanSaga } from './purchase-plan.saga';
import { DeviceAllocatedEvent, runInTraceContext } from '@cloudphone/shared';

@Injectable()
export class SagaConsumer {
  private readonly logger = new Logger(SagaConsumer.name);

  constructor(private readonly purchasePlanSaga: PurchasePlanSaga) {}

  /**
   * 监听设备分配结果事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.allocate.*',
    queue: 'billing-service.saga-device-allocate',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleDeviceAllocated(event: DeviceAllocatedEvent) {
    return runInTraceContext(event, async () => {
      this.logger.log(
        `Received device allocation result for saga ${event.sagaId}: success=${event.success}, deviceId=${event.deviceId}`
      );

      await this.purchasePlanSaga.handleDeviceAllocated(event.sagaId, event.deviceId, event.success);
    });
  }
}
