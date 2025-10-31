import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ApiKeysService, CreateApiKeyDto } from './api-keys.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyAuthGuard, ApiScopes } from './api-key-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * 创建 API 密钥
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 API 密钥' })
  @ApiResponse({ status: 201, description: '创建成功，密钥仅返回一次' })
  async createApiKey(@Body() dto: CreateApiKeyDto) {
    this.logger.log(`创建 API 密钥 - 用户: ${dto.userId}, 名称: ${dto.name}`);
    return await this.apiKeysService.createApiKey(dto);
  }

  /**
   * 获取用户的 API 密钥列表
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的 API 密钥列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserApiKeys(@Param('userId') userId: string) {
    return await this.apiKeysService.getUserApiKeys(userId);
  }

  /**
   * 获取 API 密钥详情
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 API 密钥详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getApiKey(@Param('id') id: string) {
    return await this.apiKeysService.getApiKey(id);
  }

  /**
   * 更新 API 密钥
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新 API 密钥' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateApiKey(
    @Param('id') id: string,
    @Body()
    updates: {
      name?: string;
      scopes?: string[];
      description?: string;
      expiresAt?: Date;
    }
  ) {
    this.logger.log(`更新 API 密钥 - ID: ${id}`);
    return await this.apiKeysService.updateApiKey(id, updates);
  }

  /**
   * 撤销 API 密钥
   */
  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '撤销 API 密钥' })
  @ApiResponse({ status: 200, description: '撤销成功' })
  async revokeApiKey(@Param('id') id: string) {
    this.logger.log(`撤销 API 密钥 - ID: ${id}`);
    return await this.apiKeysService.revokeApiKey(id);
  }

  /**
   * 删除 API 密钥
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 API 密钥（管理员）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteApiKey(@Param('id') id: string) {
    this.logger.log(`删除 API 密钥 - ID: ${id}`);
    await this.apiKeysService.deleteApiKey(id);
    return { message: '删除成功' };
  }

  /**
   * 获取 API 密钥统计
   */
  @Get('statistics/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 API 密钥统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatistics(@Param('userId') userId: string) {
    return await this.apiKeysService.getApiKeyStatistics(userId);
  }

  /**
   * 测试 API 密钥认证
   */
  @Get('test/auth')
  @UseGuards(ApiKeyAuthGuard)
  @ApiScopes('test:read')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '测试 API 密钥认证' })
  @ApiResponse({ status: 200, description: '认证成功' })
  async testApiKeyAuth() {
    return {
      message: 'API 密钥认证成功',
      timestamp: new Date().toISOString(),
    };
  }
}
