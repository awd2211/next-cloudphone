import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationPreferencesService } from './preferences.service';
import { NotificationPreferencesController } from './preferences.controller';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationPreference,
    ]),
    EmailModule,
    SmsModule,
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationGateway,
    NotificationPreferencesService,
  ],
  exports: [
    NotificationsService,
    NotificationGateway,
    NotificationPreferencesService,
  ],
})
export class NotificationsModule {}
