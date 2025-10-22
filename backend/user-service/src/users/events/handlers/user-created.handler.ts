import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserCreatedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';
import { EventBusService } from '@cloudphone/shared';
import { UserMetricsService } from '../../../common/metrics/user-metrics.service';

/**
 * 用户创建事件处理器
 * 当用户创建事件发布时，执行以下操作：
 * 1. 保存事件到事件存储
 * 2. 发送欢迎通知
 * 3. 更新指标
 * 4. 发布到事件总线（供其他服务消费）
 */
@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBusService: EventBusService,
    private readonly metricsService: UserMetricsService,
  ) {}

  async handle(event: UserCreatedEvent) {
    try {
      this.logger.log(`Handling UserCreatedEvent for user: ${event.aggregateId}`);

      // 1. 保存事件到事件存储
      await this.eventStore.saveEvent(event, {
        correlationId: event.aggregateId,
      });

      // 2. 发布到 RabbitMQ 事件总线（供其他微服务消费）
      await this.eventBusService.publishUserEvent('created', {
        userId: event.aggregateId,
        username: event.username,
        email: event.email,
        fullName: event.fullName,
        tenantId: event.tenantId,
      });

      // 3. 更新 Prometheus 指标
      this.metricsService.recordUserCreated(event.tenantId || 'default', true);

      this.logger.log(
        `UserCreatedEvent processed successfully for user: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle UserCreatedEvent for user: ${event.aggregateId}`,
        error,
      );
      // 不抛出异常，避免影响主流程
      // 事件处理失败会被记录，可以通过监控告警
    }
  }
}
