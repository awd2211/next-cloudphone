import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { EventBus } from '@nestjs/cqrs';
import { UserEvent } from '../../entities/user-event.entity';
import { UserDomainEvent } from './user.events';
import { Retry, DatabaseError } from '../../common/decorators/retry.decorator';

/**
 * 事件存储服务
 * 负责持久化和读取事件
 */
@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    @InjectRepository(UserEvent)
    private readonly eventRepository: Repository<UserEvent>,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * 保存事件到事件存储
   * @param event 领域事件
   * @param metadata 事件元数据
   * @returns 保存的事件实体
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [QueryFailedError, DatabaseError]
  })
  async saveEvent(
    event: UserDomainEvent,
    metadata?: {
      userId?: string;
      username?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
      causationId?: string;
    },
  ): Promise<UserEvent> {
    try {
      // 检查版本冲突（乐观锁）
      const existingEvent = await this.eventRepository.findOne({
        where: {
          aggregateId: event.aggregateId,
          version: event.version,
        },
      });

      if (existingEvent) {
        throw new ConflictException(
          `Event version conflict for aggregate ${event.aggregateId}, version ${event.version}`,
        );
      }

      // 创建事件实体
      const userEvent = this.eventRepository.create({
        aggregateId: event.aggregateId,
        eventType: event.getEventType(),
        eventData: event.getEventData(),
        version: event.version,
        metadata,
        createdAt: event.occurredAt,
      });

      // 保存事件
      const savedEvent = await this.eventRepository.save(userEvent);

      this.logger.log(
        `Event saved: ${event.getEventType()} for aggregate ${event.aggregateId}, version ${event.version}`,
      );

      // 发布事件到 CQRS EventBus（用于事件处理器）
      this.eventBus.publish(event);

      return savedEvent;
    } catch (error) {
      this.logger.error(
        `Failed to save event: ${event.getEventType()} for aggregate ${event.aggregateId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 批量保存事件（优化版：使用事务和批量插入）
   * @param events 事件列表
   * @param metadata 元数据
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [QueryFailedError, DatabaseError]
  })
  async saveEvents(
    events: UserDomainEvent[],
    metadata?: any,
  ): Promise<UserEvent[]> {
    if (events.length === 0) return [];

    // 使用事务确保原子性
    return await this.eventRepository.manager.transaction(async (transactionalEntityManager) => {
      // 检查版本冲突
      const aggregateIds = [...new Set(events.map(e => e.aggregateId))];
      const existingEvents = await transactionalEntityManager.find(UserEvent, {
        where: aggregateIds.map(aggregateId => ({
          aggregateId,
          version: events.find(e => e.aggregateId === aggregateId)?.version,
        })),
      });

      if (existingEvents.length > 0) {
        throw new ConflictException(
          `Event version conflict detected for ${existingEvents.length} events`,
        );
      }

      // 批量创建事件实体
      const eventEntities = events.map(event =>
        this.eventRepository.create({
          aggregateId: event.aggregateId,
          eventType: event.getEventType(),
          eventData: event.getEventData(),
          version: event.version,
          metadata,
          createdAt: event.occurredAt,
        }),
      );

      // 批量保存
      const savedEvents = await transactionalEntityManager.save(UserEvent, eventEntities);

      this.logger.log(`Batch saved ${savedEvents.length} events`);

      // 并行发布事件到 EventBus
      await Promise.all(events.map(event => this.eventBus.publish(event)));

      return savedEvents;
    });
  }

  /**
   * 获取聚合的所有事件
   * @param aggregateId 聚合根ID（用户ID）
   * @returns 事件列表（按版本号排序）
   */
  async getEventsForAggregate(aggregateId: string): Promise<UserEvent[]> {
    return this.eventRepository.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });
  }

  /**
   * 获取聚合从某个版本之后的事件
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本（不包含）
   */
  async getEventsFromVersion(
    aggregateId: string,
    fromVersion: number,
  ): Promise<UserEvent[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .andWhere('event.version > :fromVersion', { fromVersion })
      .orderBy('event.version', 'ASC')
      .getMany();
  }

  /**
   * 获取聚合的当前版本号
   * @param aggregateId 聚合根ID
   */
  async getCurrentVersion(aggregateId: string): Promise<number> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('MAX(event.version)', 'maxVersion')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .getRawOne();

    return result?.maxVersion ?? 0;
  }

  /**
   * 获取某个时间范围内的事件
   * @param startDate 开始时间
   * @param endDate 结束时间
   * @param eventType 事件类型（可选）
   */
  async getEventsByTimeRange(
    startDate: Date,
    endDate: Date,
    eventType?: string,
  ): Promise<UserEvent[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere('event.createdAt <= :endDate', { endDate });

    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    return queryBuilder.orderBy('event.createdAt', 'ASC').getMany();
  }

  /**
   * 获取某种类型的所有事件
   * @param eventType 事件类型
   * @param limit 限制数量
   */
  async getEventsByType(
    eventType: string,
    limit: number = 100,
  ): Promise<UserEvent[]> {
    return this.eventRepository.find({
      where: { eventType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 统计事件数量
   * @param aggregateId 聚合根ID（可选）
   * @param eventType 事件类型（可选）
   */
  async countEvents(aggregateId?: string, eventType?: string): Promise<number> {
    const queryBuilder = this.eventRepository.createQueryBuilder('event');

    if (aggregateId) {
      queryBuilder.where('event.aggregateId = :aggregateId', { aggregateId });
    }

    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    return queryBuilder.getCount();
  }

  /**
   * 清理旧事件（慎用！）
   * @param beforeDate 删除此日期之前的事件
   * @param aggregateId 只删除特定聚合的事件（可选）
   */
  async purgeOldEvents(beforeDate: Date, aggregateId?: string): Promise<number> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :beforeDate', { beforeDate });

    if (aggregateId) {
      queryBuilder.andWhere('aggregateId = :aggregateId', { aggregateId });
    }

    const result = await queryBuilder.execute();

    this.logger.warn(
      `Purged ${result.affected} events before ${beforeDate.toISOString()}`,
    );

    return result.affected || 0;
  }
}
