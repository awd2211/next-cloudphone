import { Controller, Get, Post, Delete, Query, Param, Body, UseGuards, Logger, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditAction, AuditLevel } from '../entities/audit-log.entity';
import { GetUserLogsDto } from './dto/get-user-logs.dto';
import { SearchLogsDto } from './dto/search-logs.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')  // 修改路径以匹配前端 API 调用
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * 获取用户审计日志
   */
  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户审计日志' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserLogs(
    @Param('userId') userId: string,
    @Query() query: GetUserLogsDto
  ) {
    return await this.auditLogsService.getUserLogs(userId, {
      action: query.action,
      resourceType: query.resourceType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * 获取资源的审计日志
   */
  @Get('resource/:resourceType/:resourceId')
  @ApiOperation({ summary: '获取资源的审计日志' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getResourceLogs(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: number
  ) {
    return await this.auditLogsService.getResourceLogs(
      resourceType,
      resourceId,
      limit ? Number(limit) : 50
    );
  }

  /**
   * 获取审计日志列表（根路径）
   * 前端主要调用此端点
   */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '获取审计日志列表（支持分页和过滤）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAuditLogs(@Query() query: SearchLogsDto) {
    return this.searchLogs(query);
  }

  /**
   * 搜索审计日志（管理员）
   */
  @Get('search')
  @Roles('admin')
  @ApiOperation({ summary: '搜索审计日志（管理员 - 支持分页）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async searchLogs(@Query() query: SearchLogsDto) {
    // 支持 page/pageSize 或 limit/offset 参数
    let limit: number;
    let offset: number;

    if (query.page !== undefined || query.pageSize !== undefined) {
      // 使用 page/pageSize 模式
      const page = query.page || 1;
      const pageSize = query.pageSize || query.limit || 20;
      limit = pageSize;
      offset = (page - 1) * pageSize;
    } else {
      // 使用 limit/offset 模式（兼容旧版）
      limit = query.limit || 20;
      offset = query.offset || 0;
    }

    const result = await this.auditLogsService.searchLogs({
      userId: query.userId,
      action: query.action,
      level: query.level,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      ipAddress: query.ipAddress,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      success: query.success,
      limit,
      offset,
    });

    // 计算 page 和 pageSize 用于返回
    const page = Math.floor(offset / limit) + 1;
    const pageSize = limit;

    return {
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
    };
  }

  /**
   * 获取统计信息
   */
  @Get('statistics')
  @Roles('admin')
  @ApiOperation({ summary: '获取审计日志统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatistics(@Query('userId') userId?: string) {
    return await this.auditLogsService.getStatistics(userId);
  }

  /**
   * 导出审计日志
   */
  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: '导出审计日志为 CSV' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportLogs(
    @Query() query: SearchLogsDto,
    @Res() res: Response
  ) {
    this.logger.log('导出审计日志');

    const csvData = await this.auditLogsService.exportLogs({
      userId: query.userId,
      action: query.action,
      level: query.level,
      resourceType: query.resourceType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      success: query.success,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csvData);
  }

  /**
   * 清理旧的审计日志
   * 修改为 POST 方法以匹配前端期望
   */
  @Post('clean')
  @HttpCode(200)
  @Roles('admin')
  @ApiOperation({ summary: '清理指定天数之前的审计日志' })
  @ApiResponse({ status: 200, description: '清理成功' })
  async cleanupLogs(@Body('days') days?: number) {
    const daysToKeep = days || 90; // 默认保留90天
    this.logger.log(`清理 ${daysToKeep} 天之前的审计日志`);

    const deletedCount = await this.auditLogsService.cleanupOldLogs(daysToKeep);

    return {
      data: {
        deletedCount,
        daysKept: daysToKeep,
      },
      message: `成功清理 ${deletedCount} 条审计日志`,
    };
  }

  /**
   * 获取单条审计日志详情
   */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: '获取单条审计日志详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '日志未找到' })
  async getLogById(@Param('id') id: string) {
    return await this.auditLogsService.getLogById(id);
  }
}
