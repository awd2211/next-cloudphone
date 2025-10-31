import { Controller, Get, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditAction, AuditLevel } from '../entities/audit-log.entity';

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
    @Query('action') action?: AuditAction,
    @Query('resourceType') resourceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return await this.auditLogsService.getUserLogs(userId, {
      action,
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
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
  @ApiOperation({ summary: '搜索审计日志（管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async searchLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('level') level?: AuditLevel,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('success') success?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return await this.auditLogsService.searchLogs({
      userId,
      action,
      level,
      resourceType,
      resourceId,
      ipAddress,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      success,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
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
