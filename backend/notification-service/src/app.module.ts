import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { TasksService } from './tasks/tasks.service';
import { NotificationGateway } from './gateway/notification.gateway';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';

@Module({
  imports: [
    // ========== 全局配置 ==========
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [
    HealthController,
    NotificationsController,
  ],
  providers: [
    NotificationGateway,
    NotificationsService,
    TasksService,
  ],
})
export class AppModule {}
