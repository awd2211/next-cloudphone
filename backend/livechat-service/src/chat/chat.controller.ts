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
import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';
import { ConversationStatus } from '../entities/conversation.entity';
import { MessageSender } from '../entities/message.entity';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ========== 会话接口 ==========

  @Post('conversations')
  @ApiOperation({ summary: '创建新会话' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.createConversation(dto, user.userId, user.tenantId);
  }

  @Get('conversations')
  @ApiOperation({ summary: '获取用户会话列表' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  async getUserConversations(@CurrentUser() user: CurrentUserData) {
    return this.chatService.getUserConversations(user.userId, user.tenantId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: '获取会话详情' })
  @ApiResponse({ status: 200, description: '返回会话详情' })
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.getConversation(id, user.tenantId);
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: '更新会话' })
  @ApiResponse({ status: 200, description: '会话更新成功' })
  async updateConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.updateConversation(id, dto, user.tenantId);
  }

  @Post('conversations/:id/close')
  @ApiOperation({ summary: '关闭会话' })
  @ApiResponse({ status: 200, description: '会话已关闭' })
  async closeConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.closeConversation(id, user.tenantId);
  }

  @Post('conversations/:id/assign')
  @ApiOperation({ summary: '分配客服' })
  @ApiResponse({ status: 200, description: '客服分配成功' })
  async assignAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('agentId', ParseUUIDPipe) agentId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.assignAgent(id, agentId, user.tenantId);
  }

  @Post('conversations/:id/transfer')
  @ApiOperation({ summary: '转接会话' })
  @ApiResponse({ status: 200, description: '会话转接成功' })
  async transferConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('toAgentId', ParseUUIDPipe) toAgentId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.transferConversation(id, toAgentId, reason, user.tenantId);
  }

  // ========== 消息接口 ==========

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 201, description: '消息发送成功' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // 根据用户角色确定发送者类型
    const sender = user.roles.includes('agent') ? MessageSender.AGENT : MessageSender.USER;

    return this.chatService.sendMessage(
      id,
      { ...dto, sender, senderName: user.username },
      user.userId,
      user.tenantId,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '获取消息列表' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const beforeDate = before ? new Date(before) : undefined;
    return this.chatService.getMessages(id, user.tenantId, limit, beforeDate);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: '标记会话已读' })
  @ApiResponse({ status: 200, description: '已标记为已读' })
  async markConversationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.chatService.markConversationRead(id, user.userId);
    return { success: true };
  }

  // ========== 客服接口 ==========

  @Get('agent/conversations')
  @ApiOperation({ summary: '获取客服的会话列表' })
  @ApiResponse({ status: 200, description: '返回客服会话列表' })
  @ApiQuery({ name: 'status', required: false, enum: ConversationStatus })
  async getAgentConversations(
    @Query('status') status?: ConversationStatus,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.getAgentConversations(user.userId, user.tenantId, status);
  }

  // ========== 统计接口 ==========

  @Get('stats/waiting')
  @ApiOperation({ summary: '获取等待中的会话数' })
  @ApiResponse({ status: 200, description: '返回等待数' })
  async getWaitingCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.chatService.getWaitingCount(user.tenantId);
    return { count };
  }

  @Get('stats/active')
  @ApiOperation({ summary: '获取进行中的会话数' })
  @ApiResponse({ status: 200, description: '返回活跃数' })
  async getActiveCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.chatService.getActiveCount(user.tenantId, user.userId);
    return { count };
  }
}
