import { IsString, IsNotEmpty, Matches, MaxLength, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(50, { message: '用户名最多 50 个字符' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: '用户名只能包含字母、数字、下划线、点和连字符',
  })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  username: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(100, { message: '密码最多 100 个字符' })
  password: string;

  @ApiProperty({ description: '验证码', example: 'ab12', required: false })
  @IsOptional()
  @IsString({ message: '验证码必须是字符串' })
  @MaxLength(10, { message: '验证码最多 10 个字符' })
  @Transform(({ value }) => value?.toString().trim())
  captcha?: string;

  @ApiProperty({
    description: '验证码 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '验证码ID必须是字符串' })
  @Matches(/^[a-f0-9-]{36}$/, { message: '验证码ID格式无效' })
  captchaId?: string;

  @ApiProperty({
    description: '记住我 - 勾选后 Token 有效期延长至 7 天',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'remember 必须是布尔值' })
  @Transform(({ value }) => value === true || value === 'true')
  remember?: boolean;
}
