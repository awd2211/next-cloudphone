import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { QualityService } from './quality.service';
import { ReviewStatus } from '../entities/quality-review.entity';

@ApiTags('livechat/quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  // ========== 质检 ==========

  @Get('reviews')
  @ApiOperation({ summary: '获取质检列表' })
  async listReviews(
    @Query('status') status?: ReviewStatus,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.qualityService.listReviews(user!.tenantId, status);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: '获取质检详情' })
  async getReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.qualityService.getReview(id);
  }

  @Post('reviews')
  @ApiOperation({ summary: '创建质检' })
  async createReview(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.qualityService.createReview({
      ...data,
      tenantId: user.tenantId,
      reviewerId: user.userId,
      reviewerName: user.username,
    });
  }

  @Put('reviews/:id')
  @ApiOperation({ summary: '更新质检' })
  async updateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.qualityService.updateReview(id, data);
  }

  @Get('reviews/agent/:agentId')
  @ApiOperation({ summary: '获取客服的质检记录' })
  async getAgentReviews(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.qualityService.getReviewsByAgent(agentId);
  }

  // ========== 满意度评价 ==========

  @Post('ratings')
  @ApiOperation({ summary: '提交满意度评价' })
  async createRating(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.qualityService.createRating({
      ...data,
      tenantId: user.tenantId,
      userId: user.userId,
    });
  }

  @Get('ratings/:conversationId')
  @ApiOperation({ summary: '获取会话评价' })
  async getConversationRating(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    return this.qualityService.getConversationRating(conversationId);
  }

  // ========== 敏感词 ==========

  @Get('sensitive-words')
  @ApiOperation({ summary: '获取敏感词列表' })
  async listSensitiveWords(@CurrentUser() user: CurrentUserData) {
    return this.qualityService.listSensitiveWords(user.tenantId);
  }

  @Post('sensitive-words')
  @ApiOperation({ summary: '添加敏感词' })
  async createSensitiveWord(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.qualityService.createSensitiveWord({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Delete('sensitive-words/:id')
  @ApiOperation({ summary: '删除敏感词' })
  async deleteSensitiveWord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.qualityService.deleteSensitiveWord(id, user.tenantId);
    return { success: true };
  }

  @Post('check')
  @ApiOperation({ summary: '检测敏感词' })
  async checkSensitiveWords(
    @Body('content') content: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.qualityService.checkSensitiveWords(content, user.tenantId);
  }
}
