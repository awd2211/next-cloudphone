import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TicketsService } from './tickets.service';
import {
  CreateTicketFromConversationDto,
  AddTicketCommentDto,
  UpdateTicketStatusDto,
  CreateTicketLinkDto,
  QueryTicketLinksDto,
  CreateTicketTemplateDto,
  UpdateTicketTemplateDto,
  QueryTicketTemplatesDto,
} from './dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ========== Ticket Conversion ==========

  @Post('convert')
  @ApiOperation({ summary: '将会话转为工单' })
  async createTicketFromConversation(
    @Body() dto: CreateTicketFromConversationDto,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.ticketsService.createTicketFromConversation(
      (req as any).user.tenantId,
      dto,
      (req as any).user.sub,
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

  @Post(':id/comments')
  @ApiOperation({ summary: '添加工单评论' })
  async addTicketComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketCommentDto,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const success = await this.ticketsService.addTicketComment(
      (req as any).user.tenantId,
      id,
      dto,
      (req as any).user.sub,
      token,
    );
    return { success };
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新工单状态' })
  async updateTicketStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const success = await this.ticketsService.updateTicketStatus(
      (req as any).user.tenantId,
      id,
      dto,
      token,
    );
    return { success };
  }

  // ========== Ticket Links ==========

  @Post('links')
  @ApiOperation({ summary: '创建会话-工单关联' })
  async createLink(
    @Body() dto: CreateTicketLinkDto,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.ticketsService.createLink(
      (req as any).user.tenantId,
      dto,
      (req as any).user.sub,
      token,
    );
  }

  @Get('links')
  @ApiOperation({ summary: '获取关联列表' })
  async getLinks(
    @Query() query: QueryTicketLinksDto,
    @Req() req: Request,
  ) {
    return this.ticketsService.getLinks((req as any).user.tenantId, query);
  }

  @Get('links/:id')
  @ApiOperation({ summary: '获取关联详情' })
  async getLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.ticketsService.getLink((req as any).user.tenantId, id);
  }

  @Get('conversation/:conversationId/links')
  @ApiOperation({ summary: '获取会话的所有关联工单' })
  async getConversationLinks(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Req() req: Request,
  ) {
    return this.ticketsService.getConversationLinks(
      (req as any).user.tenantId,
      conversationId,
    );
  }

  @Delete('links/:id')
  @ApiOperation({ summary: '删除关联' })
  async removeLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.ticketsService.removeLink((req as any).user.tenantId, id);
    return { success: true };
  }

  // ========== Ticket Templates ==========

  @Post('templates')
  @ApiOperation({ summary: '创建工单模板' })
  async createTemplate(
    @Body() dto: CreateTicketTemplateDto,
    @Req() req: Request,
  ) {
    return this.ticketsService.createTemplate(
      (req as any).user.tenantId,
      dto,
      (req as any).user.sub,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: '获取模板列表' })
  async getTemplates(
    @Query() query: QueryTicketTemplatesDto,
    @Req() req: Request,
  ) {
    return this.ticketsService.getTemplates((req as any).user.tenantId, query);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取模板详情' })
  async getTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.ticketsService.getTemplate((req as any).user.tenantId, id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: '更新模板' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketTemplateDto,
    @Req() req: Request,
  ) {
    return this.ticketsService.updateTemplate(
      (req as any).user.tenantId,
      id,
      dto,
    );
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除模板' })
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.ticketsService.deleteTemplate((req as any).user.tenantId, id);
    return { success: true };
  }

  // ========== Statistics ==========

  @Get('stats')
  @ApiOperation({ summary: '获取工单集成统计' })
  async getStats(@Req() req: Request) {
    return this.ticketsService.getStats((req as any).user.tenantId);
  }
}
