import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { FileUploadedEvent, NotificationEventTypes } from '@cloudphone/shared';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class MediaEventsConsumer {
  private readonly logger = new Logger(MediaEventsConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.FILE_UPLOADED,
    queue: 'notification-service.media.file_uploaded',
    queueOptions: { durable: true },
  })
  async handleFileUploaded(event: FileUploadedEvent, msg: ConsumeMessage) {
    this.logger.log(`文件上传完成: ${event.payload.fileName}`);

    try {
      await this.notificationsService.createAndSend({
        userId: event.payload.userId,
        type: NotificationType.MESSAGE,
        title: '文件上传完成',
        message: `文件 "${event.payload.fileName}" 已上传完成`,
        data: {
          fileId: event.payload.fileId,
          fileName: event.payload.fileName,
          fileSize: event.payload.fileSize,
          downloadUrl: event.payload.downloadUrl,
          thumbnailUrl: event.payload.thumbnailUrl,
        },
      });
    } catch (error) {
      this.logger.error(`处理文件上传事件失败: ${error.message}`);
      throw error;
    }
  }
}
