import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { queueConfig, QueueName } from '../common/config/queue.config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { DeviceOperationProcessor } from './processors/device-operation.processor';
import { NotificationBroadcastProcessor } from './processors/notification-broadcast.processor';
import { SmsModule } from '../common/services/sms/sms.module';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';

/**
 * 队列模块
 *
 * 集成 Bull Queue 实现异步任务处理
 */
@Module({
  imports: [
    // 注册 Bull Queue 模块
    BullModule.forRoot(queueConfig),

    // 注册各个队列
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.SMS },
      { name: QueueName.DEVICE_OPERATION },
      { name: QueueName.NOTIFICATION },
      { name: QueueName.DATA_EXPORT },
      { name: QueueName.REPORT_GENERATION },
      { name: QueueName.IMAGE_PROCESSING },
      { name: QueueName.LOG_PROCESSING },
    ),

    // TypeORM 实体访问
    TypeOrmModule.forFeature([User, Notification]),

    // 导入短信服务模块
    SmsModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    EmailProcessor,
    SmsProcessor,
    DeviceOperationProcessor,
    NotificationBroadcastProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
