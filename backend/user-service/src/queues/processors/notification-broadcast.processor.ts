import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueName } from '../../common/config/queue.config';
import { User, UserStatus } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';

export interface NotificationBroadcastJobData {
  type: 'broadcast';
  notification: {
    title: string;
    content: string;
    type: string;
    resourceType?: string;
    resourceId?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * 通知广播处理器
 * 
 * 负责批量发送通知给所有用户
 */
@Processor(QueueName.NOTIFICATION)
export class NotificationBroadcastProcessor {
  private readonly logger = new Logger(NotificationBroadcastProcessor.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 处理广播通知任务
   */
  @Process('broadcast')
  async handleBroadcast(job: Job<NotificationBroadcastJobData>): Promise<void> {
    const { notification } = job.data;
    
    this.logger.log(`Processing broadcast notification: ${notification.title}`);

    // 分批查询所有活跃用户
    const batchSize = 100;
    let offset = 0;
    let totalSent = 0;

    while (true) {
      const users = await this.userRepository.find({
        where: { status: UserStatus.ACTIVE },
        select: ['id'],
        skip: offset,
        take: batchSize,
      });

      if (users.length === 0) {
        break;
      }

      // 批量创建通知
      const notifications = users.map(user => 
        this.notificationRepository.create({
          userId: user.id,
          title: notification.title,
          content: notification.content,
          type: notification.type as any,
          resourceType: notification.resourceType,
          resourceId: notification.resourceId,
          actionUrl: notification.actionUrl,
          metadata: notification.metadata,
        })
      );

      await this.notificationRepository.save(notifications);
      
      totalSent += users.length;
      offset += batchSize;

      // 更新任务进度
      await job.progress((offset / (offset + users.length)) * 100);

      this.logger.log(`Sent ${totalSent} notifications so far...`);
    }

    this.logger.log(`✅ Broadcast completed: ${totalSent} notifications sent`);
  }
}

