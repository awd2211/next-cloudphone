import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppCategory } from '../../entities/application.entity';

export class CreateAppDto {
  @ApiPropertyOptional({
    description: '应用名称',
    example: 'WeChat',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '应用描述',
    example: 'A popular messaging app',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '应用分类',
    enum: AppCategory,
    example: AppCategory.SOCIAL,
  })
  @IsEnum(AppCategory)
  @IsOptional()
  category?: AppCategory;

  @ApiPropertyOptional({
    description: '租户 ID',
    example: 'tenant-123',
  })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '上传者 ID',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  uploaderId?: string;

  @ApiPropertyOptional({
    description: '应用标签',
    type: [String],
    example: ['social', 'chat'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
