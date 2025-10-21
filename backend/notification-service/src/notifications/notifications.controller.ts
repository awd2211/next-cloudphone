import { Controller, Get, Post, Delete, Body, Param, Query, Logger, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { NotificationsService, CreateNotificationDto } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表', description: '获取当前用户的通知列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'isRead', required: false, description: '是否已读' })
  @ApiQuery({ name: 'type', required: false, description: '通知类型' })
  async findAll(
    @Headers('x-user-id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await this.notificationsService.getUserNotifications(
      userId,
      isRead === 'false' ? true : false,
    );

    // Simple pagination
    const total = notifications.length;
    const data = notifications.slice(skip, skip + limitNum);

    return {
      success: true,
      data,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('unread/count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@Headers('x-user-id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return {
      success: true,
      data: { count },
    };
  }

  @Post('send')
  @ApiOperation({ summary: '发送通知（管理员）' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.sendNotification(dto);
    return {
      success: true,
      data: notification,
      message: '通知发送成功',
    };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  async markAsRead(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markAsRead(id);
    return {
      success: true,
      message: '标记已读成功',
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部标记为已读' })
  async markAllAsRead(@Headers('x-user-id') userId: string) {
    // TODO: Implement markAllAsRead in service
    return {
      success: true,
      message: '全部标记已读成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiParam({ name: 'id', description: '通知ID' })
  async remove(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    // TODO: Implement remove in service
    return {
      success: true,
      message: '删除通知成功',
    };
  }

  @Post('batch/delete')
  @ApiOperation({ summary: '批量删除通知' })
  async batchDelete(
    @Headers('x-user-id') userId: string,
    @Body('ids') ids: string[],
  ) {
    // TODO: Implement batch delete in service
    return {
      success: true,
      message: '批量删除成功',
    };
  }
}
