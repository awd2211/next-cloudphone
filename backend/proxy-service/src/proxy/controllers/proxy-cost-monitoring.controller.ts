import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
import { ProxyCostMonitoringService } from '../services/proxy-cost-monitoring.service';
import {
  RecordCostDto,
  ConfigureBudgetDto,
  CostStatisticsQueryDto,
  BudgetResponseDto,
  CostStatisticsResponseDto,
  CostAlertResponseDto,
  CostOptimizationResponseDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理成本监控控制器
 *
 * 提供实时成本跟踪、预算管理和优化建议
 */
@ApiTags('Proxy Cost Monitoring')
@Controller('proxy/cost')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyCostMonitoringController {
  constructor(
    private readonly costMonitoringService: ProxyCostMonitoringService,
  ) {}

  /**
   * 记录代理使用成本
   */
  @Post('record')
  @RequirePermission('proxy.cost.record')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '记录成本',
    description: '记录代理使用的成本数据',
  })
  @ApiResponse({
    status: 201,
    description: '成本记录成功',
  })
  async recordCost(
    @Body() dto: RecordCostDto,
  ): Promise<ProxyApiResponse<{ recorded: boolean }>> {
    await this.costMonitoringService.recordCost(dto);
    return ProxyApiResponse.success({ recorded: true }, 'Cost recorded');
  }

  /**
   * 配置预算
   */
  @Post('budget')
  @RequirePermission('proxy.cost.budget')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '配置预算',
    description: '为用户或设备配置成本预算和告警阈值',
  })
  @ApiResponse({
    status: 201,
    description: '预算配置成功',
    type: BudgetResponseDto,
  })
  async configureBudget(
    @Body() dto: ConfigureBudgetDto,
  ): Promise<ProxyApiResponse<BudgetResponseDto>> {
    const budget = await this.costMonitoringService.configureBudget(dto);
    const usagePercentage =
      (budget.spentAmount / budget.budgetAmount) * 100;

    return ProxyApiResponse.success(
      {
        ...budget,
        usagePercentage,
      } as any,
      'Budget configured',
    );
  }

  /**
   * 获取成本统计
   */
  @Post('statistics')
  @RequirePermission('proxy.cost.stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询成本统计',
    description: '获取指定时间范围内的成本统计数据，支持多种分组方式',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: CostStatisticsResponseDto,
  })
  async getCostStatistics(
    @Body() dto: CostStatisticsQueryDto,
  ): Promise<ProxyApiResponse<CostStatisticsResponseDto>> {
    const stats = await this.costMonitoringService.getCostStatistics({
      userId: dto.userId,
      deviceId: dto.deviceId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      groupBy: dto.groupBy as any,
    });

    return ProxyApiResponse.success(stats as any);
  }

  /**
   * 查询用户预算
   */
  @Get('budget/user/:userId')
  @RequirePermission('proxy.cost.budget')
  @ApiOperation({
    summary: '查询用户预算',
    description: '获取用户的所有预算配置',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({
    name: 'budgetType',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
    description: '预算类型（可选）',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [BudgetResponseDto],
  })
  async getUserBudgets(
    @Param('userId') userId: string,
    @Query('budgetType') budgetType?: string,
  ): Promise<ProxyApiResponse<BudgetResponseDto[]>> {
    // TODO: 实现查询逻辑
    return ProxyApiResponse.success([]);
  }

  /**
   * 查询成本告警
   */
  @Get('alerts/user/:userId')
  @RequirePermission('proxy.cost.alerts')
  @ApiOperation({
    summary: '查询成本告警',
    description: '获取用户的成本告警列表',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({
    name: 'acknowledged',
    required: false,
    type: Boolean,
    description: '是否只查询已确认的告警',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [CostAlertResponseDto],
  })
  async getCostAlerts(
    @Param('userId') userId: string,
    @Query('acknowledged') acknowledged?: boolean,
  ): Promise<ProxyApiResponse<CostAlertResponseDto[]>> {
    // TODO: 实现查询逻辑
    return ProxyApiResponse.success([]);
  }

  /**
   * 确认成本告警
   */
  @Put('alerts/:alertId/acknowledge')
  @RequirePermission('proxy.cost.alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '确认告警',
    description: '标记告警为已确认',
  })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  @ApiResponse({
    status: 200,
    description: '确认成功',
  })
  async acknowledgeCostAlert(
    @Param('alertId') alertId: string,
  ): Promise<ProxyApiResponse<{ acknowledged: boolean }>> {
    // TODO: 实现确认逻辑
    return ProxyApiResponse.success(
      { acknowledged: true },
      'Alert acknowledged',
    );
  }

  /**
   * 获取成本优化建议
   */
  @Get('optimization/:userId')
  @RequirePermission('proxy.cost.optimize')
  @ApiOperation({
    summary: '成本优化建议',
    description: '基于历史数据分析，提供成本优化建议',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: CostOptimizationResponseDto,
  })
  async getCostOptimization(
    @Param('userId') userId: string,
  ): Promise<ProxyApiResponse<CostOptimizationResponseDto>> {
    const recommendations =
      await this.costMonitoringService.getCostOptimizationRecommendations(
        userId,
      );
    return ProxyApiResponse.success(recommendations as any);
  }

  /**
   * 获取实时成本仪表盘
   */
  @Get('dashboard/:userId')
  @RequirePermission('proxy.cost.dashboard')
  @ApiOperation({
    summary: '成本仪表盘',
    description: '获取用户的实时成本仪表盘数据',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async getCostDashboard(
    @Param('userId') userId: string,
  ): Promise<
    ProxyApiResponse<{
      currentMonthCost: number;
      todayCost: number;
      budgets: BudgetResponseDto[];
      recentAlerts: CostAlertResponseDto[];
      topExpensiveProxies: any[];
      costTrend: any[];
    }>
  > {
    // TODO: 实现仪表盘数据聚合逻辑
    const endDate = new Date();
    const startOfMonth = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      1,
    );
    const startOfToday = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );

    const [monthStats, todayStats] = await Promise.all([
      this.costMonitoringService.getCostStatistics({
        userId,
        startDate: startOfMonth,
        endDate,
        groupBy: 'day',
      }),
      this.costMonitoringService.getCostStatistics({
        userId,
        startDate: startOfToday,
        endDate,
      }),
    ]);

    return ProxyApiResponse.success({
      currentMonthCost: monthStats.totalCost,
      todayCost: todayStats.totalCost,
      budgets: [],
      recentAlerts: [],
      topExpensiveProxies: [],
      costTrend: monthStats.timeline || [],
    });
  }
}
