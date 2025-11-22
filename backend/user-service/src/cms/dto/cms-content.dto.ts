import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreateCmsContentDto {
  @IsString()
  page: string;

  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  content: Record<string, any>;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCmsContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCmsContentDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
