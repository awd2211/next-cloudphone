import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchScope {
  ALL = 'all',
  USERS = 'users',
  DEVICES = 'devices',
  APPS = 'apps',
  TEMPLATES = 'templates',
  TICKETS = 'tickets',
  NOTIFICATIONS = 'notifications',
  ORDERS = 'orders',
}

export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词', example: 'device-001' })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({
    description: '搜索范围',
    enum: SearchScope,
    default: SearchScope.ALL,
    example: SearchScope.ALL,
  })
  @IsEnum(SearchScope)
  @IsOptional()
  scope?: SearchScope = SearchScope.ALL;

  @ApiPropertyOptional({
    description: '过滤条件（服务特定）',
    example: { status: 'online', region: 'us-west' },
  })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, maximum: 100, default: 20, example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '高亮显示关键词',
    default: true,
    example: true,
  })
  @IsOptional()
  highlight?: boolean = true;
}

export class AutocompleteQueryDto {
  @ApiProperty({ description: '搜索前缀', example: 'dev' })
  @IsString()
  prefix: string;

  @ApiPropertyOptional({
    description: '建议数量限制',
    minimum: 1,
    maximum: 20,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '搜索范围',
    enum: SearchScope,
    example: SearchScope.ALL,
  })
  @IsEnum(SearchScope)
  @IsOptional()
  scope?: SearchScope;
}

export class SearchHistoryQueryDto {
  @ApiPropertyOptional({
    description: '历史记录数量',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;
}
