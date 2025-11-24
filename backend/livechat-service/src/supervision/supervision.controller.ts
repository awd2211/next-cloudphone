/**
 * 会话监听/插话控制器
 *
 * 仅限主管和管理员使用
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { SupervisionService } from './supervision.service';
import {
  StartSupervisionDto,
  WhisperMessageDto,
  BargeMessageDto,
  SupervisionMode,
} from './dto';

@ApiTags('livechat/supervision')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor', 'admin')
@Controller('livechat/supervision')
export class SupervisionController {
  constructor(private readonly supervisionService: SupervisionService) {}

  @Post(':conversationId/start')
  @ApiOperation({ summary: '开始监听会话' })
  @ApiResponse({ status: 201, description: '开始监听成功' })
  async startSupervision(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: StartSupervisionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.supervisionService.startSupervision(
      conversationId,
      user.userId,
      user.username,
      dto.mode,
      user.tenantId,
    );
  }

  @Delete(':conversationId/stop')
  @ApiOperation({ summary: '停止监听会话' })
  @ApiResponse({ status: 200, description: '停止监听成功' })
  async stopSupervision(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.supervisionService.stopSupervision(
      conversationId,
      user.userId,
      user.tenantId,
    );
    return { success: true };
  }

  @Get(':conversationId')
  @ApiOperation({ summary: '获取监听状态' })
  @ApiResponse({ status: 200, description: '返回监听状态' })
  async getSupervisionSession(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.supervisionService.getSupervisionSession(conversationId, user.userId);
  }

  @Get(':conversationId/supervisors')
  @ApiOperation({ summary: '获取会话的所有监督者' })
  @ApiResponse({ status: 200, description: '返回监督者列表' })
  async getConversationSupervisors(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.supervisionService.getConversationSupervisors(conversationId);
  }

  @Post(':conversationId/whisper')
  @ApiOperation({ summary: '发送悄悄话（仅客服可见）' })
  @ApiResponse({ status: 201, description: '悄悄话发送成功' })
  async sendWhisper(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: WhisperMessageDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.supervisionService.sendWhisper(
      conversationId,
      user.userId,
      user.username,
      dto.content,
      user.tenantId,
    );
  }

  @Post(':conversationId/barge')
  @ApiOperation({ summary: '发送插话（所有人可见）' })
  @ApiResponse({ status: 201, description: '插话发送成功' })
  async sendBarge(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: BargeMessageDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.supervisionService.sendBarge(
      conversationId,
      user.userId,
      user.username,
      dto.content,
      user.tenantId,
    );
  }

  @Post(':conversationId/mode/:mode')
  @ApiOperation({ summary: '切换监听模式' })
  @ApiResponse({ status: 200, description: '模式切换成功' })
  async changeMode(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Param('mode') mode: SupervisionMode,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.supervisionService.changeSuperVisionMode(
      conversationId,
      user.userId,
      mode,
      user.tenantId,
    );
  }

  @Get('my/sessions')
  @ApiOperation({ summary: '获取我正在监听的所有会话' })
  @ApiResponse({ status: 200, description: '返回监听会话列表' })
  async getMySessions(@CurrentUser() user: CurrentUserData) {
    return this.supervisionService.getSupervisorSessions(user.userId);
  }
}
