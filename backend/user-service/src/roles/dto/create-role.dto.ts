import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称（必须以字母开头，只能包含字母、数字、下划线和连字符）',
    example: 'custom_role',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'Role name must start with a letter and contain only letters, numbers, underscores and hyphens',
  })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  name: string;

  @ApiPropertyOptional({ description: '显示名称', example: 'Custom Role' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: '描述', example: 'A custom role for specific purposes' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '租户 ID', example: 'tenant-123' })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '权限 ID 列表',
    example: ['perm-123', 'perm-456'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  permissionIds?: string[];

  @ApiPropertyOptional({ description: '是否为系统角色', example: false })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
