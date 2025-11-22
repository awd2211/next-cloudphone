import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, QueryNotificationDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission, ActionResult } from '@cloudphone/shared';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 通知管理控制器
 *
 * 使用双层守卫：
 * 1. JwtAuthGuard - 验证 JWT token，设置 request.user
 * 2. PermissionsGuard - 检查用户权限
 */
@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 创建并发送通知
   * POST /notifications
   */
  @Post()
  @RequirePermission('notification.create')
  @ApiOperation({ summary: '创建并发送通知', description: '创建通知并通过指定渠道发送给用户' })
  @ApiResponse({ status: 201, description: '通知创建成功' })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createAndSend(dto);
  }

  /**
   * 广播通知
   * POST /notifications/broadcast
   */
  @Post('broadcast')
  @RequirePermission('notification.broadcast')
  async broadcast(
    @Body() body: { title: string; message: string; data?: Record<string, unknown> }
  ): Promise<ActionResult> {
    await this.notificationsService.broadcast(body.title, body.message, body.data);
    return { message: '广播已发送' };
  }

  /**
   * 获取未读通知数量
   * GET /notifications/unread/count
   */
  @Get('unread/count')
  @RequirePermission('notification.unread-count')
  async getUnreadCount(@Query('userId') userId?: string) {
    if (!userId) {
      return { count: 0 };
    }
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * 获取用户的通知列表（支持 page/pageSize 分页）
   * GET /notifications/user/:userId
   */
  @Get('user/:userId')
  @RequirePermission('notification.read')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('limit') limit?: number
  ) {
    if (unreadOnly === 'true') {
      const data = await this.notificationsService.getUnreadNotifications(userId);
      return { data, total: data.length };
    }
    const pageNum = page ? Number(page) : 1;
    const itemsPerPage = pageSize ? Number(pageSize) : (limit ? Number(limit) : 10);

    const result = await this.notificationsService.getUserNotifications(userId, pageNum, itemsPerPage);

    return {
      data: result.data,
      total: result.total,
      page: pageNum,
      pageSize: itemsPerPage,
    };
  }

  /**
   * 标记通知为已读
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @RequirePermission('notification.update')
  markAsRead(@Param('id') id: string) {
    const notification = this.notificationsService.markAsRead(id);
    if (!notification) {
      throw new NotFoundException('通知不存在');
    }
    return notification;
  }

  /**
   * 标记所有通知为已读
   * POST /notifications/read-all
   */
  @Post('read-all')
  @RequirePermission('notification.update')
  async markAllAsRead(@Body('userId') userId: string): Promise<ActionResult<any>> {
    if (!userId) {
      throw new BadRequestException('缺少userId参数');
    }
    const result = await this.notificationsService.markAllAsRead(userId);
    return {
      data: result,
      message: `已标记 ${result.updated} 条通知为已读`,
    };
  }

  /**
   * 删除通知
   * DELETE /notifications/:id
   */
  @Delete(':id')
  @RequirePermission('notification.delete')
  delete(@Param('id') id: string): ActionResult {
    const deleted = this.notificationsService.deleteNotification(id);
    if (!deleted) {
      throw new NotFoundException('通知不存在');
    }
    return { message: '通知已删除' };
  }

  /**
   * 批量删除通知
   * POST /notifications/batch/delete
   */
  @Post('batch/delete')
  @RequirePermission('notification.batch-delete')
  async batchDelete(@Body('ids') ids: string[]): Promise<ActionResult<any>> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请提供要删除的通知ID列表');
    }
    const result = await this.notificationsService.batchDelete(ids);
    return {
      data: result,
      message: `已删除 ${result.deleted} 条通知`,
    };
  }

  /**
   * 获取统计信息
   * GET /notifications/stats
   */
  @Get('stats')
  @RequirePermission('notification.stats')
  getStats() {
    return this.notificationsService.getStats();
  }
}
