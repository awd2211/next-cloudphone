import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { SystemMaintenanceEvent, NotificationEventTypes } from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { TemplatesService } from '../../templates/templates.service';
import { runInTraceContext } from '@cloudphone/shared';

/**
 * System Service 事件消费者
 * 监听系统服务发布的所有事件并发送相应通知
 *
 * ✅ 已集成模板渲染系统 (system.maintenance)
 */
@Injectable()
export class SystemEventsConsumer {
  private readonly logger = new Logger(SystemEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.SYSTEM_MAINTENANCE,
    queue: 'notification-service.system.maintenance',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleSystemMaintenance(event: SystemMaintenanceEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      this.logger.log('收到系统维护通知事件');

      try {
        // 渲染模板
        const rendered = await this.templatesService.render(
          'system.maintenance',
          {
            startTime: event.payload.startTime,
            endTime: event.payload.endTime,
            duration: event.payload.duration,
            affectedServices: event.payload.affectedServices,
          },
          'zh-CN'
        );

        // 广播给所有在线用户
        await this.notificationsService.broadcast(rendered.title, rendered.body, {
          startTime: event.payload.startTime,
          endTime: event.payload.endTime,
          duration: event.payload.duration,
          affectedServices: event.payload.affectedServices,
        });
      } catch (error) {
        this.logger.error(`处理系统维护事件失败: ${error.message}`);
        throw error;
      }
    });
  }
}
