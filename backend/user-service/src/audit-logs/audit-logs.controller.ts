import { Controller, Get, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
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
@Controller('audit-logs')
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
      success: true,
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
}
