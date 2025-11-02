import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { AdbService } from '../../adb/adb.service';
import { DevicesService } from '../../devices/devices.service';
import { DeviceStatus } from '../../entities/device.entity';

/**
 * SMS 事件定义
 */
interface SmsMessageReceivedEvent {
  messageId: string;
  deviceId: string;
  phoneNumber: string;
  verificationCode: string;
  service?: string;
  receivedAt: string;
  userId: string;
}

interface SmsNumberRequestedEvent {
  requestId: string;
  deviceId: string;
  userId: string;
  country: string;
  service?: string;
  requestedAt: string;
}

interface SmsNumberCancelledEvent {
  requestId: string;
  deviceId: string;
  phoneNumber: string;
  userId: string;
  reason?: string;
  cancelledAt: string;
}

/**
 * SMS 事件消费者
 * 监听 SMS Receive Service 发布的短信相关事件
 *
 * 主要职责：
 * 1. 接收短信验证码事件，推送到对应的云手机设备
 * 2. 更新设备的短信元数据
 * 3. 处理虚拟号码请求和取消事件
 */
@Injectable()
export class SmsEventsConsumer {
  private readonly logger = new Logger(SmsEventsConsumer.name);

  constructor(
    private readonly adbService: AdbService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * 处理短信验证码接收事件
   *
   * 当 SMS Receive Service 接收到短信验证码时触发
   * 通过 ADB broadcast 将验证码推送到对应的云手机设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.message.received',
    queue: 'device-service.sms.message-received',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.dlx',
      },
    },
  })
  async handleSmsMessageReceived(event: SmsMessageReceivedEvent, msg: ConsumeMessage) {
    this.logger.log(
      `收到短信验证码事件: device=${event.deviceId}, code=${event.verificationCode}, phone=${event.phoneNumber}, service=${event.service || 'unknown'}`,
    );

    try {
      // 1. 查找设备
      const device = await this.devicesService.findOne(event.deviceId);

      if (!device) {
        this.logger.warn(`设备不存在: ${event.deviceId}`);
        return;
      }

      // 2. 检查设备状态（只对运行中的设备推送）
      if (device.status !== DeviceStatus.RUNNING) {
        this.logger.warn(
          `设备状态不是 RUNNING，跳过推送: deviceId=${event.deviceId}, status=${device.status}`,
        );
        return;
      }

      // 3. 通过 ADB broadcast 推送验证码到设备
      await this.adbService.broadcastSmsCode(
        event.deviceId,
        event.verificationCode,
        event.phoneNumber,
        event.service,
      );

      this.logger.log(
        `短信验证码已推送到设备: deviceId=${event.deviceId}, code=${event.verificationCode}`,
      );

      // 4. 更新设备元数据（记录最后一次收到的短信信息）
      await this.devicesService.updateDeviceMetadata(event.deviceId, {
        lastSmsReceived: {
          messageId: event.messageId,
          phoneNumber: event.phoneNumber,
          verificationCode: event.verificationCode,
          service: event.service,
          receivedAt: event.receivedAt,
          pushedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(
        `处理短信验证码事件失败: deviceId=${event.deviceId}, error=${error.message}`,
        error.stack,
      );
      throw error; // 抛出错误，让消息进入 DLX
    }
  }

  /**
   * 处理虚拟号码请求事件
   *
   * 当设备请求虚拟手机号时触发
   * 记录请求信息到设备元数据
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.number.requested',
    queue: 'device-service.sms.number-requested',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.dlx',
      },
    },
  })
  async handleSmsNumberRequested(event: SmsNumberRequestedEvent, msg: ConsumeMessage) {
    this.logger.log(
      `收到虚拟号码请求事件: device=${event.deviceId}, country=${event.country}, service=${event.service || 'any'}`,
    );

    try {
      // 1. 查找设备
      const device = await this.devicesService.findOne(event.deviceId);

      if (!device) {
        this.logger.warn(`设备不存在: ${event.deviceId}`);
        return;
      }

      // 2. 更新设备元数据（记录请求信息）
      await this.devicesService.updateDeviceMetadata(event.deviceId, {
        smsNumberRequest: {
          requestId: event.requestId,
          country: event.country,
          service: event.service,
          status: 'pending',
          requestedAt: event.requestedAt,
        },
      });

      this.logger.log(`虚拟号码请求已记录: deviceId=${event.deviceId}, requestId=${event.requestId}`);
    } catch (error) {
      this.logger.error(
        `处理虚拟号码请求事件失败: deviceId=${event.deviceId}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 处理虚拟号码取消事件
   *
   * 当虚拟手机号被取消（过期或主动取消）时触发
   * 清理设备元数据中的短信号码信息
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.number.cancelled',
    queue: 'device-service.sms.number-cancelled',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.dlx',
      },
    },
  })
  async handleSmsNumberCancelled(event: SmsNumberCancelledEvent, msg: ConsumeMessage) {
    this.logger.log(
      `收到虚拟号码取消事件: device=${event.deviceId}, phone=${event.phoneNumber}, reason=${event.reason || 'unknown'}`,
    );

    try {
      // 1. 查找设备
      const device = await this.devicesService.findOne(event.deviceId);

      if (!device) {
        this.logger.warn(`设备不存在: ${event.deviceId}`);
        return;
      }

      // 2. 更新设备元数据（标记号码已取消）
      await this.devicesService.updateDeviceMetadata(event.deviceId, {
        smsNumberRequest: {
          requestId: event.requestId,
          phoneNumber: event.phoneNumber,
          status: 'cancelled',
          reason: event.reason,
          cancelledAt: event.cancelledAt,
        },
      });

      this.logger.log(`虚拟号码取消已记录: deviceId=${event.deviceId}, phone=${event.phoneNumber}`);
    } catch (error) {
      this.logger.error(
        `处理虚拟号码取消事件失败: deviceId=${event.deviceId}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
