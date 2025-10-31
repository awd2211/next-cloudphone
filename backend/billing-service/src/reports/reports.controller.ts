import { Controller, Get, Query, Param, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('bills/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '生成用户账单报表', description: '生成指定用户的账单报表' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiQuery({ name: 'startDate', description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', description: '结束日期（ISO 8601）' })
  @ApiResponse({ status: 200, description: '生成成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUserBillReport(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.reportsService.generateUserBillReport(userId, start, end);
    return {
      success: true,
      data: report,
    };
  }

  @Get('revenue')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '生成收入统计报表', description: '生成指定时间段的收入统计报表' })
  @ApiQuery({ name: 'startDate', description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID（可选）' })
  @ApiResponse({ status: 200, description: '生成成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tenantId') tenantId?: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.reportsService.generateRevenueReport(start, end, tenantId);
    return {
      success: true,
      data: report,
    };
  }

  @Get('usage-trend')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '生成使用趋势报表', description: '生成资源使用趋势分析报表' })
  @ApiQuery({ name: 'startDate', description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID（可选）' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID（可选）' })
  @ApiResponse({ status: 200, description: '生成成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUsageTrendReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.reportsService.generateUsageTrendReport(start, end, userId, tenantId);
    return {
      success: true,
      data: report,
    };
  }

  @Get('bills/:userId/export')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '导出用户账单', description: '导出用户账单为 Excel 文件' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiQuery({ name: 'startDate', description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', description: '结束日期（ISO 8601）' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: '导出格式（excel/csv）',
    example: 'excel',
  })
  @ApiResponse({ status: 200, description: '导出成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async exportUserBill(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: string = 'excel',
    @Res() res: Response
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.reportsService.generateUserBillReport(userId, start, end);

    const fileName = `bill_${userId}_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;

    if (format === 'csv' && report.orders) {
      const filePath = await this.reportsService.exportToCSV(report.orders, fileName, [
        { id: 'id', title: 'Order ID' },
        { id: 'amount', title: 'Amount' },
        { id: 'status', title: 'Status' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'paidAt', title: 'Paid At' },
      ]);
      res.download(filePath);
    } else {
      const filePath = await this.reportsService.exportToExcel(report, fileName);
      res.download(filePath);
    }
  }

  @Get('revenue/export')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '导出收入报表', description: '导出收入统计报表为 Excel 文件' })
  @ApiQuery({ name: 'startDate', description: '开始日期（ISO 8601）' })
  @ApiQuery({ name: 'endDate', description: '结束日期（ISO 8601）' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID（可选）' })
  @ApiResponse({ status: 200, description: '导出成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async exportRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tenantId') tenantId: string | undefined,
    @Res() res: Response
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.reportsService.generateRevenueReport(start, end, tenantId);

    const fileName = `revenue_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    const filePath = await this.reportsService.exportToExcel(report, fileName);

    res.download(filePath);
  }

  @Get('plans/stats')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取套餐统计', description: '获取所有套餐的订单和收入统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPlanStats() {
    const stats = await this.reportsService.getPlanStats();
    return {
      success: true,
      data: stats,
    };
  }
}
