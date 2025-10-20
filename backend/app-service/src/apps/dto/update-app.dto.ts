import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { AppStatus, AppCategory } from '../../entities/application.entity';

export class UpdateAppDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppStatus)
  @IsOptional()
  status?: AppStatus;

  @IsEnum(AppCategory)
  @IsOptional()
  category?: AppCategory;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
