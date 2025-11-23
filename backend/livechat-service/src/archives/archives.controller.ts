import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ArchivesService } from './archives.service';

@ApiTags('livechat/archives')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取归档统计' })
  async getArchiveStats(@CurrentUser() user: CurrentUserData) {
    return this.archivesService.getArchiveStats(user.tenantId);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索归档消息' })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchArchives(
    @Query('conversationId') conversationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.archivesService.searchArchives(user!.tenantId, {
      conversationId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });
  }

  @Get(':conversationId')
  @ApiOperation({ summary: '获取会话归档消息' })
  async getArchivedMessages(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    return this.archivesService.getArchivedMessages(conversationId);
  }

  @Post(':conversationId/archive')
  @ApiOperation({ summary: '归档会话' })
  async archiveConversation(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    const count = await this.archivesService.archiveConversation(conversationId);
    return { success: true, archivedCount: count };
  }
}
