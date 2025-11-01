import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  Matches,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserStatus } from '../../entities/user.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
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
    description: '邮箱地址',
    example: 'john@example.com',
    maxLength: 100,
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100, { message: '邮箱最多100个字符' })
  @IsOptional()
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码（中国大陆11位手机号）',
    example: '13800138000',
  })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确，必须是11位中国大陆手机号',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
    maxLength: 500,
  })
  @IsString({ message: '头像URL必须是字符串' })
  @IsUrl({}, { message: '头像URL格式不正确' })
  @MaxLength(500, { message: '头像URL最多500个字符' })
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: '用户状态不正确' })
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: '角色ID列表',
    type: [String],
    example: ['role-1', 'role-2'],
    maxItems: 20,
  })
  @IsArray({ message: '角色ID必须是数组' })
  @ArrayMaxSize(20, { message: '角色数量最多20个' })
  @IsOptional()
  roleIds?: string[];
}
