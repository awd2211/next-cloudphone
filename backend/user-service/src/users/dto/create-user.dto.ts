import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../entities/user.entity';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '密码（必须至少8个字符，包含大小写字母、数字和特殊字符）',
    example: 'Pass@word123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({
    description: '全名',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '租户 ID',
    example: 'tenant-123',
  })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: '角色 ID 列表',
    type: [String],
    example: ['role-1', 'role-2'],
  })
  @IsArray()
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
