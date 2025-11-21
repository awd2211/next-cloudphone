import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Logger, Request } from '@nestjs/common';
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
   * 获取当前用户的工单列表
   * 注意：此路由必须在 :id 路由之前定义
   */
  @Get('my')
  @ApiOperation({ summary: '获取我的工单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMyTickets(
    @Request() req: any,
    @Query('status') status?: TicketStatus,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    const userId = req.user?.sub || req.user?.userId;
    if (!userId) {
      throw new Error('用户未认证');
    }

    // 支持 page/pageSize 或 limit/offset 参数
    let finalLimit: number | undefined;
    let finalOffset: number | undefined;
    let currentPage: number;
    let itemsPerPage: number;

    if (page !== undefined || pageSize !== undefined) {
      currentPage = Number(page) || 1;
      itemsPerPage = Number(pageSize) || Number(limit) || 10;
      finalLimit = itemsPerPage;
      finalOffset = (currentPage - 1) * itemsPerPage;
    } else {
      finalLimit = limit ? Number(limit) : 10;
      finalOffset = offset ? Number(offset) : 0;
      itemsPerPage = finalLimit;
      currentPage = Math.floor(finalOffset / finalLimit) + 1;
    }

    const { tickets, total } = await this.ticketsService.getUserTickets(userId, {
      status,
      category,
      priority,
      limit: finalLimit,
      offset: finalOffset,
    });

    return {
      items: tickets,
      total,
      page: currentPage,
      pageSize: itemsPerPage,
    };
  }

  /**
   * 获取当前用户的工单统计
   * 注意：此路由必须在 :id 路由之前定义
   */
  @Get('my/stats')
  @ApiOperation({ summary: '获取我的工单统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMyTicketStats(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    if (!userId) {
      throw new Error('用户未认证');
    }
    return await this.ticketsService.getTicketStatistics(userId);
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
    @Query('offset') offset?: number
  ) {
    const { tickets, total } = await this.ticketsService.getUserTickets(userId, {
      status,
      category,
      priority,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return {
      success: true,
      data: tickets,
      total,
    };
  }

  /**
   * 获取所有工单（管理员）
   * 支持 page/pageSize 和 limit/offset 两种分页模式
   */
  @Get()
  @Roles('admin', 'support')
  @ApiOperation({ summary: '获取所有工单（管理员 - 支持分页）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllTickets(
    @Query('status') status?: TicketStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    // 支持 page/pageSize 或 limit/offset 参数
    let finalLimit: number | undefined;
    let finalOffset: number | undefined;
    let currentPage: number;
    let itemsPerPage: number;

    if (page !== undefined || pageSize !== undefined) {
      // 使用 page/pageSize 模式
      currentPage = page || 1;
      itemsPerPage = pageSize || limit || 20;
      finalLimit = itemsPerPage;
      finalOffset = (currentPage - 1) * itemsPerPage;
    } else {
      // 使用 limit/offset 模式（兼容旧版）
      finalLimit = limit ? Number(limit) : 20;
      finalOffset = offset ? Number(offset) : 0;
      itemsPerPage = finalLimit;
      currentPage = Math.floor(finalOffset / finalLimit) + 1;
    }

    const { tickets, total } = await this.ticketsService.getAllTickets({
      status,
      assignedTo,
      priority,
      category,
      limit: finalLimit,
      offset: finalOffset,
    });

    return {
      success: true,
      data: tickets,
      total,
      page: currentPage,
      pageSize: itemsPerPage,
    };
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
  async addReply(@Param('id') id: string, @Body() dto: Omit<CreateReplyDto, 'ticketId'>) {
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
    @Query('includeInternal') includeInternal?: boolean
  ) {
    return await this.ticketsService.getTicketReplies(id, includeInternal);
  }

  /**
   * 工单评分
   */
  @Post(':id/rate')
  @ApiOperation({ summary: '工单评分' })
  @ApiResponse({ status: 200, description: '评分成功' })
  async rateTicket(@Param('id') id: string, @Body() body: { rating: number; feedback?: string }) {
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
