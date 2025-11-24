/**
 * 知识库控制器
 *
 * 提供知识库分类和文章的 REST API
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateArticleDto,
  UpdateArticleDto,
  SearchArticlesDto,
  RecommendArticlesDto,
  RecordUsageDto,
  ArticleStatsQueryDto,
} from './dto';

interface CurrentUserData {
  userId: string;
  tenantId: string;
  username?: string;
  roles?: string[];
}

@ApiTags('livechat/knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  // ============ 分类接口 ============

  @Get('categories')
  @ApiOperation({ summary: '获取分类列表（树形结构）' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getCategories(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.kbService.getCategories(
      user.tenantId,
      includeInactive === 'true',
    );
  }

  @Get('categories/:id')
  @ApiOperation({ summary: '获取分类详情' })
  @ApiParam({ name: 'id', description: '分类ID' })
  async getCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.getCategory(id, user.tenantId);
  }

  @Post('categories')
  @ApiOperation({ summary: '创建分类' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.createCategory(dto, user.tenantId, user.userId);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '更新分类' })
  @ApiParam({ name: 'id', description: '分类ID' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.updateCategory(id, dto, user.tenantId, user.userId);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '删除分类' })
  @ApiParam({ name: 'id', description: '分类ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.kbService.deleteCategory(id, user.tenantId, user.userId);
  }

  // ============ 文章接口 ============

  @Get('articles')
  @ApiOperation({ summary: '搜索文章' })
  async searchArticles(
    @Query() query: SearchArticlesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // 检查是否是管理员（可以看到所有状态的文章）
    const isAdmin = user.roles?.includes('admin') || user.roles?.includes('super_admin');
    return this.kbService.searchArticles(query, user.tenantId, !isAdmin);
  }

  @Get('articles/popular')
  @ApiOperation({ summary: '获取热门文章' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopularArticles(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: number,
  ) {
    return this.kbService.getPopularArticles(user.tenantId, limit || 10);
  }

  @Get('articles/:id')
  @ApiOperation({ summary: '获取文章详情' })
  @ApiParam({ name: 'id', description: '文章ID' })
  async getArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.getArticle(id, user.tenantId);
  }

  @Post('articles')
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createArticle(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.createArticle(
      dto,
      user.tenantId,
      user.userId,
      user.username,
    );
  }

  @Put('articles/:id')
  @ApiOperation({ summary: '更新文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  async updateArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.updateArticle(id, dto, user.tenantId, user.userId);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: '删除文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.kbService.deleteArticle(id, user.tenantId, user.userId);
  }

  @Post('articles/publish')
  @ApiOperation({ summary: '批量发布文章' })
  async publishArticles(
    @Body() body: { ids: string[] },
    @CurrentUser() user: CurrentUserData,
  ) {
    const count = await this.kbService.publishArticles(
      body.ids,
      user.tenantId,
      user.userId,
    );
    return { published: count };
  }

  @Post('articles/archive')
  @ApiOperation({ summary: '批量归档文章' })
  async archiveArticles(
    @Body() body: { ids: string[] },
    @CurrentUser() user: CurrentUserData,
  ) {
    const count = await this.kbService.archiveArticles(
      body.ids,
      user.tenantId,
      user.userId,
    );
    return { archived: count };
  }

  // ============ 智能推荐 ============

  @Post('recommend')
  @ApiOperation({ summary: 'AI 智能推荐文章' })
  async recommendArticles(
    @Body() dto: RecommendArticlesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.recommendArticles(dto, user.tenantId, user.userId);
  }

  // ============ 使用记录 ============

  @Post('usage')
  @ApiOperation({ summary: '记录文章使用情况' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordUsage(
    @Body() dto: RecordUsageDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.kbService.recordUsage(dto, user.tenantId, user.userId);
  }

  // ============ 统计 ============

  @Get('stats')
  @ApiOperation({ summary: '获取知识库统计' })
  async getStats(
    @Query() query: ArticleStatsQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.kbService.getStats(user.tenantId, query);
  }
}
