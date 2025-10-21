import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  /**
   * 发布事件到 RabbitMQ
   * @param exchange 交换机名称
   * @param routingKey 路由键
   * @param message 消息内容
   */
  async publish(exchange: string, routingKey: string, message: any): Promise<void> {
    try {
      await this.amqp.publish(exchange, routingKey, message, {
        persistent: true, // 消息持久化
        timestamp: Date.now(),
      });
      
      this.logger.log(`Event published: ${routingKey} to ${exchange}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${routingKey}`, error);
      throw error;
    }
  }

  /**
   * 发布设备相关事件
   */
  async publishDeviceEvent(eventType: string, payload: any): Promise<void> {
    await this.publish('cloudphone.events', `device.${eventType}`, {
      type: `device.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * 发布应用相关事件
   */
  async publishAppEvent(eventType: string, payload: any): Promise<void> {
    await this.publish('cloudphone.events', `app.${eventType}`, {
      type: `app.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * 发布订单相关事件
   */
  async publishOrderEvent(eventType: string, payload: any): Promise<void> {
    await this.publish('cloudphone.events', `order.${eventType}`, {
      type: `order.${eventType}`,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}

