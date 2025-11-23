import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('livechat/analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取概览统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getOverviewStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getOverviewStats(user!.tenantId, start, end);
  }

  @Get('trends')
  @ApiOperation({ summary: '获取会话趋势' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getConversationTrends(
    @Query('days') days: number = 7,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.analyticsService.getConversationTrends(user!.tenantId, days);
  }

  @Get('agents')
  @ApiOperation({ summary: '获取客服绩效' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAgentPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getAgentPerformance(user!.tenantId, start, end);
  }

  @Get('ratings')
  @ApiOperation({ summary: '获取评分分布' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getRatingDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getRatingDistribution(user!.tenantId, start, end);
  }

  @Get('peak-hours')
  @ApiOperation({ summary: '获取高峰时段' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getPeakHours(
    @Query('days') days: number = 7,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.analyticsService.getPeakHours(user!.tenantId, days);
  }
}
