import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppCategory } from '../../entities/application.entity';

export class CreateAppDto {
  @ApiPropertyOptional({
    description: '应用名称',
    example: 'WeChat',
    maxLength: 100,
  })
  @IsString({ message: '应用名称必须是字符串' })
  @MaxLength(100, { message: '应用名称最多100个字符' })
  @Matches(/^[a-zA-Z0-9\u4e00-\u9fa5_\-.\s]+$/, {
    message: '应用名称只能包含字母、数字、中文、下划线、连字符、点和空格',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toString().trim())
  name?: string;

  @ApiPropertyOptional({
    description: '应用描述',
    example: 'A popular messaging app',
    maxLength: 1000,
  })
  @IsString({ message: '应用描述必须是字符串' })
  @MaxLength(1000, { message: '应用描述最多1000个字符' })
  @IsOptional()
  @Transform(({ value }) => value?.toString().trim())
  description?: string;

  @ApiPropertyOptional({
    description: '应用分类',
    enum: AppCategory,
    example: AppCategory.SOCIAL,
  })
  @IsEnum(AppCategory, { message: '应用分类不正确' })
  @IsOptional()
  category?: AppCategory;

  @ApiPropertyOptional({
    description: '租户 ID',
    example: 'tenant-123',
  })
  @IsString({ message: '租户ID必须是字符串' })
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '上传者 ID',
    example: 'user-123',
  })
  @IsString({ message: '上传者ID必须是字符串' })
  @IsOptional()
  uploaderId?: string;

  @ApiPropertyOptional({
    description: '应用标签',
    type: [String],
    example: ['social', 'chat'],
    maxItems: 10,
  })
  @IsArray({ message: '标签必须是数组' })
  @ArrayMaxSize(10, { message: '标签数量最多10个' })
  @IsOptional()
  tags?: string[];
}
