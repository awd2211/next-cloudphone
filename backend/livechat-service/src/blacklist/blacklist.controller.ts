/**
 * 黑名单控制器
 *
 * 提供黑名单管理的 REST API
 */
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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlacklistService } from './blacklist.service';
import {
  CreateBlacklistDto,
  UpdateBlacklistDto,
  RevokeBlacklistDto,
  SearchBlacklistDto,
  CheckBlacklistDto,
  BatchCreateBlacklistDto,
} from './dto';

interface CurrentUserData {
  userId: string;
  tenantId: string;
  username?: string;
  roles?: string[];
}

@ApiTags('livechat/blacklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  @ApiOperation({ summary: '搜索黑名单' })
  async search(
    @Query() query: SearchBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.search(query, user.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取黑名单统计' })
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.blacklistService.getStats(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取黑名单详情' })
  @ApiParam({ name: 'id', description: '黑名单ID' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.getById(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: '添加到黑名单' })
  @ApiResponse({ status: 201, description: '添加成功' })
  async create(
    @Body() dto: CreateBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.create(dto, user.tenantId, user.userId);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量添加黑名单' })
  async createBatch(
    @Body() dto: BatchCreateBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.createBatch(dto.items, user.tenantId, user.userId);
  }

  @Post('check')
  @ApiOperation({ summary: '检查是否在黑名单中' })
  async check(
    @Body() dto: CheckBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const isBlacklisted = await this.blacklistService.isBlacklisted(dto, user.tenantId);
    return { isBlacklisted };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新黑名单' })
  @ApiParam({ name: 'id', description: '黑名单ID' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.update(id, dto, user.tenantId, user.userId);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: '撤销黑名单' })
  @ApiParam({ name: 'id', description: '黑名单ID' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeBlacklistDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.blacklistService.revoke(id, dto, user.tenantId, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除黑名单' })
  @ApiParam({ name: 'id', description: '黑名单ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.blacklistService.delete(id, user.tenantId, user.userId);
  }
}
