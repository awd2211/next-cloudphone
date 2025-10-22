import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '全名', example: '测试用户', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

