import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取仪表盘统计数据', description: '获取管理后台仪表盘的核心统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDashboardStats() {
    const stats = await this.statsService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('devices/online')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取在线设备数', description: '获取当前在线设备总数' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOnlineDevices() {
    const count = await this.statsService.getOnlineDevicesCount();
    return {
      success: true,
      data: { count },
    };
  }

  @Get('devices/distribution')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取设备状态分布', description: '获取各状态设备数量分布' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDeviceDistribution() {
    const distribution = await this.statsService.getDeviceStatusDistribution();
    return {
      success: true,
      data: distribution,
    };
  }

  @Get('users/today')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取今日新增用户', description: '获取今天新注册的用户数' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTodayNewUsers() {
    const count = await this.statsService.getTodayNewUsersCount();
    return {
      success: true,
      data: { count },
    };
  }

  @Get('users/activity')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取用户活跃度统计', description: '获取指定天数内的用户活跃度数据' })
  @ApiQuery({ name: 'days', required: false, description: '天数', example: 7 })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserActivity(@Query('days') days: number = 7) {
    const activity = await this.statsService.getUserActivityStats(days);
    return {
      success: true,
      data: activity,
    };
  }

  @Get('users/growth')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取用户增长统计', description: '获取指定天数内的用户增长趋势' })
  @ApiQuery({ name: 'days', required: false, description: '天数', example: 30 })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserGrowth(@Query('days') days: number = 30) {
    const growth = await this.statsService.getUserGrowthStats(days);
    return {
      success: true,
      data: growth,
    };
  }

  @Get('revenue/today')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取今日收入', description: '获取今天的总收入' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTodayRevenue() {
    const revenue = await this.statsService.getTodayRevenue();
    return {
      success: true,
      data: { revenue },
    };
  }

  @Get('revenue/month')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取本月收入', description: '获取本月的总收入' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMonthRevenue() {
    const revenue = await this.statsService.getMonthRevenue();
    return {
      success: true,
      data: { revenue },
    };
  }

  @Get('revenue/trend')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取收入趋势', description: '获取指定天数内的收入趋势' })
  @ApiQuery({ name: 'days', required: false, description: '天数', example: 30 })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRevenueTrend(@Query('days') days: number = 30) {
    const trend = await this.statsService.getRevenueTrend(days);
    return {
      success: true,
      data: trend,
    };
  }

  @Get('plans/distribution')
  @RequirePermission('billing.read')
  @ApiOperation({ summary: '获取套餐分布统计', description: '获取各套餐的用户数和收入统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPlanDistribution() {
    const distribution = await this.statsService.getPlanDistributionStats();
    return {
      success: true,
      data: distribution,
    };
  }
}
