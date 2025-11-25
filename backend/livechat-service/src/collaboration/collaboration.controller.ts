import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/jwt.strategy';
import { CollaborationService } from './collaboration.service';
import {
  InviteCollaboratorDto,
  RespondInvitationDto,
  LeaveCollaborationDto,
  UpdateCollaboratorRoleDto,
  SendInternalMessageDto,
  MarkMessagesReadDto,
  QueryCollaborationsDto,
  QueryInternalMessagesDto,
} from './dto';

@ApiTags('Collaboration')
@ApiBearerAuth()
@Controller('collaborations')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ========== Collaboration Management ==========

  @Post('invite')
  @ApiOperation({ summary: '邀请客服协同' })
  async inviteCollaborator(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InviteCollaboratorDto,
  ) {
    const tenantId = req.user.tenantId;
    const inviterId = req.user.agentId || req.user.sub;
    return this.collaborationService.inviteCollaborator(tenantId, dto, inviterId);
  }

  @Post('respond')
  @ApiOperation({ summary: '响应协同邀请' })
  async respondToInvitation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RespondInvitationDto,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    return this.collaborationService.respondToInvitation(tenantId, dto, agentId);
  }

  @Post('leave')
  @ApiOperation({ summary: '退出协同' })
  async leaveCollaboration(
    @Request() req: AuthenticatedRequest,
    @Body() dto: LeaveCollaborationDto,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    return this.collaborationService.leaveCollaboration(tenantId, dto, agentId);
  }

  @Put('role')
  @ApiOperation({ summary: '更新协同角色' })
  async updateCollaboratorRole(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateCollaboratorRoleDto,
  ) {
    const tenantId = req.user.tenantId;
    const requesterId = req.user.agentId || req.user.sub;
    return this.collaborationService.updateCollaboratorRole(tenantId, dto, requesterId);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: '获取会话协同者列表' })
  async getCollaborators(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.collaborationService.getCollaborators(tenantId, conversationId);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的协同列表' })
  async getMyCollaborations(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryCollaborationsDto,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    return this.collaborationService.getMyCollaborations(tenantId, agentId, query);
  }

  @Get('pending')
  @ApiOperation({ summary: '获取待处理的邀请' })
  async getPendingInvitations(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    return this.collaborationService.getPendingInvitations(tenantId, agentId);
  }

  // ========== Internal Messages ==========

  @Post('messages')
  @ApiOperation({ summary: '发送内部消息' })
  async sendInternalMessage(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendInternalMessageDto,
  ) {
    const tenantId = req.user.tenantId;
    const senderId = req.user.agentId || req.user.sub;
    return this.collaborationService.sendInternalMessage(tenantId, dto, senderId);
  }

  @Get('messages')
  @ApiOperation({ summary: '获取内部消息' })
  async getInternalMessages(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryInternalMessagesDto,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    return this.collaborationService.getInternalMessages(tenantId, query, agentId);
  }

  @Post('messages/read')
  @ApiOperation({ summary: '标记消息已读' })
  async markMessagesAsRead(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MarkMessagesReadDto,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    await this.collaborationService.markMessagesAsRead(tenantId, dto.messageIds, agentId);
    return { success: true };
  }

  // ========== Helper Endpoints ==========

  @Get('check/:conversationId')
  @ApiOperation({ summary: '检查是否为协同者' })
  async checkCollaborator(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const tenantId = req.user.tenantId;
    const agentId = req.user.agentId || req.user.sub;
    const isCollaborator = await this.collaborationService.isCollaborator(
      tenantId,
      conversationId,
      agentId,
    );
    const canSendMessage = await this.collaborationService.canSendMessage(
      tenantId,
      conversationId,
      agentId,
    );
    return { isCollaborator, canSendMessage };
  }
}
