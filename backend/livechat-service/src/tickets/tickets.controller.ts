import { Controller, Post, Get, Param, Body, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { TicketsService, CreateTicketRequest } from './tickets.service';

@ApiTags('livechat/tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: '从会话创建工单' })
  async createTicket(
    @Body() request: CreateTicketRequest,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.ticketsService.createTicketFromConversation(
      request,
      user.userId,
      user.tenantId,
      token,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工单信息' })
  async getTicketInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.ticketsService.getTicketInfo(id, token);
  }
}
