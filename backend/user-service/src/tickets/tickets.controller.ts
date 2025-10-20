import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  TicketsService,
  CreateTicketDto,
  CreateReplyDto,
  UpdateTicketDto,
} from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TicketStatus, TicketPriority, TicketCategory } from './entities/ticket.entity';
import { ReplyType } from './entities/ticket-reply.entity';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * 创建工单
   */
  @Post()
  @ApiOperation({ summary: '创建工单' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createTicket(@Body() dto: CreateTicketDto) {
    this.logger.log(`创建工单 - 用户: ${dto.userId}, 主题: ${dto.subject}`);
    return await this.ticketsService.createTicket(dto);
  }

  /**
   * 获取工单详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取工单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTicket(@Param('id') id: string) {
    return await this.ticketsService.getTicket(id);
  }

  /**
   * 获取用户工单列表
   */
  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户工单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserTickets(
    @Param('userId') userId: string,
    @Query('status') status?: TicketStatus,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.ticketsService.getUserTickets(userId, {
      status,
      category,
      priority,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * 获取所有工单（管理员）
   */
  @Get()
  @Roles('admin', 'support')
  @ApiOperation({ summary: '获取所有工单（管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllTickets(
    @Query('status') status?: TicketStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.ticketsService.getAllTickets({
      status,
      assignedTo,
      priority,
      category,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * 更新工单
   */
  @Put(':id')
  @Roles('admin', 'support')
  @ApiOperation({ summary: '更新工单' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    this.logger.log(`更新工单 - ID: ${id}`);
    return await this.ticketsService.updateTicket(id, dto);
  }

  /**
   * 添加回复
   */
  @Post(':id/replies')
  @ApiOperation({ summary: '添加工单回复' })
  @ApiResponse({ status: 201, description: '回复成功' })
  async addReply(
    @Param('id') id: string,
    @Body() dto: Omit<CreateReplyDto, 'ticketId'>,
  ) {
    this.logger.log(`添加工单回复 - 工单ID: ${id}`);
    return await this.ticketsService.addReply({ ...dto, ticketId: id });
  }

  /**
   * 获取工单回复列表
   */
  @Get(':id/replies')
  @ApiOperation({ summary: '获取工单回复列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTicketReplies(
    @Param('id') id: string,
    @Query('includeInternal') includeInternal?: boolean,
  ) {
    return await this.ticketsService.getTicketReplies(id, includeInternal);
  }

  /**
   * 工单评分
   */
  @Post(':id/rate')
  @ApiOperation({ summary: '工单评分' })
  @ApiResponse({ status: 200, description: '评分成功' })
  async rateTicket(
    @Param('id') id: string,
    @Body() body: { rating: number; feedback?: string },
  ) {
    this.logger.log(`工单评分 - ID: ${id}, 评分: ${body.rating}`);
    return await this.ticketsService.rateTicket(id, body.rating, body.feedback);
  }

  /**
   * 获取工单统计
   */
  @Get('statistics/overview')
  @ApiOperation({ summary: '获取工单统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatistics(@Query('userId') userId?: string) {
    return await this.ticketsService.getTicketStatistics(userId);
  }
}
