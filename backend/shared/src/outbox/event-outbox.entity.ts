import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Event Outbox Entity
 *
 * Implements the Transactional Outbox Pattern for reliable event publishing.
 * Events are written to this table in the same database transaction as business data,
 * then published asynchronously by a background worker.
 *
 * @see https://microservices.io/patterns/data/transactional-outbox.html
 */
@Entity('event_outbox')
@Index('idx_outbox_status_created', ['status', 'createdAt'], {
  where: "status = 'pending'",
})
@Index('idx_outbox_aggregate', ['aggregateType', 'aggregateId'])
@Index('idx_outbox_event_type', ['eventType'])
@Index('idx_outbox_failed_retryable', ['status', 'retryCount', 'createdAt'], {
  where: "status = 'failed' AND retry_count < max_retries",
})
export class EventOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of aggregate (entity) that produced this event
   * @example 'device', 'user', 'app', 'billing'
   */
  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType: string;

  /**
   * Unique identifier of the aggregate instance
   * @example device ID, user ID, app ID
   */
  @Column({ name: 'aggregate_id', type: 'varchar', length: 255 })
  aggregateId: string;

  /**
   * Event type following the pattern: {service}.{entity}.{action}
   * @example 'device.created', 'device.started', 'user.registered'
   */
  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType: string;

  /**
   * Full event payload as JSON
   */
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  /**
   * Publishing status
   * - pending: waiting to be published
   * - published: successfully sent to RabbitMQ
   * - failed: max retries exceeded
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status: 'pending' | 'published' | 'failed';

  /**
   * Number of publish attempts
   */
  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  /**
   * Maximum number of retries before marking as failed
   */
  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  /**
   * Error message from last publish attempt
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Timestamp of last publishing error
   */
  @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
  lastErrorAt?: Date;

  /**
   * When the event was created (and persisted to database)
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  /**
   * When the event was successfully published to RabbitMQ
   */
  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  /**
   * Calculate age of the event in milliseconds
   */
  getAgeMs(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Check if event should be retried
   */
  canRetry(): boolean {
    return this.status === 'failed' && this.retryCount < this.maxRetries;
  }

  /**
   * Check if event is stale (older than 1 hour and still pending)
   */
  isStale(thresholdMs: number = 3600000): boolean {
    return this.status === 'pending' && this.getAgeMs() > thresholdMs;
  }
}
