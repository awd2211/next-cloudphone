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
import { RequirePermission } from '../auth/decorators/permissions.decorator';

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
}
