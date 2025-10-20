import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsArray()
  @IsOptional()
  permissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
