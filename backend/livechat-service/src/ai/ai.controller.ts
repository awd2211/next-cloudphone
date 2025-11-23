import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('livechat/ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成 AI 回复' })
  async generateResponse(
    @Body() data: {
      message: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
      context?: Record<string, any>;
    },
  ) {
    return this.aiService.generateResponse(data.message, data.history, data.context);
  }

  @Post('classify')
  @ApiOperation({ summary: '意图分类' })
  async classifyIntent(@Body() data: { message: string }) {
    return this.aiService.classifyIntent(data.message);
  }

  @Post('suggest')
  @ApiOperation({ summary: '推荐快捷回复' })
  async suggestCannedResponse(
    @Body() data: { message: string; cannedResponses: string[] },
  ) {
    return this.aiService.suggestCannedResponse(data.message, data.cannedResponses);
  }
}
