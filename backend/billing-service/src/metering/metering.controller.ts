import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MeteringService } from './metering.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';

@ApiTags('metering')
@ApiBearerAuth()
@Controller('metering')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class MeteringController {
  constructor(private readonly meteringService: MeteringService) {}

  @Get('users/:userId')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取用户使用统计', description: '获取指定用户的资源使用统计数据' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUserUsageStats(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.meteringService.getUserUsageStats(userId, start, end);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('devices/:deviceId')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取设备使用统计', description: '获取指定设备的资源使用统计数据' })
  @ApiParam({ name: 'deviceId', description: '设备 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDeviceUsageStats(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.meteringService.getDeviceUsageStats(deviceId, start, end);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('tenants/:tenantId')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取租户使用统计', description: '获取指定租户的资源使用统计数据' })
  @ApiParam({ name: 'tenantId', description: '租户 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getTenantUsageStats(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.meteringService.getTenantUsageStats(tenantId, start, end);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('overview')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取计量概览', description: '获取平台计量数据的高层次概览' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const overview = await this.meteringService.getOverview(start, end);
    return {
      success: true,
      data: overview,
    };
  }

  @Get('users')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取所有用户计量统计', description: '获取所有用户的聚合计量数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数）', example: 20 })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAllUsersStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const itemsPerPage = pageSize || limit || '20';

    const result = await this.meteringService.getAllUsersStats(
      start,
      end,
      parseInt(page),
      parseInt(itemsPerPage)
    );

    const { limit: _, ...rest } = result;
    return {
      success: true,
      ...rest,
      pageSize: result.limit,
    };
  }

  @Get('devices')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取所有设备计量统计', description: '获取所有设备的聚合计量数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数）', example: 20 })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAllDevicesStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const itemsPerPage = pageSize || limit || '20';

    const result = await this.meteringService.getAllDevicesStats(
      start,
      end,
      parseInt(page),
      parseInt(itemsPerPage)
    );

    const { limit: _, ...rest } = result;
    return {
      success: true,
      ...rest,
      pageSize: result.limit,
    };
  }

  @Get('trend')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取计量趋势分析', description: '获取时间序列的计量趋势数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'interval', required: false, description: '时间间隔', example: 'day', enum: ['hour', 'day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval: 'hour' | 'day' | 'week' | 'month' = 'day'
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const trend = await this.meteringService.getTrend(start, end, interval);
    return {
      success: true,
      data: trend,
    };
  }

  @Get('resource-analysis')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取资源分析', description: '获取资源使用的详细分析数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getResourceAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const analysis = await this.meteringService.getResourceAnalysis(start, end);
    return {
      success: true,
      data: analysis,
    };
  }

  @Get('stats')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取计量统计', description: '获取平台整体的计量统计数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getMeteringStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.meteringService.getMeteringStats(start, end);
    return {
      success: true,
      data: stats,
    };
  }
}
