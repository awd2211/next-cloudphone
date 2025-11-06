import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService, WarningConfig } from './dashboard.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('usage-forecast/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({
    summary: '获取使用量预测',
    description: '基于历史使用数据，预测未来的资源使用趋势和成本',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiQuery({
    name: 'forecastDays',
    required: false,
    description: '预测天数',
    example: 7,
    type: Number,
  })
  @ApiQuery({
    name: 'historicalDays',
    required: false,
    description: '历史数据天数',
    example: 30,
    type: Number,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUsageForecast(
    @Param('userId') userId: string,
    @Query('forecastDays') forecastDays: number = 7,
    @Query('historicalDays') historicalDays: number = 30
  ) {
    const forecast = await this.dashboardService.getUsageForecast(
      userId,
      Number(forecastDays),
      Number(historicalDays)
    );

    return {
      success: true,
      data: forecast,
      message: '使用量预测获取成功',
    };
  }

  @Get('cost-warning/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({
    summary: '获取成本预警',
    description: '基于当前余额和预测使用量，生成成本预警信息',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getCostWarning(@Param('userId') userId: string) {
    // 获取用户配置
    const config = await this.dashboardService.getWarningConfig(userId);

    // 生成预警
    const warning = await this.dashboardService.getCostWarning(userId, config);

    return {
      success: true,
      data: warning,
      message: '成本预警获取成功',
    };
  }

  @Get('warning-config/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({
    summary: '获取预警配置',
    description: '获取用户的成本预警配置',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getWarningConfig(@Param('userId') userId: string) {
    const config = await this.dashboardService.getWarningConfig(userId);

    return {
      success: true,
      data: config,
      message: '预警配置获取成功',
    };
  }

  @Put('warning-config/:userId')
  @RequirePermission('billing:update')
  @ApiOperation({
    summary: '更新预警配置',
    description: '更新用户的成本预警配置',
  })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiBody({
    description: '预警配置',
    schema: {
      type: 'object',
      properties: {
        dailyBudget: { type: 'number', description: '每日预算（CNY）', example: 100 },
        monthlyBudget: { type: 'number', description: '每月预算（CNY）', example: 3000 },
        lowBalanceThreshold: { type: 'number', description: '低余额阈值（CNY）', example: 50 },
        criticalBalanceThreshold: {
          type: 'number',
          description: '严重低余额阈值（CNY）',
          example: 20,
        },
        enableEmailNotification: { type: 'boolean', description: '启用邮件通知', example: true },
        enableSmsNotification: { type: 'boolean', description: '启用短信通知', example: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateWarningConfig(
    @Param('userId') userId: string,
    @Body() config: Partial<WarningConfig>
  ) {
    const updatedConfig = await this.dashboardService.updateWarningConfig(userId, config);

    return {
      success: true,
      data: updatedConfig,
      message: '预警配置更新成功',
    };
  }
}
