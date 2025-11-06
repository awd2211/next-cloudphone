import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule, ConsulModule } from '@cloudphone/shared';
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
import { ErrorNotificationService } from './error-notification.service';
import { UserServiceClient } from '../clients/user-service.client';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate, NotificationPreference]),
    HttpClientModule,
    ConsulModule,
    EmailModule,
    SmsModule,
    TemplatesModule,
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationGateway,
    NotificationPreferencesService,
    ErrorNotificationService,
    UserServiceClient,
  ],
  exports: [
    NotificationsService,
    NotificationGateway,
    NotificationPreferencesService,
    ErrorNotificationService,
    UserServiceClient,
  ],
})
export class NotificationsModule {}
