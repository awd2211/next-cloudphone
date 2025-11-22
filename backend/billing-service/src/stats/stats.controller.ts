import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
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
      data: distribution,
    };
  }
  @Get('overview')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取全局统计概览',
    description: '获取用户、设备、订单、收入、应用的全面统计概览',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getOverview() {
    const overview = await this.statsService.getOverview();
    return {
      data: overview,
      message: '统计概览获取成功',
    };
  }

  @Get('trends')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取综合趋势统计',
    description: '获取指定时间范围内的用户、设备、收入等综合趋势数据',
  })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'granularity', required: false, description: '粒度（hour, day, week, month）', example: 'day' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity: string = 'day',
  ) {
    const trends = await this.statsService.getTrends(startDate, endDate, granularity);
    return {
      data: trends,
    };
  }

  @Get('device-usage')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取设备使用统计',
    description: '获取设备使用情况的统计数据',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDeviceUsage() {
    const usage = await this.statsService.getDeviceUsage();
    return {
      data: usage,
    };
  }

  @Get('revenue')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取收入统计',
    description: '获取收入统计的详细数据',
  })
  @ApiQuery({ name: 'period', required: false, description: '周期（today, week, month, year）', example: 'month' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRevenueStats(@Query('period') period: string = 'month') {
    const revenue = await this.statsService.getRevenueStats(period);
    return {
      data: revenue,
    };
  }

  @Get('top-apps')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取热门应用排行',
    description: '获取安装量最高的应用排行榜',
  })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量', example: 10 })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getTopApps(@Query('limit') limit: number = 10) {
    const topApps = await this.statsService.getTopApps(limit);
    return {
      data: topApps,
    };
  }
  @Get('performance')
  @RequirePermission('billing.read')
  @ApiOperation({
    summary: '获取性能统计',
    description: '获取各服务的健康状态和系统性能指标',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPerformance() {
    const performance = await this.statsService.getPerformance();
    return {
      data: performance,
      message: '性能统计获取成功',
    };
  }
}
