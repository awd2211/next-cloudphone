import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { AppCategory } from '../../entities/application.entity';

export class CreateAppDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppCategory)
  @IsOptional()
  category?: AppCategory;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  uploaderId?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
