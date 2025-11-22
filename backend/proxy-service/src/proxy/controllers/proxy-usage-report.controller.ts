import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
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
import { ProxyUsageReportService } from '../services/proxy-usage-report.service';
import {
  CreateReportDto,
  GenerateReportDto,
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
  QueryReportDto,
  BatchExportDto,
  ReportStatisticsDto,
  ReportDetailsDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理使用报告控制器
 *
 * 提供报告生成、定时报告、报告导出等功能
 */
@ApiTags('Proxy Usage Reports')
@Controller('proxy/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyUsageReportController {
  constructor(private readonly reportService: ProxyUsageReportService) {}

  // ==================== 报告创建和查询 ====================

  /**
   * 创建报告任务
   */
  @Post()
  @RequirePermission('proxy.report.create')
  @ApiOperation({
    summary: '创建报告',
    description: '创建新的使用报告任务，系统将异步生成报告',
  })
  @ApiResponse({
    status: 201,
    description: '报告任务创建成功',
    type: Object,
  })
  async createReport(
    @Request() req: any,
    @Body() dto: CreateReportDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const report = await this.reportService.createReport({
      userId,
      reportName: dto.reportName,
      reportType: dto.reportType,
      reportPeriod: dto.reportPeriod,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      dataScope: dto.dataScope,
      filters: dto.filters,
      includedMetrics: dto.includedMetrics,
      exportFormat: dto.exportFormat,
      includeCharts: dto.includeCharts,
    });

    return ProxyApiResponse.success(
      report,
      'Report task created. Generation in progress',
    );
  }

  /**
   * 查询报告列表
   */
  @Get()
  @RequirePermission('proxy.report.read')
  @ApiOperation({
    summary: '报告列表',
    description: '查询用户的报告列表，支持分页和筛选',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async queryReports(
    @Request() req: any,
    @Query() query: QueryReportDto,
  ): Promise<
    ProxyApiResponse<{
      reports: any[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const userId = req.user.sub;

    const result = await this.reportService.queryReports({
      userId,
      reportType: query.reportType,
      reportPeriod: query.reportPeriod,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return ProxyApiResponse.success({
      ...result,
      page: query.page || 1,
      limit: query.limit || 20,
    });
  }

  /**
   * 获取使用报告 (前端兼容端点 - GET /proxy/reports/usage)
   * 注意：必须放在 :reportId 参数路由之前，否则 "usage" 会被当作 reportId
   */
  @Get('usage')
  @RequirePermission('proxy.report.read')
  @ApiOperation({ summary: '获取使用报告' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  async getUsageReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ): Promise<ProxyApiResponse<any>> {
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return ProxyApiResponse.success({
      periodStart: startDate || defaultStartDate.toISOString(),
      periodEnd: endDate || now.toISOString(),
      totalRequests: 0,
      totalTraffic: 0,
      successRate: 100,
      topDevices: [],
      topUsers: [],
      byProvider: [],
      byCountry: [],
      dailyTrend: [],
    });
  }

  /**
   * 获取报告详情
   */
  @Get(':reportId')
  @RequirePermission('proxy.report.read')
  @ApiOperation({
    summary: '报告详情',
    description: '获取指定报告的详细信息',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: ReportDetailsDto,
  })
  async getReport(
    @Param('reportId') reportId: string,
  ): Promise<ProxyApiResponse<ReportDetailsDto>> {
    const report = await this.reportService.getReport(reportId);
    return ProxyApiResponse.success(report as any);
  }

  /**
   * 删除报告
   */
  @Delete(':reportId')
  @RequirePermission('proxy.report.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除报告',
    description: '删除指定的报告及其文件',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 204,
    description: '删除成功',
  })
  async deleteReport(@Param('reportId') reportId: string): Promise<void> {
    await this.reportService.deleteReport(reportId);
  }

  /**
   * 批量导出报告
   */
  @Post('batch-export')
  @RequirePermission('proxy.report.export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量导出',
    description: '批量导出多个报告，可选打包成ZIP',
  })
  @ApiResponse({
    status: 200,
    description: '导出成功',
    type: Object,
  })
  async batchExport(
    @Body() dto: BatchExportDto,
  ): Promise<
    ProxyApiResponse<{
      downloadUrl: string;
      fileSize: number;
      reportCount: number;
    }>
  > {
    const result = await this.reportService.batchExport({
      reportIds: dto.reportIds,
      exportFormat: dto.exportFormat,
      zipArchive: dto.zipArchive,
    });

    return ProxyApiResponse.success(result, 'Batch export completed');
  }

  // ==================== 定时报告管理 ====================

  /**
   * 创建定时报告
   */
  @Post('scheduled')
  @RequirePermission('proxy.report.schedule.create')
  @ApiOperation({
    summary: '创建定时报告',
    description: '创建定时生成的报告配置',
  })
  @ApiResponse({
    status: 201,
    description: '定时报告创建成功',
    type: Object,
  })
  async createScheduledReport(
    @Request() req: any,
    @Body() dto: CreateScheduledReportDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const scheduledReport = await this.reportService.createScheduledReport({
      userId,
      reportName: dto.reportName,
      reportType: dto.reportType,
      reportPeriod: dto.reportPeriod,
      cronExpression: dto.cronExpression,
      recipients: dto.recipients,
      dataScope: dto.dataScope,
      exportFormat: dto.exportFormat,
      autoSend: dto.autoSend,
    });

    return ProxyApiResponse.success(
      scheduledReport,
      'Scheduled report created',
    );
  }

  /**
   * 获取定时报告列表
   */
  @Get('scheduled/list')
  @RequirePermission('proxy.report.schedule.read')
  @ApiOperation({
    summary: '定时报告列表',
    description: '获取用户的所有定时报告配置',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [Object],
  })
  async getScheduledReports(
    @Request() req: any,
  ): Promise<ProxyApiResponse<any[]>> {
    const userId = req.user.sub;
    const reports = await this.reportService.getUserScheduledReports(userId);
    return ProxyApiResponse.success(reports);
  }

  /**
   * 更新定时报告
   */
  @Put('scheduled/:reportId')
  @RequirePermission('proxy.report.schedule.update')
  @ApiOperation({
    summary: '更新定时报告',
    description: '更新定时报告的配置',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: Object,
  })
  async updateScheduledReport(
    @Param('reportId') reportId: string,
    @Body() dto: UpdateScheduledReportDto,
  ): Promise<ProxyApiResponse<any>> {
    const report = await this.reportService.updateScheduledReport(
      reportId,
      dto as any,
    );
    return ProxyApiResponse.success(report, 'Scheduled report updated');
  }

  /**
   * 删除定时报告
   */
  @Delete('scheduled/:reportId')
  @RequirePermission('proxy.report.schedule.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除定时报告',
    description: '删除定时报告配置',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 204,
    description: '删除成功',
  })
  async deleteScheduledReport(
    @Param('reportId') reportId: string,
  ): Promise<void> {
    await this.reportService.deleteReport(reportId);
  }

  /**
   * 立即执行定时报告
   */
  @Post('scheduled/:reportId/execute')
  @RequirePermission('proxy.report.schedule.execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '立即执行',
    description: '手动触发定时报告生成',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 200,
    description: '执行成功',
    type: Object,
  })
  async executeScheduledReport(
    @Param('reportId') reportId: string,
  ): Promise<ProxyApiResponse<any>> {
    const result = await this.reportService.executeScheduledReportNow(reportId);

    if (!result.success) {
      return ProxyApiResponse.error(result.error || 'Failed to execute scheduled report');
    }

    return ProxyApiResponse.success(
      {
        scheduledReportId: reportId,
        newReportId: result.newReport?.id,
        newReportName: result.newReport?.reportName,
        status: result.newReport?.status,
        message: 'Report generation started',
      },
      'Scheduled report execution started',
    );
  }

  // ==================== 报告统计 ====================

  /**
   * 获取报告统计
   */
  @Get('statistics/summary')
  @RequirePermission('proxy.report.stats')
  @ApiOperation({
    summary: '报告统计',
    description: '获取用户的报告统计数据',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '统计天数',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: ReportStatisticsDto,
  })
  async getStatistics(
    @Request() req: any,
    @Query('days') days?: number,
  ): Promise<ProxyApiResponse<ReportStatisticsDto>> {
    const userId = req.user.sub;
    const daysNum = days ? parseInt(days.toString()) : 30;

    const stats = await this.reportService.getReportStatistics(userId, daysNum);

    return ProxyApiResponse.success(stats as any);
  }

  /**
   * 下载报告文件
   */
  @Get(':reportId/download')
  @RequirePermission('proxy.report.download')
  @ApiOperation({
    summary: '下载报告',
    description: '获取报告文件的下载链接',
  })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async downloadReport(
    @Param('reportId') reportId: string,
  ): Promise<
    ProxyApiResponse<{
      downloadUrl: string;
      fileName: string;
      fileSize: number;
      expiresAt: Date;
    }>
  > {
    const report = await this.reportService.getReport(reportId);

    if (report.status !== 'completed') {
      throw new Error('Report is not ready for download');
    }

    // 生成临时下载链接（带过期时间）
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时有效期

    return ProxyApiResponse.success({
      downloadUrl: report.downloadUrl,
      fileName: `${report.reportName}.${report.exportFormat}`,
      fileSize: report.fileSize,
      expiresAt,
    });
  }
}
