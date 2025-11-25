import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BaseEvent } from './schemas/base.event';

/**
 * 幂等消费者基类
 *
 * 提供事件处理的幂等性保证，通过 Redis 跟踪已处理的事件ID，
 * 防止重复处理同一事件（如网络重试、消息重投递）。
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyConsumer extends IdempotentConsumer {
 *   constructor(
 *     @Inject('REDIS_CLIENT') redis: Redis,
 *   ) {
 *     super(redis, new Logger(MyConsumer.name));
 *   }
 *
 *   protected async processEvent(event: BaseEvent): Promise<void> {
 *     // 处理业务逻辑
 *     console.log('Processing:', event.eventType, event.payload);
 *   }
 *
 *   @RabbitSubscribe({
 *     exchange: 'cloudphone.events',
 *     routingKey: 'device.created',
 *     queue: 'my-service.device-created',
 *   })
 *   async handleDeviceCreated(event: DeviceCreatedEvent) {
 *     await this.handleEvent(event);
 *   }
 * }
 * ```
 */
export abstract class IdempotentConsumer {
  /** 事件处理记录的过期时间（秒），默认24小时 */
  protected readonly eventTtl: number = 86400;

  /** Redis key 前缀 */
  protected readonly keyPrefix: string = 'event:processed:';

  /** 分布式锁的过期时间（秒） */
  protected readonly lockTtl: number = 30;

  constructor(
    protected readonly redis: Redis,
    protected readonly logger: Logger,
  ) {}

  /**
   * 抽象方法：实际处理事件的逻辑
   * 子类必须实现此方法来处理具体的业务逻辑
   */
  protected abstract processEvent(event: BaseEvent): Promise<void>;

  /**
   * 处理事件入口（带幂等性保证）
   *
   * 1. 检查事件是否已处理
   * 2. 获取分布式锁防止并发处理
   * 3. 调用子类的 processEvent 处理业务
   * 4. 标记事件为已处理
   *
   * @param event 待处理的事件
   */
  async handleEvent(event: BaseEvent): Promise<void> {
    const eventId = event.eventId;

    if (!eventId) {
      this.logger.warn(`Event without eventId received, processing anyway: ${event.eventType}`);
      await this.processEvent(event);
      return;
    }

    // 1. 检查是否已处理
    if (await this.isEventProcessed(eventId)) {
      this.logger.debug(`Event ${eventId} already processed, skipping`);
      return;
    }

    // 2. 获取分布式锁
    const lockKey = `${this.keyPrefix}lock:${eventId}`;
    const locked = await this.acquireProcessingLock(lockKey);
    if (!locked) {
      this.logger.debug(`Failed to acquire lock for event ${eventId}, another instance is processing`);
      return;
    }

    try {
      // 3. 双重检查（获取锁后再次检查）
      if (await this.isEventProcessed(eventId)) {
        this.logger.debug(`Event ${eventId} already processed (double-check), skipping`);
        return;
      }

      // 4. 处理事件
      await this.processEvent(event);

      // 5. 标记为已处理
      await this.markEventProcessed(eventId);

      this.logger.debug(`Event ${eventId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process event ${eventId}: ${error.message}`, error.stack);
      throw error; // 重新抛出以便 RabbitMQ 进行重试或发送到 DLX
    } finally {
      // 6. 释放锁
      await this.releaseProcessingLock(lockKey);
    }
  }

  /**
   * 检查事件是否已处理
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    const key = `${this.keyPrefix}${eventId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 标记事件为已处理
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    const key = `${this.keyPrefix}${eventId}`;
    await this.redis.setex(key, this.eventTtl, JSON.stringify({
      processedAt: new Date().toISOString(),
      instanceId: process.env.HOSTNAME || 'unknown',
    }));
  }

  /**
   * 获取处理锁
   */
  private async acquireProcessingLock(lockKey: string): Promise<boolean> {
    // SET key value NX PX milliseconds
    const result = await this.redis.set(lockKey, '1', 'EX', this.lockTtl, 'NX');
    return result === 'OK';
  }

  /**
   * 释放处理锁
   */
  private async releaseProcessingLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  /**
   * 批量处理事件
   * 用于批量消费场景
   */
  async handleEvents(events: BaseEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.handleEvent(event);
      } catch (error) {
        // 单个事件失败不影响其他事件处理
        this.logger.error(`Failed to process event in batch: ${error.message}`);
      }
    }
  }

  /**
   * 手动标记事件为已处理
   * 用于外部需要跳过某些事件的场景
   */
  async skipEvent(eventId: string, reason: string): Promise<void> {
    const key = `${this.keyPrefix}${eventId}`;
    await this.redis.setex(key, this.eventTtl, JSON.stringify({
      processedAt: new Date().toISOString(),
      skipped: true,
      reason,
    }));
    this.logger.log(`Event ${eventId} marked as skipped: ${reason}`);
  }

  /**
   * 检查事件处理状态
   * 用于调试和监控
   */
  async getEventStatus(eventId: string): Promise<{ processed: boolean; details?: any }> {
    const key = `${this.keyPrefix}${eventId}`;
    const data = await this.redis.get(key);
    if (data) {
      return { processed: true, details: JSON.parse(data) };
    }
    return { processed: false };
  }
}
