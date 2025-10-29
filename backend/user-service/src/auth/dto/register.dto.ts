import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(50, { message: '用户名最多 50 个字符' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: '用户名只能包含字母、数字、下划线、点和连字符',
  })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  username: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsEmail({}, { message: '邮箱格式无效' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @MaxLength(100, { message: '邮箱最多 100 个字符' })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  email: string;

  @ApiProperty({ description: '密码', example: 'Test@123' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(100, { message: '密码最多 100 个字符' })
  password: string;

  @ApiProperty({ description: '全名', example: '测试用户', required: false })
  @IsString({ message: '全名必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '全名最多 100 个字符' })
  @Transform(({ value }) => value?.toString().trim())
  fullName?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsString({ message: '手机号必须是字符串' })
  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式无效' })
  @Transform(({ value }) => value?.toString().trim())
  phone?: string;
}

