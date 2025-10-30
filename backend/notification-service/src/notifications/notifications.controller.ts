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
import { CreateNotificationDto } from './notification.interface';

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
    @Body() body: { title: string; message: string; data?: Record<string, unknown> },
  ) {
    await this.notificationsService.broadcast(
      body.title,
      body.message,
      body.data,
    );
    return { success: true, message: '广播已发送' };
  }

  /**
   * 获取未读通知数量
   * GET /notifications/unread/count
   */
  @Get('unread/count')
  async getUnreadCount(@Query('userId') userId?: string) {
    if (!userId) {
      return {
        success: true,
        data: { count: 0 },
      };
    }
    const notifications = await this.notificationsService.getUnreadNotifications(userId);
    return {
      success: true,
      data: { count: notifications.length },
    };
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
   * 标记所有通知为已读
   * POST /notifications/read-all
   */
  @Post('read-all')
  async markAllAsRead(@Body('userId') userId: string) {
    if (!userId) {
      return { success: false, message: '缺少userId参数' };
    }
    const result = await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      message: `已标记 ${result.updated} 条通知为已读`,
      data: result,
    };
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
   * 批量删除通知
   * POST /notifications/batch/delete
   */
  @Post('batch/delete')
  async batchDelete(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      return { success: false, message: '请提供要删除的通知ID列表' };
    }
    const result = await this.notificationsService.batchDelete(ids);
    return {
      success: true,
      message: `已删除 ${result.deleted} 条通知`,
      data: result,
    };
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
