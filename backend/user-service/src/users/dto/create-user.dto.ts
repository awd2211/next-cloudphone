import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsEnum,
  Matches,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../entities/user.entity';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: '用户名只能包含字母、数字、下划线、点和连字符' })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  username: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @MaxLength(100, { message: '邮箱最多100个字符' })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
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
    maxLength: 100,
  })
  @IsString({ message: '全名必须是字符串' })
  @MaxLength(100, { message: '全名最多100个字符' })
  @IsOptional()
  @Transform(({ value }) => value?.toString().trim())
  fullName?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确，必须是11位中国大陆手机号' })
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
    maxItems: 20,
  })
  @IsArray({ message: '角色ID必须是数组' })
  @ArrayMaxSize(20, { message: '角色数量最多20个' })
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
