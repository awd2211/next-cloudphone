import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { AgentStatus } from '../entities/agent.entity';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ========== 客服管理 ==========

  @Get()
  @ApiOperation({ summary: '获取客服列表' })
  @ApiQuery({ name: 'status', required: false, enum: AgentStatus })
  async listAgents(
    @Query('status') status?: AgentStatus,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.agentsService.listAgents(user!.tenantId, status);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可用客服' })
  @ApiQuery({ name: 'groupId', required: false })
  async getAvailableAgents(
    @Query('groupId') groupId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.agentsService.getAvailableAgents(user!.tenantId, groupId);
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前客服信息' })
  async getCurrentAgent(@CurrentUser() user: CurrentUserData) {
    return this.agentsService.getAgentByUserId(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客服详情' })
  async getAgent(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getAgent(id);
  }

  @Post()
  @ApiOperation({ summary: '创建客服' })
  async createAgent(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.agentsService.createAgent({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客服信息' })
  async updateAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.agentsService.updateAgent(id, data);
  }

  @Put('me/status')
  @ApiOperation({ summary: '更新客服状态' })
  async updateMyStatus(
    @Body('status') status: AgentStatus,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.agentsService.updateAgentStatus(user.userId, status);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取客服统计' })
  async getAgentStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getAgentStats(id);
  }

  // ========== 客服分组 ==========

  @Get('groups/list')
  @ApiOperation({ summary: '获取分组列表' })
  async listGroups(@CurrentUser() user: CurrentUserData) {
    return this.agentsService.listGroups(user.tenantId);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: '获取分组详情' })
  async getGroup(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getGroup(id);
  }

  @Post('groups')
  @ApiOperation({ summary: '创建分组' })
  async createGroup(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.agentsService.createGroup({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Put('groups/:id')
  @ApiOperation({ summary: '更新分组' })
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.agentsService.updateGroup(id, data);
  }

  // ========== 快捷回复 ==========

  @Get('canned-responses/list')
  @ApiOperation({ summary: '获取快捷回复列表' })
  async listCannedResponses(@CurrentUser() user: CurrentUserData) {
    return this.agentsService.listCannedResponses(user.tenantId, user.userId);
  }

  @Post('canned-responses')
  @ApiOperation({ summary: '创建快捷回复' })
  async createCannedResponse(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.agentsService.createCannedResponse({
      ...data,
      tenantId: user.tenantId,
      agentId: user.userId,
    });
  }

  @Post('canned-responses/:id/use')
  @ApiOperation({ summary: '使用快捷回复' })
  async useCannedResponse(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.useCannedResponse(id);
  }
}
