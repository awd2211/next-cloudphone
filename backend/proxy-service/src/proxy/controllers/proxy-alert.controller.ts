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
import { ProxyAlertService } from '../services/proxy-alert.service';
import {
  CreateAlertChannelDto,
  UpdateAlertChannelDto,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  AlertStatisticsDto,
  TestAlertChannelDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理告警管理控制器
 *
 * 提供告警通道、规则、历史记录管理功能
 */
@ApiTags('Proxy Alert Management')
@Controller('proxy/alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyAlertController {
  constructor(private readonly alertService: ProxyAlertService) {}

  // ==================== 告警通道管理 ====================

  /**
   * 创建告警通道
   */
  @Post('channels')
  @RequirePermission('proxy.alert.channel.create')
  @ApiOperation({
    summary: '创建告警通道',
    description: '创建新的告警通知通道（Email, SMS, Webhook等）',
  })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createChannel(
    @Request() req: any,
    @Body() dto: CreateAlertChannelDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const channel = await this.alertService.createChannel({
      ...dto,
      userId,
    });

    return ProxyApiResponse.success(channel, 'Alert channel created');
  }

  /**
   * 获取告警通道列表
   */
  @Get('channels')
  @RequirePermission('proxy.alert.channel.read')
  @ApiOperation({
    summary: '告警通道列表',
    description: '获取所有告警通道',
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getChannels(@Request() req: any): Promise<ProxyApiResponse<any[]>> {
    const userId = req.user.sub;
    const channels = await this.alertService.getUserChannels(userId);
    return ProxyApiResponse.success(channels);
  }

  /**
   * 获取通道详情
   */
  @Get('channels/:channelId')
  @RequirePermission('proxy.alert.channel.read')
  @ApiOperation({ summary: '通道详情' })
  @ApiParam({ name: 'channelId', description: '通道ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getChannel(
    @Param('channelId') channelId: string,
  ): Promise<ProxyApiResponse<any>> {
    const channel = await this.alertService.getChannel(channelId);
    return ProxyApiResponse.success(channel);
  }

  /**
   * 更新告警通道
   */
  @Put('channels/:channelId')
  @RequirePermission('proxy.alert.channel.update')
  @ApiOperation({ summary: '更新告警通道' })
  @ApiParam({ name: 'channelId', description: '通道ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateChannel(
    @Param('channelId') channelId: string,
    @Body() dto: UpdateAlertChannelDto,
  ): Promise<ProxyApiResponse<any>> {
    const channel = await this.alertService.updateChannel(channelId, dto as any);
    return ProxyApiResponse.success(channel, 'Channel updated');
  }

  /**
   * 删除告警通道
   */
  @Delete('channels/:channelId')
  @RequirePermission('proxy.alert.channel.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除告警通道' })
  @ApiParam({ name: 'channelId', description: '通道ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async deleteChannel(@Param('channelId') channelId: string): Promise<void> {
    await this.alertService.deleteChannel(channelId);
  }

  /**
   * 测试告警通道
   */
  @Post('channels/:channelId/test')
  @RequirePermission('proxy.alert.channel.test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试告警通道' })
  @ApiParam({ name: 'channelId', description: '通道ID' })
  @ApiResponse({ status: 200, description: '测试完成' })
  async testChannel(
    @Param('channelId') channelId: string,
    @Body() dto: TestAlertChannelDto,
  ): Promise<ProxyApiResponse<any>> {
    const result = await this.alertService.testChannel(channelId, dto.testMessage);
    return ProxyApiResponse.success(result);
  }

  // ==================== 告警规则管理 ====================

  /**
   * 创建告警规则
   */
  @Post('rules')
  @RequirePermission('proxy.alert.rule.create')
  @ApiOperation({
    summary: '创建告警规则',
    description: '创建新的告警触发规则',
  })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createRule(
    @Request() req: any,
    @Body() dto: CreateAlertRuleDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const rule = await this.alertService.createRule({
      ...dto,
      userId,
    });

    return ProxyApiResponse.success(rule, 'Alert rule created');
  }

  /**
   * 获取告警规则列表
   */
  @Get('rules')
  @RequirePermission('proxy.alert.rule.read')
  @ApiOperation({ summary: '告警规则列表' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: '仅返回启用的规则',
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getRules(
    @Request() req: any,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ProxyApiResponse<any[]>> {
    const userId = req.user.sub;

    const rules = activeOnly === 'true'
      ? await this.alertService.getActiveRules(userId)
      : await this.alertService.getUserRules(userId);

    return ProxyApiResponse.success(rules);
  }

  /**
   * 获取规则详情
   */
  @Get('rules/:ruleId')
  @RequirePermission('proxy.alert.rule.read')
  @ApiOperation({ summary: '规则详情' })
  @ApiParam({ name: 'ruleId', description: '规则ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getRule(@Param('ruleId') ruleId: string): Promise<ProxyApiResponse<any>> {
    const rule = await this.alertService.getRule(ruleId);
    return ProxyApiResponse.success(rule);
  }

  /**
   * 更新告警规则
   */
  @Put('rules/:ruleId')
  @RequirePermission('proxy.alert.rule.update')
  @ApiOperation({ summary: '更新告警规则' })
  @ApiParam({ name: 'ruleId', description: '规则ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ): Promise<ProxyApiResponse<any>> {
    const rule = await this.alertService.updateRule(ruleId, dto as any);
    return ProxyApiResponse.success(rule, 'Rule updated');
  }

  /**
   * 删除告警规则
   */
  @Delete('rules/:ruleId')
  @RequirePermission('proxy.alert.rule.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除告警规则' })
  @ApiParam({ name: 'ruleId', description: '规则ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async deleteRule(@Param('ruleId') ruleId: string): Promise<void> {
    await this.alertService.deleteRule(ruleId);
  }

  // ==================== 告警历史管理 ====================

  /**
   * 获取告警历史
   */
  @Get('history')
  @RequirePermission('proxy.alert.history.read')
  @ApiOperation({ summary: '告警历史列表' })
  @ApiQuery({ name: 'deviceId', required: false, description: '设备ID' })
  @ApiQuery({ name: 'ruleId', required: false, description: '规则ID' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选（逗号分隔）' })
  @ApiQuery({ name: 'alertLevel', required: false, description: '告警级别筛选（逗号分隔）' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '查询天数', schema: { default: 7 } })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量', schema: { default: 100 } })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getAlertHistory(
    @Request() req: any,
    @Query('deviceId') deviceId?: string,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
    @Query('alertLevel') alertLevel?: string,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ): Promise<ProxyApiResponse<any[]>> {
    const userId = req.user.sub;

    const daysNum = days ? parseInt(days.toString()) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const alerts = await this.alertService.getAlertHistory({
      userId,
      deviceId,
      ruleId,
      status: status ? status.split(',') : undefined,
      alertLevel: alertLevel ? alertLevel.split(',') : undefined,
      startDate,
      endDate: new Date(),
      limit: limit ? parseInt(limit.toString()) : 100,
    });

    return ProxyApiResponse.success(alerts);
  }

  /**
   * 确认告警
   */
  @Post('history/:alertId/acknowledge')
  @RequirePermission('proxy.alert.acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认告警' })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  @ApiResponse({ status: 200, description: '确认成功' })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<ProxyApiResponse<any>> {
    const acknowledgedBy = req.user.sub;

    const alert = await this.alertService.acknowledgeAlert(
      alertId,
      acknowledgedBy,
      dto.note,
    );

    return ProxyApiResponse.success(alert, 'Alert acknowledged');
  }

  /**
   * 解决告警
   */
  @Post('history/:alertId/resolve')
  @RequirePermission('proxy.alert.resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解决告警' })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  @ApiResponse({ status: 200, description: '解决成功' })
  async resolveAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
  ): Promise<ProxyApiResponse<any>> {
    const resolvedBy = req.user.sub;

    const alert = await this.alertService.resolveAlert(
      alertId,
      resolvedBy,
      dto.resolutionNote,
    );

    return ProxyApiResponse.success(alert, 'Alert resolved');
  }

  /**
   * 获取告警统计
   */
  @Get('statistics')
  @RequirePermission('proxy.alert.stats')
  @ApiOperation({ summary: '告警统计' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '统计天数', schema: { default: 7 } })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: AlertStatisticsDto,
  })
  async getStatistics(
    @Request() req: any,
    @Query('days') days?: number,
  ): Promise<ProxyApiResponse<AlertStatisticsDto>> {
    const userId = req.user.sub;
    const daysNum = days ? parseInt(days.toString()) : 7;

    const stats = await this.alertService.getAlertStatistics(userId, daysNum);

    return ProxyApiResponse.success(stats as any);
  }
}
