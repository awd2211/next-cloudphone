import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { EventStoreService } from './event-store.service';
import { EventReplayService } from './event-replay.service';

/**
 * 事件管理控制器
 * 提供事件溯源相关的管理接口
 * 仅限管理员使用
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class EventsController {
  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventReplay: EventReplayService
  ) {}

  @Get('user/:userId/history')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '获取用户事件历史',
    description: '获取用户的完整事件历史记录（审计日志）',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserEventHistory(@Param('userId') userId: string) {
    const history = await this.eventReplay.getUserEventHistory(userId);
    return {
      success: true,
      data: history,
      message: '事件历史获取成功',
    };
  }

  @Get('user/:userId/replay')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '重放用户事件',
    description: '通过重放事件重建用户当前状态',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '重放成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async replayUserEvents(@Param('userId') userId: string) {
    const userState = await this.eventReplay.replayUserEvents(userId);
    return {
      success: true,
      data: userState,
      message: '事件重放成功',
    };
  }

  @Get('user/:userId/replay/version/:version')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '重放到特定版本',
    description: '重放用户事件到特定版本号',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'version', description: '目标版本号' })
  @ApiResponse({ status: 200, description: '重放成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async replayToVersion(
    @Param('userId') userId: string,
    @Param('version', ParseIntPipe) version: number
  ) {
    const userState = await this.eventReplay.replayToVersion(userId, version);
    return {
      success: true,
      data: userState,
      message: `重放到版本 ${version} 成功`,
    };
  }

  @Get('user/:userId/replay/timestamp')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '时间旅行',
    description: '重放用户事件到特定时间点（查看历史状态）',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({
    name: 'timestamp',
    description: '目标时间戳（ISO 8601格式）',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiResponse({ status: 200, description: '时间旅行成功' })
  @ApiResponse({ status: 400, description: '时间戳格式错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async timeTravel(@Param('userId') userId: string, @Query('timestamp') timestamp: string) {
    const targetDate = new Date(timestamp);

    if (isNaN(targetDate.getTime())) {
      return {
        success: false,
        message: '无效的时间戳格式',
      };
    }

    const userState = await this.eventReplay.replayToTimestamp(userId, targetDate);
    return {
      success: true,
      data: userState,
      message: `时间旅行到 ${targetDate.toISOString()} 成功`,
    };
  }

  @Get('stats')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '事件统计',
    description: '获取事件存储的统计信息',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: '事件类型',
    example: 'UserCreated',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getEventStats(@Query('eventType') eventType?: string) {
    const totalEvents = await this.eventStore.countEvents(undefined, eventType);

    const eventTypes = [
      'UserCreated',
      'UserUpdated',
      'PasswordChanged',
      'UserDeleted',
      'LoginInfoUpdated',
      'AccountLocked',
    ];

    const eventCounts: Record<string, number> = {};

    for (const type of eventTypes) {
      eventCounts[type] = await this.eventStore.countEvents(undefined, type);
    }

    return {
      success: true,
      data: {
        totalEvents,
        eventsByType: eventCounts,
      },
      message: '事件统计获取成功',
    };
  }

  @Get('recent')
  @RequirePermission('event.read')
  @ApiOperation({
    summary: '获取最近事件',
    description: '获取最近发生的事件列表',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: '事件类型过滤',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '数量限制',
    example: 50,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRecentEvents(
    @Query('eventType') eventType?: string,
    @Query('limit') limit: string = '50'
  ) {
    const events = await this.eventStore.getEventsByType(
      eventType || 'UserCreated',
      parseInt(limit)
    );

    return {
      success: true,
      data: events.map((e) => ({
        id: e.id,
        aggregateId: e.aggregateId,
        eventType: e.eventType,
        version: e.version,
        createdAt: e.createdAt,
        eventData: e.eventData,
      })),
      total: events.length,
      message: '最近事件获取成功',
    };
  }
}
