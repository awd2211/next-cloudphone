import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdatePermissionDto {
  // Note: name, resource, and action cannot be updated (they are immutable identifiers)

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
