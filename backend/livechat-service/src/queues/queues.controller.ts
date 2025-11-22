import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { QueuesService } from './queues.service';

@ApiTags('queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  // ========== 排队配置 ==========

  @Get('configs')
  @ApiOperation({ summary: '获取排队配置列表' })
  async listConfigs(@CurrentUser() user: CurrentUserData) {
    return this.queuesService.listConfigs(user.tenantId);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: '获取排队配置详情' })
  async getConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.getConfig(id);
  }

  @Post('configs')
  @ApiOperation({ summary: '创建排队配置' })
  async createConfig(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.queuesService.createConfig({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Put('configs/:id')
  @ApiOperation({ summary: '更新排队配置' })
  async updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.queuesService.updateConfig(id, data);
  }

  // ========== 排队管理 ==========

  @Get('stats')
  @ApiOperation({ summary: '获取排队统计' })
  async getQueueStats(@CurrentUser() user: CurrentUserData) {
    return this.queuesService.getQueueStats(user.tenantId);
  }

  @Get('position/:conversationId')
  @ApiOperation({ summary: '获取会话排队位置' })
  async getQueuePosition(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    return this.queuesService.getQueuePosition(conversationId);
  }

  @Post('enqueue')
  @ApiOperation({ summary: '加入排队' })
  async enqueue(@Body() data: any, @CurrentUser() user: CurrentUserData) {
    return this.queuesService.enqueue({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Post('dequeue/:conversationId')
  @ApiOperation({ summary: '取消排队' })
  async dequeue(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    await this.queuesService.dequeue(conversationId);
    return { success: true };
  }
}
