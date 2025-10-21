import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService, CreateNotificationDto } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: '发送通知' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return await this.notificationsService.sendNotification(dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户通知列表' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return await this.notificationsService.getUserNotifications(userId, unreadOnly === true);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { message: '已标记为已读' };
  }

  @Get('unread-count/:userId')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }
}
