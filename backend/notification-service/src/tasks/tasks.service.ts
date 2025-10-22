import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private intervals: NodeJS.Timeout[] = [];

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('初始化定时任务服务');
    this.startTasks();
  }

  onModuleDestroy() {
    this.logger.log('停止所有定时任务');
    this.intervals.forEach(interval => clearInterval(interval));
  }

  private startTasks() {
    // 每小时执行一次：清理过期通知
    const hourlyTask = setInterval(() => {
      this.handleCleanupExpiredNotifications();
    }, 60 * 60 * 1000); // 1小时
    this.intervals.push(hourlyTask);
    this.logger.log('定时任务已启动：清理过期通知（每小时）');

    // 每5分钟：检查待发送的通知
    const fiveMinTask = setInterval(() => {
      this.handleCheckPendingNotifications();
    }, 5 * 60 * 1000); // 5分钟
    this.intervals.push(fiveMinTask);
    this.logger.log('定时任务已启动：检查待发送通知（每5分钟）');

    // 每天凌晨2点：生成每日报告（简化版：每24小时执行一次）
    const dailyTask = setInterval(() => {
      this.handleDailyReport();
    }, 24 * 60 * 60 * 1000); // 24小时
    this.intervals.push(dailyTask);
    this.logger.log('定时任务已启动：生成每日报告（每24小时）');
  }

  private async handleCleanupExpiredNotifications() {
    this.logger.log('执行定时任务：清理过期通知');
    const count = await this.notificationsService.cleanupExpiredNotifications();
    if (count > 0) {
      this.logger.log(`已清理 ${count} 条过期通知`);
    }
  }

  private async handleDailyReport() {
    this.logger.log('执行定时任务：生成每日报告');
    const stats = await this.notificationsService.getStats();
    this.logger.log(`每日统计: ${JSON.stringify(stats)}`);
  }

  private async handleCheckPendingNotifications() {
    this.logger.debug('执行定时任务：检查待发送通知');
    const stats = await this.notificationsService.getStats();
    if (stats.byStatus.pending > 0) {
      this.logger.log(`发现 ${stats.byStatus.pending} 条待发送通知`);
    }
  }
}
