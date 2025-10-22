import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AccountLockedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';
import { EventBusService } from '@cloudphone/shared';
import { UserMetricsService } from '../../../common/metrics/user-metrics.service';

@EventsHandler(AccountLockedEvent)
export class AccountLockedEventHandler
  implements IEventHandler<AccountLockedEvent>
{
  private readonly logger = new Logger(AccountLockedEventHandler.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBusService: EventBusService,
    private readonly metricsService: UserMetricsService,
  ) {}

  async handle(event: AccountLockedEvent) {
    try {
      this.logger.warn(
        `Handling AccountLockedEvent for user: ${event.aggregateId}, attempts: ${event.loginAttempts}`,
      );

      // 保存事件
      await this.eventStore.saveEvent(event);

      // 计算锁定时长（分钟）
      const lockDurationMs =
        event.lockedUntil.getTime() - event.occurredAt.getTime();
      const lockDurationMinutes = Math.floor(lockDurationMs / 60000);

      // 发布锁定告警事件
      await this.eventBusService.publish('events', 'user.account_locked', {
        userId: event.aggregateId,
        reason: event.reason,
        attempts: event.loginAttempts,
        lockedUntil: event.lockedUntil.toISOString(),
        lockDurationMinutes,
        severity: event.loginAttempts >= 10 ? 'critical' : 'warning',
        timestamp: event.occurredAt.toISOString(),
      });

      // 记录指标
      this.metricsService.recordAccountLocked('default', event.loginAttempts);

      this.logger.warn(
        `AccountLockedEvent processed for user: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle AccountLockedEvent for user: ${event.aggregateId}`,
        error,
      );
    }
  }
}
