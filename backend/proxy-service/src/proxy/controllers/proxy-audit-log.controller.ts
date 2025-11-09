import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
import { ProxyAuditLogService } from '../services/proxy-audit-log.service';
import {
  CreateAuditLogDto,
  QueryAuditLogDto,
  QuerySensitiveAuditLogDto,
  ExportAuditLogDto,
  ApproveSensitiveAccessDto,
  AuditLogStatisticsDto,
  AuditLogDetailsDto,
  UserActivityAnalysisDto,
  SystemAuditSummaryDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理审计日志控制器
 *
 * 提供审计日志记录、查询、统计分析等功能
 */
@ApiTags('Proxy Audit Logs')
@Controller('proxy/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyAuditLogController {
  constructor(private readonly auditLogService: ProxyAuditLogService) {}

  // ==================== 审计日志记录和查询 ====================

  /**
   * 创建审计日志
   */
  @Post()
  @RequirePermission('proxy.audit.create')
  @ApiOperation({
    summary: '创建审计日志',
    description: '手动创建审计日志记录（通常系统自动记录）',
  })
  @ApiResponse({
    status: 201,
    description: '审计日志创建成功',
    type: Object,
  })
  async createAuditLog(
    @Request() req: any,
    @Body() dto: CreateAuditLogDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const log = await this.auditLogService.createAuditLog({
      userId,
      deviceId: dto.deviceId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      details: dto.details,
      requestData: dto.requestData,
      responseData: dto.responseData,
      ipAddress: dto.ipAddress || req.ip,
      userAgent: dto.userAgent || req.headers['user-agent'],
      riskLevel: dto.riskLevel,
      success: true,
    });

    return ProxyApiResponse.success(log, 'Audit log created');
  }

  /**
   * 查询审计日志
   */
  @Get()
  @RequirePermission('proxy.audit.read')
  @ApiOperation({
    summary: '审计日志列表',
    description: '查询审计日志，支持多条件过滤和分页',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async queryAuditLogs(
    @Request() req: any,
    @Query() query: QueryAuditLogDto,
  ): Promise<
    ProxyApiResponse<{
      logs: any[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const result = await this.auditLogService.queryAuditLogs({
      userId: query.userId,
      deviceId: query.deviceId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      riskLevel: query.riskLevel,
      success: query.success,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ProxyApiResponse.success({
      ...result,
      page: query.page || 1,
      limit: query.limit || 50,
    });
  }

  /**
   * 获取审计日志详情
   */
  @Get(':logId')
  @RequirePermission('proxy.audit.read')
  @ApiOperation({
    summary: '审计日志详情',
    description: '获取指定审计日志的详细信息',
  })
  @ApiParam({ name: 'logId', description: '审计日志ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: AuditLogDetailsDto,
  })
  async getAuditLog(
    @Param('logId') logId: string,
  ): Promise<ProxyApiResponse<AuditLogDetailsDto>> {
    const log = await this.auditLogService.getAuditLog(logId);
    return ProxyApiResponse.success(log as any);
  }

  // ==================== 敏感审计日志管理 ====================

  /**
   * 查询敏感审计日志
   */
  @Get('sensitive/list')
  @RequirePermission('proxy.audit.sensitive.read')
  @ApiOperation({
    summary: '敏感审计日志列表',
    description: '查询敏感数据访问审计日志（需要高级权限）',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async querySensitiveLogs(
    @Request() req: any,
    @Query() query: QuerySensitiveAuditLogDto,
  ): Promise<
    ProxyApiResponse<{
      logs: any[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const requestUserId = req.user.sub;

    const result = await this.auditLogService.querySensitiveAuditLogs(
      requestUserId,
      {
        userId: query.userId,
        action: query.action,
        dataType: query.dataType,
        accessPurpose: query.accessPurpose,
        requiresApproval: query.requiresApproval,
        approvalStatus: query.approvalStatus,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        page: query.page,
        limit: query.limit,
      },
    );

    return ProxyApiResponse.success({
      ...result,
      page: query.page || 1,
      limit: query.limit || 50,
    });
  }

  /**
   * 获取敏感审计日志详情（含解密）
   */
  @Get('sensitive/:logId')
  @RequirePermission('proxy.audit.sensitive.decrypt')
  @ApiOperation({
    summary: '敏感日志详情',
    description: '获取敏感审计日志详情，包含解密后的数据（需要最高权限）',
  })
  @ApiParam({ name: 'logId', description: '敏感日志ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async getSensitiveLogDetails(
    @Request() req: any,
    @Param('logId') logId: string,
  ): Promise<ProxyApiResponse<any>> {
    const requestUserId = req.user.sub;

    const log = await this.auditLogService.getSensitiveAuditLogDetails(
      requestUserId,
      logId,
    );

    return ProxyApiResponse.success(log);
  }

  /**
   * 审批敏感日志访问
   */
  @Put('sensitive/:logId/approve')
  @RequirePermission('proxy.audit.sensitive.approve')
  @ApiOperation({
    summary: '审批敏感访问',
    description: '审批或拒绝敏感数据访问申请',
  })
  @ApiParam({ name: 'logId', description: '敏感日志ID' })
  @ApiResponse({
    status: 200,
    description: '审批成功',
    type: Object,
  })
  async approveSensitiveAccess(
    @Request() req: any,
    @Param('logId') logId: string,
    @Body() dto: ApproveSensitiveAccessDto,
  ): Promise<ProxyApiResponse<any>> {
    const approverId = req.user.sub;

    const log = await this.auditLogService.approveSensitiveAccess(
      approverId,
      logId,
      dto.decision as 'approve' | 'reject',
      dto.approvalNote,
    );

    return ProxyApiResponse.success(
      log,
      `Sensitive access ${dto.decision}d`,
    );
  }

  // ==================== 统计分析 ====================

  /**
   * 审计日志统计
   */
  @Get('statistics/summary')
  @RequirePermission('proxy.audit.stats')
  @ApiOperation({
    summary: '审计统计',
    description: '获取审计日志的统计数据和趋势分析',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: '用户ID（不提供则统计全部）',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '统计天数',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: AuditLogStatisticsDto,
  })
  async getStatistics(
    @Query('userId') userId?: string,
    @Query('days') days?: number,
  ): Promise<ProxyApiResponse<AuditLogStatisticsDto>> {
    const daysNum = days ? parseInt(days.toString()) : 7;
    const stats = await this.auditLogService.getAuditLogStatistics(
      userId,
      daysNum,
    );

    return ProxyApiResponse.success(stats as any);
  }

  /**
   * 用户活动分析
   */
  @Get('users/:userId/activity')
  @RequirePermission('proxy.audit.user-activity')
  @ApiOperation({
    summary: '用户活动分析',
    description: '分析指定用户的活动模式和行为特征',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '分析天数',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: '分析成功',
    type: UserActivityAnalysisDto,
  })
  async analyzeUserActivity(
    @Param('userId') userId: string,
    @Query('days') days?: number,
  ): Promise<ProxyApiResponse<UserActivityAnalysisDto>> {
    const daysNum = days ? parseInt(days.toString()) : 30;
    const analysis = await this.auditLogService.analyzeUserActivity(
      userId,
      daysNum,
    );

    return ProxyApiResponse.success(analysis as any);
  }

  /**
   * 系统审计摘要
   */
  @Get('system/summary')
  @RequirePermission('proxy.audit.system-summary')
  @ApiOperation({
    summary: '系统审计摘要',
    description: '获取整个系统的审计摘要和合规性报告',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '统计天数',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: SystemAuditSummaryDto,
  })
  async getSystemSummary(
    @Query('days') days?: number,
  ): Promise<ProxyApiResponse<SystemAuditSummaryDto>> {
    const daysNum = days ? parseInt(days.toString()) : 7;
    const summary = await this.auditLogService.getSystemAuditSummary(daysNum);

    return ProxyApiResponse.success(summary as any);
  }

  // ==================== 导出功能 ====================

  /**
   * 导出审计日志
   */
  @Post('export')
  @RequirePermission('proxy.audit.export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '导出审计日志',
    description: '导出审计日志到CSV、JSON或Excel格式',
  })
  @ApiResponse({
    status: 200,
    description: '导出成功',
    type: Object,
  })
  async exportAuditLogs(
    @Body() dto: ExportAuditLogDto,
  ): Promise<
    ProxyApiResponse<{
      downloadUrl: string;
      fileSize: number;
      recordCount: number;
    }>
  > {
    const result = await this.auditLogService.exportAuditLogs({
      userId: dto.userId,
      action: dto.action,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      exportFormat: dto.exportFormat,
      includeFields: dto.includeFields,
    });

    return ProxyApiResponse.success(result, 'Audit logs exported');
  }

  /**
   * 获取我的审计日志
   */
  @Get('my-logs/list')
  @RequirePermission('proxy.audit.my-logs')
  @ApiOperation({
    summary: '我的审计日志',
    description: '获取当前用户的审计日志',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async getMyAuditLogs(
    @Request() req: any,
    @Query() query: QueryAuditLogDto,
  ): Promise<
    ProxyApiResponse<{
      logs: any[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const userId = req.user.sub;

    const result = await this.auditLogService.queryAuditLogs({
      userId, // 强制只查询当前用户的日志
      action: query.action,
      resourceType: query.resourceType,
      riskLevel: query.riskLevel,
      success: query.success,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return ProxyApiResponse.success({
      ...result,
      page: query.page || 1,
      limit: query.limit || 50,
    });
  }
}