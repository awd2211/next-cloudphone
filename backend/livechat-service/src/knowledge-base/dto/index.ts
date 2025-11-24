/**
 * 知识库 DTO 定义
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ArticleStatus,
  ArticleVisibility,
} from '../../entities/knowledge-article.entity';

// ============ 分类 DTO ============

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '分类图标' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '分类名称' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '分类图标' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============ 文章 DTO ============

export class CreateArticleDto {
  @ApiProperty({ description: '文章标题', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: '文章摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: '文章内容 (Markdown)' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: 'HTML 渲染内容' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: '文章状态',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: '可见性',
    enum: ArticleVisibility,
    default: ArticleVisibility.INTERNAL,
  })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: '是否置顶' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '是否精选' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '关联文章ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  relatedArticleIds?: string[];
}

export class UpdateArticleDto {
  @ApiPropertyOptional({ description: '文章标题' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '文章摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '文章内容' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ description: 'HTML 渲染内容' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '文章状态', enum: ArticleStatus })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ description: '可见性', enum: ArticleVisibility })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: '是否置顶' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '是否精选' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '关联文章ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  relatedArticleIds?: string[];
}

// ============ 查询 DTO ============

export class SearchArticlesDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '文章状态', enum: ArticleStatus })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ description: '可见性', enum: ArticleVisibility })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '是否置顶' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '是否精选' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['createdAt', 'updatedAt', 'viewCount', 'useCount', 'sortOrder'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'sortOrder';

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

// ============ AI 推荐 DTO ============

export class RecommendArticlesDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ description: '用户消息内容' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: '返回数量', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}

// ============ 使用记录 DTO ============

export class RecordUsageDto {
  @ApiProperty({ description: '文章ID' })
  @IsUUID()
  articleId: string;

  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description: '使用类型',
    enum: ['view', 'copy', 'send', 'helpful', 'not_helpful'],
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  searchQuery?: string;
}

// ============ 统计 DTO ============

export class ArticleStatsQueryDto {
  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
