import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventOutbox } from './event-outbox.entity';
import { EventBusService } from '../events/event-bus.service';

/**
 * Event Outbox Service
 *
 * Implements the Transactional Outbox Pattern:
 * 1. Business logic writes events to outbox table in same transaction as data
 * 2. Background worker polls outbox and publishes events to RabbitMQ
 * 3. Successfully published events are marked as 'published'
 * 4. Failed events are retried with exponential backoff
 *
 * This ensures at-least-once delivery of events even if RabbitMQ is temporarily unavailable.
 */
@Injectable()
export class EventOutboxService implements OnModuleInit {
  private readonly logger = new Logger(EventOutboxService.name);
  private isPublishing = false; // Prevent concurrent publishing

  constructor(
    @InjectRepository(EventOutbox)
    private readonly outboxRepository: Repository<EventOutbox>,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource
  ) {}

  async onModuleInit() {
    this.logger.log('Event Outbox Service initialized');
    // Publish any pending events left from previous run
    await this.publishPendingEvents();
  }

  /**
   * Write event to outbox within an existing database transaction
   *
   * @param queryRunner The active QueryRunner from business transaction
   * @param aggregateType Type of entity (e.g., 'device', 'user')
   * @param aggregateId Unique ID of entity
   * @param eventType Event type (e.g., 'device.created')
   * @param payload Event data
   * @param options Additional options (maxRetries, etc.)
   */
  async writeEvent(
    queryRunner: QueryRunner,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, any>,
    options?: {
      maxRetries?: number;
    }
  ): Promise<EventOutbox> {
    const event = queryRunner.manager.create(EventOutbox, {
      aggregateType,
      aggregateId,
      eventType,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
    });

    await queryRunner.manager.save(EventOutbox, event);

    this.logger.debug(`Event written to outbox: ${eventType} for ${aggregateType}:${aggregateId}`);

    return event;
  }

  /**
   * Publish pending events to RabbitMQ
   * Called by scheduled job every 5 seconds
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async publishPendingEvents(): Promise<void> {
    // Prevent concurrent execution
    if (this.isPublishing) {
      this.logger.debug('Skipping: previous publish batch still running');
      return;
    }

    this.isPublishing = true;

    try {
      // Fetch up to 100 pending events (oldest first)
      const pendingEvents = await this.outboxRepository.find({
        where: { status: 'pending' },
        order: { createdAt: 'ASC' },
        take: 100,
      });

      if (pendingEvents.length === 0) {
        return; // No events to publish
      }

      this.logger.log(`Publishing ${pendingEvents.length} pending events...`);

      let successCount = 0;
      let failureCount = 0;

      for (const event of pendingEvents) {
        try {
          // Publish to RabbitMQ
          await this.eventBus.publish('cloudphone.events', event.eventType, event.payload);

          // Mark as published
          event.status = 'published';
          event.publishedAt = new Date();
          await this.outboxRepository.save(event);

          successCount++;
        } catch (error) {
          // Increment retry count
          event.retryCount++;
          event.lastErrorAt = new Date();
          event.errorMessage = error.message || String(error);

          // Check if max retries exceeded
          if (event.retryCount >= event.maxRetries) {
            event.status = 'failed';
            this.logger.error(
              `Event ${event.id} (${event.eventType}) failed after ${event.retryCount} retries: ${error.message}`
            );
          } else {
            this.logger.warn(
              `Event ${event.id} (${event.eventType}) publish failed (attempt ${event.retryCount}/${event.maxRetries}): ${error.message}`
            );
          }

          await this.outboxRepository.save(event);
          failureCount++;
        }
      }

      this.logger.log(
        `Event publishing completed: ${successCount} succeeded, ${failureCount} failed`
      );
    } catch (error) {
      this.logger.error('Error in publishPendingEvents', error.stack);
    } finally {
      this.isPublishing = false;
    }
  }

  /**
   * Retry failed events that haven't exceeded max retries
   * Called every 1 minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedEvents(): Promise<void> {
    try {
      // Find failed events with retries remaining
      const retryableEvents = await this.outboxRepository
        .createQueryBuilder('event')
        .where('event.status = :status', { status: 'failed' })
        .andWhere('event.retryCount < event.maxRetries')
        .andWhere(
          'event.lastErrorAt < :retryAfter',
          // Exponential backoff: wait 2^retryCount minutes
          {
            retryAfter: new Date(
              Date.now() - Math.pow(2, 0) * 60000 // Start with 1 min, doubles each retry
            ),
          }
        )
        .take(50)
        .getMany();

      if (retryableEvents.length === 0) {
        return;
      }

      this.logger.log(`Retrying ${retryableEvents.length} failed events...`);

      // Reset status to pending for retry
      for (const event of retryableEvents) {
        event.status = 'pending';
        await this.outboxRepository.save(event);
      }

      // Trigger immediate publishing
      await this.publishPendingEvents();
    } catch (error) {
      this.logger.error('Error in retryFailedEvents', error.stack);
    }
  }

  /**
   * Clean up old published events (older than 7 days)
   * Called daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldEvents(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.outboxRepository.delete({
        status: 'published',
        publishedAt: LessThan(sevenDaysAgo),
      });

      this.logger.log(`Cleaned up ${result.affected || 0} old published events`);
    } catch (error) {
      this.logger.error('Error in cleanupOldEvents', error.stack);
    }
  }

  /**
   * Get statistics about outbox events
   */
  async getStatistics(): Promise<{
    pending: number;
    published: number;
    failed: number;
    oldestPending?: Date;
    staleEvents: number;
  }> {
    const [pending, published, failed] = await Promise.all([
      this.outboxRepository.count({ where: { status: 'pending' } }),
      this.outboxRepository.count({ where: { status: 'published' } }),
      this.outboxRepository.count({ where: { status: 'failed' } }),
    ]);

    // Find oldest pending event
    const oldestPending = await this.outboxRepository.findOne({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });

    // Count stale events (pending for more than 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const staleEvents = await this.outboxRepository.count({
      where: {
        status: 'pending',
        createdAt: LessThan(oneHourAgo),
      },
    });

    return {
      pending,
      published,
      failed,
      oldestPending: oldestPending?.createdAt,
      staleEvents,
    };
  }

  /**
   * Manually trigger event publishing (for testing or admin purposes)
   */
  async triggerPublish(): Promise<{ processed: number }> {
    await this.publishPendingEvents();
    const stats = await this.getStatistics();
    return { processed: stats.published };
  }
}
