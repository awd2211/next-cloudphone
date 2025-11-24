import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BotService } from './bot.service';
import {
  CreateBotDto,
  UpdateBotDto,
  CreateIntentDto,
  UpdateIntentDto,
  BotMessageDto,
  TransferToAgentDto,
  BotFeedbackDto,
  QueryBotsDto,
  QueryBotConversationsDto,
} from './dto';

@ApiTags('Bot')
@ApiBearerAuth()
@Controller('bot')
@UseGuards(JwtAuthGuard)
export class BotController {
  constructor(private readonly botService: BotService) {}

  // ========== Bot Management ==========

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '创建机器人' })
  async createBot(@Request() req, @Body() dto: CreateBotDto) {
    return this.botService.createBot(req.user.tenantId, dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: '获取机器人列表' })
  async getBots(@Request() req, @Query() query: QueryBotsDto) {
    return this.botService.getBots(req.user.tenantId, query);
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认机器人' })
  async getDefaultBot(@Request() req) {
    return this.botService.getDefaultBot(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机器人详情' })
  async getBot(@Request() req, @Param('id') id: string) {
    return this.botService.getBot(req.user.tenantId, id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '更新机器人' })
  async updateBot(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateBotDto,
  ) {
    return this.botService.updateBot(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '删除机器人' })
  async deleteBot(@Request() req, @Param('id') id: string) {
    return this.botService.deleteBot(req.user.tenantId, id);
  }

  // ========== Intent Management ==========

  @Post(':botId/intents')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '创建意图' })
  async createIntent(
    @Request() req,
    @Param('botId') botId: string,
    @Body() dto: CreateIntentDto,
  ) {
    return this.botService.createIntent(req.user.tenantId, botId, dto);
  }

  @Get(':botId/intents')
  @ApiOperation({ summary: '获取意图列表' })
  async getIntents(@Request() req, @Param('botId') botId: string) {
    return this.botService.getIntents(req.user.tenantId, botId);
  }

  @Put('intents/:intentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '更新意图' })
  async updateIntent(
    @Request() req,
    @Param('intentId') intentId: string,
    @Body() dto: UpdateIntentDto,
  ) {
    return this.botService.updateIntent(req.user.tenantId, intentId, dto);
  }

  @Delete('intents/:intentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '删除意图' })
  async deleteIntent(@Request() req, @Param('intentId') intentId: string) {
    return this.botService.deleteIntent(req.user.tenantId, intentId);
  }

  // ========== Bot Interaction ==========

  @Post('message')
  @ApiOperation({ summary: '发送消息给机器人' })
  async sendMessage(@Request() req, @Body() dto: BotMessageDto) {
    return this.botService.processMessage(req.user.tenantId, dto, req.user.sub);
  }

  @Get('welcome')
  @ApiOperation({ summary: '获取欢迎消息' })
  async getWelcomeMessage(@Request() req) {
    return this.botService.getWelcomeMessage(req.user.tenantId);
  }

  @Post('transfer')
  @ApiOperation({ summary: '转人工客服' })
  async transferToAgent(@Request() req, @Body() dto: TransferToAgentDto) {
    await this.botService.transferToAgent(req.user.tenantId, dto);
    return { success: true };
  }

  // ========== Bot Conversations ==========

  @Get('conversations')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '获取机器人会话列表' })
  async getBotConversations(
    @Request() req,
    @Query() query: QueryBotConversationsDto,
  ) {
    return this.botService.getBotConversations(req.user.tenantId, query);
  }

  @Post('conversations/:id/feedback')
  @ApiOperation({ summary: '提交机器人服务反馈' })
  async submitFeedback(@Request() req, @Body() dto: BotFeedbackDto) {
    await this.botService.submitFeedback(req.user.tenantId, dto);
    return { success: true };
  }

  @Post('conversations/:id/resolve')
  @ApiOperation({ summary: '标记为机器人解决' })
  async markAsResolved(@Request() req, @Param('id') id: string) {
    await this.botService.markAsResolved(req.user.tenantId, id);
    return { success: true };
  }

  // ========== Statistics ==========

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '获取机器人统计数据' })
  async getBotStats(@Request() req, @Query('botId') botId?: string) {
    return this.botService.getBotStats(req.user.tenantId, botId);
  }
}
