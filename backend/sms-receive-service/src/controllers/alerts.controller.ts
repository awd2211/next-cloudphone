import { Controller, Get, Post, Param, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

/**
 * SMS 告警管理控制器
 */
@ApiTags('SMS告警')
@ApiBearerAuth()
@Controller('sms/alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  // 内存中模拟告警数据
  private alerts: any[] = [
    {
      id: '1',
      type: 'provider_down',
      level: 'critical',
      title: '供应商离线',
      message: '5sim.net 供应商连接超时',
      source: '5sim',
      status: 'active',
      createdAt: new Date(Date.now() - 3600000),
      acknowledgedAt: null,
      resolvedAt: null,
      metadata: { responseTime: 30000, errorCode: 'ETIMEDOUT' },
    },
    {
      id: '2',
      type: 'low_balance',
      level: 'warning',
      title: '余额不足',
      message: 'smsactivate.org 余额低于阈值',
      source: 'smsactivate',
      status: 'acknowledged',
      createdAt: new Date(Date.now() - 7200000),
      acknowledgedAt: new Date(Date.now() - 3600000),
      resolvedAt: null,
      metadata: { balance: 5.32, threshold: 10 },
    },
  ];

  /**
   * 获取告警列表
   */
  @Get()
  @RequirePermission('sms.alerts.view')
  @ApiOperation({ summary: '获取SMS告警列表' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选 (active, acknowledged, resolved)' })
  @ApiQuery({ name: 'level', required: false, description: '级别筛选 (info, warning, critical)' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  async getAlerts(
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    let filtered = [...this.alerts];

    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (level) {
      filtered = filtered.filter(a => a.level === level);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      summary: {
        active: this.alerts.filter(a => a.status === 'active').length,
        acknowledged: this.alerts.filter(a => a.status === 'acknowledged').length,
        resolved: this.alerts.filter(a => a.status === 'resolved').length,
      },
    };
  }

  /**
   * 确认告警
   */
  @Post(':alertId/acknowledge')
  @RequirePermission('sms.alerts.manage')
  @ApiOperation({ summary: '确认告警' })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, message: '告警不存在' };
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();

    this.logger.log(`Alert ${alertId} acknowledged`);
    return { success: true, message: '告警已确认', alert };
  }

  /**
   * 解决告警
   */
  @Post(':alertId/resolve')
  @RequirePermission('sms.alerts.manage')
  @ApiOperation({ summary: '解决告警' })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { note?: string },
  ) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, message: '告警不存在' };
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    if (body.note) {
      alert.resolveNote = body.note;
    }

    this.logger.log(`Alert ${alertId} resolved`);
    return { success: true, message: '告警已解决', alert };
  }
}
