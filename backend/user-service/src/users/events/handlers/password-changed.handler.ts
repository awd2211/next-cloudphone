import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PasswordChangedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';
import { EventBusService } from '@cloudphone/shared';
import { UserMetricsService } from '../../../common/metrics/user-metrics.service';

@EventsHandler(PasswordChangedEvent)
export class PasswordChangedEventHandler implements IEventHandler<PasswordChangedEvent> {
  private readonly logger = new Logger(PasswordChangedEventHandler.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBusService: EventBusService,
    private readonly metricsService: UserMetricsService
  ) {}

  async handle(event: PasswordChangedEvent) {
    try {
      this.logger.log(`Handling PasswordChangedEvent for user: ${event.aggregateId}`);

      // 保存事件
      await this.eventStore.saveEvent(event);

      // 发送密码修改通知（安全提醒）
      await this.eventBusService.publish('events', 'user.password_changed', {
        userId: event.aggregateId,
        changedBy: event.changedBy,
        timestamp: new Date().toISOString(),
      });

      // 记录指标
      this.metricsService.recordPasswordChange('default', true);

      this.logger.log(`PasswordChangedEvent processed for user: ${event.aggregateId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle PasswordChangedEvent for user: ${event.aggregateId}`,
        error
      );
    }
  }
}
