import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AllEventsHandler } from './all-events.handler';

/**
 * 事件处理模块
 * 
 * 订阅 RabbitMQ 事件并发送通知
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    NotificationsModule,
  ],
  providers: [AllEventsHandler],
  exports: [AllEventsHandler],
})
export class EventsModule {}

