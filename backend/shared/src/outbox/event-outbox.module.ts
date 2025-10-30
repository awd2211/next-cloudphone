import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventOutbox } from './event-outbox.entity';
import { EventOutboxService } from './event-outbox.service';
import { EventBusModule } from '../events/event-bus.module';

/**
 * Event Outbox Module
 *
 * Provides Transactional Outbox Pattern for reliable event publishing.
 * Import this module in services that need to publish events transactionally.
 *
 * IMPORTANT: The consuming application must import ScheduleModule.forRoot() in its AppModule
 * to enable the @Cron decorators in EventOutboxService.
 *
 * @example
 * // In your AppModule
 * @Module({
 *   imports: [
 *     ScheduleModule.forRoot(), // Required for @Cron decorators
 *     // ... other imports
 *   ],
 * })
 * export class AppModule {}
 *
 * // In your service module
 * @Module({
 *   imports: [
 *     EventOutboxModule,
 *     // ... other imports
 *   ],
 * })
 * export class DeviceModule {}
 *
 * // In your service
 * constructor(
 *   private readonly outboxService: EventOutboxService,
 *   private readonly dataSource: DataSource,
 * ) {}
 *
 * async createDevice(dto: CreateDeviceDto) {
 *   const queryRunner = this.dataSource.createQueryRunner();
 *   await queryRunner.connect();
 *   await queryRunner.startTransaction();
 *
 *   try {
 *     // 1. Save business data
 *     const device = await queryRunner.manager.save(Device, dto);
 *
 *     // 2. Write event to outbox (in same transaction)
 *     await this.outboxService.writeEvent(
 *       queryRunner,
 *       'device',
 *       device.id,
 *       'device.created',
 *       { deviceId: device.id, ...device },
 *     );
 *
 *     await queryRunner.commitTransaction();
 *     return device;
 *   } catch (error) {
 *     await queryRunner.rollbackTransaction();
 *     throw error;
 *   } finally {
 *     await queryRunner.release();
 *   }
 * }
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EventOutbox]),
    EventBusModule, // For publishing to RabbitMQ
  ],
  providers: [EventOutboxService],
  exports: [EventOutboxService, TypeOrmModule],
})
export class EventOutboxModule {}
