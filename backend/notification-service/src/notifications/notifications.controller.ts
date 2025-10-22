import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, NotificationType } from './notification.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 创建并发送通知
   * POST /notifications
   */
  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createAndSend(dto);
  }

  /**
   * 广播通知
   * POST /notifications/broadcast
   */
  @Post('broadcast')
  async broadcast(
    @Body() body: { title: string; message: string; data?: any },
  ) {
    await this.notificationsService.broadcast(
      body.title,
      body.message,
      body.data,
    );
    return { success: true, message: '广播已发送' };
  }

  /**
   * 获取用户的通知列表
   * GET /notifications/user/:userId
   */
  @Get('user/:userId')
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    if (unreadOnly === 'true') {
      return this.notificationsService.getUnreadNotifications(userId);
    }
    return this.notificationsService.getUserNotifications(userId);
  }

  /**
   * 标记通知为已读
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    const notification = this.notificationsService.markAsRead(id);
    if (!notification) {
      return { success: false, message: '通知不存在' };
    }
    return { success: true, notification };
  }

  /**
   * 删除通知
   * DELETE /notifications/:id
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    const success = this.notificationsService.deleteNotification(id);
    if (!success) {
      return { success: false, message: '通知不存在' };
    }
    return { success: true, message: '通知已删除' };
  }

  /**
   * 获取统计信息
   * GET /notifications/stats
   */
  @Get('stats')
  getStats() {
    return this.notificationsService.getStats();
  }
}
