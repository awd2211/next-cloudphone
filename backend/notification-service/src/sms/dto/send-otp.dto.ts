import { IsPhoneNumber, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpType } from '../otp.service';

/**
 * 发送验证码 DTO (旧版，保留兼容性)
 */
export class SendOtpDto {
  @ApiProperty({
    description: '接收验证码的手机号码（国际格式）',
    example: '+8613800138000',
  })
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: '过期时间（分钟）',
    example: 5,
    default: 5,
  })
  @IsOptional()
  expiryMinutes?: number;
}

/**
 * 发送 OTP 验证码 DTO (新版)
 */
export class SendOtpV2Dto {
  @ApiProperty({
    description: '接收验证码的手机号码（国际格式）',
    example: '+8613800138000',
  })
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @ApiProperty({
    description: '验证码类型',
    enum: OtpType,
    example: OtpType.REGISTRATION,
  })
  @IsEnum(OtpType, { message: '无效的验证码类型' })
  type: OtpType;

  @ApiPropertyOptional({
    description: '自定义短信内容（可选）',
    example: '您的验证码是: {code}',
  })
  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * 验证 OTP 验证码 DTO
 */
export class VerifyOtpDto {
  @ApiProperty({
    description: '手机号码（国际格式）',
    example: '+8613800138000',
  })
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;

  @ApiProperty({
    description: '验证码类型',
    enum: OtpType,
    example: OtpType.REGISTRATION,
  })
  @IsEnum(OtpType, { message: '无效的验证码类型' })
  type: OtpType;
}
