import { Controller, Get, Query, UseGuards, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

/**
 * SMS 审计日志控制器
 */
@ApiTags('SMS审计日志')
@ApiBearerAuth()
@Controller('sms/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);

  // 模拟审计日志数据
  private auditLogs: any[] = [
    {
      id: '1',
      action: 'number_request',
      userId: 'user-1',
      username: 'admin',
      targetType: 'virtual_number',
      targetId: 'vn-12345',
      description: '请求虚拟号码',
      details: { provider: '5sim', service: 'google', country: 'russia' },
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      action: 'provider_config_update',
      userId: 'user-1',
      username: 'admin',
      targetType: 'provider_config',
      targetId: 'smsactivate',
      description: '更新供应商配置',
      details: { field: 'priority', oldValue: 1, newValue: 2 },
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      status: 'success',
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: '3',
      action: 'number_cancel',
      userId: 'user-2',
      username: 'operator',
      targetType: 'virtual_number',
      targetId: 'vn-12346',
      description: '取消虚拟号码',
      details: { reason: 'timeout', refund: 0.5 },
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0',
      status: 'success',
      createdAt: new Date(Date.now() - 10800000),
    },
  ];

  /**
   * 获取审计日志列表
   */
  @Get()
  @RequirePermission('sms.audit.view')
  @ApiOperation({ summary: '获取SMS审计日志' })
  @ApiQuery({ name: 'action', required: false, description: '操作类型' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID' })
  @ApiQuery({ name: 'targetType', required: false, description: '目标类型' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('targetType') targetType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    let filtered = [...this.auditLogs];

    if (action) {
      filtered = filtered.filter(log => log.action === action);
    }
    if (userId) {
      filtered = filtered.filter(log => log.userId === userId);
    }
    if (targetType) {
      filtered = filtered.filter(log => log.targetType === targetType);
    }
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => new Date(log.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(log => new Date(log.createdAt) <= end);
    }

    // 按时间倒序
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 导出审计日志
   */
  @Get('export')
  @RequirePermission('sms.audit.export')
  @ApiOperation({ summary: '导出SMS审计日志' })
  @ApiQuery({ name: 'format', required: false, description: '导出格式 (csv, json)', example: 'csv' })
  async exportAuditLogs(
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="sms-audit-logs.json"');
      return res.send(JSON.stringify(this.auditLogs, null, 2));
    }

    // CSV 格式
    const headers = ['ID', 'Action', 'User', 'Target Type', 'Target ID', 'Description', 'Status', 'Created At'];
    const rows = this.auditLogs.map(log => [
      log.id,
      log.action,
      log.username,
      log.targetType,
      log.targetId,
      log.description,
      log.status,
      log.createdAt,
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sms-audit-logs.csv"');
    return res.send(csv);
  }
}
