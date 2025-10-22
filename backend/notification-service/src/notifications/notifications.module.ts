import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationGateway } from '../gateway/notification.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationTemplate])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}
