/**
 * SLA 预警系统控制器
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { SlaService } from './sla.service';
import { CreateSlaRuleDto, UpdateSlaRuleDto, QuerySlaAlertsDto } from './dto';

@ApiTags('livechat/sla')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  // ========== 规则管理 ==========

  @Post('rules')
  @UseGuards(RolesGuard)
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: '创建 SLA 规则' })
  @ApiResponse({ status: 201, description: '规则创建成功' })
  async createRule(
    @Body() dto: CreateSlaRuleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.slaService.createRule(dto, user.tenantId);
  }

  @Get('rules')
  @ApiOperation({ summary: '获取 SLA 规则列表' })
  @ApiResponse({ status: 200, description: '返回规则列表' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getRules(
    @CurrentUser() user: CurrentUserData,
    @Query('isActive') isActive?: string,
  ) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.slaService.getRules(user.tenantId, active);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: '获取 SLA 规则详情' })
  @ApiResponse({ status: 200, description: '返回规则详情' })
  async getRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.slaService.getRule(id, user.tenantId);
  }

  @Put('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: '更新 SLA 规则' })
  @ApiResponse({ status: 200, description: '规则更新成功' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlaRuleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.slaService.updateRule(id, dto, user.tenantId);
  }

  @Delete('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: '删除 SLA 规则' })
  @ApiResponse({ status: 200, description: '规则删除成功' })
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.slaService.deleteRule(id, user.tenantId);
    return { success: true };
  }

  // ========== 告警管理 ==========

  @Get('alerts')
  @ApiOperation({ summary: '获取告警列表' })
  @ApiResponse({ status: 200, description: '返回告警列表' })
  async getAlerts(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QuerySlaAlertsDto,
  ) {
    return this.slaService.getAlerts(user.tenantId, query);
  }

  @Get('alerts/active')
  @ApiOperation({ summary: '获取活跃告警列表' })
  @ApiResponse({ status: 200, description: '返回活跃告警列表' })
  async getActiveAlerts(@CurrentUser() user: CurrentUserData) {
    return this.slaService.getActiveAlerts(user.tenantId);
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: '确认告警' })
  @ApiResponse({ status: 200, description: '告警已确认' })
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.slaService.acknowledgeAlert(id, user.userId, user.tenantId);
  }

  @Post('alerts/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: '解决告警' })
  @ApiResponse({ status: 200, description: '告警已解决' })
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.slaService.resolveAlert(id, user.tenantId);
  }

  // ========== 统计 ==========

  @Get('stats')
  @ApiOperation({ summary: '获取 SLA 统计' })
  @ApiResponse({ status: 200, description: '返回 SLA 统计数据' })
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.slaService.getSlaStats(user.tenantId);
  }
}
