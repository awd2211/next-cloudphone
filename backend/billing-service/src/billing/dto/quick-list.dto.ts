import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuickListQueryDto {
  @ApiPropertyOptional({
    description: '状态过滤',
    example: 'online',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'device',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '限制数量',
    default: 100,
    minimum: 1,
    maximum: 500,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}

export class QuickListItemDto {
  @ApiProperty({ description: 'ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: '名称', example: 'device-001' })
  name: string;

  @ApiPropertyOptional({ description: '状态', example: 'online' })
  status?: string;

  @ApiPropertyOptional({
    description: '额外信息',
    example: { provider: 'redroid', region: 'us-west' },
  })
  extra?: Record<string, any>;
}

export class QuickListResponseDto {
  @ApiProperty({
    description: '数据列表',
    type: [QuickListItemDto],
  })
  items: QuickListItemDto[];

  @ApiProperty({ description: '总数', example: 42 })
  total: number;

  @ApiProperty({ description: '是否来自缓存', example: false })
  cached: boolean;
}
