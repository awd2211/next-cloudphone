import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { ScheduledTaskCompletedEvent, NotificationEventTypes } from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class SchedulerEventsConsumer {
  private readonly logger = new Logger(SchedulerEventsConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.SCHEDULED_TASK_COMPLETED,
    queue: 'notification-service.scheduler.task_completed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleTaskCompleted(event: ScheduledTaskCompletedEvent, msg: ConsumeMessage) {
    this.logger.log(`定时任务完成: ${event.payload.taskName}`);
    // 这里可以根据 taskType 决定是否发送通知
    // 通常定时任务完成不需要通知用户，除非是用户主动创建的任务
  }
}
