import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService, CreateNotificationDto } from '../services/notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}
  @Get()
  @ApiOperation({ summary: '获取通知列表', description: '获取用户通知列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'isRead', required: false, description: '是否已读' })
  @ApiQuery({ name: 'type', required: false, description: '通知类型' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user?.id;
    const result = await this.notificationService.findAllByUser(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      isRead: isRead ? isRead === 'true' : undefined,
      type: type as any,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Get('unread/count')
  @ApiOperation({ summary: '获取未读通知数量', description: '获取用户未读通知数量' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return {
      success: true,
      data: { count },
    };
  }

  @Post()
  @ApiOperation({ summary: '创建通知', description: '创建新通知（管理员）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Req() req: any, @Body() createDto: CreateNotificationDto) {
    const notifications = await this.notificationService.create(createDto);
    return {
      success: true,
      data: notifications,
      message: '通知创建成功',
    };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记为已读', description: '标记指定通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const notification = await this.notificationService.markAsRead(userId, id);
    return {
      success: true,
      data: notification,
      message: '标记已读成功',
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部标记为已读', description: '标记所有通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    await this.notificationService.markAllAsRead(userId);
    return {
      success: true,
      message: '全部标记已读成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知', description: '删除指定通知' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    await this.notificationService.remove(userId, id);
    return {
      success: true,
      message: '删除通知成功',
    };
  }

  @Post('batch/delete')
  @ApiOperation({ summary: '批量删除通知', description: '批量删除指定通知' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async batchDelete(@Req() req: any, @Body('ids') ids: string[]) {
    const userId = req.user?.id;
    await this.notificationService.batchRemove(userId, ids);
    return {
      success: true,
      message: '批量删除成功',
    };
  }
}
