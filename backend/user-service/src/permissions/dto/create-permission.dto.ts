import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
