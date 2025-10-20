import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
